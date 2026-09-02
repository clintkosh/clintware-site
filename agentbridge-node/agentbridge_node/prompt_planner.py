from __future__ import annotations

from dataclasses import asdict, dataclass
import re

from .contextor import estimate_tokens


ACTION_RE = re.compile(
    r"\b(?:build|create|generate|make|update|edit|modify|fix|implement|add|remove|"
    r"replace|assemble|combine|export|render|deploy|test|verify|check|review|"
    r"research|search|compare|analyze|summarize|draft|send|save|upload|download|"
    r"then|after|once|next|finally|before|proceed|continue)\b",
    re.I,
)
SEQUENCE_RE = re.compile(r"\b(?:then|after(?:ward)?|once|next|finally|before|only after|proceed|continue)\b", re.I)
NUMBERED_RE = re.compile(r"^\s*(?:\d+[.)]|[-*•])\s+", re.M)
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")
LOGICAL_BOUNDARY_RE = re.compile(
    r"\s*;\s*|(?<=[.!?])\s+(?=(?:Then|Next|After(?:ward)?|Once|Finally|Before|Proceed|Continue)\b)",
    re.I,
)
VISUAL_MULTI_RE = re.compile(
    r"\b(?:pages?|images?|illustrations?|scenes?|frames?|shots?|storyboards?|coloring\s+book|gallery|wallpapers?)\b",
    re.I,
)
VISUAL_VARIATION_RULE = (
    "For repeated visual/story outputs, preserve recognizable identity/style but deliberately vary pose, body angle, camera distance, "
    "framing, expression, interaction, environment, and composition; do not clone the same portrait stance across scenes."
)

AUTO_CONTINUE_RULES = (
    "Work through the steps in order without asking for repeated OK/continue confirmations. "
    "Before each next step, re-compact the unresolved requirements plus only the prior outputs needed by that step; do not resend irrelevant completed context. "
    "After each step, verify its requested outcome and repair only failed or defective parts before moving on. "
    "If a provider, tool, image, file, or batch limit is reached, resume with the next legal-sized batch and keep prior accepted work. "
    "Do not restart completed work unless QA finds a defect. Preserve exact names, counts, files, quoted text, constraints, and definition-of-done requirements. "
    "Pause only when a required value is genuinely missing or a policy, permission, destructive, financial, security, or other confirmation boundary requires user approval."
)


@dataclass
class PromptStep:
    index: int
    prompt: str


@dataclass
class PromptPlan:
    mode: str
    master_prompt: str
    steps: list[PromptStep]
    raw_chars: int
    compacted_chars: int
    raw_tokens_est: int
    compacted_tokens_est: int
    complexity_score: int
    triggered_by: list[str]

    def to_dict(self) -> dict:
        data = asdict(self)
        data["step_count"] = len(self.steps)
        return data


def _normalize_preserving_blocks(text: str) -> str:
    """Conservatively compact whitespace and exact duplicate lines without dropping unique content."""
    text = str(text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return ""

    out: list[str] = []
    seen_lines: set[str] = set()
    in_fence = False
    blank = False
    for raw in text.split("\n"):
        line = raw.rstrip()
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            blank = False
            continue
        if in_fence:
            out.append(line)
            continue
        stripped = " ".join(line.split())
        if not stripped:
            if not blank and out:
                out.append("")
            blank = True
            continue
        blank = False
        key = stripped.casefold()
        if key in seen_lines and len(stripped) >= 24:
            continue
        seen_lines.add(key)
        out.append(stripped)

    while out and not out[-1]:
        out.pop()
    return "\n".join(out)


def _complexity(text: str) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    actions = len(ACTION_RE.findall(text))
    sequences = len(SEQUENCE_RE.findall(text))
    list_items = len(NUMBERED_RE.findall(text))
    separators = text.count(";") + text.count("\n")

    if actions >= 6:
        score += min(6, actions // 3)
        reasons.append("many_actions")
    if sequences >= 3:
        score += min(5, sequences)
        reasons.append("sequential_dependencies")
    if list_items >= 4:
        score += min(5, list_items // 2)
        reasons.append("many_list_items")
    if separators >= 10:
        score += min(4, separators // 8)
        reasons.append("many_sections")
    return score, reasons


def _split_large_unit(unit: str, target: int) -> list[str]:
    unit = unit.strip()
    if len(unit) <= target:
        return [unit] if unit else []

    sentences = [x.strip() for x in SENTENCE_SPLIT_RE.split(unit) if x.strip()]
    if len(sentences) <= 1:
        chunks: list[str] = []
        remaining = unit
        while len(remaining) > target:
            cut = remaining.rfind(" ", 0, target)
            if cut < target // 2:
                cut = target
            chunks.append(remaining[:cut].strip())
            remaining = remaining[cut:].strip()
        if remaining:
            chunks.append(remaining)
        return chunks

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = sentence if not current else f"{current} {sentence}"
        if len(candidate) <= target:
            current = candidate
            continue
        if current:
            chunks.append(current)
        if len(sentence) > target:
            chunks.extend(_split_large_unit(sentence, target))
            current = ""
        else:
            current = sentence
    if current:
        chunks.append(current)
    return chunks


def _coalesce_to_limit(steps: list[str], max_steps: int) -> list[str]:
    if len(steps) <= max_steps:
        return steps
    group_size = (len(steps) + max_steps - 1) // max_steps
    return ["\n".join(steps[i:i + group_size]) for i in range(0, len(steps), group_size)]


def _chunk(text: str, target: int, max_steps: int, *, prefer_logical_boundaries: bool = False) -> list[str]:
    base_units = [u.strip() for u in re.split(r"\n{2,}|(?=^\s*(?:\d+[.)]|[-*•])\s+)", text, flags=re.M) if u.strip()]
    if not base_units:
        base_units = [text.strip()]

    units: list[str] = []
    for unit in base_units:
        if prefer_logical_boundaries:
            logical = [x.strip() for x in LOGICAL_BOUNDARY_RE.split(unit) if x.strip()]
            units.extend(logical or [unit])
        else:
            units.append(unit)

    expanded: list[str] = []
    for unit in units:
        expanded.extend(_split_large_unit(unit, target))

    if prefer_logical_boundaries and len(expanded) > 1:
        return _coalesce_to_limit(expanded, max_steps)

    steps: list[str] = []
    current = ""
    for unit in expanded:
        candidate = unit if not current else f"{current}\n{unit}"
        if len(candidate) <= target:
            current = candidate
        else:
            if current:
                steps.append(current)
            current = unit
    if current:
        steps.append(current)
    return _coalesce_to_limit(steps, max_steps)


def _master_prompt(compacted: str, steps: list[str], auto_continue: bool) -> str:
    if len(steps) <= 1:
        return compacted

    protocol = AUTO_CONTINUE_RULES if auto_continue else (
        "Complete the steps in order. Verify each step before moving to the next."
    )
    if VISUAL_MULTI_RE.search(compacted):
        protocol = f"{protocol} {VISUAL_VARIATION_RULE}"

    rendered = [
        "QUILLGEIST AUTOCOMPACT EXECUTION PLAN",
        f"Protocol: {protocol}",
        "Execute the following dependency-ordered steps. Treat all steps as parts of the same original request:",
    ]
    total = len(steps)
    for idx, step in enumerate(steps, 1):
        rendered.append(f"\n[STEP {idx}/{total}]\n{step}")
    rendered.append(
        "\nBegin with STEP 1 now. After QA, re-compact only the unresolved requirements and required prior outputs for STEP 2, then continue automatically; repeat until final end-to-end QA and delivery."
    )
    return "\n".join(rendered)


def plan_prompt(text: str, config: dict | None = None, *, force: bool = False) -> PromptPlan:
    settings = dict(config or {})
    enabled = bool(settings.get("enabled", True))
    threshold = int(settings.get("threshold_chars", 3500))
    target = max(800, int(settings.get("step_target_chars", 2400)))
    complexity_threshold = int(settings.get("complexity_threshold", 6))
    max_steps = max(2, int(settings.get("max_steps", 24)))
    auto_continue = bool(settings.get("auto_continue", True))

    raw = str(text or "").strip()
    compacted = _normalize_preserving_blocks(raw)
    score, reasons = _complexity(compacted)
    triggered: list[str] = []
    if len(compacted) >= threshold:
        triggered.append("length")
    if score >= complexity_threshold:
        triggered.append("complexity")
    if force:
        triggered.append("forced")

    should_plan = enabled and bool(compacted) and bool(triggered)
    prefer_logical = "complexity" in triggered or "forced" in triggered
    steps_text = _chunk(compacted, target, max_steps, prefer_logical_boundaries=prefer_logical) if should_plan else [compacted]
    steps = [PromptStep(index=i, prompt=value) for i, value in enumerate(steps_text, 1)]
    master = _master_prompt(compacted, steps_text, auto_continue) if should_plan else compacted

    return PromptPlan(
        mode="auto_continue" if should_plan and len(steps) > 1 else "single",
        master_prompt=master,
        steps=steps,
        raw_chars=len(raw),
        compacted_chars=len(compacted),
        raw_tokens_est=estimate_tokens(raw),
        compacted_tokens_est=estimate_tokens(master),
        complexity_score=score,
        triggered_by=triggered,
    )

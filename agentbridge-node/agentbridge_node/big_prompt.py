from __future__ import annotations

from dataclasses import asdict, dataclass, field
import re
from typing import Iterable

from .contextor import estimate_tokens
from .dlp import sanitize as sanitize_dlp
from .prompt_planner import _chunk, _complexity, plan_prompt


PROVIDER_RE = re.compile(
    r"\b(?:chatgpt|openai|codex|claude|anthropic|gemini|grok|perplexity|openrouter|azure\s+openai)\b",
    re.I,
)
PROVIDER_REQUEST_RE = re.compile(
    r"\b(?:use|ask|call|invoke|query|route\s+to|send\s+to|through|via|with)\s+"
    r"(?:chatgpt|openai|codex|claude|anthropic|gemini|grok|perplexity|openrouter|azure\s+openai)\b",
    re.I,
)
FRESH_RE = re.compile(
    r"\b(?:latest|today|tonight|this\s+(?:week|month|year)|real[- ]?time|live\s+(?:web|data|status)|"
    r"breaking|news|price|prices|availability|weather|score|schedule|recent)\b",
    re.I,
)
CURRENT_AUTHORITY_RE = re.compile(
    r"\bcurrent\s+(?:status|state|version|price|prices|availability|weather|news|schedule|score|"
    r"listing|listings|job|jobs|role|roles|release|deployment|documentation|docs|record|records)\b",
    re.I,
)
EXTERNAL_ACTION_RE = re.compile(
    r"\b(?:send|email|message|publish|post|deploy|release|upload|delete|remove|rename|move|invite|"
    r"create\s+(?:account|user|record|issue|event|meeting|dns)|update\s+(?:account|record|issue|event|dns)|"
    r"authorize|grant|revoke|purchase|buy|pay|book|reserve)\b",
    re.I,
)
EXTERNAL_SYSTEM_RE = re.compile(
    r"\b(?:gmail|calendar|github|cloudflare|jira|confluence|hubspot|slack|linkedin|dns|oauth|mcp|"
    r"control\s+plane|provider|account|credential|secret|token)\b",
    re.I,
)
LOCAL_EXEC_RE = re.compile(
    r"\b(?:build|compile|test|verify|lint|format|package|render|convert|transform|index|scan|install|"
    r"repair|patch|edit|write|generate\s+files?|filesystem|file\s+system|repository|repo|source\s+code|"
    r"powershell|python|node|npm|git|docker|windows|local\s+machine|cpu|gpu)\b",
    re.I,
)
HEAVY_REASONING_RE = re.compile(
    r"\b(?:deep\s+research|research|architecture|architect|strategy|compare|investigate|forensic|"
    r"multi[- ]?source|comprehensive|legal|scientific)\b",
    re.I,
)
SECRET_VALUE_RE = re.compile(
    r"(?:\b(?:sk|ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_-]{16,}\b|"
    r"\bgithub_pat_[A-Za-z0-9_-]{16,}\b|"
    r"\bBearer\s+[A-Za-z0-9._~+/-]{20,}\b)",
    re.I,
)

SEQUENCE_DEP_RE = re.compile(
    r"\b(?:then|next|after(?:ward)?|once|finally|before|only\s+after|in\s+order|"
    r"step\s+\d+|after\s+that|when\s+complete)\b",
    re.I,
)
GPU_WORK_RE = re.compile(
    r"\b(?:llm|model|inference|generate|summarize|classify|embed|embedding|vision|"
    r"image|render|diffusion|comfyui|cuda|gpu|ollama|bitnet)\b",
    re.I,
)


@dataclass
class WorkUnit:
    id: str
    path: str
    depth: int
    prompt: str
    lane: str
    broker: str
    provider_hint: str
    depends_on: list[str] = field(default_factory=list)
    estimated_tokens: int = 0
    requires_fresh_authority: bool = False
    mutates_external: bool = False
    resource_class: str = "cpu"
    gpu_eligible: bool = False
    parallel_group: str = ""
    status: str = "planned"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class BigPromptPlan:
    mode: str
    project: str
    state_scope: str
    original_prompt: str
    master_prompt: str
    units: list[WorkUnit]
    raw_tokens_est: int
    remote_units: int
    local_units: int
    naive_remote_context_tokens_est: int
    routed_remote_context_tokens_est: int
    avoided_remote_context_tokens_est: int
    max_depth: int
    parallel_units: int
    sequential_units: int
    routing_contract: str
    credential_contract: str
    triggered_by: list[str]

    def to_dict(self) -> dict:
        data = asdict(self)
        data["unit_count"] = len(self.units)
        data["units"] = [unit.to_dict() for unit in self.units]
        return data


def _provider_hint(text: str) -> str:
    explicit = PROVIDER_REQUEST_RE.search(text or "")
    if explicit:
        provider = PROVIDER_RE.search(explicit.group(0))
        return provider.group(0).lower() if provider else ""
    return ""


def _route(text: str, remote_broker: str = "control_plane") -> tuple[str, str, str, bool, bool]:
    fresh = bool(FRESH_RE.search(text or "") or CURRENT_AUTHORITY_RE.search(text or ""))
    external_action = bool(EXTERNAL_ACTION_RE.search(text or ""))
    external_system = bool(EXTERNAL_SYSTEM_RE.search(text or ""))
    provider_hint = _provider_hint(text)

    if external_action or (external_system and re.search(r"\b(?:change|modify|write|create|update|delete|deploy|send|publish)\b", text, re.I)):
        return "control_plane_action", remote_broker, provider_hint, fresh, True
    # Deterministic implementation intent wins over incidental provider/system names.
    # Mentioning ChatGPT, GitHub, or a current code/config state does not itself require
    # a remote model or fresh authority.
    if LOCAL_EXEC_RE.search(text or ""):
        return "qq_deterministic", "qq", "", False, False
    if fresh or provider_hint:
        return "control_plane_provider", remote_broker, provider_hint, fresh, False
    if HEAVY_REASONING_RE.search(text or ""):
        return "qq_local_model", "qq", "", False, False
    return "qq_local_model", "qq", "", False, False


def _resource_class(lane: str, text: str) -> tuple[str, bool]:
    if lane == "qq_local_model":
        return ("gpu", True)
    if lane == "qq_deterministic":
        if GPU_WORK_RE.search(text or ""):
            return ("gpu", True)
        if re.search(r"\b(?:scan|search|index|read|copy|archive|storage|disk|files?)\b", text or "", re.I):
            return ("io", False)
        return ("cpu", False)
    return ("remote", False)


def _needs_children(text: str, *, depth: int, max_depth: int, target_chars: int, complexity_threshold: int) -> bool:
    if depth >= max_depth:
        return False
    score, _ = _complexity(text)
    return len(text) > target_chars or score >= complexity_threshold


def _leaf_prompts(
    text: str,
    *,
    path: str,
    depth: int,
    max_depth: int,
    target_chars: int,
    complexity_threshold: int,
    max_children: int,
) -> Iterable[tuple[str, str, int]]:
    if not _needs_children(
        text,
        depth=depth,
        max_depth=max_depth,
        target_chars=target_chars,
        complexity_threshold=complexity_threshold,
    ):
        yield path, text.strip(), depth
        return

    parts = _chunk(text, target_chars, max_children, prefer_logical_boundaries=True)
    if len(parts) <= 1:
        yield path, text.strip(), depth
        return

    for idx, part in enumerate(parts, 1):
        child_path = f"{path}.{idx}"
        yield from _leaf_prompts(
            part,
            path=child_path,
            depth=depth + 1,
            max_depth=max_depth,
            target_chars=target_chars,
            complexity_threshold=complexity_threshold,
            max_children=max_children,
        )


def _redact_secret_shapes(text: str) -> str:
    return SECRET_VALUE_RE.sub("[REDACTED_CREDENTIAL]", str(text or ""))


def plan_big_prompt(
    text: str,
    config: dict | None = None,
    *,
    project: str = "",
    state_scope: str = "",
    force: bool = False,
) -> BigPromptPlan:
    settings = dict(config or {})
    max_depth = max(1, min(6, int(settings.get("max_depth", 2))))
    max_units = max(2, min(128, int(settings.get("max_units", 48))))
    target_chars = max(600, int(settings.get("child_target_chars", 1600)))
    complexity_threshold = max(2, int(settings.get("child_complexity_threshold", 3)))
    max_children = max(2, min(24, int(settings.get("max_children", 12))))
    remote_broker = str(settings.get("remote_broker") or "control_plane").strip() or "control_plane"

    planner_settings = dict(settings.get("prompt_planner") or {})
    if project:
        planner_settings["project"] = project
    if state_scope:
        planner_settings["state_scope"] = state_scope
    planner_settings.setdefault("state_compaction", settings.get("state_compaction") or {})

    raw_input = str(text or "").strip()
    sanitized, _dlp_report = sanitize_dlp(raw_input, settings.get("dlp") or {"enabled": True, "mode": "standard"}, purpose="big_prompt")
    raw = _redact_secret_shapes(str(sanitized))
    root = plan_prompt(raw, planner_settings, force=force)
    seed_prompts = [step.prompt for step in root.steps] or [root.master_prompt]

    leaves: list[tuple[str, str, int]] = []
    for idx, seed in enumerate(seed_prompts, 1):
        leaves.extend(
            _leaf_prompts(
                seed,
                path=str(idx),
                depth=0,
                max_depth=max_depth,
                target_chars=target_chars,
                complexity_threshold=complexity_threshold,
                max_children=max_children,
            )
        )
        if len(leaves) >= max_units:
            leaves = leaves[:max_units]
            break

    units: list[WorkUnit] = []
    previous = ""
    previous_external = ""
    explicit_sequence = bool(SEQUENCE_DEP_RE.search(raw))
    for idx, (path, prompt, depth) in enumerate(leaves, 1):
        lane, broker, provider_hint, fresh, mutates = _route(prompt, remote_broker)
        unit_id = f"u{idx:03d}"
        resource_class, gpu_eligible = _resource_class(lane, prompt)
        dependencies: list[str] = []
        if explicit_sequence and previous:
            dependencies = [previous]
        elif mutates and previous_external:
            # External/stateful mutations remain ordered even when the surrounding
            # analysis/research units can fan out.
            dependencies = [previous_external]
        unit = WorkUnit(
            id=unit_id,
            path=path,
            depth=depth,
            prompt=prompt,
            lane=lane,
            broker=broker,
            provider_hint=provider_hint,
            depends_on=dependencies,
            estimated_tokens=estimate_tokens(prompt),
            requires_fresh_authority=fresh,
            mutates_external=mutates,
            resource_class=resource_class,
            gpu_eligible=gpu_eligible,
            parallel_group=("serial" if dependencies else f"{resource_class}-ready"),
        )
        units.append(unit)
        previous = unit_id
        if mutates:
            previous_external = unit_id

    remote = [u for u in units if u.lane.startswith("control_plane_")]
    local = [u for u in units if u not in remote]
    raw_tokens = estimate_tokens(raw)
    naive_remote = raw_tokens * len(remote)
    routed_remote = sum(u.estimated_tokens for u in remote)
    avoided = max(0, naive_remote - routed_remote)

    return BigPromptPlan(
        mode="qq_big_prompt",
        project=str(project or ""),
        state_scope=str(state_scope or project or ""),
        original_prompt=raw,
        master_prompt=root.master_prompt,
        units=units,
        raw_tokens_est=raw_tokens,
        remote_units=len(remote),
        local_units=len(local),
        naive_remote_context_tokens_est=naive_remote,
        routed_remote_context_tokens_est=routed_remote,
        avoided_remote_context_tokens_est=avoided,
        max_depth=max_depth,
        parallel_units=sum(1 for u in units if not u.depends_on),
        sequential_units=sum(1 for u in units if u.depends_on),
        routing_contract=(
            "Route deterministic/local work through qq first. Independent dependency-free units may execute concurrently through "
            "the adaptive CPU/RAM/GPU worker pool. Prefer GPU-class workers for local-model/inference units when GPU capacity is healthy. "
            "Route fresh external authority, explicit provider work, and external mutations through the configured control plane. "
            "Each unit receives only its prompt, dependency outputs, and the minimum durable state required to continue."
        ),
        credential_contract=(
            "Plans contain no reusable provider secrets. The control plane resolves opaque provider/account references "
            "to server-side credentials. Official local provider clients keep their own supported local sign-in state."
        ),
        triggered_by=list(dict.fromkeys(root.triggered_by + ["qq_big_prompt_default"])),
    )

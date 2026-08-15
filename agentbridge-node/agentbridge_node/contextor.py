from __future__ import annotations
from dataclasses import dataclass, asdict
import re
import shutil
import subprocess

ERROR_RE = re.compile(r"(error|exception|traceback|failed|failure|fatal|panic|denied|not found|syntax)", re.I)

def estimate_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4) if text else 0

@dataclass
class ContextMetrics:
    mode: str
    raw_chars: int
    sent_chars: int
    raw_tokens_est: int
    sent_tokens_est: int
    external_tokens_avoided_est: int
    local_llm_input_tokens_est: int = 0
    local_llm_output_tokens_est: int = 0
    net_tokens_avoided_est: int = 0

    def to_dict(self) -> dict:
        return asdict(self)

def _dedupe(lines: list[str]) -> list[str]:
    out: list[str] = []
    prev = None
    count = 0
    def flush():
        nonlocal prev, count
        if prev is None:
            return
        out.append(prev)
        if count > 1:
            out.append(f"[Contextor: previous line repeated {count - 1} more times]")
    for line in lines:
        if line == prev:
            count += 1
        else:
            flush()
            prev = line
            count = 1
    flush()
    return out

def fast_compact(text: str, max_chars: int = 24000) -> str:
    lines = _dedupe(text.splitlines())
    joined = "\\n".join(lines)
    if len(joined) <= max_chars:
        return joined
    important: set[int] = set()
    for i, line in enumerate(lines):
        if ERROR_RE.search(line):
            for j in range(max(0, i - 2), min(len(lines), i + 4)):
                important.add(j)
    head = set(range(min(80, len(lines))))
    tail = set(range(max(0, len(lines) - 80), len(lines)))
    indices = sorted(important | head | tail)
    selected = []
    last = -2
    for i in indices:
        if i > last + 1:
            selected.append("[Contextor: non-critical log lines omitted]")
        selected.append(lines[i])
        last = i
    compacted = "\\n".join(selected)
    if len(compacted) > max_chars:
        half = max_chars // 2
        compacted = compacted[:half] + "\\n[Contextor: middle omitted]\\n" + compacted[-half:]
    return compacted

def compact(text: str, config: dict) -> tuple[str, ContextMetrics]:
    threshold = int(config.get("compact_threshold_chars", 6000))
    max_chars = int(config.get("max_transmit_chars", 24000))
    mode = str(config.get("mode", "fast"))
    raw_tokens = estimate_tokens(text)
    if len(text) <= threshold or mode == "off":
        metrics = ContextMetrics("pass", len(text), len(text), raw_tokens, raw_tokens, 0, net_tokens_avoided_est=0)
        return text, metrics

    fast = fast_compact(text, max_chars=max_chars)
    selected = fast
    used = "fast"
    local_in = local_out = 0
    model = str(config.get("ollama_model", "")).strip()
    min_savings = int(config.get("smart_min_savings_tokens", 4000))
    predicted_savings = raw_tokens - estimate_tokens(fast)
    if mode == "smart" and model and predicted_savings >= min_savings and shutil.which("ollama"):
        prompt = (
            "Compress the following execution result for an upstream coding/planning LLM. "
            "Preserve exact error messages, file paths, exit codes, failed tests, attempted fixes, "
            "and Definition-of-Done evidence. Remove repetitive/noisy success output. "
            "Do not invent facts.\\n\\n" + fast
        )
        local_in = estimate_tokens(prompt)
        try:
            proc = subprocess.run(
                ["ollama", "run", model],
                input=prompt, text=True, capture_output=True, timeout=90
            )
            if proc.returncode == 0 and proc.stdout.strip():
                candidate = proc.stdout.strip()
                if len(candidate) < len(fast):
                    selected = candidate
                    used = "smart"
                    local_out = estimate_tokens(candidate)
        except (OSError, subprocess.TimeoutExpired):
            pass
    sent_tokens = estimate_tokens(selected)
    avoided = max(0, raw_tokens - sent_tokens)
    net = max(0, avoided - local_in - local_out)
    metrics = ContextMetrics(
        used, len(text), len(selected), raw_tokens, sent_tokens, avoided,
        local_in, local_out, net
    )
    return selected, metrics

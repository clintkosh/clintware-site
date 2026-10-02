"""Clintware Reflex Router v1.

Provider-neutral local-first decision layer for QQ.  It does not execute tools or
resolve secrets.  It produces a route decision that the existing Control Plane /
QQ policy layer must authorize before execution.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from enum import Enum
from typing import Callable, Optional


class Mode(str, Enum):
    AUTO = "auto"
    DETERMINISTIC = "deterministic"
    BITNET = "bitnet"
    JEV = "jev"
    LOCAL_LLM = "local_llm"
    REMOTE_LLM = "remote_llm"


@dataclass(frozen=True)
class Signal:
    task_class: str
    confidence: float
    reason: str


@dataclass(frozen=True)
class Decision:
    mode: str
    route: str
    confidence: float
    reason_code: str
    fallback: Optional[str] = None

    def to_dict(self):
        return asdict(self)


Classifier = Callable[[str], Signal]


HARD_REMOTE_CLASSES = {"fresh_external_fact", "external_mutation"}
DETERMINISTIC_CLASSES = {
    "file_read", "file_write", "build", "test", "format", "lint",
    "service_status", "health_check", "exact_lookup", "known_command",
}


def route(
    prompt: str,
    *,
    mode: Mode = Mode.AUTO,
    explicit_route: Optional[str] = None,
    deterministic_signal: Optional[Signal] = None,
    bitnet: Optional[Classifier] = None,
    jev: Optional[Classifier] = None,
    local_llm: Optional[Classifier] = None,
    bitnet_min: float = 0.86,
    jev_min: float = 0.80,
) -> Decision:
    """Return a route recommendation. Existing policy remains authoritative."""
    if explicit_route:
        return Decision(mode.value, explicit_route, 1.0, "explicit_user_selection")

    if deterministic_signal:
        tc = deterministic_signal.task_class
        if tc in HARD_REMOTE_CLASSES:
            return Decision(mode.value, "control_plane", 1.0, "hard_authority_gate")
        if tc in DETERMINISTIC_CLASSES:
            return Decision(mode.value, "qq_deterministic", 1.0, "deterministic_match")

    if mode == Mode.DETERMINISTIC:
        return Decision(mode.value, "qq_deterministic", 1.0, "forced_rules_only")

    if mode in (Mode.AUTO, Mode.BITNET) and bitnet:
        b = bitnet(prompt)
        if b.confidence >= bitnet_min:
            return Decision(mode.value, f"bitnet:{b.task_class}", b.confidence, "bitnet_confident")
        if mode == Mode.BITNET:
            return Decision(mode.value, "local_llm", b.confidence, "bitnet_low_confidence", "local_llm")

    if mode in (Mode.AUTO, Mode.JEV) and jev:
        j = jev(prompt)
        if j.confidence >= jev_min:
            return Decision(mode.value, f"jev:{j.task_class}", j.confidence, "jev_confident")
        if mode == Mode.JEV:
            return Decision(mode.value, "local_llm", j.confidence, "jev_low_confidence", "local_llm")

    if mode in (Mode.AUTO, Mode.LOCAL_LLM) and local_llm:
        l = local_llm(prompt)
        return Decision(mode.value, f"local_llm:{l.task_class}", l.confidence, "local_reasoner")

    if mode == Mode.REMOTE_LLM:
        return Decision(mode.value, "control_plane_remote", 1.0, "forced_remote")

    return Decision(mode.value, "control_plane_remote", 0.0, "no_local_decider_available", "control_plane_remote")

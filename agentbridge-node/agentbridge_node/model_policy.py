from __future__ import annotations

def _norm(value: object) -> str:
    return str(value or "").strip()

def private_data_allowed(authenticated_subject: str, config: dict | None = None) -> bool:
    """Fail closed: only a verified subject equal to the configured owner may use owner-local data."""
    settings = dict((config or {}).get("private_data") or {})
    owner = _norm(settings.get("owner_subject"))
    subject = _norm(authenticated_subject)
    return bool(owner and subject and subject.casefold() == owner.casefold())

def model_preferences(config: dict | None = None) -> dict:
    settings = dict((config or {}).get("model_preferences") or {})
    return {
        "allow_user_choice": bool(settings.get("allow_user_choice", True)),
        "text": dict(settings.get("text") or {"mode": "local_auto", "provider": "local", "model": "auto"}),
        "image": dict(settings.get("image") or {"mode": "user_choice", "provider": "", "model": ""}),
        "critic": dict(settings.get("critic") or {"enabled": False, "provider": "", "model": "", "compact": True}),
        "pulse_grade": dict(settings.get("pulse_grade") or {"enabled": False, "provider": "", "model": "", "cadence": "weekly"}),
    }

def choose_model(
    config: dict | None,
    *,
    task_kind: str = "text",
    requested_provider: str = "",
    requested_model: str = "",
) -> dict:
    prefs = model_preferences(config)
    kind = _norm(task_kind).lower() or "text"
    role = prefs.get(kind) if kind in {"text", "image", "critic", "pulse_grade"} else prefs["text"]
    role = dict(role or {})
    if prefs["allow_user_choice"] and (_norm(requested_provider) or _norm(requested_model)):
        return {
            "task_kind": kind,
            "provider": _norm(requested_provider) or _norm(role.get("provider")),
            "model": _norm(requested_model) or _norm(role.get("model")),
            "mode": "explicit",
            "source": "user_override",
        }
    return {
        "task_kind": kind,
        "provider": _norm(role.get("provider")),
        "model": _norm(role.get("model")),
        "mode": _norm(role.get("mode")) or "auto",
        "source": "configured_default",
    }

def routing_summary(config: dict | None, authenticated_subject: str = "") -> dict:
    prefs = model_preferences(config)
    return {
        "allow_user_choice": prefs["allow_user_choice"],
        "text": choose_model(config, task_kind="text"),
        "image": choose_model(config, task_kind="image"),
        "critic": choose_model(config, task_kind="critic"),
        "pulse_grade": choose_model(config, task_kind="pulse_grade"),
        "private_data_allowed": private_data_allowed(authenticated_subject, config),
        "private_data_boundary": "verified_owner_subject_only",
    }

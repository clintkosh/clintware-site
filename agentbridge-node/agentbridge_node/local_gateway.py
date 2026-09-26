from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import hmac
import os
import shutil
import time
import urllib.error
import urllib.request
import uuid

from . import local_inference


_MAX_BODY = 1024 * 1024
_LOOPBACK = {"127.0.0.1", "localhost", "::1"}


def _public_model_id(model: dict) -> str:
    runtime = str(model.get("runtime") or "local")
    name = str(model.get("name") or model.get("id") or "model")
    prefix = {"ollama": "ollama", "bitnet.cpp": "bitnet", "llama.cpp": "llama"}.get(runtime, runtime.replace(".", "-"))
    return f"{prefix}/{name}"


def _flatten_messages(messages: list[dict]) -> str:
    parts = []
    for item in messages[:100]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "user").strip().lower()
        content = item.get("content")
        if isinstance(content, list):
            chunks = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    chunks.append(str(block.get("text") or ""))
            text = "\n".join(chunks)
        else:
            text = str(content or "")
        text = text[:20000]
        if text:
            parts.append(f"{role.upper()}: {text}")
    parts.append("ASSISTANT:")
    return "\n\n".join(parts)


def _resolve_model(requested: str, config: dict | None = None) -> dict | None:
    models = local_inference.model_inventory(config)
    requested = str(requested or "").strip()
    if requested and requested not in {"auto", "local-auto"}:
        direct = local_inference._find_model(requested, models)
        if direct:
            return direct
        for row in models:
            if requested == _public_model_id(row):
                return row
        return None
    profile = local_inference.active_profile()
    if profile.get("active"):
        found = local_inference._find_model(str(profile.get("model") or ""), models)
        if found:
            return found
    route = local_inference.route_recommendation(prefer_local=True, config=config)
    choice = route.get("choice") or {}
    if choice.get("target") == "local":
        return local_inference._find_model(str(choice.get("model") or ""), models)
    return None


def _ollama_chat(model: str, messages: list[dict], *, context_tokens: int, max_tokens: int, temperature: float, timeout: int) -> dict:
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "num_ctx": context_tokens,
            "num_predict": max_tokens,
            "temperature": temperature,
        },
    }).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/chat",
        data=payload,
        method="POST",
        headers={"content-type": "application/json", "user-agent": "quillgeist-local-gateway"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": "ollama_local_api_failed", "detail": str(exc)[:500]}
    text = str((data.get("message") or {}).get("content") or "")
    return {
        "ok": True,
        "text": text,
        "prompt_tokens": int(data.get("prompt_eval_count") or 0) or None,
        "completion_tokens": int(data.get("eval_count") or 0) or None,
    }


def _llama_cli_chat(model: dict, messages: list[dict], *, context_tokens: int, max_tokens: int, timeout: int) -> dict:
    exe = local_inference._bitnet_executable("llama-cli") if model.get("runtime") == "bitnet.cpp" else local_inference._which_any(["llama-cli", "llama-cli.exe", "main", "main.exe"])
    if not exe or not model.get("path"):
        return {"ok": False, "error": "llama_cli_not_available"}
    prompt = _flatten_messages(messages)
    code, output = local_inference._run([
        exe,
        "-m", str(model["path"]),
        "-p", prompt,
        "-n", str(max_tokens),
        "-c", str(context_tokens),
        "--no-display-prompt",
    ], timeout=timeout)
    return {"ok": code == 0, "text": output, "exit_code": code}


def complete(payload: dict, config: dict | None = None) -> tuple[int, dict]:
    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        return 400, {"error": {"message": "messages must be a non-empty array", "type": "invalid_request"}}
    model = _resolve_model(str(payload.get("model") or "auto"), config)
    if not model:
        return 404, {"error": {"message": "No requested or auto-selected installed local model is available.", "type": "model_not_found"}}
    profile = local_inference.active_profile()
    context_tokens = int(payload.get("context_tokens") or (profile.get("context_tokens") if profile.get("active") else 0) or (config or {}).get("default_context_tokens") or 4096)
    context_tokens = max(512, min(context_tokens, 262144))
    max_tokens = int(payload.get("max_tokens") or payload.get("max_completion_tokens") or 256)
    max_tokens = max(1, min(max_tokens, 2048))
    try:
        temperature = float(payload.get("temperature", 0.7))
    except (TypeError, ValueError):
        temperature = 0.7
    temperature = max(0.0, min(temperature, 2.0))
    timeout = max(5, min(int((config or {}).get("benchmark_timeout_seconds") or 60) * 2, 300))

    fit = local_inference.estimate_fit(
        model.get("size_bytes"),
        context_tokens=context_tokens,
        reserve_gib=float((config or {}).get("ram_reserve_gib") or 2.0),
    )
    if fit.get("fit") == "no":
        return 409, {"error": {"message": "The selected model/context was refused by the local RAM guard.", "type": "memory_guard"}, "fit": fit}

    started = time.perf_counter()
    if model["runtime"] == "ollama":
        generated = _ollama_chat(model["name"], messages, context_tokens=context_tokens, max_tokens=max_tokens, temperature=temperature, timeout=timeout)
    else:
        generated = _llama_cli_chat(model, messages, context_tokens=context_tokens, max_tokens=max_tokens, timeout=timeout)
    elapsed = max(0.001, time.perf_counter() - started)
    if not generated.get("ok"):
        return 502, {"error": {"message": str(generated.get("error") or "local_generation_failed"), "type": "local_runtime_error"}, "detail": generated.get("detail")}

    text = str(generated.get("text") or "")
    local_inference._append_history({
        "ok": True,
        "kind": "gateway",
        "model": model["id"],
        "runtime": model["runtime"],
        "context_tokens": context_tokens,
        "elapsed_seconds": round(elapsed, 3),
        "output_chars": len(text),
        "chars_per_second": round(len(text) / elapsed, 2),
        "prompt_tokens": generated.get("prompt_tokens"),
        "completion_tokens": generated.get("completion_tokens"),
    })
    prompt_tokens = generated.get("prompt_tokens")
    completion_tokens = generated.get("completion_tokens")
    usage = {
        "prompt_tokens": int(prompt_tokens or 0),
        "completion_tokens": int(completion_tokens or 0),
        "total_tokens": int(prompt_tokens or 0) + int(completion_tokens or 0),
    }
    response = {
        "id": "chatcmpl-" + uuid.uuid4().hex[:24],
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model["id"],
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "usage": usage,
        "quillgeist": {"runtime": model["runtime"], "context_tokens": context_tokens, "fit": fit.get("fit"), "elapsed_seconds": round(elapsed, 3)},
    }
    return 200, response


class GatewayHandler(BaseHTTPRequestHandler):
    server_version = "QuillgeistLocalGateway/1"

    def _json(self, status: int, value: dict) -> None:
        body = json.dumps(value).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        expected = str(getattr(self.server, "quillgeist_api_key", "") or "")
        if not expected:
            return True
        header = str(self.headers.get("authorization") or "")
        if not header.lower().startswith("bearer "):
            return False
        supplied = header[7:].strip()
        return bool(supplied) and hmac.compare_digest(supplied, expected)

    def _stream_chat(self, response: dict) -> None:
        message = (((response.get("choices") or [{}])[0].get("message") or {}).get("content") or "")
        base = {
            "id": response.get("id"),
            "object": "chat.completion.chunk",
            "created": response.get("created"),
            "model": response.get("model"),
        }
        chunks = [
            {**base, "choices": [{"index": 0, "delta": {"role": "assistant", "content": str(message)}, "finish_reason": None}]},
            {**base, "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]},
        ]
        body = "".join("data: " + json.dumps(item) + "\n\n" for item in chunks) + "data: [DONE]\n\n"
        raw = body.encode("utf-8")
        self.send_response(200)
        self.send_header("content-type", "text/event-stream; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.send_header("connection", "close")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json(200, {
                "ok": True,
                "service": "Quillgeist Local Gateway",
                "auth_required": bool(getattr(self.server, "quillgeist_api_key", "")),
                "listen": str(getattr(self.server, "quillgeist_listen", "")),
            })
            return
        if not self._authorized():
            self._json(401, {"error": {"message": "invalid_api_key", "type": "authentication_error"}})
            return
        if self.path == "/v1/models":
            config = getattr(self.server, "quillgeist_config", {})
            rows = local_inference.model_inventory(config)
            data = [{"id": "local-auto", "object": "model", "owned_by": "local"}]
            data.extend({"id": _public_model_id(r), "object": "model", "owned_by": "local"} for r in rows)
            self._json(200, {"object": "list", "data": data})
            return
        self._json(404, {"error": {"message": "not_found", "type": "not_found"}})

    def do_POST(self) -> None:
        if self.path != "/v1/chat/completions":
            self._json(404, {"error": {"message": "not_found", "type": "not_found"}})
            return
        if not self._authorized():
            self._json(401, {"error": {"message": "invalid_api_key", "type": "authentication_error"}})
            return
        try:
            length = int(self.headers.get("content-length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > _MAX_BODY:
            self._json(413, {"error": {"message": "request body is empty or too large", "type": "invalid_request"}})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._json(400, {"error": {"message": "invalid JSON", "type": "invalid_request"}})
            return
        wants_stream = bool(payload.get("stream"))
        if wants_stream:
            payload = dict(payload)
            payload["stream"] = False
        status, response = complete(payload, getattr(self.server, "quillgeist_config", {}))
        if wants_stream and status == 200:
            self._stream_chat(response)
            return
        self._json(status, response)

    def log_message(self, fmt: str, *args) -> None:
        return


def serve(config: dict | None = None, *, host: str = "127.0.0.1", port: int = 11435, api_key: str = "") -> None:
    settings = dict(config or {})
    host = str(host or "127.0.0.1").strip().lower()
    port = max(1024, min(int(port or 11435), 65535))
    key = str(api_key or settings.get("gateway_api_key") or os.environ.get("QUILLGEIST_GATEWAY_API_KEY") or "").strip()
    loopback_only = host in _LOOPBACK
    if not loopback_only and len(key) < 32:
        raise ValueError("A non-loopback Quillgeist gateway requires a 32+ character bearer key.")
    server = ThreadingHTTPServer((host, port), GatewayHandler)
    server.quillgeist_config = settings
    server.quillgeist_api_key = key
    server.quillgeist_listen = f"http://{host}:{port}"
    print(json.dumps({
        "ok": True,
        "service": "Quillgeist Local Gateway",
        "listen": server.quillgeist_listen,
        "loopback_only": loopback_only,
        "auth_required": bool(key),
    }))
    server.serve_forever()


__all__ = ["complete", "serve", "_flatten_messages", "_resolve_model"]

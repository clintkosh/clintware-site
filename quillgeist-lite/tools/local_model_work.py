from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AGENTBRIDGE = ROOT / "agentbridge-node"
if str(AGENTBRIDGE) not in sys.path:
    sys.path.insert(0, str(AGENTBRIDGE))

from agentbridge_node.config import Config
from agentbridge_node.local_gateway import complete


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Run one bounded local-model work unit through Quillgeist local inference.")
    parser.add_argument("--Prompt", required=True)
    parser.add_argument("--Model", default="local-auto")
    parser.add_argument("--MaxTokens", type=int, default=512)
    parser.add_argument("--ContextTokens", type=int, default=4096)
    parser.add_argument("--Temperature", type=float, default=0.3)
    args = parser.parse_args(argv)

    prompt = str(args.Prompt or "").strip()
    if not prompt:
        print(json.dumps({"ok": False, "error": "prompt_required"}))
        return 2

    cfg = Config.load()
    inference = dict(cfg.data.get("local_inference", {}))
    payload = {
        "model": args.Model or "local-auto",
        "messages": [{"role": "user", "content": prompt[:24000]}],
        "max_tokens": max(1, min(int(args.MaxTokens), 2048)),
        "context_tokens": max(512, min(int(args.ContextTokens), 262144)),
        "temperature": max(0.0, min(float(args.Temperature), 2.0)),
        "stream": False,
    }
    status, response = complete(payload, inference)
    if status != 200:
        print(json.dumps({"ok": False, "status": status, "response": response}, ensure_ascii=False))
        return 1

    choice = ((response.get("choices") or [{}])[0] or {})
    message = choice.get("message") or {}
    result = {
        "ok": True,
        "host": os.environ.get("COMPUTERNAME", ""),
        "worker_slot": os.environ.get("QQ_WORKER_SLOT", ""),
        "gpu_index": os.environ.get("QQ_GPU_INDEX", ""),
        "model": response.get("model"),
        "text": str(message.get("content") or ""),
        "usage": response.get("usage") or {},
        "finish_reason": choice.get("finish_reason"),
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

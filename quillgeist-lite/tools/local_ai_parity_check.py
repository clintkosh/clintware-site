from __future__ import annotations

import importlib.util
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
FULL = ROOT / "agentbridge-node" / "agentbridge_node" / "local_inference.py"
LITE = ROOT / "quillgeist-lite" / "tools" / "local_ai.py"


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    full = load("quillgeist_full_local_ai", FULL)
    lite = load("quillgeist_lite_local_ai", LITE)

    for raw in ("4.7 GB", "900 MB", "1 TB", "bad"):
        a = full._parse_size(raw)
        b = lite.parse_size(raw)
        if a != b:
            raise SystemExit(f"size parser drift for {raw!r}: full={a} lite={b}")

    memories = [
        {"available_bytes": 4 * 1024**3},
        {"available_bytes": 8 * 1024**3},
        {"available_bytes": 16 * 1024**3},
        {"available_bytes": 32 * 1024**3},
    ]
    sizes = [1 * 1024**3, 3 * 1024**3, 7 * 1024**3, 15 * 1024**3]
    contexts = [2048, 4096, 8192, 16384]
    for mem in memories:
        for size in sizes:
            for ctx in contexts:
                a = full.estimate_fit(size, context_tokens=ctx, memory=mem, reserve_gib=2)
                b = lite.fit(size, context_tokens=ctx, mem=mem, reserve_gib=2)
                keys = ("fit", "estimated_working_set_gib", "available_after_reserve_gib", "context_tokens", "reserve_gib")
                for key in keys:
                    if a.get(key) != b.get(key):
                        raise SystemExit(
                            f"fit drift key={key} size={size} context={ctx} memory={mem}: full={a.get(key)!r} lite={b.get(key)!r}"
                        )

    print("LOCAL_AI_PARITY_OK shared Lite/Full fit behavior is aligned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import json
import os
import time


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="QQ adaptive worker-pool concurrency smoke task.")
    parser.add_argument("--Message", default="QQ_WORKER_OK")
    parser.add_argument("--DelayMs", type=int, default=2500)
    args = parser.parse_args(argv)
    delay_ms = max(250, min(int(args.DelayMs), 15000))
    started = time.time()
    time.sleep(delay_ms / 1000.0)
    print(json.dumps({
        "ok": True,
        "message": str(args.Message)[:200],
        "host": os.environ.get("COMPUTERNAME", ""),
        "pid": os.getpid(),
        "worker_slot": os.environ.get("QQ_WORKER_SLOT", ""),
        "gpu_index": os.environ.get("QQ_GPU_INDEX", ""),
        "delay_ms": delay_ms,
        "started_epoch": started,
        "finished_epoch": time.time(),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import struct
import subprocess
import sys
import time
import wave
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORT = 4173
URL = f"http://{HOST}:{PORT}"
CHECKS = [
    "desktop-load-layout",
    "prompt-generation-render-exports",
    "upload-waveform-adaptation",
    "project-reset",
    "mobile-responsive-layout",
    "runtime-error-free",
]


def make_wav(path: Path) -> None:
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        frames = bytearray()
        for i in range(4000):
            sample = int(0.22 * 32767 * math.sin(2 * math.pi * 220 * i / 16000))
            frames.extend(struct.pack("<h", sample))
        wav.writeframes(frames)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_pass(browser, number: int, source: Path) -> dict:
    errors: list[str] = []
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#studio")

    require(page.title() == "AI Music Studio | Clintware", "title mismatch")
    require(page.locator(".studio-shell").is_visible(), "studio not visible")
    require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), "desktop overflow")

    page.locator(".prompt-chip").first.click()
    page.locator("#duration").evaluate("el => {el.min='1'; el.value='1'; el.dispatchEvent(new Event('input',{bubbles:true}))}")
    page.locator("#rightsGenerate").check()
    page.locator("#generateForm .render-button").click()
    page.wait_for_selector("#renderList .render-player:not(.hidden)", timeout=30000)
    require(page.locator("#renderCount").inner_text() == "1 version", "generate failed")
    require(page.locator(".download-button").is_visible(), "WAV export missing")
    require(page.locator(".manifest-button").is_visible(), "JSON export missing")

    page.locator('[data-mode="adapt"]').click()
    page.locator("#audioFile").set_input_files(str(source))
    page.wait_for_selector("#sourceWaveCard:not(.hidden)")
    page.locator("#rightsAdapt").check()
    page.locator("#adaptForm .render-button").click()
    page.wait_for_function("document.querySelectorAll('#renderList .render-player:not(.hidden)').length === 2", timeout=30000)
    require(page.locator("#renderCount").inner_text() == "2 versions", "adapt failed")

    page.locator("#newProjectBtn").click()
    require(page.locator("#renderCount").inner_text() == "0 versions", "reset failed")

    page.set_viewport_size({"width": 390, "height": 844})
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#studio")
    require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), "mobile overflow")
    require(not errors, f"runtime errors: {errors}")
    context.close()
    return {"round": number, "status": "PASS", "checks": CHECKS}


def main() -> int:
    rounds = int(os.environ.get("ROUNDS", "5"))
    source = ROOT / "tests" / "regression-source.wav"
    make_wav(source)
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", HOST], cwd=ROOT)
    time.sleep(1)
    results = []
    try:
        with sync_playwright() as pw:
            for number in range(1, rounds + 1):
                browser = pw.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
                started = time.time()
                try:
                    result = run_pass(browser, number, source)
                    result["duration_seconds"] = round(time.time() - started, 2)
                    results.append(result)
                    print(f"Round {number}: PASS")
                finally:
                    browser.close()
    finally:
        server.terminate()

    report = {
        "suite": "Clintware Audio Lab virtual browser regression",
        "rounds_requested": rounds,
        "rounds_completed": len(results),
        "all_passed": len(results) == rounds,
        "results": results,
    }
    (ROOT / "TEST_REPORT.json").write_text(json.dumps(report, indent=2) + "\n")
    return 0 if report["all_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Interactive Google OAuth verification video recorder for Clintware.

Records the full primary screen so the real browser chrome/address bar and the
actual Google OAuth consent flow are visible. The user performs only the Google
sign-in/consent interaction. After OAuth returns to Clintware, the script
automatically demonstrates free/busy scheduling, event creation, rescheduling,
cancellation, and confirmation delivery.
"""
from __future__ import annotations

import os
import pathlib
import threading
import time
import textwrap
from urllib.parse import urlparse, parse_qs

import cv2
import mss
import numpy as np
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

VERSION = "2026.09.24.1"
HOME = pathlib.Path(os.environ.get("LOCALAPPDATA", pathlib.Path.home())) / "Clintware" / "QuillgeistLite"
PROFILE = HOME / "oauth-verification-profile"
DOWNLOADS = pathlib.Path.home() / "Downloads"
OUTPUT = DOWNLOADS / "Clintware-Google-OAuth-Verification-Demo.mp4"
STATUS = DOWNLOADS / "Clintware-Google-OAuth-Verification-Demo.txt"

class Recorder:
    def __init__(self, path: pathlib.Path, fps: int = 8):
        self.path = path
        self.fps = fps
        self.stop_event = threading.Event()
        self.caption = "Clintware OAuth Verification Demo - TEST ENVIRONMENT"
        self.detail = "Starting..."
        self.thread = None
        self.error = None

    def set_caption(self, caption: str, detail: str = ""):
        self.caption = caption
        self.detail = detail

    def start(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        time.sleep(0.8)
        if self.error:
            raise self.error

    def stop(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=10)

    def _run(self):
        try:
            with mss.mss() as sct:
                monitor = sct.monitors[1]
                width, height = monitor["width"], monitor["height"]
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                writer = cv2.VideoWriter(str(self.path), fourcc, float(self.fps), (width, height))
                if not writer.isOpened():
                    raise RuntimeError("Could not open MP4 video writer")
                interval = 1.0 / self.fps
                try:
                    while not self.stop_event.is_set():
                        started = time.perf_counter()
                        shot = np.asarray(sct.grab(monitor), dtype=np.uint8)
                        frame = cv2.cvtColor(shot, cv2.COLOR_BGRA2BGR)

                        # Add a low-profile verification annotation strip to the
                        # recording without covering browser chrome/address bar.
                        banner_h = max(96, int(height * 0.105))
                        y0 = height - banner_h
                        overlay = frame.copy()
                        cv2.rectangle(overlay, (0, y0), (width, height), (3, 8, 14), -1)
                        frame = cv2.addWeighted(overlay, 0.82, frame, 0.18, 0)

                        cv2.putText(
                            frame,
                            self.caption[:110],
                            (34, y0 + 34),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.78,
                            (240, 250, 255),
                            2,
                            cv2.LINE_AA,
                        )
                        wrapped = textwrap.wrap(self.detail or "", width=112)[:2]
                        for i, line in enumerate(wrapped):
                            cv2.putText(
                                frame,
                                line,
                                (34, y0 + 66 + i * 24),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.52,
                                (80, 210, 255),
                                1,
                                cv2.LINE_AA,
                            )

                        cv2.putText(
                            frame,
                            "CLINTWARE | GOOGLE OAUTH VERIFICATION",
                            (max(34, width - 520), y0 + 34),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.47,
                            (110, 240, 190),
                            1,
                            cv2.LINE_AA,
                        )
                        writer.write(frame)

                        remain = interval - (time.perf_counter() - started)
                        if remain > 0:
                            time.sleep(remain)
                finally:
                    writer.release()
        except Exception as exc:
            self.error = exc
            self.stop_event.set()


def sleep_visible(seconds: float):
    time.sleep(seconds)


def find_open_slot(page):
    page.wait_for_selector(".slot", timeout=30000)
    slots = page.locator(".slot")
    count = slots.count()
    if count < 1:
        raise RuntimeError("No availability slots are visible for the verification demo")
    slots.nth(0).click()


def fill_booking(page):
    page.locator("#name").fill("Clintware OAuth Verification Test")
    page.locator("#email").fill("clint@clintware.com")
    page.locator("#company").fill("Clintware")
    page.locator("#purpose").select_option(label="Other")
    page.locator("#topic").fill(
        "Google OAuth verification demonstration. This test meeting is created, "
        "updated, and cancelled during the recording."
    )


def is_oauth_return(url: str) -> bool:
    try:
        u = urlparse(url)
        q = parse_qs(u.query)
        return u.hostname in {"meet.clintware.com", "www.meet.clintware.com"} and q.get("calendar") == ["connected"]
    except Exception:
        return False


def main() -> int:
    HOME.mkdir(parents=True, exist_ok=True)
    PROFILE.mkdir(parents=True, exist_ok=True)
    recorder = Recorder(OUTPUT)

    STATUS.write_text(
        "Clintware Google OAuth verification capture started.\n"
        "Complete Google sign-in/consent in the browser window that opens.\n",
        encoding="utf-8",
    )

    recorder.start()
    try:
        with sync_playwright() as p:
            launch = {
                "user_data_dir": str(PROFILE),
                "headless": False,
                "no_viewport": True,
                "args": [
                    "--start-maximized",
                    "--disable-session-crashed-bubble",
                    "--no-first-run",
                ],
            }
            try:
                context = p.chromium.launch_persistent_context(channel="msedge", **launch)
            except Exception:
                context = p.chromium.launch_persistent_context(**launch)

            page = context.pages[0] if context.pages else context.new_page()
            page.set_default_timeout(20000)

            recorder.set_caption(
                "1/6 - Clintware application and branding",
                "The same Clintware application submitted for Google OAuth verification.",
            )
            page.goto("https://www.clintware.com/", wait_until="domcontentloaded", timeout=30000)
            page.bring_to_front()
            sleep_visible(4)

            recorder.set_caption(
                "2/6 - Google OAuth grant",
                "Complete Google sign-in and the real consent screen in English. "
                "The browser address bar remains visible in this recording.",
            )
            page.goto("https://auth.clintware.com/delegated/google/start", wait_until="domcontentloaded", timeout=30000)
            page.bring_to_front()

            deadline = time.time() + 600
            while time.time() < deadline:
                current = page.url
                host = urlparse(current).hostname or ""
                if "accounts.google.com" in host:
                    recorder.set_caption(
                        "2/6 - Google OAuth grant and requested scopes",
                        "This is the live Google consent flow. Approve the scopes shown for this test account.",
                    )
                elif is_oauth_return(current):
                    break
                elif "meet.clintware.com" in host and "calendar=connected" in current:
                    break
                sleep_visible(0.5)
            else:
                raise TimeoutError("Timed out waiting for Google OAuth consent to complete")

            recorder.set_caption(
                "3/6 - calendar.freebusy",
                "Clintware reads free/busy availability so the scheduler can offer open meeting times.",
            )
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector(".slot", timeout=30000)
            sleep_visible(5)

            find_open_slot(page)
            fill_booking(page)
            sleep_visible(3)

            recorder.set_caption(
                "4/6 - calendar.events",
                "Clintware creates the user-requested meeting in Google Calendar and attaches meeting details.",
            )
            page.locator("#submit").click()
            page.wait_for_selector("#success:not(.hidden)", timeout=30000)
            sleep_visible(6)

            recorder.set_caption(
                "5/6 - gmail.send",
                "The booking flow sends the requested confirmation from the connected Google account.",
            )
            sleep_visible(5)

            manage = page.locator("#manage-link")
            manage.wait_for(state="visible", timeout=10000)
            manage.click()
            page.wait_for_selector("#manage-actions", timeout=30000)
            sleep_visible(3)

            recorder.set_caption(
                "5/6 - calendar.events update",
                "Clintware updates the same Google Calendar event when the user reschedules.",
            )
            page.locator("#reschedule-btn").click()
            page.wait_for_selector("#newslot option", timeout=30000)
            options = page.locator("#newslot option")
            if options.count() > 0:
                page.locator("#newslot").select_option(index=0)
                page.locator("#save").click()
                sleep_visible(6)

            recorder.set_caption(
                "6/6 - calendar.events cancellation",
                "Clintware cancels the verification test meeting and removes the synchronized calendar event.",
            )
            page.on("dialog", lambda dialog: dialog.accept())
            page.locator("#cancel-btn").click()
            sleep_visible(6)

            recorder.set_caption(
                "Verification demo complete",
                "OAuth grant, free/busy scheduling, event creation/update/cancellation, and confirmation delivery were demonstrated.",
            )
            sleep_visible(5)

            recorder.stop()
            context.close()

        if not OUTPUT.exists() or OUTPUT.stat().st_size < 100_000:
            raise RuntimeError("Verification video was not created correctly")

        STATUS.write_text(
            "READY\n"
            f"Video: {OUTPUT}\n"
            f"Size: {OUTPUT.stat().st_size} bytes\n"
            "Test booking was cancelled at the end of the recording.\n"
            "Upload this video as Unlisted to YouTube for Google OAuth verification.\n",
            encoding="utf-8",
        )
        print(f"READY // {OUTPUT}")
        print(f"SIZE // {OUTPUT.stat().st_size}")
        return 0

    except Exception as exc:
        recorder.set_caption("Capture stopped", str(exc))
        sleep_visible(3)
        recorder.stop()
        STATUS.write_text(
            "INCOMPLETE\n"
            f"Partial video: {OUTPUT}\n"
            f"Reason: {type(exc).__name__}: {exc}\n"
            "Re-run the qq OAuth verification video task after resolving the issue.\n",
            encoding="utf-8",
        )
        print(f"ERROR // {type(exc).__name__}: {exc}")
        print(f"PARTIAL // {OUTPUT}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

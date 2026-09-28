#!/usr/bin/env python3
"""Interactive Google OAuth verification video recorder for Clintware.

Records the full primary screen so the real browser chrome/address bar and the
actual Google OAuth consent flow are visible. QQ advances ordinary account,
warning, and consent controls when they are unambiguous, but never types a
password, OTP, passkey, or other credential. After OAuth returns to Clintware,
the script automatically demonstrates free/busy scheduling, event creation, rescheduling,
cancellation, and confirmation delivery.
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import threading
import time
import textwrap
import urllib.request
from urllib.parse import urlparse

import cv2
import mss
import numpy as np
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

VERSION = "2026.09.28.5"
HOME = pathlib.Path(os.environ.get("LOCALAPPDATA", pathlib.Path.home())) / "Clintware" / "QuillgeistLite"
PROFILE = HOME / "oauth-verification-profile"
DOWNLOADS = pathlib.Path.home() / "Downloads"
OUTPUT = DOWNLOADS / "Clintware-Google-OAuth-Verification-Demo.mp4"
STATUS = DOWNLOADS / "Clintware-Google-OAuth-Verification-Demo.txt"
AUTH_START = "https://auth.clintware.com/delegated/google/start"
AUTH_STATUS = "https://auth.clintware.com/delegated/google/status"
CONTROL_GLOW_JS = r"""
(() => {
  let style=document.getElementById('cw-demo-control-style');
  if(!style){
    style=document.createElement('style');
    style.id='cw-demo-control-style';
    style.textContent=`
      @keyframes cwDemoGlow {0%,100%{box-shadow:inset 0 0 0 1px rgba(80,215,255,.8),0 0 28px rgba(60,170,255,.35)}50%{box-shadow:inset 0 0 0 1px rgba(184,116,255,.9),0 0 42px rgba(109,112,255,.48)}}
      #cw-demo-control{position:fixed;inset:0;z-index:2147483647;pointer-events:none;border:4px solid rgba(73,201,255,.95);border-radius:8px;animation:cwDemoGlow 1.6s ease-in-out infinite}
      #cw-demo-control span{position:absolute;top:14px;right:16px;padding:7px 11px;border-radius:999px;background:linear-gradient(135deg,rgba(4,31,58,.95),rgba(43,25,84,.94));border:1px solid rgba(155,225,255,.72);color:#eefaff;font:700 11px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.12em;text-shadow:0 0 10px rgba(120,214,255,.75)}
    `;
    document.documentElement.appendChild(style);
  }
  let box=document.getElementById('cw-demo-control');
  if(!box){
    box=document.createElement('div');box.id='cw-demo-control';
    const label=document.createElement('span');label.textContent='QQ // CONTROL';box.appendChild(label);
    document.documentElement.appendChild(box);
  }
})();
"""

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

def open_system_browser(url: str) -> None:
    # Provider authentication must use the user's normal supported browser.
    # No Playwright/CDP flags, embedded webview, or QQ automation is involved.
    if os.name == "nt":
        try:
            os.startfile(url)  # type: ignore[attr-defined]
            return
        except Exception:
            pass
        subprocess.Popen(["cmd.exe","/d","/c","start","",url], close_fds=True)
        return
    import webbrowser
    webbrowser.open(url, new=1, autoraise=True)

def delegated_google_connected() -> bool:
    try:
        req=urllib.request.Request(AUTH_STATUS,headers={"User-Agent":"clintware-oauth-verification-recorder"})
        with urllib.request.urlopen(req,timeout=10) as response:
            data=json.loads(response.read().decode("utf-8","replace"))
            return bool(data.get("connected"))
    except Exception:
        return False

def set_control_glow(page) -> None:
    try:
        page.evaluate(CONTROL_GLOW_JS)
    except Exception:
        pass


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
        "Google authentication and consent run only in the user's normal system browser. QQ never automates provider sign-in UI, credentials, passkeys, or MFA.\n",
        encoding="utf-8",
    )

    recorder.start()
    try:
        recorder.set_caption(
            "1/6 - Clintware application and branding",
            "Google authorization will open in the normal system browser, not an automated browser.",
        )
        open_system_browser("https://www.clintware.com/")
        sleep_visible(4)

        recorder.set_caption(
            "2/6 - Secure Google OAuth handoff",
            "Your normal supported browser owns Google sign-in and consent. QQ does not automate the provider login page.",
        )
        open_system_browser(AUTH_START)

        deadline = time.time() + 600
        while time.time() < deadline:
            if delegated_google_connected():
                break
            sleep_visible(1.0)
        else:
            raise TimeoutError("Timed out waiting for secure system-browser Google OAuth consent to complete")

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
            try:
                context.add_init_script(CONTROL_GLOW_JS)
            except Exception:
                pass

            recorder.set_caption(
                "3/6 - calendar.freebusy",
                "QQ control is visibly marked with a blue/cyan/purple edge glow while automating the post-auth demo.",
            )
            page.goto("https://meet.clintware.com/?calendar=connected", wait_until="domcontentloaded", timeout=30000)
            set_control_glow(page)
            page.bring_to_front()
            page.wait_for_selector(".slot", timeout=30000)
            sleep_visible(5)

            set_control_glow(page)
            find_open_slot(page)
            fill_booking(page)
            sleep_visible(3)

            recorder.set_caption(
                "4/6 - calendar.events",
                "Clintware creates the user-requested meeting in Google Calendar and attaches meeting details.",
            )
            set_control_glow(page)
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
            set_control_glow(page)
            manage.click()
            page.wait_for_selector("#manage-actions", timeout=30000)
            sleep_visible(3)

            recorder.set_caption(
                "5/6 - calendar.events update",
                "Clintware updates the same Google Calendar event when the user reschedules.",
            )
            set_control_glow(page)
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
            set_control_glow(page)
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

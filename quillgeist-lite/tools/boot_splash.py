#!/usr/bin/env python3
"""Native-feeling no-focus startup surface for Clintware Quillgeist Lite."""
from __future__ import annotations

import base64
import ctypes
import os
import pathlib
import time

VERSION = "2026.09.25.11"


def _enable_no_activate(root):
    try:
        hwnd = root.winfo_id()
        user32 = ctypes.windll.user32
        GWL_EXSTYLE = -20
        WS_EX_TOOLWINDOW = 0x80
        WS_EX_NOACTIVATE = 0x08000000
        SW_SHOWNOACTIVATE = 4
        style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE)
        user32.ShowWindow(hwnd, SW_SHOWNOACTIVATE)
    except Exception:
        pass


def _load_logo(tk, home: pathlib.Path):
    asset = home / "clintware-terminal-logo.b64"
    if not asset.exists():
        return None
    raw = asset.read_text(encoding="utf-8").strip()
    if not raw.startswith("iVBOR"):
        return None
    return tk.PhotoImage(data=raw)


def main():
    if os.name != "nt":
        return 0

    try:
        import tkinter as tk

        home = pathlib.Path(os.environ.get("LOCALAPPDATA", ".")) / "Clintware" / "QuillgeistLite"
        root = tk.Tk()
        root.withdraw()
        root.configure(bg="#0A0A0A")
        root.overrideredirect(True)

        try:
            root.attributes("-alpha", 0.985)
            root.attributes("-topmost", True)
        except Exception:
            pass

        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        ww = min(620, max(520, int(sw * 0.31)))
        wh = min(390, max(330, int(sh * 0.34)))
        x = max(0, (sw - ww) // 2)
        y = max(0, (sh - wh) // 2)
        root.geometry(f"{ww}x{wh}+{x}+{y}")

        canvas = tk.Canvas(
            root,
            width=ww,
            height=wh,
            bg="#0A0A0A",
            highlightthickness=1,
            highlightbackground="#202020",
            borderwidth=0,
        )
        canvas.pack(fill="both", expand=True)

        logo = _load_logo(tk, home)
        if logo is not None:
            canvas.create_image(ww / 2, 118, image=logo)
            canvas._qq_logo = logo
        else:
            canvas.create_text(
                ww / 2,
                112,
                text="CLINTWARE™",
                fill="#F5F5F5",
                font=("Segoe UI Variable Display", 28, "bold"),
            )
            canvas.create_text(
                ww / 2,
                146,
                text="EST. 2026",
                fill="#8A8A8A",
                font=("Segoe UI Variable Text", 10),
            )

        canvas.create_text(
            ww / 2,
            225,
            text="Quillgeist Lite",
            fill="#F7F7F7",
            font=("Segoe UI Variable Display", 22, "bold"),
        )
        canvas.create_text(
            ww / 2,
            256,
            text="Secure local runtime",
            fill="#A8A8A8",
            font=("Segoe UI Variable Text", 10),
        )

        left = 58
        right = ww - 58
        baseline = wh - 64
        canvas.create_line(left, baseline, right, baseline, fill="#242424", width=2)
        progress = canvas.create_line(left, baseline, left, baseline, fill="#29C7FF", width=2)

        canvas.create_text(
            left,
            wh - 38,
            anchor="w",
            text="STARTING",
            fill="#B6B6B6",
            font=("Segoe UI Variable Text", 9, "bold"),
        )
        canvas.create_text(
            right,
            wh - 38,
            anchor="e",
            text="LOCAL  •  CONTROL PLANE",
            fill="#29C7FF",
            font=("Segoe UI Variable Text", 9),
        )

        start = time.time()
        duration = 1.15

        def tick():
            elapsed = time.time() - start
            p = min(1.0, elapsed / duration)
            canvas.coords(progress, left, baseline, left + (right - left) * p, baseline)
            if p >= 1.0:
                root.after(90, root.destroy)
            else:
                root.after(16, tick)

        root.update_idletasks()
        _enable_no_activate(root)
        root.deiconify()
        _enable_no_activate(root)
        tick()
        root.bind("<Escape>", lambda _e: root.destroy())
        root.bind("<Button-1>", lambda _e: root.destroy())
        root.mainloop()
    except Exception:
        time.sleep(0.05)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
import platform
from pathlib import Path
import sqlite3
import subprocess
import sys
import threading
import webbrowser

from . import __version__
from .cloud import pair as cloud_pair
from .config import Config, home_dir


APP_NAME = "Quillgeist"
CLOUD_URL = "https://quillgeist.clintware.com"


class ActivityLedger:
    def __init__(self) -> None:
        self.path = home_dir() / "activity.sqlite3"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    details TEXT NOT NULL DEFAULT ''
                )
                """
            )

    def _connect(self):
        return sqlite3.connect(self.path, timeout=5)

    def add(self, kind: str, summary: str, details: str = "") -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO activity(ts, kind, summary, details) VALUES (?, ?, ?, ?)",
                (datetime.now(timezone.utc).isoformat(), kind, summary, details[:4000]),
            )

    def recent(self, limit: int = 20) -> list[tuple[str, str, str]]:
        with self._connect() as db:
            rows = db.execute(
                "SELECT ts, kind, summary FROM activity ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return rows


def compile_intent(text: str, cfg: Config) -> dict:
    clean = " ".join(text.split())
    lowered = clean.lower()
    local_only = bool(cfg.data.get("desktop", {}).get("local_only", False))
    privacy = "local-only" if local_only else "local-first"
    action = "general"
    for verb in ("summarize", "rewrite", "compare", "organize", "explain", "extract", "run", "open", "pair"):
        if verb in lowered:
            action = verb
            break
    output = "Return the completed result and concise evidence that the requested outcome was achieved."
    if "json" in lowered:
        output = "Return valid JSON matching the user's requested shape."
    elif "table" in lowered:
        output = "Return a compact table with the requested fields."
    return {
        "product": "Quillgeist",
        "version": __version__,
        "intent": clean,
        "action": action,
        "routing": privacy,
        "constraints": {
            "preserve_user_intent": True,
            "minimize_unnecessary_context": True,
            "local_policy_authoritative": True,
        },
        "definition_of_done": output,
    }


class QuillgeistDesktop:
    def __init__(self, minimized: bool = False, no_tray: bool = False) -> None:
        import tkinter as tk
        from tkinter import messagebox

        self.tk = tk
        self.messagebox = messagebox
        self.cfg = Config.load()
        self.ledger = ActivityLedger()
        self.root = tk.Tk()
        self.root.title(f"{APP_NAME} {__version__}")
        self.root.geometry("1000x760")
        self.root.minsize(800, 620)
        self.root.configure(bg="#05070b")
        self.root.protocol("WM_DELETE_WINDOW", self.hide_window)
        self._daemon_proc: subprocess.Popen | None = None
        self._running = True
        self._tray_icon = None
        self._no_tray = no_tray
        self._build_ui()
        self.refresh()
        if minimized:
            self.root.withdraw()
        self.root.after(500, self._startup_runtime)
        if not no_tray:
            threading.Thread(target=self._run_tray, daemon=True).start()
        if platform.system().lower() == "windows":
            threading.Thread(target=self._hotkey_loop, daemon=True).start()

    def _build_ui(self) -> None:
        tk = self.tk
        bg = "#05070b"
        panel = "#0b111a"
        fg = "#f4f7fb"
        muted = "#8fa1b5"
        accent = "#7dd3fc"
        border = "#1b2a3a"

        top = tk.Frame(self.root, bg=bg, padx=24, pady=16)
        top.pack(fill="x")
        tk.Label(top, text="QUILLGEIST", bg=bg, fg=fg, font=("Consolas", 20, "bold")).pack(side="left")
        self.mode_label = tk.Label(top, text="", bg=bg, fg=accent, font=("Consolas", 10, "bold"))
        self.mode_label.pack(side="right")

        intro = tk.Frame(
            self.root, bg=panel, highlightbackground=border, highlightthickness=1,
            padx=18, pady=13,
        )
        intro.pack(fill="x", padx=24, pady=(0, 10))
        tk.Label(
            intro,
            text="Local-first Windows AI execution layer",
            bg=panel, fg=fg, font=("Segoe UI", 14, "bold"),
        ).pack(anchor="w")
        self.status_label = tk.Label(
            intro, text="", bg=panel, fg=muted, justify="left", font=("Consolas", 9),
        )
        self.status_label.pack(anchor="w", pady=(5, 0))

        self.body = tk.PanedWindow(self.root, orient="horizontal", bg=bg, sashwidth=6, bd=0)
        self.body.pack(fill="both", expand=True, padx=24, pady=(0, 10))

        left = tk.Frame(
            self.body, bg=panel, highlightbackground=border, highlightthickness=1,
            padx=16, pady=14,
        )
        right = tk.Frame(
            self.body, bg=panel, highlightbackground=border, highlightthickness=1,
            padx=14, pady=14,
        )
        self.body.add(left, minsize=500)
        self.body.add(right, minsize=240)

        tk.Label(
            left,
            text="START HERE · ENTER COMMAND",
            bg=panel, fg=accent, font=("Consolas", 10, "bold"),
        ).pack(anchor="w")
        tk.Label(
            left,
            text="Describe what you want Quillgeist to do. Ctrl+Enter prepares the command.",
            bg=panel, fg=muted, font=("Segoe UI", 9),
        ).pack(anchor="w", pady=(3, 8))

        command_shell = tk.Frame(
            left, bg="#070b11", highlightbackground="#28435c", highlightthickness=1,
            padx=1, pady=1,
        )
        command_shell.pack(fill="x")
        self.command_input = tk.Text(
            command_shell,
            height=4,
            bg="#070b11",
            fg=fg,
            insertbackground=fg,
            selectbackground="#172536",
            relief="flat",
            font=("Segoe UI", 12),
            wrap="word",
            padx=10,
            pady=9,
            undo=True,
        )
        self.command_input.pack(fill="x")
        self.command_input.bind("<Control-Return>", self._submit_command_event)

        command_buttons = tk.Frame(left, bg=panel)
        command_buttons.pack(fill="x", pady=(8, 12))
        tk.Button(
            command_buttons,
            text="Prepare command",
            command=self.submit_command,
            bg="#1d4968",
            fg=fg,
            activebackground="#255b80",
            activeforeground=fg,
            relief="flat",
            padx=16,
            pady=8,
            font=("Segoe UI", 10, "bold"),
        ).pack(side="left")
        tk.Button(
            command_buttons,
            text="Clear",
            command=self.clear_command,
            bg="#111a25",
            fg=muted,
            activebackground="#172536",
            activeforeground=fg,
            relief="flat",
            padx=12,
            pady=8,
            font=("Segoe UI", 9),
        ).pack(side="left", padx=(8, 0))

        tk.Label(
            left, text="RESULT / STATUS", bg=panel, fg=muted, font=("Consolas", 9, "bold"),
        ).pack(anchor="w")
        self.output = tk.Text(
            left,
            height=8,
            bg="#070b11",
            fg=fg,
            insertbackground=fg,
            relief="flat",
            font=("Consolas", 10),
            wrap="word",
            padx=12,
            pady=12,
        )
        self.output.pack(fill="both", expand=True, pady=(8, 0))
        self._write_output("Ready. Enter your task above, then click Prepare command or press Ctrl+Enter.")

        tk.Label(
            right, text="RECENT LOCAL ACTIVITY", bg=panel, fg=muted,
            font=("Consolas", 9, "bold"),
        ).pack(anchor="w")
        self.activity = tk.Listbox(
            right,
            bg="#070b11",
            fg=fg,
            selectbackground="#172536",
            relief="flat",
            font=("Consolas", 9),
            activestyle="none",
        )
        self.activity.pack(fill="both", expand=True, pady=(10, 0))

        self.actions_frame = tk.Frame(self.root, bg=bg)
        self.actions_frame.pack(fill="x", padx=24, pady=(0, 10))
        for label, command in [
            ("Pair device", self.pair_device),
            ("Open Cloud", self.open_cloud),
            ("Doctor", self.run_doctor),
            ("Toggle local-only", self.toggle_local_only),
        ]:
            tk.Button(
                self.actions_frame,
                text=label,
                command=command,
                bg="#111a25",
                fg=fg,
                activebackground="#172536",
                activeforeground=fg,
                relief="flat",
                padx=11,
                pady=7,
                font=("Segoe UI", 9, "bold"),
            ).pack(side="left", padx=(0, 8), pady=2)

        self.runtime_button = tk.Button(
            self.actions_frame,
            text="Start runtime",
            command=self.toggle_runtime,
            bg="#172536",
            fg=fg,
            activebackground="#1c3045",
            activeforeground=fg,
            relief="flat",
            padx=11,
            pady=7,
            font=("Segoe UI", 9, "bold"),
        )
        self.runtime_button.pack(side="right", pady=2)

        self.footer_frame = tk.Frame(self.root, bg=bg, padx=24)
        self.footer_frame.pack(fill="x", pady=(0, 14))
        tk.Label(
            self.footer_frame,
            text="Ctrl+Alt+Space opens Quillgeist and focuses the command box. Closing the window keeps it in the tray.",
            bg=bg, fg=muted, font=("Segoe UI", 9),
        ).pack(anchor="w")

    def _cli_command(self, *args: str) -> list[str]:
        if getattr(sys, "frozen", False):
            cli = Path(sys.executable).with_name("Quillgeist-CLI.exe")
            if cli.exists():
                return [str(cli), *args]
        return [sys.executable, "-m", "agentbridge_node", *args]

    def _creationflags(self) -> int:
        return getattr(subprocess, "CREATE_NO_WINDOW", 0) if platform.system().lower() == "windows" else 0

    def _write_output(self, value) -> None:
        if not isinstance(value, str):
            value = json.dumps(value, indent=2, default=str)
        self.output.delete("1.0", "end")
        self.output.insert("1.0", value)

    def _status_text(self) -> str:
        runtime = "RUNNING" if self._daemon_proc and self._daemon_proc.poll() is None else "STOPPED"
        return (
            f"Device: {self.cfg.data.get('device_name')}  ·  ID: {self.cfg.data.get('device_id')}\n"
            f"Runtime: {runtime}  ·  Cloud: {self.cfg.data.get('cloud_url', CLOUD_URL)}"
        )

    def refresh(self) -> None:
        self.cfg = Config.load()
        local_only = bool(self.cfg.data.get("desktop", {}).get("local_only", False))
        running = bool(self._daemon_proc and self._daemon_proc.poll() is None)
        self.mode_label.config(text="LOCAL ONLY" if local_only else "LOCAL FIRST")
        self.status_label.config(text=self._status_text())
        self.runtime_button.config(text="Stop runtime" if running else "Start runtime")
        self.activity.delete(0, "end")
        for ts, kind, summary in self.ledger.recent():
            stamp = ts[11:19] if "T" in ts else ts[:8]
            self.activity.insert("end", f"{stamp}  {kind.upper():10} {summary}")

    def _startup_runtime(self) -> None:
        if not self.cfg.data.get("desktop", {}).get("local_only", False):
            self.start_runtime(silent=True)

    def start_runtime(self, silent: bool = False) -> None:
        if self._daemon_proc and self._daemon_proc.poll() is None:
            if not silent:
                self._write_output("Quillgeist local runtime is already running.")
            self.refresh()
            return
        try:
            self._daemon_proc = subprocess.Popen(
                self._cli_command("daemon"),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=self._creationflags(),
            )
            self.ledger.add("runtime", "started")
            if not silent:
                self._write_output("Quillgeist local runtime started.")
        except Exception as exc:
            self.ledger.add("error", "runtime start failed", str(exc))
            if not silent:
                self._write_output(f"Unable to start runtime: {exc}")
        self.refresh()

    def stop_runtime(self) -> None:
        proc = self._daemon_proc
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=4)
            except subprocess.TimeoutExpired:
                proc.kill()
            self.ledger.add("runtime", "stopped")
        self._daemon_proc = None
        self._write_output("Quillgeist local runtime stopped.")
        self.refresh()

    def toggle_runtime(self) -> None:
        if self._daemon_proc and self._daemon_proc.poll() is None:
            self.stop_runtime()
        else:
            self.start_runtime()

    def run_doctor(self) -> None:
        def worker():
            try:
                result = subprocess.run(
                    self._cli_command("doctor"), text=True, capture_output=True,
                    timeout=30, creationflags=self._creationflags(),
                )
                output = result.stdout or result.stderr
                self.ledger.add("doctor", "completed", output)
            except Exception as exc:
                output = f"Doctor failed: {exc}"
                self.ledger.add("error", "doctor failed", str(exc))
            self.root.after(0, lambda: (self._write_output(output), self.refresh()))
        threading.Thread(target=worker, daemon=True).start()

    def install_associations(self) -> None:
        def worker():
            try:
                result = subprocess.run(
                    self._cli_command("install-associations"), text=True, capture_output=True,
                    timeout=30, creationflags=self._creationflags(),
                )
                output = result.stdout or result.stderr
                self.ledger.add("windows", "file associations installed", output)
            except Exception as exc:
                output = f"Association install failed: {exc}"
                self.ledger.add("error", "associations failed", str(exc))
            self.root.after(0, lambda: (self._write_output(output), self.refresh()))
        threading.Thread(target=worker, daemon=True).start()

    def pair_device(self) -> None:
        self._write_output("Requesting a pairing code…")
        def worker():
            try:
                cfg = Config.load()
                result = cloud_pair(cfg, cfg.data.get("cloud_url") or CLOUD_URL)
                code = result.get("pair_code", "")
                self.ledger.add("pair", "pairing code issued")
                self.root.after(0, lambda: self._pair_ready(code, result))
            except Exception as exc:
                self.ledger.add("error", "pairing failed", str(exc))
                self.root.after(0, lambda: self._write_output(f"Pairing failed: {exc}"))
        threading.Thread(target=worker, daemon=True).start()

    def _pair_ready(self, code: str, result: dict) -> None:
        self._write_output({
            **result,
            "next": f"Enter pairing code {code} in Quillgeist Cloud.",
        })
        self.root.clipboard_clear()
        self.root.clipboard_append(code)
        webbrowser.open(self.cfg.data.get("cloud_url") or CLOUD_URL)
        self.refresh()

    def open_cloud(self) -> None:
        webbrowser.open(self.cfg.data.get("cloud_url") or CLOUD_URL)
        self.ledger.add("cloud", "opened control room")
        self.refresh()

    def toggle_local_only(self) -> None:
        desktop = self.cfg.data.setdefault("desktop", {})
        desktop["local_only"] = not bool(desktop.get("local_only", False))
        self.cfg.save()
        if desktop["local_only"]:
            self.stop_runtime()
            self._write_output("Local-only mode enabled. Cloud runtime is stopped; local tools and data remain available.")
            self.ledger.add("privacy", "local-only enabled")
        else:
            self.ledger.add("privacy", "local-first enabled")
            self.start_runtime(silent=True)
            self._write_output("Local-first mode enabled. Quillgeist may connect to configured Cloud services under local policy.")
        self.refresh()

    def _submit_command_event(self, _event=None):
        self.submit_command()
        return "break"

    def submit_command(self) -> None:
        text = self.command_input.get("1.0", "end").strip()
        if not text:
            self._write_output("Enter a task in the command box first.")
            self.focus_command()
            return
        self.execute_palette(text)

    def clear_command(self) -> None:
        self.command_input.delete("1.0", "end")
        self._write_output("Ready. Enter your next task above.")
        self.focus_command()

    def focus_command(self) -> None:
        self.show_window()
        try:
            self.command_input.focus_force()
            self.command_input.see("1.0")
        except Exception:
            pass

    def show_palette(self) -> None:
        self.focus_command()

    def execute_palette(self, text: str) -> None:
        lowered = text.lower().strip()
        if lowered in {"pair", "pair device", "connect"}:
            self.pair_device()
            return
        if lowered in {"doctor", "diagnose", "status"}:
            self.run_doctor()
            return
        if lowered in {"open cloud", "cloud", "control room"}:
            self.open_cloud()
            return
        if lowered in {"start", "start runtime", "daemon"}:
            self.start_runtime()
            return
        if lowered in {"stop", "stop runtime", "stop daemon"}:
            self.stop_runtime()
            return
        if lowered in {"local only", "offline", "privacy local"}:
            if not self.cfg.data.get("desktop", {}).get("local_only", False):
                self.toggle_local_only()
            return
        if lowered in {"local first", "online"}:
            if self.cfg.data.get("desktop", {}).get("local_only", False):
                self.toggle_local_only()
            return
        compiled = compile_intent(text, self.cfg)
        payload = json.dumps(compiled, indent=2)
        self.root.clipboard_clear()
        self.root.clipboard_append(payload)
        self._write_output(
            "Command prepared.\n\n"
            f"Action: {compiled.get('action', 'general')}\n"
            f"Routing: {compiled.get('routing', 'local-first')}\n\n"
            "The compiled instruction is copied to the clipboard for the connected AI/planner. "
            "Quillgeist will enforce local policy when an execution pack is run."
        )
        self.ledger.add("intent", compiled.get("action", "general"), text)
        self.refresh()

    def show_window(self) -> None:
        self.root.deiconify()
        self.root.lift()
        try:
            self.root.attributes("-topmost", True)
            self.root.after(150, lambda: self.root.attributes("-topmost", False))
        except Exception:
            pass

    def hide_window(self) -> None:
        if self._no_tray:
            self.exit_app()
        else:
            self.root.withdraw()

    def _run_tray(self) -> None:
        try:
            import pystray
            from PIL import Image, ImageDraw

            image = Image.new("RGB", (64, 64), "#05070b")
            draw = ImageDraw.Draw(image)
            draw.rectangle((14, 14, 50, 50), outline="#7dd3fc", width=4)
            draw.line((20, 32, 44, 32), fill="#f4f7fb", width=4)
            draw.line((32, 20, 32, 44), fill="#7dd3fc", width=4)
            menu = pystray.Menu(
                pystray.MenuItem("Open Quillgeist", lambda: self.root.after(0, self.focus_command), default=True),
                pystray.MenuItem("Focus command box", lambda: self.root.after(0, self.focus_command)),
                pystray.MenuItem("Open Cloud", lambda: self.root.after(0, self.open_cloud)),
                pystray.MenuItem("Pair device", lambda: self.root.after(0, self.pair_device)),
                pystray.MenuItem("Toggle local-only", lambda: self.root.after(0, self.toggle_local_only)),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Exit", lambda: self.root.after(0, self.exit_app)),
            )
            self._tray_icon = pystray.Icon("quillgeist", image, "Quillgeist", menu)
            self._tray_icon.run()
        except Exception as exc:
            self.ledger.add("error", "tray unavailable", str(exc))

    def _hotkey_loop(self) -> None:
        try:
            import ctypes
            from ctypes import wintypes

            user32 = ctypes.windll.user32
            MOD_CONTROL = 0x0002
            MOD_ALT = 0x0001
            VK_SPACE = 0x20
            WM_HOTKEY = 0x0312
            hotkey_id = 0x5147
            if not user32.RegisterHotKey(None, hotkey_id, MOD_CONTROL | MOD_ALT, VK_SPACE):
                self.ledger.add("windows", "global hotkey unavailable", "Ctrl+Alt+Space already registered")
                return
            msg = wintypes.MSG()
            while self._running and user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
                if msg.message == WM_HOTKEY and msg.wParam == hotkey_id:
                    self.root.after(0, self.focus_command)
            user32.UnregisterHotKey(None, hotkey_id)
        except Exception as exc:
            self.ledger.add("error", "hotkey unavailable", str(exc))

    def exit_app(self) -> None:
        self._running = False
        if self._tray_icon is not None:
            try:
                self._tray_icon.stop()
            except Exception:
                pass
        self.stop_runtime()
        try:
            self.root.destroy()
        except Exception:
            pass

    def run(self) -> None:
        self.root.mainloop()


def smoke() -> int:
    cfg = Config.load()
    ledger = ActivityLedger()
    compiled = compile_intent("summarize this report as a table", cfg)
    print(json.dumps({
        "product": APP_NAME,
        "version": __version__,
        "platform": platform.platform(),
        "home": str(home_dir()),
        "device_id": cfg.data.get("device_id"),
        "desktop": cfg.data.get("desktop", {}),
        "activity_db": str(ledger.path),
        "intent_smoke": compiled,
    }, indent=2))
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="Quillgeist", description="Quillgeist Windows desktop control surface")
    parser.add_argument("--smoke", action="store_true", help="validate desktop runtime without opening the UI")
    parser.add_argument("--minimized", action="store_true", help="start in the Windows system tray")
    parser.add_argument("--no-tray", action="store_true", help="run without a system tray icon")
    args = parser.parse_args(argv)
    if args.smoke:
        return smoke()
    app = QuillgeistDesktop(minimized=args.minimized, no_tray=args.no_tray)
    app.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

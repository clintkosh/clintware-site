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
import time
import webbrowser

from . import __version__
from .cloud import pair as cloud_pair
from .config import Config, home_dir
from .prompt_planner import plan_prompt
from .scheduler import add_schedule, load_schedules, remove_schedule, set_schedule_enabled, update_schedule
from .runner import execute_pack_path
from .active_jobs import list_active_jobs, request_stop


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
    source = str(text or "").strip()
    normalized = " ".join(source.split())
    lowered = normalized.lower()
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

    plan = plan_prompt(source, cfg.data.get("prompt_planner", {}))
    return {
        "product": "Quillgeist",
        "version": __version__,
        "intent": plan.master_prompt,
        "action": action,
        "routing": privacy,
        "execution_mode": plan.mode,
        "prompt_plan": {
            "step_count": len(plan.steps),
            "triggered_by": plan.triggered_by,
            "complexity_score": plan.complexity_score,
            "raw_chars": plan.raw_chars,
            "planned_chars": len(plan.master_prompt),
            "raw_tokens_est": plan.raw_tokens_est,
            "planned_tokens_est": plan.compacted_tokens_est,
        },
        "constraints": {
            "preserve_user_intent": True,
            "minimize_unnecessary_context": True,
            "local_policy_authoritative": True,
            "auto_continue_non_sensitive_steps": plan.mode == "auto_continue",
            "qa_each_step_before_continuing": plan.mode == "auto_continue",
            "preserve_accepted_work_across_batches": plan.mode == "auto_continue",
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
            ("Task control", self.open_task_manager),
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
        plan = compiled.get("prompt_plan", {})
        plan_note = ""
        if compiled.get("execution_mode") == "auto_continue":
            plan_note = (
                f"\nAuto-compact: ON · {plan.get('step_count', 1)} dependency-aware steps "
                f"· trigger: {', '.join(plan.get('triggered_by') or ['complexity'])}\n"
                "The copied master prompt tells the connected AI to QA each step and continue automatically across ordinary batch/tool limits.\n"
            )
        self._write_output(
            "Command prepared.\n\n"
            f"Action: {compiled.get('action', 'general')}\n"
            f"Routing: {compiled.get('routing', 'local-first')}\n"
            f"Execution: {compiled.get('execution_mode', 'single')}\n"
            f"{plan_note}\n"
            "The compiled instruction is copied to the clipboard for the connected AI/planner. "
            "Quillgeist will enforce local policy when an execution pack is run."
        )
        self.ledger.add("intent", compiled.get("action", "general"), text)
        self.refresh()

    def _format_epoch(self, value) -> str:
        try:
            return datetime.fromtimestamp(float(value)).astimezone().strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            return "—"

    def open_task_manager(self) -> None:
        tk = self.tk
        from tkinter import ttk, filedialog, simpledialog

        if getattr(self, "_task_window", None) is not None:
            try:
                if self._task_window.winfo_exists():
                    self._task_window.deiconify()
                    self._task_window.lift()
                    self._refresh_task_manager()
                    return
            except Exception:
                pass

        win = tk.Toplevel(self.root)
        self._task_window = win
        win.title("Quillgeist · Task Control")
        win.geometry("1120x720")
        win.minsize(900, 580)
        win.configure(bg="#05070b")

        style = ttk.Style(win)
        try:
            style.theme_use("clam")
        except Exception:
            pass
        style.configure("QG.Treeview", background="#070b11", fieldbackground="#070b11", foreground="#f4f7fb", rowheight=28, borderwidth=0)
        style.configure("QG.Treeview.Heading", background="#111a25", foreground="#8fa1b5", relief="flat", font=("Segoe UI", 9, "bold"))
        style.map("QG.Treeview", background=[("selected", "#1d4968")], foreground=[("selected", "#ffffff")])

        header = tk.Frame(win, bg="#05070b", padx=22, pady=16)
        header.pack(fill="x")
        tk.Label(header, text="TASK CONTROL", bg="#05070b", fg="#f4f7fb", font=("Consolas", 18, "bold")).pack(side="left")
        self.task_summary_label = tk.Label(header, text="", bg="#05070b", fg="#7dd3fc", font=("Consolas", 10, "bold"))
        self.task_summary_label.pack(side="right")

        scheduled_panel = tk.Frame(win, bg="#0b111a", highlightbackground="#1b2a3a", highlightthickness=1, padx=14, pady=12)
        scheduled_panel.pack(fill="both", expand=True, padx=22, pady=(0, 10))
        tk.Label(scheduled_panel, text="SCHEDULED TASKS", bg="#0b111a", fg="#7dd3fc", font=("Consolas", 10, "bold")).pack(anchor="w")
        tk.Label(scheduled_panel, text="Device-owned tasks can be edited live. Cloud-owned tasks remain visible and sync-authoritative.", bg="#0b111a", fg="#8fa1b5", font=("Segoe UI", 9)).pack(anchor="w", pady=(2, 8))

        cols = ("state", "next", "repeat", "owner", "last", "pack")
        self.schedule_tree = ttk.Treeview(scheduled_panel, columns=cols, show="headings", style="QG.Treeview", height=9)
        headings = {"state":"State","next":"Next run","repeat":"Repeat","owner":"Owner","last":"Last status","pack":"Pack"}
        widths = {"state":80,"next":160,"repeat":110,"owner":90,"last":110,"pack":430}
        for col in cols:
            self.schedule_tree.heading(col, text=headings[col])
            self.schedule_tree.column(col, width=widths[col], anchor="w", stretch=(col=="pack"))
        self.schedule_tree.pack(fill="both", expand=True)

        sched_buttons = tk.Frame(scheduled_panel, bg="#0b111a")
        sched_buttons.pack(fill="x", pady=(10, 0))
        for label, command, strong in [
            ("Add", self._task_add_schedule, True),
            ("Edit", self._task_edit_schedule, False),
            ("Pause / Resume", self._task_toggle_schedule, False),
            ("Run now", self._task_run_now, True),
            ("Remove", self._task_remove_schedule, False),
        ]:
            tk.Button(sched_buttons, text=label, command=command,
                      bg="#1d4968" if strong else "#111a25", fg="#f4f7fb",
                      activebackground="#255b80" if strong else "#172536", activeforeground="#ffffff",
                      relief="flat", padx=12, pady=7, font=("Segoe UI", 9, "bold")).pack(side="left", padx=(0,8))

        running_panel = tk.Frame(win, bg="#0b111a", highlightbackground="#1b2a3a", highlightthickness=1, padx=14, pady=12)
        running_panel.pack(fill="both", expand=True, padx=22, pady=(0, 12))
        tk.Label(running_panel, text="RUNNING NOW", bg="#0b111a", fg="#7dd3fc", font=("Consolas", 10, "bold")).pack(anchor="w")
        tk.Label(running_panel, text="Live execution registry. Stop requests terminate the active child process and prevent the next step from starting.", bg="#0b111a", fg="#8fa1b5", font=("Segoe UI", 9)).pack(anchor="w", pady=(2, 8))

        rcols = ("state","started","step","source","title")
        self.running_tree = ttk.Treeview(running_panel, columns=rcols, show="headings", style="QG.Treeview", height=6)
        rh = {"state":"State","started":"Started","step":"Step","source":"Source","title":"Task"}
        rw = {"state":110,"started":160,"step":80,"source":100,"title":520}
        for col in rcols:
            self.running_tree.heading(col, text=rh[col])
            self.running_tree.column(col, width=rw[col], anchor="w", stretch=(col=="title"))
        self.running_tree.pack(fill="both", expand=True)

        run_buttons = tk.Frame(running_panel, bg="#0b111a")
        run_buttons.pack(fill="x", pady=(10,0))
        tk.Button(run_buttons, text="Stop selected", command=self._task_stop_job,
                  bg="#4a1f28", fg="#ffffff", activebackground="#6a2936", activeforeground="#ffffff",
                  relief="flat", padx=12, pady=7, font=("Segoe UI", 9, "bold")).pack(side="left")
        tk.Button(run_buttons, text="Refresh", command=self._refresh_task_manager,
                  bg="#111a25", fg="#f4f7fb", activebackground="#172536", activeforeground="#ffffff",
                  relief="flat", padx=12, pady=7, font=("Segoe UI", 9, "bold")).pack(side="left", padx=(8,0))

        self._refresh_task_manager()
        self._schedule_task_refresh()

    def _schedule_task_refresh(self) -> None:
        win = getattr(self, "_task_window", None)
        if win is None:
            return
        try:
            if win.winfo_exists():
                self._refresh_task_manager()
                win.after(1000, self._schedule_task_refresh)
        except Exception:
            pass

    def _refresh_task_manager(self) -> None:
        if not hasattr(self, "schedule_tree") or not hasattr(self, "running_tree"):
            return
        schedules = load_schedules()
        jobs = list_active_jobs()
        self.schedule_tree.delete(*self.schedule_tree.get_children())
        for row in schedules:
            every = row.get("every_seconds")
            repeat = f"{every}s" if every else "one-time"
            state = "ON" if row.get("enabled") else "PAUSED"
            iid = str(row.get("id"))
            self.schedule_tree.insert("", "end", iid=iid, values=(
                state,
                self._format_epoch(row.get("next_run_at")),
                repeat,
                row.get("owner") or "device",
                row.get("last_status") or "—",
                row.get("pack_path") or row.get("pack_name") or "—",
            ))
        self.running_tree.delete(*self.running_tree.get_children())
        for row in jobs:
            run_id = str(row.get("run_id"))
            started = str(row.get("started_at") or "")
            if "T" in started:
                started = started.replace("T"," ")[:19]
            self.running_tree.insert("", "end", iid=run_id, values=(
                str(row.get("state") or "running").upper(),
                started or "—",
                row.get("current_step", "—"),
                row.get("source") or "local",
                row.get("title") or row.get("job_id") or run_id,
            ))
        if hasattr(self, "task_summary_label"):
            self.task_summary_label.config(text=f"{len(schedules)} scheduled  ·  {len(jobs)} running")

    def _selected_schedule(self) -> dict | None:
        selected = self.schedule_tree.selection() if hasattr(self, "schedule_tree") else ()
        if not selected:
            self.messagebox.showinfo("Task Control", "Select a scheduled task first.")
            return None
        sid = selected[0]
        return next((x for x in load_schedules() if str(x.get("id")) == sid), None)

    def _task_add_schedule(self) -> None:
        from tkinter import filedialog, simpledialog
        path = filedialog.askopenfilename(title="Choose Quillgeist execution pack", filetypes=[("Quillgeist pack","*.abpack"),("All files","*.*")])
        if not path:
            return
        every = simpledialog.askstring("Repeat", "Repeat every N seconds. Leave blank for a one-time run.", parent=self._task_window)
        at_text = simpledialog.askstring("Next run", "Next run as local ISO date/time (YYYY-MM-DDTHH:MM:SS). Leave blank for about one minute from now.", parent=self._task_window)
        try:
            every_seconds = int(every) if every and every.strip() else None
            at_epoch = None
            if at_text and at_text.strip():
                dt = datetime.fromisoformat(at_text.strip())
                if dt.tzinfo is None:
                    dt = dt.astimezone()
                at_epoch = dt.timestamp()
            add_schedule(path, at_epoch=at_epoch, every_seconds=every_seconds, owner="device", device_id=self.cfg.data.get("device_id"))
            self.ledger.add("schedule", "added", path)
            self._refresh_task_manager()
        except Exception as exc:
            self.messagebox.showerror("Unable to add schedule", str(exc))

    def _task_edit_schedule(self) -> None:
        from tkinter import simpledialog
        row = self._selected_schedule()
        if not row:
            return
        if row.get("owner") == "cloud":
            self.messagebox.showinfo("Cloud-owned schedule", "This schedule is controlled by Quillgeist Cloud. Open Cloud to change its authoritative schedule.")
            return
        current_next = self._format_epoch(row.get("next_run_at")).replace(" ","T")
        next_text = simpledialog.askstring("Next run", "Next run (local ISO date/time):", initialvalue=current_next, parent=self._task_window)
        if next_text is None:
            return
        repeat_text = simpledialog.askstring("Repeat", "Repeat every N seconds. Leave blank for one-time.", initialvalue=str(row.get("every_seconds") or ""), parent=self._task_window)
        if repeat_text is None:
            return
        try:
            dt = datetime.fromisoformat(next_text.strip())
            if dt.tzinfo is None:
                dt = dt.astimezone()
            update_schedule(row["id"], next_run_at=dt.timestamp(), every_seconds=int(repeat_text) if repeat_text.strip() else None)
            self.ledger.add("schedule", "edited", row["id"])
            self._refresh_task_manager()
        except Exception as exc:
            self.messagebox.showerror("Unable to edit schedule", str(exc))

    def _task_toggle_schedule(self) -> None:
        row = self._selected_schedule()
        if not row:
            return
        if row.get("owner") == "cloud":
            self.messagebox.showinfo("Cloud-owned schedule", "This schedule is controlled by Quillgeist Cloud. Open Cloud to pause or resume it.")
            return
        set_schedule_enabled(row["id"], not bool(row.get("enabled")))
        self.ledger.add("schedule", "resumed" if not row.get("enabled") else "paused", row["id"])
        self._refresh_task_manager()

    def _task_run_now(self) -> None:
        row = self._selected_schedule()
        if not row:
            return
        path = row.get("pack_path")
        if not path:
            self.messagebox.showerror("Run now", "This schedule has no local execution pack.")
            return
        def worker():
            try:
                result = execute_pack_path(path, Config.load(), approved=bool(row.get("approved_local")))
                self.ledger.add("manual run", result.get("status","completed"), path)
            except Exception as exc:
                self.ledger.add("error", "manual run failed", str(exc))
            self.root.after(0, self._refresh_task_manager)
        threading.Thread(target=worker, daemon=True).start()
        self.root.after(150, self._refresh_task_manager)

    def _task_remove_schedule(self) -> None:
        row = self._selected_schedule()
        if not row:
            return
        if row.get("owner") == "cloud":
            self.messagebox.showinfo("Cloud-owned schedule", "This schedule is controlled by Quillgeist Cloud. Open Cloud to remove it.")
            return
        if self.messagebox.askyesno("Remove schedule", "Remove this scheduled task? The execution pack will not be deleted."):
            remove_schedule(row["id"])
            self.ledger.add("schedule", "removed", row["id"])
            self._refresh_task_manager()

    def _task_stop_job(self) -> None:
        selected = self.running_tree.selection() if hasattr(self, "running_tree") else ()
        if not selected:
            self.messagebox.showinfo("Task Control", "Select a running task first.")
            return
        row = request_stop(selected[0])
        if row:
            self.ledger.add("run", "stop requested", selected[0])
            self._refresh_task_manager()

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
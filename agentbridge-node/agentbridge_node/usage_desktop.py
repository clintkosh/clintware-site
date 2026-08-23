from __future__ import annotations

import threading
import time
import uuid
import webbrowser

from .config import Config
from .desktop import ActivityLedger, QuillgeistDesktop
from .telemetry import emit_event
from .usage import delete_plan, emit_plan_snapshot, save_plan, snapshot

_CONTROL_COMMANDS = {
    "pair", "pair device", "connect", "doctor", "diagnose", "status",
    "open cloud", "cloud", "control room", "start", "start runtime", "daemon",
    "stop", "stop runtime", "stop daemon", "local only", "offline", "privacy local",
    "local first", "online",
}


class QuillgeistDesktopWithUsage(QuillgeistDesktop):
    def execute_palette(self, text: str) -> None:
        lowered = text.lower().strip()
        is_prompt = lowered not in _CONTROL_COMMANDS
        super().execute_palette(text)
        if is_prompt:
            cfg = Config.load()
            event = {
                "event_id": f"prompt:{uuid.uuid4()}",
                "type": "prompt_compiled",
                "ts": int(time.time() * 1000),
                "device_id": cfg.data.get("device_id"),
                "status": "compiled",
                "raw_tokens_est": max(1, (len(text) + 3) // 4),
                "node_version": self.root.title().split()[-1] if self.root.title() else "",
                "metadata": {"source": "windows_command_palette", "content_collected": False},
            }
            threading.Thread(target=lambda: emit_event(cfg, event), daemon=True).start()

    def _build_ui(self) -> None:
        super()._build_ui()
        tk = self.tk
        panel = "#0b111a"; fg = "#f4f7fb"; muted = "#8fa1b5"; accent = "#7dd3fc"; border = "#1b2a3a"
        actions = next((w for w in self.root.winfo_children() if isinstance(w, tk.Frame) and any(isinstance(c, tk.Button) for c in w.winfo_children())), None)
        self.usage_panel = tk.Frame(self.root, bg=panel, highlightbackground=border, highlightthickness=1, padx=18, pady=14)
        if actions is not None:self.usage_panel.pack(fill="x", padx=24, pady=(0, 14), before=actions)
        else:self.usage_panel.pack(fill="x", padx=24, pady=(0, 14))
        head = tk.Frame(self.usage_panel, bg=panel); head.pack(fill="x")
        tk.Label(head, text="USAGE & SAVINGS", bg=panel, fg=muted, font=("Consolas", 9, "bold")).pack(side="left")
        self.usage_sync = tk.Label(head, text="LOCAL", bg=panel, fg=accent, font=("Consolas", 9, "bold")); self.usage_sync.pack(side="right")
        self.usage_pressure = tk.Label(self.usage_panel, text="External pressure 0%", bg=panel, fg=fg, font=("Segoe UI", 12, "bold")); self.usage_pressure.pack(anchor="w", pady=(8, 4))
        self.usage_bar = tk.Canvas(self.usage_panel, height=12, bg="#070b11", highlightthickness=0); self.usage_bar.pack(fill="x")
        stats = tk.Frame(self.usage_panel, bg=panel); stats.pack(fill="x", pady=(10, 0)); self.usage_values = {}
        for label in ["Saved", "Local", "External", "Delta", "Plans", "Headroom"]:
            box = tk.Frame(stats, bg=panel); box.pack(side="left", expand=True, fill="x")
            tk.Label(box, text=label.upper(), bg=panel, fg=muted, font=("Consolas", 8, "bold")).pack(anchor="w")
            value = tk.Label(box, text="—", bg=panel, fg=fg, font=("Consolas", 12, "bold")); value.pack(anchor="w"); self.usage_values[label] = value
        buttons = tk.Frame(self.usage_panel, bg=panel); buttons.pack(fill="x", pady=(10, 0))
        tk.Button(buttons, text="Manage plans", command=self.manage_plans, bg="#111a25", fg=fg, relief="flat", padx=10, pady=6).pack(side="left")
        tk.Button(buttons, text="Open overall portal", command=lambda: webbrowser.open((self.cfg.data.get("cloud_url") or "https://quillgeist.clintware.com") + "/#usage"), bg="#111a25", fg=fg, relief="flat", padx=10, pady=6).pack(side="left", padx=(8, 0))
        self.root.after(750, self._refresh_usage_async)

    def _refresh_usage_async(self) -> None:
        if not getattr(self, "_running", True):return
        def work():
            cfg = Config.load(); data = snapshot(cfg)
            try:sync = "SYNCED" if emit_plan_snapshot(cfg) else "LOCAL"
            except Exception:sync = "LOCAL"
            self.root.after(0, lambda: self._render_usage(data, sync))
        threading.Thread(target=work, daemon=True).start(); self.root.after(20000, self._refresh_usage_async)

    def _render_usage(self, data: dict, sync: str) -> None:
        c = data.get("consumption", {}); p = data.get("plans_summary", {}); pressure = max(0.0, min(100.0, float(c.get("external_consumption_pressure_pct") or 0)))
        self.usage_sync.config(text=sync); self.usage_pressure.config(text=f"External pressure {pressure:.0f}%  ·  {float(c.get('avoided_external_pct') or 0):.0f}% avoided")
        self.usage_bar.delete("all"); width = max(1, self.usage_bar.winfo_width()); self.usage_bar.create_rectangle(0, 0, width, 12, fill="#070b11", outline=""); self.usage_bar.create_rectangle(0, 0, width * pressure / 100, 12, fill="#7dd3fc", outline="")
        def compact(v):
            v=float(v or 0)
            for s,d in (("B",1e9),("M",1e6),("K",1e3)):
                if abs(v)>=d:return f"{v/d:.1f}{s}".replace(".0","")
            return f"{v:.0f}"
        self.usage_values["Saved"].config(text=compact(c.get("net_tokens_saved_est"))); self.usage_values["Local"].config(text=compact(c.get("local_tokens_used_est"))); self.usage_values["External"].config(text=compact(c.get("external_tokens_used_est"))); self.usage_values["Delta"].config(text=compact(c.get("local_vs_external_delta_est"))); self.usage_values["Plans"].config(text=str(p.get("connected", 0))); headroom = p.get("normalized_remaining_pct"); self.usage_values["Headroom"].config(text="—" if headroom is None else f"{float(headroom):.0f}%")

    def manage_plans(self) -> None:
        tk = self.tk; win = tk.Toplevel(self.root); win.title("Quillgeist plans"); win.geometry("720x520"); win.configure(bg="#070b11"); win.transient(self.root)
        form = tk.Frame(win, bg="#070b11", padx=16, pady=14); form.pack(fill="x"); fields = {}; specs = [("provider","Provider"),("plan_name","Plan / account"),("unit","Unit"),("allowance","Allowance"),("used","Used"),("reset_at","Reset date")]
        for i,(key,label) in enumerate(specs):
            cell=tk.Frame(form,bg="#070b11"); cell.grid(row=i//3,column=i%3,sticky="ew",padx=5,pady=5); form.grid_columnconfigure(i%3,weight=1); tk.Label(cell,text=label.upper(),bg="#070b11",fg="#8fa1b5",font=("Consolas",8,"bold")).pack(anchor="w"); e=tk.Entry(cell,bg="#0d1520",fg="#f4f7fb",insertbackground="#f4f7fb",relief="flat"); e.pack(fill="x",ipady=7); fields[key]=e
        fields["unit"].insert(0,"tokens"); listing=tk.Listbox(win,bg="#0d1520",fg="#f4f7fb",selectbackground="#172536",relief="flat",font=("Consolas",10)); listing.pack(fill="both",expand=True,padx=16,pady=10); rows=[]
        def reload():
            nonlocal rows; rows=snapshot(Config.load()).get("plans",[]); listing.delete(0,"end")
            for p in rows:
                rem="unknown" if p.get("remaining") is None else f"{p['remaining']:.0f} {p['unit']} left"; listing.insert("end",f"{p['provider']} · {p['plan_name']} · {p['used']:.0f}/{p['allowance']:.0f} {p['unit']} · {rem} · {p['source']}")
        def add():
            try:
                save_plan(Config.load(), {k:e.get().strip() for k,e in fields.items()})
                for e in fields.values():e.delete(0,"end")
                fields["unit"].insert(0,"tokens"); reload(); self._refresh_usage_async()
            except Exception as exc:self.messagebox.showerror("Quillgeist", str(exc), parent=win)
        def remove():
            sel=listing.curselection()
            if sel:delete_plan(Config.load(), rows[sel[0]]["plan_id"]); reload(); self._refresh_usage_async()
        bar=tk.Frame(win,bg="#070b11",padx=16,pady=10); bar.pack(fill="x"); tk.Button(bar,text="Add manual plan",command=add,bg="#172536",fg="#f4f7fb",relief="flat",padx=12,pady=7).pack(side="left"); tk.Button(bar,text="Remove selected",command=remove,bg="#24161b",fg="#ff9eaa",relief="flat",padx=12,pady=7).pack(side="left",padx=(8,0)); tk.Label(bar,text="Provider API sync appears only when a provider exposes a supported authenticated usage source.",bg="#070b11",fg="#8fa1b5",font=("Segoe UI",8)).pack(side="right"); reload()


def main(argv=None) -> int:
    import argparse
    parser=argparse.ArgumentParser(prog="Quillgeist",description="Quillgeist Windows desktop control surface"); parser.add_argument("--smoke",action="store_true"); parser.add_argument("--minimized",action="store_true"); parser.add_argument("--no-tray",action="store_true"); args=parser.parse_args(argv)
    if args.smoke:
        ActivityLedger(); print(snapshot(Config.load())); return 0
    app=QuillgeistDesktopWithUsage(minimized=args.minimized,no_tray=args.no_tray); app.run(); return 0

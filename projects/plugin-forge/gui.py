#!/usr/bin/env python3
"""Tkinter desktop shell for Clintware Plugin Forge MVP."""
from __future__ import annotations

import json
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from plugin_forge import default_plugin_roots, migrate_legacy_source, write_plugin


class PluginForgeApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Clintware Plugin Forge")
        self.geometry("900x650")
        self.minsize(760, 560)
        self.configure(bg="#080a0e")
        self.output_root = Path.cwd() / "forge-output"
        self._build()

    def _build(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TFrame", background="#080a0e")
        style.configure("TLabel", background="#080a0e", foreground="#e9f7ff")
        style.configure("TButton", padding=8)
        style.configure("TEntry", fieldbackground="#151a22", foreground="#e9f7ff")

        outer = ttk.Frame(self, padding=24)
        outer.pack(fill="both", expand=True)
        ttk.Label(outer, text="CLINTWARE  /  PLUGIN FORGE", font=("Segoe UI", 16, "bold")).pack(anchor="w")
        ttk.Label(outer, text="GIMP 3 plug-in scaffold + GIMP 2 migration MVP").pack(anchor="w", pady=(2, 18))

        ttk.Label(outer, text="Plugin name").pack(anchor="w")
        self.name = ttk.Entry(outer)
        self.name.insert(0, "Clear Selection Tool")
        self.name.pack(fill="x", pady=(4, 12))

        ttk.Label(outer, text="Describe what the plug-in should do").pack(anchor="w")
        self.prompt = tk.Text(outer, height=8, bg="#151a22", fg="#e9f7ff", insertbackground="#e9f7ff", relief="flat", padx=12, pady=12)
        self.prompt.insert("1.0", "Clear the current selection")
        self.prompt.pack(fill="both", expand=True, pady=(4, 12))

        row = ttk.Frame(outer)
        row.pack(fill="x")
        ttk.Button(row, text="Generate GIMP 3 Plugin", command=self.generate).pack(side="left")
        ttk.Button(row, text="Upgrade Legacy .py", command=self.migrate).pack(side="left", padx=8)
        ttk.Button(row, text="Choose Output Folder", command=self.choose_output).pack(side="left")

        roots = default_plugin_roots()
        root_hint = str(roots[0]) if roots else "Set GIMP plug-ins directory manually"
        self.status = ttk.Label(outer, text=f"Default GIMP 3 plug-ins path: {root_hint}")
        self.status.pack(anchor="w", pady=(18, 0))

    def choose_output(self):
        chosen = filedialog.askdirectory(initialdir=str(self.output_root))
        if chosen:
            self.output_root = Path(chosen)
            self.status.config(text=f"Output: {self.output_root}")

    def generate(self):
        try:
            path = write_plugin(self.output_root, prompt=self.prompt.get("1.0", "end").strip(), name=self.name.get())
            self.status.config(text=f"Generated + validated: {path}")
            messagebox.showinfo("Plugin Forge", f"Generated and validated:\n{path}")
        except Exception as exc:
            messagebox.showerror("Plugin Forge", str(exc))

    def migrate(self):
        filename = filedialog.askopenfilename(filetypes=[("Python plug-in", "*.py"), ("All files", "*.*")])
        if not filename:
            return
        try:
            src = Path(filename)
            report, generated = migrate_legacy_source(src.read_text(encoding="utf-8", errors="replace"), src.name)
            folder = self.output_root / report.generated_slug
            folder.mkdir(parents=True, exist_ok=True)
            target = folder / f"{report.generated_slug}.py"
            target.write_text(generated, encoding="utf-8")
            (folder / "migration-report.json").write_text(json.dumps(report, default=lambda o: o.__dict__, indent=2), encoding="utf-8")
            self.status.config(text=f"Migrated scaffold: {target}")
            messagebox.showinfo("Plugin Forge", f"Migration scaffold generated:\n{target}\n\nReview TODO items before installing.")
        except Exception as exc:
            messagebox.showerror("Plugin Forge", str(exc))


if __name__ == "__main__":
    PluginForgeApp().mainloop()

from __future__ import annotations
from datetime import datetime
import os
import shutil
import subprocess
import sys
import time
from .config import home_dir
from .pack import load_bytes, PackError

def read_clipboard() -> str:
    if os.name == "nt":
        exe = shutil.which("powershell") or shutil.which("pwsh")
        if not exe: return ""
        p = subprocess.run([exe, "-NoProfile", "-Command", "Get-Clipboard -Raw"], text=True, capture_output=True)
        return p.stdout if p.returncode == 0 else ""
    if sys.platform == "darwin":
        p = subprocess.run(["pbpaste"], text=True, capture_output=True)
        return p.stdout if p.returncode == 0 else ""
    for cmd in (["wl-paste", "-n"], ["xclip", "-selection", "clipboard", "-o"], ["xsel", "--clipboard", "--output"]):
        if shutil.which(cmd[0]):
            p = subprocess.run(cmd, text=True, capture_output=True)
            return p.stdout if p.returncode == 0 else ""
    return ""

def looks_like_agentbridge(text: str) -> bool:
    s = text.strip()
    return "```agentbridge" in s.lower() or "---agentbridge---" in s.lower() or ('"agentbridge"' in s and s.startswith("{"))

def watch(mode: str, on_trusted=None, poll: float = 1.0):
    if mode == "off":
        print("AgentBridge clipboard watch is off.")
        return
    last = None; inbox = home_dir() / "inbox"; inbox.mkdir(parents=True, exist_ok=True)
    while True:
        text = read_clipboard()
        if text and text != last and looks_like_agentbridge(text):
            last = text
            try: load_bytes(text.encode("utf-8"), ".md")
            except PackError:
                time.sleep(poll); continue
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            path = inbox / f"clipboard-{stamp}.md"
            if mode in {"import","trusted"}: path.write_text(text, encoding="utf-8")
            print(f"AgentBridge content detected: {path if path.exists() else 'clipboard'}")
            if mode == "trusted" and on_trusted: on_trusted(path)
        time.sleep(poll)

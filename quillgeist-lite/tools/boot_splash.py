#!/usr/bin/env python3
"""No-focus acrylic HUD splash for Clintware Quillgeist Lite."""
from __future__ import annotations
import base64
import ctypes
import os
from pathlib import Path
import time

VERSION = "2026.09.26.2"

def enable_glass(root):
    try:
        hwnd=root.winfo_id(); user32=ctypes.windll.user32
        GWL_EXSTYLE=-20; WS_EX_TOOLWINDOW=0x80; WS_EX_NOACTIVATE=0x08000000; SW_SHOWNOACTIVATE=4
        style=user32.GetWindowLongW(hwnd,GWL_EXSTYLE)
        user32.SetWindowLongW(hwnd,GWL_EXSTYLE,style|WS_EX_TOOLWINDOW|WS_EX_NOACTIVATE)
        class Accent(ctypes.Structure):
            _fields_=[("AccentState",ctypes.c_int),("AccentFlags",ctypes.c_int),("GradientColor",ctypes.c_uint),("AnimationId",ctypes.c_int)]
        class Data(ctypes.Structure):
            _fields_=[("Attribute",ctypes.c_int),("Data",ctypes.c_void_p),("SizeOfData",ctypes.c_size_t)]
        accent=Accent(4,2,0xD1080502,0)
        data=Data(19,ctypes.cast(ctypes.pointer(accent),ctypes.c_void_p),ctypes.sizeof(accent))
        try: user32.SetWindowCompositionAttribute(hwnd,ctypes.byref(data))
        except Exception: pass
        user32.ShowWindow(hwnd,SW_SHOWNOACTIVATE)
    except Exception: pass

def main():
    if os.name!="nt": return 0
    try:
        import tkinter as tk
        home=Path(os.environ.get("LOCALAPPDATA",str(Path.home()))) / "Clintware" / "QuillgeistLite"
        logo_path=home / "clintware-terminal-logo.b64"
        raw=logo_path.read_text(encoding="utf-8").strip()
        if not raw.startswith("iVBOR"): raise RuntimeError("Clintware logo asset is invalid")

        root=tk.Tk(); root.withdraw(); root.configure(bg="#02060A"); root.overrideredirect(True)
        try: root.attributes("-alpha",0.97); root.attributes("-topmost",True)
        except Exception: pass

        sw,sh=root.winfo_screenwidth(),root.winfo_screenheight()
        ww,wh=340,218
        root.geometry(f"{ww}x{wh}+{max(0,(sw-ww)//2)}+{max(0,(sh-wh)//2)}")
        c=tk.Canvas(root,width=ww,height=wh,bg="#02060A",highlightthickness=0,borderwidth=0); c.pack(fill="both",expand=True)

        deep="#075A8A"; cyan="#27C8FF"; dim="#557184"
        m,seg=13,27
        for sx in (m,ww-m):
            sign=1 if sx==m else -1
            c.create_line(sx,m,sx+sign*seg,m,fill=deep,width=1)
            c.create_line(sx,m,sx,m+seg,fill=deep,width=1)
            c.create_line(sx,wh-m,sx+sign*seg,wh-m,fill=deep,width=1)
            c.create_line(sx,wh-m,sx,wh-m-seg,fill=deep,width=1)

        # This is the supplied Clintware eclipse image, pre-downsampled with
        # Lanczos and rendered 1:1. Do not enlarge it in Tk; small is deliberate.
        logo=tk.PhotoImage(data=raw)
        root._qq_logo=logo
        c.create_image(ww//2,82,image=logo)

        c.create_text(ww//2,157,text="Q U I L L G E I S T   L I T E",fill="#F7FBFF",font=("Cascadia Mono",10,"bold"))
        c.create_text(ww//2,176,text="Go Furthest.™",fill=cyan,font=("Cascadia Mono",8))
        c.create_line(35,190,ww-35,190,fill="#113447",width=1)
        c.create_text(ww//2,203,text="LOCAL FIRST  •  CONTROL PLANE READY",fill=dim,font=("Cascadia Mono",7,"bold"))

        root.update_idletasks(); enable_glass(root); root.deiconify(); enable_glass(root)
        root.after(900,root.destroy)
        root.bind("<Escape>",lambda _e:root.destroy()); root.bind("<Button-1>",lambda _e:root.destroy())
        root.mainloop()
    except Exception:
        time.sleep(.05)
    return 0

if __name__=="__main__": raise SystemExit(main())

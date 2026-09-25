#!/usr/bin/env python3
"""No-focus acrylic HUD splash for Clintware Quillgeist Lite."""
from __future__ import annotations
import ctypes, math, os, random, time
VERSION = "2026.09.24.10"

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
        root=tk.Tk(); root.withdraw(); root.configure(bg="#02060A"); root.overrideredirect(True)
        try: root.attributes("-alpha",0.96); root.attributes("-topmost",True)
        except Exception: pass
        sw,sh=root.winfo_screenwidth(),root.winfo_screenheight()
        ww=min(760,max(620,int(sw*0.38))); wh=min(560,max(430,int(sh*0.48)))
        root.geometry(f"{ww}x{wh}+{max(0,(sw-ww)//2)}+{max(0,(sh-wh)//2)}")
        c=tk.Canvas(root,width=ww,height=wh,bg="#02060A",highlightthickness=0,borderwidth=0); c.pack(fill="both",expand=True)
        cyan="#27C8FF"; deep="#075A8A"; dim="#113447"; m=18; seg=54
        for sx in (m,ww-m):
            sign=1 if sx==m else -1
            c.create_line(sx,m,sx+sign*seg,m,fill=deep,width=2); c.create_line(sx,m,sx,m+seg,fill=deep,width=2)
            c.create_line(sx,wh-m,sx+sign*seg,wh-m,fill=deep,width=2); c.create_line(sx,wh-m,sx,wh-m-seg,fill=deep,width=2)
        cx,cy=ww/2,wh*0.45; rx=min(ww*0.38,275); ry=min(wh*0.37,190)
        random.seed(20260924); chars=[".",":","*","#","@"]
        layers=[(1.19,210,"#06466B"),(1.14,235,"#075E8E"),(1.09,260,"#0878B7"),(1.045,290,"#0797DE"),(1.012,330,"#19BCF7"),(.985,300,"#43D8FF"),(.955,250,"#0B90D4")]
        for li,(scale,count,color) in enumerate(layers):
            for i in range(count):
                a=math.tau*i/count+random.uniform(-.010,.010)
                if random.random()>(.68+.28*abs(math.sin(a))): continue
                px=cx+math.cos(a)*rx*scale; py=cy+math.sin(a)*ry*scale
                ch=chars[min(len(chars)-1,max(0,li-1+random.randint(-1,1)))]
                c.create_text(px,py,text=ch,fill=color,font=("Cascadia Mono",7+li//2,"bold"))
        for i in range(190):
            a=math.tau*i/190+random.uniform(-.02,.02); spread=random.uniform(1.20,1.34)
            c.create_text(cx+math.cos(a)*rx*spread,cy+math.sin(a)*ry*spread,text=random.choice((".",":","*")),fill=deep,font=("Cascadia Mono",6,"bold"))
        title_size=max(31,int(ww/18))
        for ox,oy in ((-2,0),(2,0),(0,-2),(0,2)):
            c.create_text(cx+ox,cy-2+oy,text="Clintware™",fill="#173C52",font=("Cascadia Mono",title_size,"bold"))
        c.create_text(cx,cy-2,text="Clintware™",fill="#F7FBFF",font=("Cascadia Mono",title_size,"bold"))
        est_y=cy+max(48,int(wh*.10)); est_size=max(14,int(ww/36))
        for spread,color in ((12,"#003B80"),(7,"#005DB8"),(3,"#0A8FFF")):
            c.create_text(cx-spread,est_y,text="Est. 2026",fill=color,font=("Cascadia Mono",est_size,"bold"))
            c.create_text(cx+spread,est_y,text="Est. 2026",fill=color,font=("Cascadia Mono",est_size,"bold"))
        c.create_text(cx,est_y,text="Est. 2026",fill="#F2F7FF",font=("Cascadia Mono",est_size,"bold"))
        baseline=wh-50; c.create_line(42,baseline-18,ww-42,baseline-18,fill=dim,width=1)
        c.create_text(44,baseline,anchor="w",text="QUILLGEIST LITE",fill="#EAF7FF",font=("Cascadia Mono",10,"bold"))
        c.create_text(ww-44,baseline,anchor="e",text="LOCAL LINK  //  CONTROL PLANE",fill=cyan,font=("Cascadia Mono",9,"bold"))
        root.update_idletasks(); enable_glass(root); root.deiconify(); enable_glass(root)
        root.after(1100,root.destroy); root.bind("<Escape>",lambda _e:root.destroy()); root.bind("<Button-1>",lambda _e:root.destroy()); root.mainloop()
    except Exception: time.sleep(.05)
    return 0
if __name__=="__main__": raise SystemExit(main())

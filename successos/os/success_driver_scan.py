#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess
from pathlib import Path
def run(*cmd:str)->str:
    try:return subprocess.check_output(cmd,text=True,stderr=subprocess.DEVNULL).strip()
    except Exception:return ""
def modaliases()->list[dict]:
    out=[]
    for root in (Path("/sys/bus/pci/devices"),Path("/sys/bus/usb/devices")):
        if not root.exists():continue
        for dev in root.iterdir():
            alias=dev/"modalias"
            if not alias.exists():continue
            value=alias.read_text(errors="ignore").strip()
            if value: out.append({"device":str(dev),"modalias":value,"module_match":run("modprobe","--show-depends",value).splitlines()})
    return out
def missing_firmware()->list[str]:
    journal=run("journalctl","-k","-b","--no-pager"); return [x.strip() for x in journal.splitlines() if "firmware" in x.lower() and any(k in x.lower() for k in ("failed","not found","missing"))][-100:]
def main()->None:
    print(json.dumps({"kernel":run("uname","-srmo"),"machine":run("uname","-m"),"pci":run("lspci","-nnk").splitlines(),"usb":run("lsusb").splitlines(),"loaded_modules":run("lsmod").splitlines(),"modalias_inventory":modaliases(),"missing_firmware":missing_firmware()},indent=2))
if __name__=="__main__":main()

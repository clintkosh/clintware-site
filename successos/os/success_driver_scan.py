#!/usr/bin/env python3
from __future__ import annotations
import json, re, subprocess
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
    journal=run("journalctl","-k","-b","--no-pager")
    return [x.strip() for x in journal.splitlines() if "firmware" in x.lower() and any(k in x.lower() for k in ("failed","not found","missing"))][-100:]

def recommended_packages(pci_lines:list[str])->list[dict]:
    rules=[
      ("8086","network",["firmware-iwlwifi"],"Intel wireless"),
      ("8086","vga",["firmware-intel-graphics","firmware-intel-misc"],"Intel graphics"),
      ("8086","audio",["firmware-sof-signed","firmware-intel-misc"],"Intel audio/SOF"),
      ("10ec","",["firmware-realtek"],"Realtek network/audio"),
      ("14c3","",["firmware-mediatek"],"MediaTek/Ralink"),
      ("168c","",["firmware-atheros"],"Qualcomm Atheros"),
      ("17cb","",["firmware-atheros","firmware-qcom-soc"],"Qualcomm"),
      ("1002","",["firmware-amd-graphics"],"AMD graphics/NPU"),
      ("10de","",["firmware-nvidia-graphics"],"NVIDIA firmware"),
      ("14e4","network",["firmware-brcm80211","firmware-bnx2","firmware-bnx2x"],"Broadcom network"),
    ]
    found={}
    for line in pci_lines:
        low=line.lower()
        ids=re.findall(r"\[([0-9a-f]{4}):([0-9a-f]{4})\]",low)
        vendor=ids[-1][0] if ids else ""
        for vid,kind,packages,why in rules:
            if vendor==vid and (not kind or kind in low):
                for package in packages:
                    found[package]={"package":package,"reason":why,"evidence":line.strip()}
    return list(found.values())

def main()->None:
    pci=run("lspci","-nnk").splitlines()
    data={
      "kernel":run("uname","-srmo"),
      "machine":run("uname","-m"),
      "pci":pci,
      "usb":run("lsusb").splitlines(),
      "loaded_modules":run("lsmod").splitlines(),
      "modalias_inventory":modaliases(),
      "missing_firmware":missing_firmware(),
      "recommended_debian_packages":recommended_packages(pci),
      "note":"Recommendations are candidates only. SuccessOS verifies package availability/signatures and asks before installation."
    }
    print(json.dumps(data,indent=2))
if __name__=="__main__":main()

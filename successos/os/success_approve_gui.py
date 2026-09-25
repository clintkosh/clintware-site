#!/usr/bin/env python3
from __future__ import annotations
import argparse, os, subprocess, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from success_permission import PolicyStore, Request

def choose(req:Request)->str:
    text=(f"Capability: {req.capability}\nOperation: {req.operation}\nResource: {req.resource}\nHost: {req.host}\nRisk: {req.risk}")
    if not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY"):
        return ""
    cmd=["zenity","--list","--radiolist","--title=SuccessOS permission","--text",text,
         "--column","Pick","--column","Decision",
         "TRUE","Allow once","FALSE","Allow for this session","FALSE","Always allow this exact scope","FALSE","Deny",
         "--width=620","--height=360"]
    try:
        return subprocess.check_output(cmd,text=True,stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""

def main()->int:
    p=argparse.ArgumentParser()
    p.add_argument("--policy",default=os.environ.get("SUCCESSOS_POLICY","/var/lib/successos/policies.json"))
    p.add_argument("--subject",default=os.environ.get("USER","local-user"))
    p.add_argument("--capability",required=True); p.add_argument("--operation",required=True)
    p.add_argument("--resource",required=True); p.add_argument("--host",default=os.uname().nodename)
    p.add_argument("--risk",choices=["R0","R1","R2","R3"],required=True)
    a=p.parse_args(); req=Request(a.subject,a.capability,a.operation,a.resource,a.host,a.risk)
    store=PolicyStore(a.policy); current=store.evaluate(req)
    if current=="allow": return 0
    if current=="deny": return 20
    choice=choose(req)
    mapping={"Allow once":"once","Allow for this session":"session","Always allow this exact scope":"always","Deny":"deny"}
    mode=mapping.get(choice)
    if not mode:
        from success_permission import interactive_approve
        return 0 if interactive_approve(store,req)=="allow" else 20
    try: store.grant(req,mode)
    except ValueError as exc:
        subprocess.run(["zenity","--error","--text",str(exc)],check=False) if os.environ.get("DISPLAY") else print(exc,file=sys.stderr)
        return 20
    return 20 if mode=="deny" else 0

if __name__=="__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations
import getpass, json, os, re, shlex, shutil, subprocess, sys, time
from pathlib import Path
HERE=Path(__file__).resolve().parent
for candidate in (HERE,Path("/usr/local/lib/successos")):
    if str(candidate) not in sys.path: sys.path.insert(0,str(candidate))
from success_permission import PolicyStore, Request, interactive_approve

STATE=Path.home()/".local/state/successos"
STATE.mkdir(parents=True,exist_ok=True)
LOG=STATE/"execution.jsonl"
POLICY=Path(os.environ.get("SUCCESSOS_POLICY",str(STATE/"policies.json")))
MODEL=Path(os.environ.get("SUCCESSOS_BITNET_MODEL","/opt/successos/models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf"))
BITNET_RUN=Path(os.environ.get("SUCCESSOS_BITNET_RUN","/opt/successos/bitnet/run_inference.py"))

TOOLS={
 "hardware.inspect":{"risk":"R0"},
 "driver.scan":{"risk":"R0"},
 "network.status":{"risk":"R0"},
 "network.wifi.connect":{"risk":"R1"},
 "package.install":{"risk":"R2"},
 "service.restart":{"risk":"R2"},
 "filesystem.move":{"risk":"R1"},
}

def log_event(event:dict)->None:
    event={"ts":int(time.time()),**event}
    with LOG.open("a",encoding="utf-8") as f:f.write(json.dumps(event,sort_keys=True)+"\n")

def parse_json(text:str)->dict:
    for candidate in re.findall(r"\{(?:[^{}]|\{[^{}]*\})*\}",text,re.S)[::-1]:
        try:return json.loads(candidate)
        except json.JSONDecodeError:pass
    raise ValueError("Planner did not return valid JSON")

def plan_with_bitnet(intent:str)->dict:
    if not BITNET_RUN.exists() or not MODEL.exists():
        raise RuntimeError("Local BitNet runtime/model is not provisioned")
    system="""You are the SuccessOS local planner. Return only one JSON object.
Allowed actions:
hardware.inspect resource=machine
driver.scan resource=machine
network.status resource=machine
network.wifi.connect args.ssid required
package.install args.package required
service.restart args.service required
filesystem.move args.source and args.destination required
If none fits, return {"action":"explain","message":"..."}.
Never invent credentials. Never emit shell commands. Choose exactly one action."""
    cmd=[sys.executable,str(BITNET_RUN),"-m",str(MODEL),"-p",system+"\nUser intent: "+intent,"-n","220","-c","2048","-temp","0.1"]
    out=subprocess.check_output(cmd,text=True,stderr=subprocess.STDOUT,timeout=180)
    return parse_json(out)

def fallback_plan(intent:str)->dict:
    x=intent.strip().lower()
    if x in {"hardware","inspect hardware","system info"}:return {"action":"hardware.inspect","resource":"machine","args":{}}
    if x in {"drivers","scan drivers","driver scan"}:return {"action":"driver.scan","resource":"machine","args":{}}
    if x in {"network","network status","wifi status"}:return {"action":"network.status","resource":"machine","args":{}}
    return {"action":"explain","message":"Local planner unavailable. Try: hardware, drivers, or network; or provision the BitNet bundle."}

def approve(action:str,resource:str,risk:str)->bool:
    req=Request(os.environ.get("USER","local-user"),action,"execute",resource,os.uname().nodename,risk)
    store=PolicyStore(POLICY)
    gui=Path(__file__).resolve().parent/"success_approve_gui.py"
    if gui.exists() and (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        p=subprocess.run([sys.executable,str(gui),"--policy",str(POLICY),"--capability",action,"--operation","execute","--resource",resource,"--risk",risk])
        return p.returncode==0
    return interactive_approve(store,req)=="allow"

def run_action(plan:dict)->dict:
    action=plan.get("action"); args=plan.get("args") or {}
    if action=="explain":return {"ok":True,"message":plan.get("message","No executable action proposed.")}
    if action not in TOOLS:return {"ok":False,"error":"Unknown capability"}
    if action=="hardware.inspect":
        cmd=["lshw","-short"]
        resource="machine"
    elif action=="driver.scan":
        scan=Path("/usr/local/bin/success-driver-scan")
        if not scan.exists(): scan=HERE/"success_driver_scan.py"
        cmd=[str(scan)]
        resource="machine"
    elif action=="network.status":
        cmd=["nmcli","device","status"]; resource="machine"
    elif action=="network.wifi.connect":
        ssid=str(args.get("ssid","")).strip()
        if not ssid:return {"ok":False,"error":"SSID required"}
        resource="ssid:"+ssid
        if not approve(action,resource,TOOLS[action]["risk"]):return {"ok":False,"denied":True}
        password=getpass.getpass("Wi-Fi password (kept out of model context): ")
        cmd=["nmcli","device","wifi","connect",ssid,"password",password]
    elif action=="package.install":
        package=str(args.get("package","")).strip()
        if not re.fullmatch(r"[A-Za-z0-9.+_-]+",package):return {"ok":False,"error":"Invalid package name"}
        resource="pkg:"+package
        if not approve(action,resource,TOOLS[action]["risk"]):return {"ok":False,"denied":True}
        cmd=["sudo","apt-get","install","-y",package]
    elif action=="service.restart":
        service=str(args.get("service","")).strip()
        if not re.fullmatch(r"[A-Za-z0-9@_.:-]+",service):return {"ok":False,"error":"Invalid service name"}
        resource="service:"+service
        if not approve(action,resource,TOOLS[action]["risk"]):return {"ok":False,"denied":True}
        cmd=["sudo","systemctl","restart",service]
    elif action=="filesystem.move":
        src=Path(str(args.get("source",""))).expanduser().resolve(); dst=Path(str(args.get("destination",""))).expanduser().resolve()
        resource=f"{src} -> {dst}"
        if not approve(action,resource,TOOLS[action]["risk"]):return {"ok":False,"denied":True}
        shutil.move(str(src),str(dst)); return {"ok":True,"result":resource}
    else:return {"ok":False,"error":"Unsupported action"}
    if action in {"hardware.inspect","driver.scan","network.status"}:
        pass
    elif action not in {"network.wifi.connect","package.install","service.restart"}:
        if not approve(action,resource,TOOLS[action]["risk"]):return {"ok":False,"denied":True}
    proc=subprocess.run(cmd,text=True,capture_output=True)
    return {"ok":proc.returncode==0,"returncode":proc.returncode,"stdout":proc.stdout[-16000:],"stderr":proc.stderr[-8000:]}

def one(intent:str)->dict:
    try: plan=plan_with_bitnet(intent)
    except Exception as exc:
        plan=fallback_plan(intent); plan["planner_note"]=str(exc)
    print("Plan:",json.dumps(plan,indent=2))
    result=run_action(plan); log_event({"intent":intent,"plan":plan,"result":result}); return result

def main()->int:
    if len(sys.argv)>1:
        print(json.dumps(one(" ".join(sys.argv[1:])),indent=2)); return 0
    print("SuccessOS smart terminal. Type exit to quit.")
    while True:
        try:intent=input("success> ").strip()
        except (EOFError,KeyboardInterrupt):break
        if not intent:continue
        if intent.lower() in {"exit","quit"}:break
        print(json.dumps(one(intent),indent=2))
    return 0

if __name__=="__main__":raise SystemExit(main())

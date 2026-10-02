#!/usr/bin/env python3
import argparse, ctypes, datetime as dt, json, os, pathlib, platform, shutil, socket, subprocess, uuid
ROOT=pathlib.Path(os.environ.get("LOCALAPPDATA") or pathlib.Path.home()/".local"/"share")/"Clintware"/"QuillgeistLite"/"cloud-mist"
CONFIG=ROOT/"node.json"; HEARTBEAT=ROOT/"heartbeat.json"; POOL=ROOT/"pool.json"
def now(): return dt.datetime.now(dt.timezone.utc).isoformat()
def load(path,default=None):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except Exception:return default
def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(value,indent=2)+"\n",encoding="utf-8"); tmp.replace(path)
def memory_gb():
    try:
        if os.name=="nt":
            class M(ctypes.Structure):
                _fields_=[("dwLength",ctypes.c_ulong),("dwMemoryLoad",ctypes.c_ulong),("ullTotalPhys",ctypes.c_ulonglong),("ullAvailPhys",ctypes.c_ulonglong),("ullTotalPageFile",ctypes.c_ulonglong),("ullAvailPageFile",ctypes.c_ulonglong),("ullTotalVirtual",ctypes.c_ulonglong),("ullAvailVirtual",ctypes.c_ulonglong),("sullAvailExtendedVirtual",ctypes.c_ulonglong)]
            m=M();m.dwLength=ctypes.sizeof(M);ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m));return round(m.ullTotalPhys/(1024**3),1)
        p=pathlib.Path("/proc/meminfo")
        if p.exists():
            kb=int(next(x for x in p.read_text().splitlines() if x.startswith("MemTotal:")).split()[1]);return round(kb/1024/1024,1)
    except Exception:pass
    return None
def gpu_info():
    exe=shutil.which("nvidia-smi")
    if not exe:return []
    try:
        out=subprocess.check_output([exe,"--query-gpu=name,memory.total","--format=csv,noheader,nounits"],text=True,timeout=8);rows=[]
        for line in out.splitlines():
            if line.strip():
                name,mem=[x.strip() for x in line.split(",",1)];rows.append({"name":name,"memory_mb":int(float(mem))})
        return rows
    except Exception:return []
def task_inventory():
    p=pathlib.Path(__file__).resolve().parents[2]/"quillgeist-lite"/"tasks.json";data=load(p,{}) or {}
    return sorted((data.get("tasks") or {}).keys())
def inventory():
    g=gpu_info()
    return {"hostname":socket.gethostname(),"platform":platform.platform(),"cpu_logical":os.cpu_count() or 1,"memory_gb":memory_gb(),"gpu":g,"ollama_present":bool(shutil.which("ollama")),"python":platform.python_version(),"capabilities":task_inventory(),"resource_classes":["cpu","io","mixed"]+(["gpu"] if g else [])}
def auto_workers(inv):
    cpu=max(1,int(inv.get("cpu_logical") or 1));mem=float(inv.get("memory_gb") or 8);return max(1,min(16,cpu//2 if cpu>2 else 1,max(1,int(mem//6))))
def heartbeat(node=None):
    node=node or load(CONFIG)
    if not node:raise SystemExit("CloudMist node is not enrolled. Run Action=enroll.")
    hb={"version":1,"node_id":node["node_id"],"label":node["label"],"timestamp":now(),"health":"healthy","state":node.get("state","ready"),"max_workers":node.get("max_workers"),"resource_classes":node.get("inventory",{}).get("resource_classes",[]),"capabilities":node.get("inventory",{}).get("capabilities",[])}
    save(HEARTBEAT,hb);return hb
def enroll(a):
    inv=inventory();old=load(CONFIG,{}) or {};roles=[x.strip() for x in (a.Roles or "general,build").split(",") if x.strip()]
    node={"version":1,"node_id":old.get("node_id") or str(uuid.uuid4()),"label":a.Label or old.get("label") or socket.gethostname(),"hostname":socket.gethostname(),"roles":roles,"max_workers":a.MaxWorkers if a.MaxWorkers>0 else old.get("max_workers") or auto_workers(inv),"gpu_enabled":str(a.Gpu).lower() not in ("false","0","no","off"),"inventory":inv,"created_at":old.get("created_at") or now(),"updated_at":now(),"state":"ready"}
    save(CONFIG,node);hb=heartbeat(node);pool=load(POOL,{"version":1,"nodes":[]}) or {"version":1,"nodes":[]}
    nodes=[x for x in pool.get("nodes",[]) if x.get("node_id")!=node["node_id"]];nodes.append({**node,**hb,"health":"healthy","queue_depth":0,"load":0.0});pool["nodes"]=nodes;pool["updated_at"]=now();save(POOL,pool)
    return {"ok":True,"action":"enroll","node":node,"heartbeat":hb,"config_path":str(CONFIG)}
def load_pool(path):
    p=pathlib.Path(path).expanduser().resolve() if path else POOL;return (load(p,{"nodes":[]}) or {"nodes":[]}),p
def route(a):
    pool,p=load_pool(a.PoolFile);need=(a.RequiredCapability or "").strip();resource=(a.ResourceClass or "cpu").strip().lower();preferred=(a.PreferredNode or "").strip().lower();eligible=[];rejected=[]
    for n in pool.get("nodes",[]):
        reasons=[];caps=set(n.get("capabilities") or n.get("inventory",{}).get("capabilities",[]));resources=set(n.get("resource_classes") or n.get("inventory",{}).get("resource_classes",[]))
        if str(n.get("health","healthy")).lower() not in ("healthy","ready"):reasons.append("unhealthy")
        if need and need not in caps:reasons.append("missing_capability")
        if resource and resource not in resources and resource!="any":reasons.append("resource_mismatch")
        if reasons:rejected.append({"node_id":n.get("node_id"),"label":n.get("label"),"reasons":reasons});continue
        loadv=float(n.get("load") or 0);q=int(n.get("queue_depth") or 0);score=100-(max(0,min(1,loadv))*45)-(q*8)
        if preferred and preferred in {str(n.get("label","")).lower(),str(n.get("hostname","")).lower(),str(n.get("node_id","")).lower()}:score+=25
        roles=set(n.get("roles") or [])
        if resource=="gpu" and "ai" in roles:score+=8
        if resource in ("cpu","mixed") and "build" in roles:score+=5
        eligible.append({"node_id":n.get("node_id"),"label":n.get("label"),"hostname":n.get("hostname"),"score":round(score,2),"queue_depth":q,"load":loadv})
    eligible.sort(key=lambda x:(-x["score"],x["label"] or ""))
    return {"ok":bool(eligible),"action":"route","pool_file":str(p),"required_capability":need or None,"resource_class":resource,"selected":eligible[0] if eligible else None,"failover_order":eligible,"rejected":rejected}
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--Action",default="status",choices=["status","enroll","heartbeat","route","pool-export"]);ap.add_argument("--Label",default="");ap.add_argument("--Roles",default="general,build");ap.add_argument("--MaxWorkers",type=int,default=0);ap.add_argument("--ResourceClass",default="cpu");ap.add_argument("--RequiredCapability",default="");ap.add_argument("--PoolFile",default="");ap.add_argument("--PreferredNode",default="");ap.add_argument("--Gpu",default="true");a=ap.parse_args();ROOT.mkdir(parents=True,exist_ok=True)
    if a.Action=="enroll":out=enroll(a)
    elif a.Action=="heartbeat":out={"ok":True,"action":"heartbeat","heartbeat":heartbeat()}
    elif a.Action=="route":out=route(a)
    elif a.Action=="pool-export":pool,p=load_pool(a.PoolFile);out={"ok":True,"action":"pool-export","pool_file":str(p),"pool":pool}
    else:out={"ok":True,"action":"status","enrolled":bool(load(CONFIG)),"node":load(CONFIG),"heartbeat":load(HEARTBEAT),"live_inventory":inventory(),"root":str(ROOT)}
    print(json.dumps(out,indent=2));return 0 if out.get("ok",True) else 2
if __name__=="__main__":raise SystemExit(main())

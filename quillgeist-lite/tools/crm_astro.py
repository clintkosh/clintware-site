#!/usr/bin/env python3
import argparse, json, pathlib, sys
from urllib.parse import urlparse

REQUIRED_ACTIONS={"describe","validate","plan"}

def load_manifest(path):
    p=pathlib.Path(path).expanduser().resolve()
    if not p.is_file():
        raise ValueError(f"manifest_not_found: {p}")
    data=json.loads(p.read_text(encoding="utf-8"))
    return p,data

def validate(data):
    errors=[]
    for key in ("project_id","company","name","domain","base_project","roles","tracks"):
        if not data.get(key):
            errors.append(f"missing:{key}")
    domain=str(data.get("domain",""))
    if domain and urlparse(domain).scheme!="https":
        errors.append("domain_must_be_https")
    tracks=data.get("tracks",[])
    if not isinstance(tracks,list):
        errors.append("tracks_must_be_list"); tracks=[]
    mode=str(data.get("mode") or "dual-track").strip().lower()
    ids=[]
    groups={"CSM":0,"Support":0}
    if mode=="dual-track" and len(tracks)!=12:
        errors.append(f"track_count:{len(tracks)}")
    if mode=="one-off" and not (4 <= len(tracks) <= 12):
        errors.append(f"one_off_track_count:{len(tracks)}")
    for idx,t in enumerate(tracks):
        if not isinstance(t,dict):
            errors.append(f"track_{idx+1}_not_object"); continue
        tid=str(t.get("id","")).strip()
        if not tid: errors.append(f"track_{idx+1}_missing_id")
        ids.append(tid)
        for key in ("label","tab","objective"):
            if not str(t.get(key,"")).strip():
                errors.append(f"track_{idx+1}_missing_{key}")
        if mode=="dual-track":
            group=str(t.get("group","")).strip()
            if group not in groups: errors.append(f"track_{idx+1}_bad_group:{group}")
            else: groups[group]+=1
    if len([x for x in ids if x]) != len(set(x for x in ids if x)):
        errors.append("duplicate_track_id")
    roles=data.get("roles",[])
    if not isinstance(roles,list) or len(roles)<1:
        errors.append("roles_must_include_at_least_one_role")
    if mode=="dual-track":
        if groups["CSM"]!=6 or groups["Support"]!=6:
            errors.append(f"unbalanced_groups:{groups}")
        if len(roles)<2:
            errors.append("dual_track_roles_must_include_two_roles")
    elif mode!="one-off":
        errors.append(f"unsupported_mode:{mode}")
    return errors,groups,mode

def result(action,path,data):
    errors,groups,mode=validate(data)
    base={
        "ok":not errors,
        "action":action,
        "manifest":str(path),
        "project_id":data.get("project_id"),
        "company":data.get("company"),
        "domain":data.get("domain"),
        "mode":mode,
        "track_count":len(data.get("tracks",[]) if isinstance(data.get("tracks"),list) else []),
        "groups":groups if mode=="dual-track" else None,
        "errors":errors,
        "local_first":True,
        "remote_shell_exposed":False
    }
    if action=="describe":
        base["capabilities"]=[
            "one-off or dual-track manifest validation",
            "deterministic materialization handoff",
            "local npm/source checks",
            "reviewed deployment handoff",
            "browser-smoke handoff"
        ]
    elif action=="plan":
        pid=data.get("project_id","PROJECT")
        base["steps"]=[
            f"validate projects/{pid}/manifest.json",
            f"node projects/{pid}/scripts/materialize.mjs",
            f"run checks inside .build/{pid}",
            "run role-specific browser smoke",
            "deploy only when explicitly requested",
            "verify live domain before reporting live"
        ]
    return base

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--Action",default="validate",choices=sorted(REQUIRED_ACTIONS))
    ap.add_argument("--Manifest",required=True)
    ap.add_argument("--Json",action="store_true")
    args=ap.parse_args()
    try:
        path,data=load_manifest(args.Manifest)
        out=result(args.Action,path,data)
    except Exception as exc:
        out={"ok":False,"action":args.Action,"error":str(exc)}
    print(json.dumps(out,indent=2))
    return 0 if out.get("ok") else 2

if __name__=="__main__":
    sys.exit(main())

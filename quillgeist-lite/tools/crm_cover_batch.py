#!/usr/bin/env python3
import argparse
import concurrent.futures
import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.request
import uuid

ROOT_DEFAULT = pathlib.Path(__file__).resolve().parents[2]
PROJECT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")

def run(cmd, cwd, env=None, timeout=7200):
    p=subprocess.run(cmd,cwd=str(cwd),env=env,text=True,capture_output=True,timeout=timeout)
    return {"cmd":cmd,"code":p.returncode,"stdout":p.stdout[-20000:],"stderr":p.stderr[-20000:]}

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def ollama(prompt, model, url):
    payload=json.dumps({"model":model,"prompt":prompt,"stream":False,"options":{"temperature":0.2,"num_ctx":12000}}).encode()
    req=urllib.request.Request(url.rstrip("/")+"/api/generate",data=payload,headers={"content-type":"application/json"})
    with urllib.request.urlopen(req,timeout=900) as r:
        data=json.loads(r.read().decode())
    return str(data.get("response","")).strip()

def local_copy(repo, project, model, ollama_url, run_dir):
    m=load_json(repo/"projects"/project/"manifest.json")
    bundle=m.get("application_bundle") or {}
    existing_cover=((bundle.get("cover_letter") or {}).get("draft") or "").strip()
    existing_why=((bundle.get("why_company") or {}).get("draft") or "").strip()
    app_dir=run_dir/project
    app_dir.mkdir(parents=True,exist_ok=True)
    (app_dir/"cover-letter.manifest.md").write_text(existing_cover+"\n",encoding="utf-8")
    (app_dir/"why-company.manifest.md").write_text(existing_why+"\n",encoding="utf-8")
    prompt=f"""You are generating application copy locally for Clinton Kosh.
Company: {m.get('company')}
Role: {(m.get('roles') or [{}])[0].get('name')}
Role mission: {m.get('role_mission')}
Operating loop: {' -> '.join(m.get('operating_loop') or [])}
Verified role tracks: {json.dumps(m.get('tracks') or [])}
Candidate evidence: {json.dumps(m.get('candidate_evidence') or [])}
Public sources: {json.dumps(m.get('public_sources') or [])}

Write two distinct artifacts:
1. WHY COMPANY: 180-260 words focused on motivation, company/role convergence, and future contribution.
2. COVER LETTER: 250-380 words focused on role fit and evidence.

Hard gates:
- Do not invent metrics, private company processes, or customer facts.
- Every metric must come from Candidate evidence.
- No em dash.
- Use two spaces between sentences.
- Mention the candidate-built CRM only as optional proof and clearly call its data synthetic.
- Keep AI/tooling secondary to the business operating value unless the role explicitly centers it.
- Do not over-explain personal connections.
- End when the case is made.

Return headings exactly: WHY COMPANY and COVER LETTER."""
    try:
        out=ollama(prompt,model,ollama_url)
        (app_dir/"application-copy.local.md").write_text(out+"\n",encoding="utf-8")
        return {"generated":True,"file":str(app_dir/"application-copy.local.md")}
    except Exception as e:
        return {"generated":False,"error":str(e),"manifest_copy_preserved":True}

def worker(repo, project, action, generate_copy, model, ollama_url, run_dir):
    started=dt.datetime.now(dt.timezone.utc).isoformat()
    proj=repo/"projects"/project
    manifest=proj/"manifest.json"
    result={"project":project,"started_at":started,"steps":[],"ok":False}
    if not manifest.is_file():
        result["error"]="manifest_not_found"
        return result
    validator=repo/"quillgeist-lite"/"tools"/"crm_astro.py"
    v=run([sys.executable,str(validator),"--Action","validate","--Manifest",str(manifest),"--Json"],repo,timeout=120)
    result["steps"].append({"name":"validate",**v})
    if v["code"]!=0:return result
    if action=="plan":
        result["ok"]=True
        return result
    mat=proj/"scripts"/"materialize.mjs"
    if not mat.is_file():
        result["error"]="materializer_not_found"
        return result
    m=run(["node",str(mat)],repo,timeout=1200)
    result["steps"].append({"name":"materialize",**m})
    if m["code"]!=0:return result
    build=repo/".build"/project
    if action in ("check","full-local"):
        ni=run(["npm","install","--no-audit","--no-fund"],build,timeout=2400)
        result["steps"].append({"name":"npm-install",**ni})
        if ni["code"]!=0:return result
        ck=run(["npm","run","check"],build,timeout=1800)
        result["steps"].append({"name":"check",**ck})
        if ck["code"]!=0:return result
    if generate_copy:
        result["local_copy"]=local_copy(repo,project,model,ollama_url,run_dir)
    result["ok"]=True
    result["finished_at"]=dt.datetime.now(dt.timezone.utc).isoformat()
    return result

def main():
    ap=argparse.ArgumentParser(description="Parallel local CRM+Cover ASTRO runner. Works directly or through QQ.")
    ap.add_argument("--Projects",required=True,help="Comma-separated project ids")
    ap.add_argument("--Action",choices=["plan","materialize","check","full-local"],default="full-local")
    ap.add_argument("--Workers",type=int,default=0)
    ap.add_argument("--GenerateCopy",action="store_true")
    ap.add_argument("--Model",default=os.environ.get("CW_LOCAL_MODEL","qwen3:4b"))
    ap.add_argument("--OllamaUrl",default=os.environ.get("OLLAMA_URL","http://127.0.0.1:11434"))
    ap.add_argument("--RepoRoot",default=str(ROOT_DEFAULT))
    args=ap.parse_args()
    repo=pathlib.Path(args.RepoRoot).expanduser().resolve()
    projects=[x.strip() for x in args.Projects.split(",") if x.strip()]
    if not projects:raise SystemExit("No projects supplied")
    invalid=[p for p in projects if not PROJECT_ID_RE.fullmatch(p)]
    if invalid:raise SystemExit("Invalid project id(s): "+", ".join(invalid))
    if len(projects)>20:raise SystemExit("At most 20 projects may be materialized in one batch.")
    workers=args.Workers if args.Workers>0 else max(2,min(4,max(1,(os.cpu_count() or 4)//2)))
    run_id=dt.datetime.now().strftime("%Y%m%d_%H%M%S")+"_"+uuid.uuid4().hex[:8]
    run_dir=repo/".local"/"application-runs"/run_id
    run_dir.mkdir(parents=True,exist_ok=True)

    base=None
    if args.Action!="plan":
        env=os.environ.copy()
        env["CW_ASTRO_REFERENCE_MODE"]="1"
        base=run(["node",str(repo/"projects"/"dplr-crm"/"scripts"/"materialize.mjs")],repo,env=env,timeout=1200)
        (run_dir/"dplr-base.json").write_text(json.dumps(base,indent=2),encoding="utf-8")
        if base["code"]!=0:
            print(json.dumps({"ok":False,"run_id":run_id,"error":"dplr_reference_materialization_failed","base":base},indent=2))
            return 2

    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(workers,len(projects))) as ex:
        futs=[ex.submit(worker,repo,p,args.Action,args.GenerateCopy,args.Model,args.OllamaUrl,run_dir) for p in projects]
        for f in concurrent.futures.as_completed(futs):
            results.append(f.result())
    results.sort(key=lambda x:x["project"])
    summary={"ok":all(x.get("ok") for x in results),"run_id":run_id,"workers":min(workers,len(projects)),"projects":results,"local_first":True,"qq_required":False,"qq_compatible":True,"deploy_performed":False,"run_dir":str(run_dir)}
    (run_dir/"SUMMARY.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print(json.dumps(summary,indent=2))
    return 0 if summary["ok"] else 2

if __name__=="__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
import datetime as dt,json,pathlib,shutil
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parents[2];SRC=ROOT/"projects"/"crm-cover-factory"/"tenants";OUT=ROOT/".build"/"crm-factory";PUBLIC=OUT/"public"
def main():
 tenants=[]
 for p in sorted(SRC.glob("*.json")):tenants.extend((json.loads(p.read_text(encoding="utf-8")).get("tenants")or[]))
 by={}
 for t in tenants:
  if t["slug"]in by:raise SystemExit("duplicate tenant slug: "+t["slug"])
  by[t["slug"]]=t
 shutil.rmtree(OUT,ignore_errors=True);PUBLIC.mkdir(parents=True,exist_ok=True);(PUBLIC/"tenants").mkdir(parents=True,exist_ok=True)
 for n in("index.html","app.js","styles.css"):shutil.copy2(HERE/n,PUBLIC/n)\n shutil.copy2(HERE/"src"/"analytics.js",PUBLIC/"analytics.js")
 months={}
 for t in by.values():months.setdefault(str(t.get("source_date")or"unknown")[:7],[]).append(t)
 index=[]
 for month,items in sorted(months.items()):
  (PUBLIC/"tenants"/(month+".json")).write_text(json.dumps({"version":1,"month":month,"tenants":items},separators=(",",":"))+"\n",encoding="utf-8")
  for t in items:index.append({k:t.get(k)for k in("slug","company","title","category","source_date","rank")}|{"month":month})
 index.sort(key=lambda x:(x.get("source_date")or"",-(x.get("rank")or 9999),x.get("company")or""),reverse=True)
 (PUBLIC/"tenant-index.json").write_text(json.dumps({"version":1,"count":len(index),"tenants":index},separators=(",",":"))+"\n",encoding="utf-8")
 health={"ok":True,"service":"clintware-crm-factory","storage":"static-assets+browser-local","tenant_count":len(index),"worker_runtime_required":False,"generated_at":dt.datetime.now(dt.timezone.utc).isoformat()};(PUBLIC/"health.json").write_text(json.dumps(health,separators=(",",":"))+"\n",encoding="utf-8");shutil.copy2(HERE/"wrangler.jsonc",OUT/"wrangler.jsonc")
 total=sum(p.stat().st_size for p in PUBLIC.rglob("*")if p.is_file());usage={"tenant_count":len(index),"published_static_bytes":total,"static_asset_files":sum(1 for p in PUBLIC.rglob("*")if p.is_file()),"cloudflare_worker_projects_increment":1,"cloudflare_worker_script_requests_per_normal_view":0,"pages_projects_increment":0,"pages_builds_increment":0,"r2_operations_increment":0,"kv_writes_increment":0,"d1_writes_increment":0,"github_actions_minutes_steady_state_local_path":0,"note":"Normal navigation and asset requests are served by Workers Static Assets. No Worker script is configured."};(OUT/"usage-estimate.json").write_text(json.dumps(usage,indent=2)+"\n",encoding="utf-8");print(json.dumps({"ok":True,**usage},indent=2))
if __name__=="__main__":main()

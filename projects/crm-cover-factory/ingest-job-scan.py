#!/usr/bin/env python3
import argparse,datetime as dt,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[2]
def slugify(s):return re.sub(r"(^-|-$)","",re.sub(r"[^a-z0-9]+","-",s.lower().replace("&"," and ")))[:110]
def clean(x):return x.strip().replace("**","")
def category(t):
 t=t.lower()
 if "support" in t:return "support-leadership"
 if re.search(r"implementation|professional services|delivery consultant|consulting services",t):return "implementation-services"
 if re.search(r"technical account|technical success|customer program",t):return "technical-post-sales"
 if re.search(r"ai adoption|ai transformation|ai engagement|transformation catalyst|enablement",t):return "ai-adoption"
 if re.search(r"operations|service operations",t):return "cs-operations"
 return "customer-success"
def existing_roles():
 out=set()
 for p in (ROOT/"projects").glob("*/manifest.json"):
  try:
   m=json.loads(p.read_text(encoding="utf-8"));company=str(m.get("company")or"").strip().lower()
   for role in m.get("roles")or[]:out.add((company,str(role.get("name")or"").strip().lower()))
  except Exception:pass
 return out
def parse(md,date):
 existing=existing_roles();rows=[];skipped=[]
 for line in md.splitlines():
  if not re.match(r"^\|\s*\d+\s*\|",line):continue
  c=[clean(x) for x in line.split("|")[1:-1]]
  if len(c)<11:continue
  company,title=c[1],c[2]
  if(company.lower(),title.lower())in existing:skipped.append({"company":company,"title":title,"reason":"existing_exact_role_crm"});continue
  m=re.search(r"\((https?://[^)]+)\)",c[10])
  rows.append({"slug":slugify(company+"-"+title),"company":company,"title":title,"rank":int(c[0]),"req":c[3],"location":c[4],"freshness":c[5],"compensation":c[6],"fit_percent":int(c[7].replace("%",""))if c[7].replace("%","").isdigit()else None,"fit_reason":c[8],"gap_risk":c[9],"apply_url":m.group(1)if m else"","category":category(title),"source_date":date,"source":"Clintware job scan","status":"new","public_boundary":"Public job facts plus candidate-built planning context. No private employer process is implied."})
 return rows,skipped
def main():
 ap=argparse.ArgumentParser();ap.add_argument("--Input",required=True);ap.add_argument("--Date",default=dt.date.today().isoformat());ap.add_argument("--Output",default="");a=ap.parse_args();inp=pathlib.Path(a.Input).expanduser().resolve();rows,skipped=parse(inp.read_text(encoding="utf-8"),a.Date);out=pathlib.Path(a.Output).expanduser().resolve()if a.Output else ROOT/"projects"/"crm-cover-factory"/"tenants"/(a.Date+".json");out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({"version":1,"date":a.Date,"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),"tenants":rows,"skipped_existing":skipped},indent=2)+"\n",encoding="utf-8");print(json.dumps({"ok":True,"output":str(out),"tenants":len(rows),"skipped":len(skipped)},indent=2))
if __name__=="__main__":main()

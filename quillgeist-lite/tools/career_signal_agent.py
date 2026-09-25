#!/usr/bin/env python3
"""LandThePlane Career Signal Agent.

Local-first ASTRO-derived daily planning agent for hiring + YC visibility.
It NEVER automates LinkedIn access, scraping, posting, commenting, liking, messaging,
or profile actions. LinkedIn targets must be supplied by the user as local input.
"""

from __future__ import annotations
import argparse, datetime as dt, json, os, re, sqlite3, urllib.parse
from pathlib import Path

APP_VERSION = "0.1.0"
ROOT = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Clintware" / "QuillgeistLite" / "career-signal-agent"
CONFIG = ROOT / "config.json"
INBOX = ROOT / "inbox.jsonl"
STATE = ROOT / "state.json"
DAILY = ROOT / "daily"
RESPONDER_DB = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Clintware" / "QuillgeistLite" / "responder-agent" / "state.sqlite3"

DEFAULT_CONFIG = {
    "version": 1,
    "enabled": True,
    "daily_time_local": "08:00",
    "comment_target": 20,
    "post_target_weekly": 3,
    "mix": {"hire": 0.40, "yc_founder": 0.30, "target_company": 0.20, "relationship": 0.10},
    "yc_deadline": "2026-11-02T20:00:00-08:00",
    "yc_label": "Winter 2027 application deadline",
    "linkedin_mode": "MANUAL_PUBLISH_ONLY",
    "linkedin_policy_note": "No automated LinkedIn access, scraping, posting, commenting, liking, messaging, or profile actions.",
    "minimum_responder_score": 70,
    "profile_story": "Experienced operator who builds: customer systems, AI workflows, secure automation, and evidence-backed products.",
    "gates": [
        "profile_story_alignment",
        "adds_actual_perspective",
        "sounds_human_not_corporate",
        "based_on_real_observation",
        "authentic_voice_not_frictionless_slop",
        "clear_reason_to_exist",
        "reply_worthy",
        "evidence_claims_are_defendable"
    ]
}

def ensure():
    ROOT.mkdir(parents=True, exist_ok=True); DAILY.mkdir(parents=True, exist_ok=True)
    if not CONFIG.exists(): CONFIG.write_text(json.dumps(DEFAULT_CONFIG, indent=2), encoding="utf-8")
    if not INBOX.exists(): INBOX.write_text("", encoding="utf-8")
    if not STATE.exists(): STATE.write_text(json.dumps({"last_run": "", "accepted_edits": []}, indent=2), encoding="utf-8")

def load_json(path, fallback):
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception: return fallback

def cfg():
    ensure(); out = DEFAULT_CONFIG.copy(); out.update(load_json(CONFIG, {})); return out

def inbox_rows():
    ensure(); rows=[]
    for line in INBOX.read_text(encoding="utf-8").splitlines():
        line=line.strip()
        if not line: continue
        try:
            item=json.loads(line)
            if isinstance(item, dict): rows.append(item)
        except Exception: pass
    return rows

def compact(s, n=700):
    return re.sub(r"\s+", " ", str(s or "")).strip()[:n]

def linkedin_gate(item, config):
    text = compact(item.get("draft") or item.get("observation") or item.get("post_text"), 4000)
    checks = {}
    checks["profile_story_alignment"] = bool(text)
    checks["adds_actual_perspective"] = len(text.split()) >= 10
    checks["sounds_human_not_corporate"] = not bool(re.search(r"\b(revolutionary|game[- ]changing|synergy|thought leadership|delighted to announce)\b", text, re.I))
    checks["based_on_real_observation"] = bool(item.get("observation") or item.get("source") or item.get("post_text"))
    checks["authentic_voice_not_frictionless_slop"] = not bool(re.search(r"^(great post|love this|so true|well said)[!. ]*$", text, re.I))
    checks["clear_reason_to_exist"] = bool(item.get("purpose") or item.get("goal") or item.get("category"))
    checks["reply_worthy"] = len(text.split()) >= 10
    checks["evidence_claims_are_defendable"] = not bool(re.search(r"\b(always|never|everyone|guaranteed|100%)\b", text, re.I))
    return {"pass": all(checks.values()), "checks": checks}

def make_comment_draft(item):
    obs = compact(item.get("observation") or "", 500)
    post = compact(item.get("post_text") or "", 500)
    angle = compact(item.get("angle") or "", 220)
    if obs:
        return obs
    if angle:
        return angle
    if post:
        # Safe generic scaffold rather than pretending first-hand experience.
        return "The part I would pressure-test is the operating mechanism behind this. What changed in the workflow or decision process that made the result repeatable?"
    return ""

def responder_opportunities(limit=8, minimum=70):
    if not RESPONDER_DB.exists(): return []
    try:
        con = sqlite3.connect(RESPONDER_DB); con.row_factory=sqlite3.Row
        rows = con.execute(
          "SELECT platform,community,title,url,score,mode,reasons FROM opportunities WHERE score>=? ORDER BY score DESC, discovered_at DESC LIMIT ?",
          (minimum,limit)).fetchall()
        return [dict(r) for r in rows]
    except Exception: return []
    finally:
        try: con.close()
        except Exception: pass

def allocate(n, mix):
    keys=["hire","yc_founder","target_company","relationship"]; vals={}
    used=0
    for k in keys[:-1]:
        vals[k]=round(n*float(mix.get(k,0))); used += vals[k]
    vals[keys[-1]]=max(0,n-used)
    return vals

def days_to_deadline(iso):
    try:
        d=dt.datetime.fromisoformat(iso); now=dt.datetime.now(d.tzinfo or dt.timezone.utc)
        return max(0, (d-now).days)
    except Exception: return None

def build_report():
    config=cfg(); rows=inbox_rows(); target=int(config.get("comment_target",20)); mix=allocate(target, config.get("mix",{}))
    targets=[]; ideas=[]
    for item in rows:
        kind=str(item.get("type","")).lower()
        if kind in {"linkedin_target","comment_target"}:
            draft=make_comment_draft(item); enriched={**item,"draft":draft}
            enriched["gate"]=linkedin_gate(enriched,config); targets.append(enriched)
        elif kind in {"observation","idea","brain_dump"}: ideas.append(item)
    targets.sort(key=lambda x: (not x.get("gate",{}).get("pass",False), -int(x.get("priority",50))))
    report={
      "schema":"landtheplane.signal.v1","generated_at":dt.datetime.now().astimezone().isoformat(),
      "mode":"HIRE_YC_BOTH","linkedin_mode":config["linkedin_mode"],"policy_note":config["linkedin_policy_note"],
      "profile_story":config["profile_story"],"daily_targets":{"comments":target,"mix":mix,"weekly_posts":config["post_target_weekly"]},
      "yc":{"label":config["yc_label"],"deadline":config["yc_deadline"],"days_remaining":days_to_deadline(config["yc_deadline"])},
      "linkedin_queue":targets[:target],
      "idea_queue":ideas[:12],
      "public_signal_queue":responder_opportunities(8,int(config.get("minimum_responder_score",70))),
      "manual_actions":[
        "Open LinkedIn yourself; do not let the agent control the site.",
        f"Complete up to {target} substantive comments using the mix targets, stopping before quality drops.",
        "Paste any target post text into inbox.jsonl before asking the agent to draft; no scraping.",
        "Promote only gate-passing drafts. Edit manually before publishing.",
        "Capture replies, profile visits, interview conversations, user conversations, and product feedback as outcomes.",
        "Turn one real observation or shipped change into a post only when there is something worth saying."
      ],
      "gates":config["gates"]
    }
    date=dt.date.today().isoformat()
    (DAILY/f"{date}.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    (ROOT/"latest.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    md=[f"# LandThePlane Daily Signal — {date}","",f"LinkedIn mode: **{report['linkedin_mode']}**",f"YC runway: **{report['yc']['days_remaining']} days**","",
        "## Daily mix",*(f"- {k}: {v}" for k,v in mix.items()),"","## Manual actions",*(f"- {x}" for x in report["manual_actions"])]
    (DAILY/f"{date}.md").write_text("\n".join(md),encoding="utf-8")
    state=load_json(STATE,{}); state["last_run"]=report["generated_at"]; state["last_report"]=str(DAILY/f"{date}.json"); STATE.write_text(json.dumps(state,indent=2),encoding="utf-8")
    return report

def status():
    config=cfg(); state=load_json(STATE,{})
    return {"ok":True,"version":APP_VERSION,"enabled":bool(config.get("enabled",True)),"home":str(ROOT),"last_run":state.get("last_run",""),"latest":str(ROOT/"latest.json"),"linkedin_mode":config["linkedin_mode"]}

def main():
    p=argparse.ArgumentParser(); p.add_argument("action",choices=["run","status","on","off","paths"],nargs="?",default="status"); p.add_argument("--json",action="store_true")
    a=p.parse_args(); ensure(); config=cfg()
    if a.action=="on": config["enabled"]=True; CONFIG.write_text(json.dumps(config,indent=2),encoding="utf-8"); result=status()
    elif a.action=="off": config["enabled"]=False; CONFIG.write_text(json.dumps(config,indent=2),encoding="utf-8"); result=status()
    elif a.action=="run":
        result=build_report() if config.get("enabled",True) else {"ok":True,"skipped":"disabled"}
    elif a.action=="paths": result={"home":str(ROOT),"config":str(CONFIG),"inbox":str(INBOX),"latest":str(ROOT/"latest.json")}
    else: result=status()
    print(json.dumps(result,ensure_ascii=False) if a.json else json.dumps(result,indent=2,ensure_ascii=False))
if __name__=="__main__": main()

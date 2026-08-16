from __future__ import annotations
from datetime import datetime
import argparse
import json
import platform
import shutil
import sys
import threading

from . import __version__
from .association import install as install_associations
from .clipboard import watch as clipboard_watch
from .cloud import daemon as cloud_daemon, pair as cloud_pair, sync_device_schedules_to_local, report_device_schedule_state, sync_help_center
from .config import Config, home_dir
from .dlp import evaluate as evaluate_dlp
from .executor import rollback
from .helpdb import load as load_help, page as page_help, render as render_help
from .pack import load_pack, save_abpack, summary
from .policy import evaluate
from .runner import execute_pack_path
from .scheduler import SchedulerEngine, add_schedule, load_schedules, remove_schedule, approve_schedule
from .telemetry import flush as flush_telemetry

def _print(obj): print(json.dumps(obj,indent=2,default=str))

def cmd_init(args):
    cfg=Config.load(); load_help(); out={"home":str(home_dir()),"device_id":cfg.data["device_id"],"cloud_url":cfg.data["cloud_url"],"telemetry":cfg.data.get("telemetry",{}),"dlp":cfg.data.get("dlp",{}),"dlp_note":"Quillgeist sensitive-data protection is enabled by default and scans locally before execution. Use `agentbridge dlp status` to review it.","help_center":str(home_dir()/"help"/"help.json")}
    if not getattr(args,"no_associations",False):
        try: out["associations"]=install_associations(False)
        except Exception as exc: out["association_warning"]=str(exc)
    _print(out)

def cmd_inspect(args): _print(summary(load_pack(args.pack)))

def _approve(pack,cfg,explicit=False):
    dlp=evaluate_dlp(pack.manifest,cfg.data.get("dlp",{}),approved=explicit)
    if dlp.get("action")=="deny":
        print("Quillgeist blocked this run: Strict sensitive-data protection detected:",", ".join(sorted(dlp.get("counts",{}))))
        return False
    if dlp.get("action")=="approval_required" and not explicit:
        if not sys.stdin.isatty(): return False
        print("Quillgeist sensitive-data warning:",", ".join(sorted(dlp.get("counts",{}))))
        print("The matching values stay local and are not printed here.")
        if input("Approve this run without redacting the detected data? [y/N] ").strip().lower() not in {"y","yes"}:
            return False
        explicit=True
    d=evaluate(pack.manifest,cfg.data.get("policy",{}),approved=False)
    if d.denied: return False
    if not d.needs_approval: return True
    if explicit: return True
    if not sys.stdin.isatty(): return False
    print("AgentBridge requests:",", ".join(d.needs_approval))
    return input("Approve this run? [y/N] ").strip().lower() in {"y","yes"}

def cmd_run(args):
    cfg=Config.load(); pack=load_pack(args.pack); approved=_approve(pack,cfg,explicit=args.approve_all)
    result=execute_pack_path(args.pack,cfg,args.workspace,approved=approved); _print(result)
    raise SystemExit(0 if result.get("status")=="passed" else 2)

def cmd_open(args):
    from pathlib import Path
    p=Path(args.pack)
    if p.suffix.lower()==".abresult":
        _print(json.loads(p.read_text(encoding="utf-8"))); return
    cfg=Config.load(); pack=load_pack(args.pack); _print(summary(pack))
    if sys.stdin.isatty() and _approve(pack,cfg): _print(execute_pack_path(args.pack,cfg,approved=True))

def cmd_rollback(args): _print(rollback(args.run_id,args.workspace))

def cmd_make_pack(args):
    from pathlib import Path
    manifest=json.loads(Path(args.manifest).read_text(encoding="utf-8")); _print({"created":str(save_abpack(manifest,args.output))})

def cmd_pair(args):
    cfg=Config.load(); result=cloud_pair(cfg,args.cloud); _print(result); print(f"Enter pairing code {result['pair_code']} at {cfg.data['cloud_url']}")

def _scheduled_run(row):
    cfg=Config.load(); print(f"Running scheduled pack {row['pack_path']}")
    result=execute_pack_path(row["pack_path"],cfg,approved=bool(row.get("approved_local")))
    _print({"schedule_id":row["id"],"result":result})
    return result

def _schedule_after_run(row,result):
    if row.get("source")=="cloud":
        try: report_device_schedule_state(Config.load(),row,result)
        except Exception as exc: print(f"Unable to report schedule state: {exc}")

def _schedule_sync_loop(cfg):
    import time
    help_tick=0
    while True:
        try: sync_device_schedules_to_local(cfg)
        except Exception as exc: print(f"Schedule sync unavailable: {exc}")
        if help_tick<=0:
            try: sync_help_center(cfg)
            except Exception as exc: print(f"Help Center sync unavailable: {exc}")
            help_tick=2
        else:
            help_tick-=1
        time.sleep(30)

def cmd_daemon(args):
    cfg=Config.load(); load_help(); engine=SchedulerEngine(_scheduled_run,after_run=_schedule_after_run)
    thread=threading.Thread(target=engine.run_forever,daemon=True); thread.start()
    sync_thread=threading.Thread(target=_schedule_sync_loop,args=(cfg,),daemon=True); sync_thread.start()
    try: cloud_daemon(cfg)
    finally: engine.stop()

def _parse_at(value:str)->float:
    dt=datetime.fromisoformat(value)
    if dt.tzinfo is None: dt=dt.astimezone()
    return dt.timestamp()

def cmd_schedule(args):
    if args.schedule_command=="list": _print(load_schedules())
    elif args.schedule_command=="add":
        _print(add_schedule(args.pack,at_epoch=_parse_at(args.at) if args.at else None,every_seconds=args.every,owner=args.owner,device_id=Config.load().data["device_id"]))
    elif args.schedule_command=="remove": _print({"removed":remove_schedule(args.id)})
    elif args.schedule_command=="approve": _print({"approved":approve_schedule(args.id,True),"id":args.id})
    elif args.schedule_command=="revoke": _print({"revoked":approve_schedule(args.id,False),"id":args.id})

def cmd_clipboard(args):
    cfg=Config.load(); mode=args.mode or cfg.data.get("clipboard_mode","detect")
    def trusted(path):
        if cfg.data.get("owner_mode") and cfg.data.get("trusted_auto_run"): _print(execute_pack_path(path,cfg,approved=True))
        else: print("Trusted auto-run blocked: enable owner_mode and trusted_auto_run in config.")
    clipboard_watch(mode,on_trusted=trusted)

def cmd_associations(args): _print(install_associations(args.include_md_json))

def cmd_telemetry(args):
    cfg=Config.load()
    if args.telemetry_command=="status": _print({"settings":cfg.data.get("telemetry",{}),"queue":str(home_dir()/"telemetry-queue.jsonl")})
    elif args.telemetry_command=="flush": _print(flush_telemetry(cfg,limit=args.limit))
    elif args.telemetry_command=="on": cfg.data.setdefault("telemetry",{})["enabled"]=True; cfg.save(); _print({"enabled":True})
    elif args.telemetry_command=="off": cfg.data.setdefault("telemetry",{})["enabled"]=False; cfg.save(); _print({"enabled":False})

def cmd_dlp(args):
    cfg=Config.load(); settings=cfg.data.setdefault("dlp",{})
    command=args.dlp_command
    if command=="status":
        _print({"settings":settings,"default":"standard","note":"Detection occurs locally. Finding reports omit the matching secret."}); return
    if command=="off":
        settings["enabled"]=False; settings["mode"]="off"
    else:
        settings["enabled"]=True; settings["mode"]="standard" if command=="on" else command
    cfg.save(); _print({"settings":settings})

def cmd_help_center(args):
    if args.json:
        _print(load_help()); return
    if args.search:
        print(render_help("all",query=args.search,limit=args.limit)); return
    if args.no_pager:
        print(render_help(args.section,limit=args.limit)); return
    page_help(args.section,limit=args.limit)

def cmd_doctor(args):
    cfg=Config.load(); runtimes={x:shutil.which(x) for x in ["git","node","python","python3","pwsh","powershell","ollama"]}
    _print({"version":__version__,"platform":platform.platform(),"python":sys.version,"device_id":cfg.data["device_id"],"cloud_url":cfg.data["cloud_url"],"runtimes":runtimes,"allowed_workspaces":cfg.data.get("allowed_workspaces"),"policy":cfg.data.get("policy"),"dlp":cfg.data.get("dlp"),"telemetry":cfg.data.get("telemetry"),"help_center":str(home_dir()/"help"/"help.json")})

def build_parser():
    p=argparse.ArgumentParser(prog="agentbridge",description="AgentBridge local execution node"); sub=p.add_subparsers(dest="command",required=True)
    x=sub.add_parser("init"); x.add_argument("--no-associations",action="store_true"); x.set_defaults(func=cmd_init)
    x=sub.add_parser("inspect"); x.add_argument("pack"); x.set_defaults(func=cmd_inspect)
    x=sub.add_parser("open"); x.add_argument("pack"); x.set_defaults(func=cmd_open)
    x=sub.add_parser("run"); x.add_argument("pack"); x.add_argument("--workspace"); x.add_argument("--approve-all",action="store_true"); x.set_defaults(func=cmd_run)
    x=sub.add_parser("rollback"); x.add_argument("run_id"); x.add_argument("--workspace",required=True); x.set_defaults(func=cmd_rollback)
    x=sub.add_parser("make-pack"); x.add_argument("manifest"); x.add_argument("output"); x.set_defaults(func=cmd_make_pack)
    x=sub.add_parser("pair"); x.add_argument("--cloud"); x.set_defaults(func=cmd_pair)
    x=sub.add_parser("daemon"); x.set_defaults(func=cmd_daemon)
    x=sub.add_parser("clipboard-watch"); x.add_argument("--mode",choices=["off","detect","import","trusted"]); x.set_defaults(func=cmd_clipboard)
    x=sub.add_parser("install-associations"); x.add_argument("--include-md-json",action="store_true"); x.set_defaults(func=cmd_associations)
    x=sub.add_parser("doctor"); x.set_defaults(func=cmd_doctor)
    x=sub.add_parser("telemetry"); ts=x.add_subparsers(dest="telemetry_command",required=True); ts.add_parser("status"); f=ts.add_parser("flush"); f.add_argument("--limit",type=int,default=100); ts.add_parser("on"); ts.add_parser("off"); x.set_defaults(func=cmd_telemetry)
    x=sub.add_parser("dlp",help="Quillgeist local sensitive-data protection"); ds=x.add_subparsers(dest="dlp_command",required=True); [ds.add_parser(name) for name in ["status","on","standard","strict","monitor","off"]]; x.set_defaults(func=cmd_dlp)
    x=sub.add_parser("help"); x.add_argument("section",nargs="?",default="all",choices=["all","start","setup","remove","faq","glossary","fixes"]); x.add_argument("--search"); x.add_argument("--limit",type=int,default=100); x.add_argument("--json",action="store_true"); x.add_argument("--no-pager",action="store_true"); x.set_defaults(func=cmd_help_center)
    x=sub.add_parser("schedule"); ss=x.add_subparsers(dest="schedule_command",required=True)
    a=ss.add_parser("add"); a.add_argument("pack"); a.add_argument("--at"); a.add_argument("--every",type=int); a.add_argument("--owner",choices=["device","cloud"],default="device")
    ss.add_parser("list"); r=ss.add_parser("remove"); r.add_argument("id"); ap=ss.add_parser("approve"); ap.add_argument("id"); rv=ss.add_parser("revoke"); rv.add_argument("id"); x.set_defaults(func=cmd_schedule)
    return p

def main(argv=None):
    args=build_parser().parse_args(argv); return args.func(args)

if __name__=="__main__": main()

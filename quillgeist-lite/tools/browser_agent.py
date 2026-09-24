#!/usr/bin/env python3
"""Quillgeist Lite local browser operator."""
from __future__ import annotations
import argparse, json, os, pathlib, re, time
from typing import Any

VERSION = "2026.09.24.1"
def as_bool(v:str)->bool: return str(v).strip().lower() not in {"0","false","no","off"}
def clip(v:Any,n:int=500)->str:
    s="" if v is None else str(v)
    return s if len(s)<=n else s[:n]+"…"
def emit(v:dict[str,Any])->None:
    # Keep the control-plane stream ASCII-safe even when a page contains symbols
    # outside the active Windows console code page.
    print(json.dumps(v,ensure_ascii=True,separators=(",",":")),flush=True)
def esc(v:str)->str: return v.replace("\\","\\\\").replace('"','\\"')
def candidate(item):
    ident=str(item.get("id") or "")
    if ident and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.:-]*",ident): return "#"+ident
    for key,attr in (("name","name"),("aria","aria-label"),("placeholder","placeholder")):
        val=str(item.get(key) or "")
        if val: return f'[{attr}="{esc(val)}"]'
    return str(item.get("tag") or "*")

def inspect_page(page):
    loc=page.locator("input,textarea,select,button,a,[contenteditable='true'],[role='button'],[role='textbox'],[role='link'],[role='checkbox'],[role='combobox']")
    out=[]
    for i in range(min(loc.count(),200)):
        try:
            item=loc.nth(i).evaluate("""el=>({tag:(el.tagName||'').toLowerCase(),type:el.getAttribute('type')||'',id:el.id||'',name:el.getAttribute('name')||'',placeholder:el.getAttribute('placeholder')||'',aria:el.getAttribute('aria-label')||'',role:el.getAttribute('role')||'',text:(el.innerText||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,240),value:('value' in el?String(el.value||''):''),editable:el.getAttribute('contenteditable')==='true',disabled:!!el.disabled})""")
            item["index"]=i; item["selector"]=candidate(item)
            out.append({k:(clip(v,260) if isinstance(v,str) else v) for k,v in item.items()})
        except Exception: pass
    return {"title":clip(page.title(),300),"url":page.url,"interactive":out}

def resolve(page,step):
    if step.get("selector"): return page.locator(str(step["selector"])).first
    if step.get("label"): return page.get_by_label(str(step["label"])).first
    if step.get("role"): return page.get_by_role(str(step["role"]),name=step.get("name")).first
    if step.get("text"): return page.get_by_text(str(step["text"]),exact=bool(step.get("exact",False))).first
    raise ValueError("step requires selector, label, role, or text")

def run_steps(page,steps,wait_ms):
    results=[]
    for i,step in enumerate(steps):
        if not isinstance(step,dict): raise ValueError(f"step {i} is not an object")
        op=str(step.get("op") or step.get("action") or "").lower().strip()
        timeout=int(step.get("timeout_ms") or 15000); r={"index":i,"op":op,"ok":True}
        if op in {"goto","open","navigate"}:
            page.goto(str(step.get("url") or ""),wait_until="domcontentloaded",timeout=timeout); r["url"]=page.url
        elif op=="fill": resolve(page,step).fill(str(step.get("value") or ""),timeout=timeout)
        elif op=="type": resolve(page,step).type(str(step.get("value") or ""),delay=int(step.get("delay_ms") or 20),timeout=timeout)
        elif op=="click": resolve(page,step).click(timeout=timeout)
        elif op=="select": resolve(page,step).select_option(value=step.get("value"),timeout=timeout)
        elif op=="check": resolve(page,step).check(timeout=timeout)
        elif op=="uncheck": resolve(page,step).uncheck(timeout=timeout)
        elif op=="press": resolve(page,step).press(str(step.get("key") or "Enter"),timeout=timeout)
        elif op=="wait": page.wait_for_timeout(max(0,min(int(step.get("ms") or wait_ms),60000)))
        elif op=="screenshot":
            p=pathlib.Path(str(step.get("path") or "qq-browser.png")).expanduser()
            if not p.is_absolute():
                d=pathlib.Path(os.environ.get("LOCALAPPDATA","."))/"Clintware"/"QuillgeistLite"/"screenshots"; d.mkdir(parents=True,exist_ok=True); p=d/p.name
            page.screenshot(path=str(p),full_page=bool(step.get("full_page",False))); r["path"]=str(p)
        elif op=="extract": r["text"]=clip(resolve(page,step).inner_text(timeout=timeout),int(step.get("max_chars") or 4000))
        elif op=="inspect": r["page"]=inspect_page(page)
        else: raise ValueError(f"step {i}: unsupported op '{op}'")
        settle=int(step.get("settle_ms") or wait_ms)
        if settle>0 and op not in {"wait","screenshot","extract","inspect"}: page.wait_for_timeout(min(settle,5000))
        results.append(r)
    return results

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--action",required=True); ap.add_argument("--url",default=""); ap.add_argument("--selector",default="")
    ap.add_argument("--value",default=""); ap.add_argument("--steps-json",default=""); ap.add_argument("--headless",default="true"); ap.add_argument("--wait-ms",type=int,default=700)
    a=ap.parse_args()
    from playwright.sync_api import sync_playwright
    local=pathlib.Path(os.environ.get("LOCALAPPDATA",pathlib.Path.home()))
    profile=local/"Clintware"/"QuillgeistLite"/"browser-profile"; profile.mkdir(parents=True,exist_ok=True)
    headless=as_bool(a.headless); action=a.action.lower().strip()
    with sync_playwright() as p:
        opts={"user_data_dir":str(profile),"headless":headless,"viewport":{"width":1440,"height":1000},"args":["--disable-session-crashed-bubble","--no-first-run"]}
        try: ctx=p.chromium.launch_persistent_context(channel="msedge",**opts)
        except Exception: ctx=p.chromium.launch_persistent_context(**opts)
        try:
            page=ctx.pages[0] if ctx.pages else ctx.new_page(); page.set_default_timeout(15000)
            if a.url: page.goto(a.url,wait_until="domcontentloaded",timeout=30000); page.wait_for_timeout(max(0,min(a.wait_ms,5000)))
            if action in {"open","login"}:
                emit({"ok":True,"action":action,"title":clip(page.title()),"url":page.url,"headless":headless})
                if action=="login" and not headless:
                    while ctx.pages: time.sleep(.5)
                return 0
            if action=="inspect": emit({"ok":True,"action":action,**inspect_page(page)}); return 0
            if action=="fill":
                if not a.selector: raise ValueError("--selector is required for fill")
                page.locator(a.selector).first.fill(a.value); emit({"ok":True,"action":action,"url":page.url}); return 0
            if action=="click":
                if not a.selector: raise ValueError("--selector is required for click")
                page.locator(a.selector).first.click(); emit({"ok":True,"action":action,"url":page.url}); return 0
            if action=="run":
                parsed=json.loads(a.steps_json); steps=parsed.get("steps") if isinstance(parsed,dict) else parsed
                if not isinstance(steps,list) or len(steps)>100: raise ValueError("steps-json must contain a list of at most 100 steps")
                results=run_steps(page,steps,a.wait_ms)
                emit({"ok":True,"action":action,"title":clip(page.title()),"url":page.url,"results":results,"final":inspect_page(page)}); return 0
            raise ValueError(f"unsupported action '{action}'")
        finally:
            if action!="login" or headless: ctx.close()

if __name__=="__main__":
    try: raise SystemExit(main())
    except KeyboardInterrupt: raise
    except Exception as exc:
        emit({"ok":False,"error":type(exc).__name__,"detail":clip(exc,2000)}); raise SystemExit(1)

#!/usr/bin/env python3
"""Quillgeist Lite local browser operator with governed live-web capabilities."""
from __future__ import annotations
import argparse, base64, ipaddress, json, os, pathlib, re, socket, sys, time
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

try:
    if hasattr(sys.stdout,"reconfigure"): sys.stdout.reconfigure(encoding="utf-8",errors="backslashreplace")
    if hasattr(sys.stderr,"reconfigure"): sys.stderr.reconfigure(encoding="utf-8",errors="backslashreplace")
except Exception: pass

VERSION="2026.09.25.1"
MAX_STEPS=100
DEFAULT_MAX_CHARS=20000
DEFAULT_SEARCH_RESULTS=8
SENSITIVE_RE=re.compile(r"(password|passwd|passcode|one.?time|otp|verification.?code|cvv|cvc|credit.?card|card.?number|security.?code|client.?secret|api.?key|access.?token|refresh.?token|private.?key|ssn|social.?security)",re.I)
CONSEQUENTIAL_RE=re.compile(r"\b(delete|remove|destroy|purchase|buy|checkout|pay|transfer|wire|send money|place order|publish|post publicly|authorize|approve|confirm purchase|confirm payment|book now|reserve now|sign agreement|accept offer|invite user|remove user)\b",re.I)

def as_bool(v:Any)->bool: return str(v).strip().lower() not in {"","0","false","no","off","none"}
def clip(v:Any,n:int=500)->str:
    s="" if v is None else str(v)
    return s if len(s)<=n else s[:n]+"…"
def emit(v:dict[str,Any])->None: print(json.dumps(v,ensure_ascii=True,separators=(",",":")),flush=True)
def esc(v:str)->str: return v.replace("\\","\\\\").replace('"','\\"')
def candidate(item):
    ident=str(item.get("id") or "")
    if ident and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.:-]*",ident): return "#"+ident
    for key,attr in (("name","name"),("aria","aria-label"),("placeholder","placeholder")):
        val=str(item.get(key) or "")
        if val: return f'[{attr}="{esc(val)}"]'
    return str(item.get("tag") or "*")
def is_sensitive_meta(item)->bool:
    material=" ".join(str(item.get(k) or "") for k in ("type","name","placeholder","aria","autocomplete","id"))
    return str(item.get("type") or "").lower()=="password" or bool(SENSITIVE_RE.search(material))

class NetworkPolicy:
    def __init__(self,allow_private:bool=False):
        self.allow_private=allow_private; self._cache={}
    def _host_allowed(self,host:str)->bool:
        host=(host or "").strip().strip("[]").lower()
        if not host: return False
        if self.allow_private: return True
        if host in {"localhost","localhost.localdomain"} or host.endswith(".local"): return False
        if host in self._cache: return self._cache[host]
        try:
            try: addresses=[str(ipaddress.ip_address(host.split("%",1)[0]))]
            except ValueError: addresses=[row[4][0] for row in socket.getaddrinfo(host,None,type=socket.SOCK_STREAM)]
        except socket.gaierror:
            self._cache[host]=False; return False
        allowed=True
        for raw in set(addresses):
            try:
                if not ipaddress.ip_address(raw.split("%",1)[0]).is_global: allowed=False; break
            except ValueError: allowed=False; break
        self._cache[host]=allowed; return allowed
    def validate(self,raw:str)->str:
        value=str(raw or "").strip(); parsed=urlparse(value)
        if parsed.scheme.lower() not in {"http","https"}: raise ValueError("only public http/https URLs are allowed")
        if parsed.username or parsed.password: raise ValueError("credentials embedded in URLs are not allowed")
        if not parsed.hostname: raise ValueError("URL must contain a hostname")
        if not self._host_allowed(parsed.hostname): raise ValueError("private, loopback, link-local, or reserved network destinations are blocked")
        return value
    def allow_request(self,raw:str)->bool:
        parsed=urlparse(str(raw or ""))
        if parsed.scheme in {"data","blob","about"}: return True
        if parsed.scheme not in {"http","https"}: return False
        try: self.validate(raw); return True
        except Exception: return False

def install_network_guard(context,policy):
    def guard(route):
        try:
            if policy.allow_request(route.request.url): route.continue_()
            else: route.abort("blockedbyclient")
        except Exception: route.abort("blockedbyclient")
    context.route("**/*",guard)
def safe_goto(page,url,policy,timeout=30000):
    response=page.goto(policy.validate(url),wait_until="domcontentloaded",timeout=timeout)
    policy.validate(page.url); return response
def element_meta(locator):
    try:
        return locator.evaluate(r"""el=>({tag:(el.tagName||'').toLowerCase(),type:el.getAttribute('type')||'',id:el.id||'',name:el.getAttribute('name')||'',placeholder:el.getAttribute('placeholder')||'',aria:el.getAttribute('aria-label')||'',role:el.getAttribute('role')||'',autocomplete:el.getAttribute('autocomplete')||'',text:(el.innerText||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,300),value:('value' in el?String(el.value||''):'')})""")
    except Exception: return {}
def ensure_not_sensitive(locator):
    if is_sensitive_meta(element_meta(locator)):
        raise PermissionError("qq will not remotely type passwords, OTPs, payment-card data, API keys, tokens, or other credentials; use web login <url> locally for manual authentication")
def ensure_action_allowed(locator,approved):
    if approved: return
    meta=element_meta(locator); material=" ".join(str(meta.get(k) or "") for k in ("text","value","aria","name","id","role"))
    if CONSEQUENTIAL_RE.search(material): raise PermissionError("consequential browser action requires explicit Approved=true authorization")
def inspect_page(page):
    loc=page.locator("input,textarea,select,button,a,[contenteditable='true'],[role='button'],[role='textbox'],[role='link'],[role='checkbox'],[role='combobox']")
    out=[]
    for i in range(min(loc.count(),200)):
        try:
            item=element_meta(loc.nth(i)); item["index"]=i; item["selector"]=candidate(item)
            if is_sensitive_meta(item):
                item["value"]="[REDACTED]" if item.get("value") else ""; item["sensitive"]=True
            out.append({k:(clip(v,260) if isinstance(v,str) else v) for k,v in item.items()})
        except Exception: pass
    return {"title":clip(page.title(),300),"url":page.url,"interactive":out}
def resolve(page,step):
    if step.get("selector"): return page.locator(str(step["selector"])).first
    if step.get("label"): return page.get_by_label(str(step["label"])).first
    if step.get("role"): return page.get_by_role(str(step["role"]),name=step.get("name")).first
    if step.get("text"): return page.get_by_text(str(step["text"]),exact=bool(step.get("exact",False))).first
    raise ValueError("step requires selector, label, role, or text")
def clean_result_href(href):
    href=str(href or "").strip()
    if not href: return ""
    parsed=urlparse(href); host=(parsed.hostname or "").lower()
    if "duckduckgo.com" in host and parsed.path.startswith("/l/"):
        uddg=parse_qs(parsed.query).get("uddg",[""])[0]
        if uddg: return unquote(uddg)
    if host.endswith("google.com") and parsed.path=="/url":
        target=parse_qs(parsed.query).get("q",[""])[0]
        if target.startswith(("http://","https://")): return target
    if host.endswith("bing.com") and parsed.path.startswith("/ck/a"):
        token=parse_qs(parsed.query.replace("!&&","")).get("u",[""])[0]
        if token.startswith("a1"):
            try:
                raw=token[2:]; raw += "="*((4-len(raw)%4)%4)
                decoded=base64.urlsafe_b64decode(raw.encode()).decode("utf-8","replace")
                if decoded.startswith(("http://","https://")): return decoded
            except Exception: pass
    return href

def extract_search_results(page,engine,limit):
    rows=page.evaluate("""() => Array.from(document.querySelectorAll('a[href]')).slice(0,1200).map(a=>({
      text:(a.innerText||a.textContent||'').trim().replace(/\\s+/g,' '),
      href:a.href||'',
      context:(a.closest('li,article,section,div')?.innerText||'').trim().replace(/\\s+/g,' ').slice(0,1400)
    }))""")
    results=[]; seen=set()
    for row in rows:
        title=re.sub(r"\\s+"," ",str(row.get("text") or "")).strip()
        href=clean_result_href(row.get("href") or "")
        if len(title)<3 or not href or href in seen: continue
        parsed=urlparse(href); host=(parsed.hostname or "").lower()
        if parsed.scheme not in {"http","https"}: continue
        provider_hosts={"google":("google.com","googleusercontent.com"),"brave":("search.brave.com",),"bing":("bing.com",),"duckduckgo":("duckduckgo.com",)}
        if any(host==h or host.endswith("."+h) for h in provider_hosts.get(engine,())): continue
        if title.lower() in {"privacy","terms","learn more","sign in","settings","feedback","accessibility feedback","all","web","search","images","videos","maps","news","shopping","flights"}: continue
        context=re.sub(r"\\s+"," ",str(row.get("context") or "")).strip()
        snippet=context[len(title):].strip(" -|:") if context.startswith(title) else context
        results.append({"title":clip(title,500),"url":href,"snippet":clip(snippet,1000)})
        seen.add(href)
        if len(results)>=limit: break
    return results

def search_web(page,query,engine,limit,policy):
    q=str(query or "").strip()
    if not q: raise ValueError("query is required for search")
    limit=max(1,min(int(limit or DEFAULT_SEARCH_RESULTS),20)); requested=str(engine or "auto").strip().lower()
    engines=["google","brave","bing","duckduckgo"] if requested=="auto" else [requested]
    if any(x not in {"google","brave","bing","duckduckgo"} for x in engines): raise ValueError("engine must be auto, google, brave, bing, or duckduckgo")
    urls={
        "google":"https://www.google.com/search?hl=en&num=20&q="+quote_plus(q),
        "brave":"https://search.brave.com/search?source=web&q="+quote_plus(q),
        "bing":"https://www.bing.com/search?q="+quote_plus(q)+"&setlang=en-us&cc=us",
        "duckduckgo":"https://html.duckduckgo.com/html/?q="+quote_plus(q),
    }
    errors=[]
    for name in engines:
        try:
            safe_goto(page,urls[name],policy); page.wait_for_timeout(700); results=extract_search_results(page,name,limit)
            if results: return {"query":q,"engine":name,"count":len(results),"results":results}
            errors.append(f"{name}: no results parsed")
        except Exception as exc: errors.append(f"{name}: {clip(exc,300)}")
    raise RuntimeError("search failed: "+"; ".join(errors))
def read_page(page,max_chars):
    limit=max(1000,min(int(max_chars or DEFAULT_MAX_CHARS),100000))
    snap=page.evaluate("""() => {
      const root=document.querySelector('main,article,[role="main"]')||document.body;
      const clean=s=>(s||'').replace(/\\r/g,'').replace(/\\n{3,}/g,'\\n\\n').trim();
      return {
        text:clean(root?.innerText||''),
        description:document.querySelector('meta[name="description"]')?.content||'',
        headings:Array.from(document.querySelectorAll('h1,h2,h3')).slice(0,80).map(x=>clean(x.innerText||x.textContent||'')).filter(Boolean),
        links:Array.from((root||document).querySelectorAll('a[href]')).slice(0,300).map(a=>({text:clean(a.innerText||a.textContent||'').replace(/\\s+/g,' '),url:a.href||''})).filter(x=>x.text&&x.url)
      };
    }""")
    text=str(snap.get("text") or "")
    headings=[clip(x,300) for x in (snap.get("headings") or [])]
    links=[]; seen=set()
    for row in snap.get("links") or []:
        href=str(row.get("url") or ""); label=str(row.get("text") or "")
        if href in seen or urlparse(href).scheme not in {"http","https"}: continue
        links.append({"text":clip(label,240),"url":href}); seen.add(href)
        if len(links)>=50: break
    return {"title":clip(page.title(),500),"url":page.url,"description":clip(snap.get("description") or "",1000),"headings":headings,"text":clip(text,limit),"links":links,"truncated":len(text)>limit}

def run_steps(page,steps,wait_ms,policy,approved,max_chars):
    results=[]
    for i,step in enumerate(steps):
        if not isinstance(step,dict): raise ValueError(f"step {i} is not an object")
        op=str(step.get("op") or step.get("action") or "").lower().strip(); timeout=int(step.get("timeout_ms") or 15000)
        step_approved=approved or as_bool(step.get("approved",False)); r={"index":i,"op":op,"ok":True}
        if op in {"goto","open","navigate"}: safe_goto(page,str(step.get("url") or ""),policy,timeout); r["url"]=page.url
        elif op=="fill":
            loc=resolve(page,step); ensure_not_sensitive(loc); loc.fill(str(step.get("value") or ""),timeout=timeout)
        elif op=="type":
            loc=resolve(page,step); ensure_not_sensitive(loc); loc.type(str(step.get("value") or ""),delay=int(step.get("delay_ms") or 20),timeout=timeout)
        elif op=="click":
            loc=resolve(page,step); ensure_action_allowed(loc,step_approved); loc.click(timeout=timeout)
        elif op=="select":
            loc=resolve(page,step); ensure_not_sensitive(loc); ensure_action_allowed(loc,step_approved); loc.select_option(value=step.get("value"),timeout=timeout)
        elif op=="check":
            loc=resolve(page,step); ensure_action_allowed(loc,step_approved); loc.check(timeout=timeout)
        elif op=="uncheck":
            loc=resolve(page,step); ensure_action_allowed(loc,step_approved); loc.uncheck(timeout=timeout)
        elif op=="press":
            loc=resolve(page,step); key=str(step.get("key") or "Enter")
            if key.lower() in {"enter","return"}: ensure_action_allowed(loc,step_approved)
            loc.press(key,timeout=timeout)
        elif op=="wait": page.wait_for_timeout(max(0,min(int(step.get("ms") or wait_ms),60000)))
        elif op=="wait_for": resolve(page,step).wait_for(state=str(step.get("state") or "visible"),timeout=timeout)
        elif op=="back": page.go_back(wait_until="domcontentloaded",timeout=timeout); policy.validate(page.url); r["url"]=page.url
        elif op=="reload": page.reload(wait_until="domcontentloaded",timeout=timeout); policy.validate(page.url); r["url"]=page.url
        elif op=="screenshot":
            p=pathlib.Path(str(step.get("path") or "qq-browser.png")).expanduser()
            if not p.is_absolute():
                d=pathlib.Path(os.environ.get("LOCALAPPDATA","."))/"Clintware"/"QuillgeistLite"/"screenshots"; d.mkdir(parents=True,exist_ok=True); p=d/p.name
            page.screenshot(path=str(p),full_page=bool(step.get("full_page",False))); r["path"]=str(p)
        elif op=="extract": r["text"]=clip(resolve(page,step).inner_text(timeout=timeout),int(step.get("max_chars") or 4000))
        elif op=="inspect": r["page"]=inspect_page(page)
        elif op=="read":
            if step.get("url"): safe_goto(page,str(step["url"]),policy,timeout)
            r["page"]=read_page(page,int(step.get("max_chars") or max_chars))
        elif op=="search": r["search"]=search_web(page,str(step.get("query") or ""),str(step.get("engine") or "auto"),int(step.get("max_results") or DEFAULT_SEARCH_RESULTS),policy)
        else: raise ValueError(f"step {i}: unsupported op '{op}'")
        settle=int(step.get("settle_ms") or wait_ms)
        if settle>0 and op not in {"wait","wait_for","screenshot","extract","inspect","read","search"}: page.wait_for_timeout(min(settle,5000))
        results.append(r)
    return results
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--action",required=True); ap.add_argument("--url",default=""); ap.add_argument("--selector",default="")
    ap.add_argument("--value",default=""); ap.add_argument("--steps-json",default=""); ap.add_argument("--query",default="")
    ap.add_argument("--engine",default="auto"); ap.add_argument("--max-results",type=int,default=DEFAULT_SEARCH_RESULTS)
    ap.add_argument("--max-chars",type=int,default=DEFAULT_MAX_CHARS); ap.add_argument("--headless",default="true")
    ap.add_argument("--wait-ms",type=int,default=700); ap.add_argument("--approved",default="false"); ap.add_argument("--allow-private",default="false")
    a=ap.parse_args()
    from playwright.sync_api import sync_playwright
    local=pathlib.Path(os.environ.get("LOCALAPPDATA",pathlib.Path.home())); profile=local/"Clintware"/"QuillgeistLite"/"browser-profile"; profile.mkdir(parents=True,exist_ok=True)
    headless=as_bool(a.headless); approved=as_bool(a.approved); policy=NetworkPolicy(allow_private=as_bool(a.allow_private)); action=a.action.lower().strip()
    if action=="login": headless=False
    with sync_playwright() as p:
        opts={"user_data_dir":str(profile),"headless":headless,"viewport":{"width":1440,"height":1000},"accept_downloads":False,"args":["--disable-session-crashed-bubble","--no-first-run"]}
        try: ctx=p.chromium.launch_persistent_context(channel="msedge",**opts)
        except Exception: ctx=p.chromium.launch_persistent_context(**opts)
        install_network_guard(ctx,policy)
        try:
            page=ctx.pages[0] if ctx.pages else ctx.new_page(); page.set_default_timeout(15000)
            if a.url: safe_goto(page,a.url,policy,30000); page.wait_for_timeout(max(0,min(a.wait_ms,5000)))
            if action in {"open","login"}:
                emit({"ok":True,"action":action,"title":clip(page.title()),"url":page.url,"headless":headless})
                if action=="login":
                    while ctx.pages: time.sleep(.5)
                return 0
            if action=="search": emit({"ok":True,"action":action,**search_web(page,a.query,a.engine,a.max_results,policy)}); return 0
            if action=="read":
                if not a.url: raise ValueError("--url is required for read")
                emit({"ok":True,"action":action,"page":read_page(page,a.max_chars)}); return 0
            if action=="inspect": emit({"ok":True,"action":action,**inspect_page(page)}); return 0
            if action=="fill":
                if not a.selector: raise ValueError("--selector is required for fill")
                loc=page.locator(a.selector).first; ensure_not_sensitive(loc); loc.fill(a.value); emit({"ok":True,"action":action,"url":page.url}); return 0
            if action=="click":
                if not a.selector: raise ValueError("--selector is required for click")
                loc=page.locator(a.selector).first; ensure_action_allowed(loc,approved); loc.click(); emit({"ok":True,"action":action,"url":page.url}); return 0
            if action=="run":
                parsed=json.loads(a.steps_json); steps=parsed.get("steps") if isinstance(parsed,dict) else parsed
                if not isinstance(steps,list) or len(steps)>MAX_STEPS: raise ValueError(f"steps-json must contain a list of at most {MAX_STEPS} steps")
                results=run_steps(page,steps,a.wait_ms,policy,approved,a.max_chars)
                emit({"ok":True,"action":action,"title":clip(page.title()),"url":page.url,"results":results,"final":inspect_page(page)}); return 0
            raise ValueError(f"unsupported action '{action}'")
        finally:
            if action!="login": ctx.close()
if __name__=="__main__":
    try: raise SystemExit(main())
    except KeyboardInterrupt: raise
    except Exception as exc:
        emit({"ok":False,"error":type(exc).__name__,"detail":clip(exc,2000)}); raise SystemExit(1)

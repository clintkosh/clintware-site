from __future__ import annotations

from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import platform
import secrets
import threading
import webbrowser

from .autonomy import AUTONOMY_LEVELS, IntentError, compile_intent, save_manifest_json
from .config import Config, home_dir
from .executor import execute
from .native_schedule import NativeScheduleError, install_windows_schedule
from .policy import evaluate
from .scheduler import add_schedule, approve_schedule


HTML = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<title>Quillgeist Local Autonomy</title>
<style>
:root{color-scheme:dark;--bg:#05070b;--bg2:#080d14;--line:rgba(164,206,235,.13);--line2:rgba(164,224,255,.24);--text:#f4f9fc;--muted:#8da0af;--cyan:#63e8ff;--mint:#6ef2b2;--amber:#ffd58a;--red:#ff8f9b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,var(--bg2),var(--bg));color:var(--text);min-height:100vh}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:54px 54px}button,input,textarea,select{font:inherit}code,pre,.mono{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace}main{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 52px;position:relative}header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:22px;border-bottom:1px solid var(--line)}.brand{font-weight:900;letter-spacing:.045em}.brand small{display:block;color:var(--muted);font-size:9px;letter-spacing:.16em;margin-top:3px}.local{font:700 10px/1.2 "SFMono-Regular",Consolas,monospace;color:var(--mint);letter-spacing:.12em;text-transform:uppercase}.flow{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--line);margin-bottom:32px}.flow span{padding:13px 8px;font:750 10px/1 "SFMono-Regular",Consolas,monospace;letter-spacing:.08em;color:var(--muted);text-align:center;position:relative}.flow span+span{border-left:1px solid var(--line)}.flow span.active{color:var(--cyan)}.flow span.active:after{content:"";position:absolute;left:20%;right:20%;bottom:-1px;height:1px;background:var(--cyan)}.intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.45fr);gap:34px;align-items:end;margin-bottom:28px}.kicker{font:800 10px/1 "SFMono-Regular",Consolas,monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--cyan)}h1{font-size:clamp(32px,5vw,58px);line-height:.96;letter-spacing:-.052em;margin:9px 0 12px;max-width:780px}p{color:var(--muted);line-height:1.55;margin:0}.truth{border-left:1px solid var(--line2);padding-left:18px;font-size:12px}.workbench{border-top:1px solid var(--line2);border-bottom:1px solid var(--line2);background:rgba(5,9,14,.58)}.row{display:grid;grid-template-columns:150px minmax(0,1fr);min-width:0;border-top:1px solid var(--line)}.row:first-child{border-top:0}.row-label{padding:18px 16px;font:800 10px/1.3 "SFMono-Regular",Consolas,monospace;letter-spacing:.11em;color:var(--muted);text-transform:uppercase;border-right:1px solid var(--line)}.row-body{padding:16px;min-width:0}textarea,input,select{width:100%;border:1px solid var(--line);background:#03070c;color:var(--text);border-radius:8px;padding:12px;outline:0}textarea:focus,input:focus,select:focus{border-color:rgba(99,232,255,.46);box-shadow:0 0 0 3px rgba(99,232,255,.06)}textarea{min-height:130px;resize:vertical;font-size:15px;line-height:1.5}.controls{display:grid;grid-template-columns:1fr 180px;gap:10px}.actions{display:flex;flex-wrap:wrap;gap:8px}.btn{border:1px solid var(--line2);background:#0b1119;color:var(--text);border-radius:8px;padding:10px 14px;font-weight:760;font-size:12px;cursor:pointer}.btn:hover{border-color:rgba(99,232,255,.42)}.btn.primary{background:var(--cyan);color:#041015;border-color:transparent}.btn.warn{color:var(--amber)}.btn:disabled{opacity:.42;cursor:not-allowed}.approval{display:flex;gap:9px;align-items:flex-start;font-size:12px;color:var(--muted);margin-top:12px}.approval input{width:auto;margin-top:2px}.result{display:none;margin-top:28px}.result.show{display:block}.result-head{display:flex;justify-content:space-between;gap:16px;align-items:end;border-bottom:1px solid var(--line2);padding-bottom:12px}.result-head h2{margin:4px 0 0;font-size:22px;letter-spacing:-.025em}.status{font:750 10px/1 "SFMono-Regular",Consolas,monospace;color:var(--mint);text-transform:uppercase;letter-spacing:.08em}.readout{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--line)}.readout>section{padding:18px 0}.readout>section+section{padding-left:22px;border-left:1px solid var(--line)}h3{font:800 10px/1 "SFMono-Regular",Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}.lines{font-size:13px;line-height:1.7}.lines div:before{content:"›";color:var(--cyan);margin-right:9px}.boundary div:before{color:var(--amber)}.power{padding-top:20px}.power-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}pre{margin:0;background:#020508;border:1px solid var(--line);border-radius:8px;padding:16px;overflow:auto;max-height:420px;color:#c6d7e2;font-size:12px;line-height:1.62;white-space:pre-wrap}.execution{margin-top:18px;border-left:2px solid var(--line2);padding:12px 0 12px 16px}.execution.good{border-color:var(--mint)}.execution.bad{border-color:var(--red)}.execution pre{margin-top:10px;max-height:260px}.history{margin-top:34px}.history h2{font-size:18px;margin:0 0 12px}.history-row{display:grid;grid-template-columns:130px 150px 100px 1fr;gap:12px;padding:10px 0;border-top:1px solid var(--line);font-size:11px;color:var(--muted)}.history-row code{color:var(--text)}.note{font-size:11px;color:var(--muted);margin-top:8px}.error{color:var(--red)}@media(max-width:760px){.intro{grid-template-columns:1fr}.truth{border-left:0;border-top:1px solid var(--line);padding:14px 0 0}.row{grid-template-columns:1fr}.row-label{border-right:0;border-bottom:1px solid var(--line);padding:10px 14px}.controls{grid-template-columns:1fr}.readout{grid-template-columns:1fr}.readout>section+section{padding-left:0;border-left:0;border-top:1px solid var(--line)}.flow span{font-size:8px}.history-row{grid-template-columns:1fr 1fr}.history-row span:last-child{grid-column:1/-1}}
</style></head>
<body><main>
<header><div class="brand">QUILLGEIST<small>BY CLINTWARE · LOCAL AUTONOMY</small></div><div class="local">127.0.0.1 · LOCAL ONLY</div></header>
<nav class="flow" aria-label="Quillgeist intent flow"><span class="active">TYPE</span><span>UNDERSTAND</span><span>IMPROVE</span><span>EXECUTE</span><span>LEARN</span></nav>
<section class="intro"><div><div class="kicker">Deterministic intent compiler · alpha</div><h1>Say what should happen. Inspect what will run.</h1><p>Quillgeist compiles only intents it can prove it understands. It emits inspectable PowerShell, executes under your local policy, verifies the result, and uses bounded E3 repair where a known local recovery exists.</p></div><p class="truth"><strong>Current truth:</strong> deterministic local execution works for a bounded capability set. This is not an LLM replacement and it does not claim arbitrary reasoning. Ambiguous intent is rejected instead of guessed.</p></section>
<form id="form" class="workbench"><div class="row"><div class="row-label">TYPE / intent</div><div class="row-body"><textarea id="intent" required spellcheck="true" placeholder="Example: Check https://clintware.com every hour and make sure it is available"></textarea><div class="note">Supported now: endpoint health, Windows service/process state, Git repo inspect or fast-forward sync, directory state, explicit PowerShell.</div></div></div><div class="row"><div class="row-label">CONTEXT</div><div class="row-body controls"><input id="workspace" value="." aria-label="Workspace"><select id="autonomy" aria-label="Autonomy"><option value="recommend">Recommend · preview</option><option value="observe">Observe · no repair</option><option value="safe">Safe · retry only</option><option value="managed">Managed · bounded repair</option><option value="autonomous">Autonomous · bounded repair + retry</option></select></div></div><div class="row"><div class="row-label">ACTION</div><div class="row-body"><div class="actions"><button class="btn primary" type="submit">Prepare intent</button><button class="btn" id="run" type="button" disabled>Execute locally</button><button class="btn warn" id="schedule" type="button" disabled>Install local schedule</button></div><label class="approval"><input id="approve" type="checkbox"><span>Explicitly approve capabilities that my local Quillgeist policy marks <code>ask</code> for this run or schedule. Policy entries marked <code>never</code> remain blocked.</span></label></div></div></form>
<section id="result" class="result" aria-live="polite"><div class="result-head"><div><div class="kicker">Compiler result</div><h2 id="type">—</h2></div><div id="status" class="status">prepared</div></div><div class="readout"><section><h3>UNDERSTAND</h3><div id="understanding" class="lines"></div></section><section><h3>BOUNDARIES</h3><div id="boundaries" class="lines boundary"></div></section></div><section class="power"><div class="power-top"><h3>IMPROVE / GENERATED POWERSHELL</h3><span id="confidence" class="status"></span></div><pre id="powershell"></pre></section><div id="execution" class="execution" hidden></div></section>
<section class="history"><div class="kicker">LEARN / local evidence</div><h2>Recent outcomes</h2><div id="history"><p class="note">No local outcomes recorded yet.</p></div><p class="note">“Learn” currently means retaining outcome evidence for validated recipes. Adaptive intent learning remains in development until demonstrated.</p></section>
</main><script>
const SESSION="__SESSION__";let prepared=null;const $=s=>document.querySelector(s);async function api(path,body){const r=await fetch(path,{method:body?"POST":"GET",headers:{"content-type":"application/json","x-quillgeist-session":SESSION},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({error:"Invalid local response"}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}function payload(){return{intent:$("#intent").value.trim(),workspace:$("#workspace").value.trim()||".",autonomy:$("#autonomy").value,approve:$("#approve").checked}}function lines(id,values){$(id).innerHTML=(values||[]).map(x=>`<div>${String(x).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</div>`).join("")}function render(c){prepared=c;$("#result").classList.add("show");$("#type").textContent=c.intent_type.replaceAll("_"," ");$("#confidence").textContent=Math.round(c.confidence*100)+"% confidence";lines("#understanding",c.understanding);lines("#boundaries",c.boundaries);$("#powershell").textContent=c.powershell;$("#run").disabled=false;$("#schedule").disabled=!c.schedule_seconds;$("#status").textContent=c.schedule_seconds?`prepared · every ${c.schedule_seconds}s`:"prepared";$("#execution").hidden=true}function showExec(label,data,ok=true){const el=$("#execution");el.hidden=false;el.className="execution "+(ok?"good":"bad");el.innerHTML=`<strong>${label}</strong><pre></pre>`;el.querySelector("pre").textContent=JSON.stringify(data,null,2)}async function refreshHistory(){try{const s=await api("/api/state");const rows=s.history||[];$("#history").innerHTML=rows.length?rows.map(x=>`<div class="history-row"><span>${x.at||""}</span><code>${x.intent_type||""}</code><span>${x.status||""}</span><span>${x.detail||""}</span></div>`).join(""):'<p class="note">No local outcomes recorded yet.</p>'}catch{}}
$("#form").addEventListener("submit",async e=>{e.preventDefault();$("#status").textContent="compiling";try{render(await api("/api/compile",payload()))}catch(err){prepared=null;$("#result").classList.add("show");$("#type").textContent="intent refused";$("#status").textContent="not compiled";$("#powershell").textContent=err.message;lines("#understanding",[]);lines("#boundaries",["Quillgeist did not invent a command for this request."]);$("#run").disabled=true;$("#schedule").disabled=true}});$("#run").addEventListener("click",async()=>{if(!prepared)return;$("#status").textContent="executing";try{const r=await api("/api/run",payload());showExec("EXECUTE / RESULT",r,r.result?.status==="passed");$("#status").textContent=r.result?.status||"complete";refreshHistory()}catch(err){showExec("EXECUTE / BLOCKED",{error:err.message},false);$("#status").textContent="blocked"}});$("#schedule").addEventListener("click",async()=>{if(!prepared)return;$("#status").textContent="scheduling";try{const r=await api("/api/schedule",payload());showExec("LOCAL SCHEDULE",r,true);$("#status").textContent="scheduled";refreshHistory()}catch(err){showExec("SCHEDULE / BLOCKED",{error:err.message},false);$("#status").textContent="blocked"}});refreshHistory();
</script></body></html>'''


def _history_path() -> Path:
    return home_dir() / "autonomy" / "history.jsonl"


def _record(intent_type: str, status: str, detail: str = "") -> None:
    path = _history_path(); path.parent.mkdir(parents=True, exist_ok=True)
    row = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "intent_type": intent_type, "status": status, "detail": str(detail)[:240]}
    with path.open("a", encoding="utf-8") as handle: handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def _history(limit: int = 12) -> list[dict]:
    path = _history_path()
    if not path.exists(): return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        try: rows.append(json.loads(line))
        except Exception: continue
    return rows[-limit:][::-1]


class LocalAutonomyServer(ThreadingHTTPServer):
    daemon_threads = True; allow_reuse_address = True
    def __init__(self, address, handler, session_token: str):
        super().__init__(address, handler); self.session_token = session_token


class Handler(BaseHTTPRequestHandler):
    server_version = "QuillgeistLocal/1"
    def log_message(self, format, *args): return
    def _headers(self, status=200, content_type="application/json; charset=utf-8"):
        self.send_response(status); self.send_header("content-type", content_type); self.send_header("cache-control", "no-store"); self.send_header("x-content-type-options", "nosniff"); self.send_header("content-security-policy", "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"); self.end_headers()
    def _json(self, payload, status=200):
        body = json.dumps(payload, default=str).encode("utf-8"); self._headers(status); self.wfile.write(body)
    def _authorized(self): return secrets.compare_digest(self.headers.get("x-quillgeist-session", ""), self.server.session_token)
    def _body(self):
        length = min(int(self.headers.get("content-length", "0") or 0), 1024 * 1024); return json.loads(self.rfile.read(length).decode("utf-8") or "{}")
    def do_GET(self):
        if self.path == "/":
            body = HTML.replace("__SESSION__", self.server.session_token).encode("utf-8"); self._headers(200, "text/html; charset=utf-8"); self.wfile.write(body); return
        if self.path == "/api/state":
            if not self._authorized(): self._json({"error": "Local session token required."}, 403); return
            self._json({"product": "Quillgeist", "mode": "local_autonomy", "host": "127.0.0.1", "platform": platform.system().lower(), "autonomy_levels": AUTONOMY_LEVELS, "history": _history()}); return
        self._json({"error": "Not found."}, 404)
    def do_POST(self):
        if not self._authorized(): self._json({"error": "Local session token required."}, 403); return
        try:
            body = self._body(); compiled = compile_intent(body.get("intent", ""), workspace=body.get("workspace") or ".", autonomy=body.get("autonomy") or "recommend")
            if self.path == "/api/compile": self._json(compiled.to_dict()); return
            cfg = Config.load(); approved = bool(body.get("approve")); decision = evaluate(compiled.manifest, cfg.data.get("policy", {}), approved=approved)
            if decision.denied: self._json({"error": "Local policy denies required capabilities.", "denied": decision.denied}, 403); return
            if decision.needs_approval and not approved: self._json({"error": "Local policy requires explicit approval.", "needs_approval": decision.needs_approval}, 409); return
            if self.path == "/api/run":
                result = execute(compiled.execution_pack(), cfg, workspace_override=compiled.workspace, approved=approved); _record(compiled.intent_type, result.get("status", "unknown"), result.get("error") or "local execution"); self._json({"compiled": compiled.to_dict(), "result": result}); return
            if self.path == "/api/schedule":
                every = compiled.schedule_seconds
                if not every: self._json({"error": "No cadence found. Include 'every hour', 'daily', etc."}, 400); return
                pack_path = save_manifest_json(compiled, home_dir() / "autonomy" / "packs" / f"{compiled.id}.json")
                if platform.system().lower() == "windows":
                    if "admin" in compiled.manifest.get("permissions", []): self._json({"error": "Admin-level repair is not installed as a LIMITED Windows scheduled task. Run it interactively or create an explicitly elevated task."}, 409); return
                    schedule = install_windows_schedule(pack_path, every, approve_all=approved)
                else:
                    row = add_schedule(str(pack_path), every_seconds=every, owner="device", device_id=cfg.data["device_id"])
                    if approved: approve_schedule(row["id"], True); row["approved_local"] = True
                    schedule = {"provider": "quillgeist_device_scheduler", **row}
                _record(compiled.intent_type, "scheduled", schedule.get("task_name") or schedule.get("id") or ""); self._json({"compiled": compiled.to_dict(), "schedule": schedule}); return
            self._json({"error": "Not found."}, 404)
        except IntentError as exc: self._json({"error": str(exc)}, 422)
        except NativeScheduleError as exc: self._json({"error": str(exc)}, 400)
        except Exception as exc: self._json({"error": str(exc)}, 500)


def serve(host: str = "127.0.0.1", port: int = 8789, *, open_browser: bool = True):
    if host not in {"127.0.0.1", "localhost", "::1"}: raise ValueError("Quillgeist Local Autonomy only binds to loopback.")
    token = secrets.token_urlsafe(24); server = LocalAutonomyServer((host, int(port)), Handler, token); url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"Quillgeist Local Autonomy: {url}"); print("Local-only control surface. Close this process to stop the local server.")
    if open_browser: threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    try: server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt: pass
    finally: server.server_close()


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(prog="quillgeist local", description="Open the localhost-only Quillgeist autonomy workbench."); parser.add_argument("--port", type=int, default=8789); parser.add_argument("--no-browser", action="store_true"); args = parser.parse_args(argv); serve(port=args.port, open_browser=not args.no_browser); return 0


if __name__ == "__main__": raise SystemExit(main())

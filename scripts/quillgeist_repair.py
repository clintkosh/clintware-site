from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"repair marker not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_all(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"repair marker not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new), encoding="utf-8")


core = "agentbridge-cloud/src/index.js"
entry = "agentbridge-cloud/src/entry.js"
app = "agentbridge-cloud/public/app.js"
deploy = ".github/workflows/agentbridge-deploy-cloud.yml"

# Register real account existence so a typoed control key cannot silently open a new empty namespace.
replace_once(
    core,
    '    if (request.method === "GET" && url.pathname === "/state") {',
    '''    if (request.method === "POST" && url.pathname === "/init-account") {
      const existing = await this.ctx.storage.get("account_meta");
      if (!existing) await this.ctx.storage.put("account_meta", {created_at:nowIso(),version:1});
      return json({ok:true});
    }
    if (request.method === "GET" && url.pathname === "/exists") {
      const meta = await this.ctx.storage.get("account_meta");
      if (meta) return json({exists:true});
      const [devices,jobs,schedules,metrics] = await Promise.all([
        this.ctx.storage.get("devices"), this.ctx.storage.get("jobs"), this.ctx.storage.get("schedules"), this.ctx.storage.get("metrics")
      ]);
      const legacy = Boolean(devices?.length || jobs?.length || schedules?.length || Number(metrics?.runs || 0) > 0);
      if (legacy) await this.ctx.storage.put("account_meta", {created_at:"legacy-alpha",migrated_at:nowIso(),version:1});
      return json({exists:legacy});
    }
    if (request.method === "GET" && url.pathname === "/state") {''',
)

replace_once(
    core,
    '''async function accountContext(request, env) {
  const token=bearer(request); if (!token) return null;
  const accountId=await sha256(token); return {token,accountId,account:env.ACCOUNT_HUB.getByName(accountId)};
}''',
    '''async function accountContext(request, env) {
  const token=bearer(request); if (!token) return null;
  const accountId=await sha256(token); const account=env.ACCOUNT_HUB.getByName(accountId);
  const exists=await (await account.fetch("https://internal/exists")).json();
  if (!exists.exists) return null;
  return {token,accountId,account};
}''',
)

replace_once(
    core,
    '''      if (request.method==="POST"&&url.pathname==="/api/account/bootstrap") {
        const account_token=randomToken(32); return json({account_token,account_id:await sha256(account_token),plan:"alpha"});
      }''',
    '''      if (request.method==="POST"&&url.pathname==="/api/account/bootstrap") {
        const account_token=randomToken(32); const account_id=await sha256(account_token);
        const account=env.ACCOUNT_HUB.getByName(account_id);
        await account.fetch(new Request("https://internal/init-account",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
        return json({account_token,account_id,plan:"alpha"});
      }''',
)

# Prevent malformed repeat intervals from creating runaway or nonsensical schedules.
replace_once(
    core,
    '        const next=Number(d.next_run_at); if (!Number.isFinite(next)||next<Date.now()-1000) return json({error:"invalid_next_run_at"},400);',
    '''        const next=Number(d.next_run_at); if (!Number.isFinite(next)||next<Date.now()-1000) return json({error:"invalid_next_run_at"},400);
        const every=d.every_seconds==null?null:Number(d.every_seconds);
        if(every!==null&&(!Number.isFinite(every)||every<60)) return json({error:"invalid_repeat_interval","minimum_seconds":60},400);
        d.every_seconds=every;''',
)

# Keep the account-visible schedule record synchronized after cloud alarms fire.
replace_once(
    core,
    '''    if (s.every_seconds) {
      const next=Date.now()+Number(s.every_seconds)*1000; s.next_run_at=next; await this.ctx.storage.put("schedule",s); await this.ctx.storage.setAlarm(next);
    } else { s.enabled=false; await this.ctx.storage.put("schedule",s); }''',
    '''    if (s.every_seconds) {
      const next=Date.now()+Number(s.every_seconds)*1000; s.next_run_at=next; await this.ctx.storage.put("schedule",s); await this.ctx.storage.setAlarm(next);
    } else { s.enabled=false; await this.ctx.storage.put("schedule",s); }
    await account.fetch(new Request("https://internal/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(s)}));''',
)

# The deployed ScheduleHub adds telemetry, so synchronize its account-visible state too.
replace_once(
    entry,
    '''    if(s.every_seconds){
      const next=Date.now()+Number(s.every_seconds)*1000;s.next_run_at=next;await this.ctx.storage.put("schedule",s);await this.ctx.storage.setAlarm(next);
    }else{s.enabled=false;await this.ctx.storage.put("schedule",s);}
  }''',
    '''    if(s.every_seconds){
      const next=Date.now()+Number(s.every_seconds)*1000;s.next_run_at=next;await this.ctx.storage.put("schedule",s);await this.ctx.storage.setAlarm(next);
    }else{s.enabled=false;await this.ctx.storage.put("schedule",s);}
    await account.fetch(new Request("https://internal/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(s)}));
  }''',
)

# Apply the same account-key validity check to telemetry/help routes owned by the entry wrapper.
replace_once(
    entry,
    '''const accountContext=async(request,env)=>{
  const token=bearer(request);if(!token)return null;
  const accountId=await sha256(token);
  return{
    token,accountId,
    telemetry:env.TELEMETRY_HUB.getByName(accountId),
    help:env.HELP_HUB.getByName(accountId),
    account:env.ACCOUNT_HUB.getByName(accountId)
  };
};''',
    '''const accountContext=async(request,env)=>{
  const token=bearer(request);if(!token)return null;
  const accountId=await sha256(token);const account=env.ACCOUNT_HUB.getByName(accountId);
  const exists=await(await account.fetch("https://internal/exists")).json();if(!exists.exists)return null;
  return{
    token,accountId,
    telemetry:env.TELEMETRY_HUB.getByName(accountId),
    help:env.HELP_HUB.getByName(accountId),
    account
  };
};''',
)

# Public naming should be Quillgeist while retaining the runtime name only as explicit compatibility metadata.
replace_once(
    entry,
    'if(request.method==="GET"&&url.pathname==="/api/health")return json({ok:true,service:"AgentBridge Cloud",version:"0.1.0-alpha.2",time:new Date().toISOString()});',
    'if(request.method==="GET"&&url.pathname==="/api/health")return json({ok:true,service:"Quillgeist Cloud",runtime:"AgentBridge Cloud",version:"0.1.0-alpha.2",time:new Date().toISOString()});',
)
replace_all(entry, 'filename=agentbridge-report.csv', 'filename=quillgeist-report.csv')

# Remove legacy public-facing strings from the browser app while retaining internal compatibility keys.
replacements = {
    'Run <code>agentbridge pair</code>': 'Run <code>quillgeist pair</code>',
    'No AgentBridge product bugs reported.': 'No Quillgeist product bugs reported.',
    'agentbridge-report-': 'quillgeist-report-',
    'AgentBridge Cloud ready.': 'Quillgeist Cloud ready.',
    'That key could not open an AgentBridge account.': 'That key could not open a Quillgeist account.',
    "Forget this browser's AgentBridge control key?": "Forget this browser's Quillgeist control key?",
    'title:"AgentBridge task"': 'title:"Quillgeist task"',
}
for old, new in replacements.items():
    replace_all(app, old, new)

replace_once(
    app,
    'if(token())try{await refresh()}catch(e){toast(e.message,"error")}',
    'if(token())try{await refresh()}catch(e){localStorage.removeItem(TOKEN_KEY);show();toast("Control key could not be restored. Create a new account or paste a valid key.","error")}',
)

# Deployment smoke test follows the public health identity.
replace_all(deploy, '\"service\":\"AgentBridge Cloud\"', '\"service\":\"Quillgeist Cloud\"')

print("Quillgeist alpha repair markers applied successfully")

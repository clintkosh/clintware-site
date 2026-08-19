import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const nowIso = () => new Date().toISOString();
const json = (value, status=200, extra={}) => new Response(JSON.stringify(value), {status, headers:{...JSON_HEADERS,...extra}});
const randomToken = (bytes=32) => {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
};
const sha256 = async (s) => {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
};
const bodyJson = async (request) => {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error("expected application/json");
  return await request.json();
};
const bearer = (request) => {
  const h = request.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
};
const trimHistory = (items, limit=100) => items.slice(Math.max(0, items.length-limit));
const payloadTooLarge = (value, limit=1_000_000) => JSON.stringify(value).length > limit;

export class AccountHub extends DurableObject {
  constructor(ctx, env) { super(ctx, env); }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/init-account") {
      const existing = await this.ctx.storage.get("account_meta");
      if (!existing) await this.ctx.storage.put("account_meta", {created_at:nowIso(),version:1});
      return json({ok:true});
    }
    if (request.method === "GET" && url.pathname === "/exists") {
      const meta = await this.ctx.storage.get("account_meta");
      if (meta) return json({exists:true});
      const [devices,jobs,schedules,metrics] = await Promise.all([
        this.ctx.storage.get("devices"),
        this.ctx.storage.get("jobs"),
        this.ctx.storage.get("schedules"),
        this.ctx.storage.get("metrics")
      ]);
      const legacy = Boolean(devices?.length || jobs?.length || schedules?.length || Number(metrics?.runs || 0) > 0);
      if (legacy) await this.ctx.storage.put("account_meta", {created_at:"legacy-alpha",migrated_at:nowIso(),version:1});
      return json({exists:legacy});
    }
    if (request.method === "GET" && url.pathname === "/state") {
      return json({
        devices: await this.ctx.storage.get("devices") || [],
        jobs: await this.ctx.storage.get("jobs") || [],
        schedules: await this.ctx.storage.get("schedules") || [],
        metrics: await this.ctx.storage.get("metrics") || {runs:0,passed:0,failed:0,tokens_avoided_est:0,local_tokens_est:0}
      });
    }
    if (request.method === "POST" && url.pathname === "/claim-device") {
      const d = await bodyJson(request);
      let devices = await this.ctx.storage.get("devices") || [];
      devices = devices.filter(x=>x.device_id!==d.device_id);
      devices.unshift({...d, claimed_at:nowIso()});
      await this.ctx.storage.put("devices", trimHistory(devices, 50));
      return json({ok:true});
    }
    if (request.method === "POST" && url.pathname === "/create-job") {
      const d = await bodyJson(request);
      let jobs = await this.ctx.storage.get("jobs") || [];
      const job = {...d, id:d.id||crypto.randomUUID(), status:"queued", created_at:nowIso(), approved:Boolean(d.approved)};
      jobs.unshift(job);
      await this.ctx.storage.put("jobs", trimHistory(jobs, 150));
      return json(job);
    }
    if (request.method === "POST" && url.pathname === "/job-status") {
      const d = await bodyJson(request);
      let jobs = await this.ctx.storage.get("jobs") || [];
      jobs = jobs.map(j=>j.id===d.id ? {...j,...d.patch,updated_at:nowIso()} : j);
      await this.ctx.storage.put("jobs", trimHistory(jobs,150));
      return json({ok:true});
    }
    if (request.method === "POST" && url.pathname === "/result") {
      const result = await bodyJson(request);
      let jobs = await this.ctx.storage.get("jobs") || [];
      jobs = jobs.map(j=>j.id===result.job_id ? {...j,status:result.status,result,updated_at:nowIso()} : j);
      await this.ctx.storage.put("jobs", trimHistory(jobs,150));
      let metrics = await this.ctx.storage.get("metrics") || {runs:0,passed:0,failed:0,tokens_avoided_est:0,local_tokens_est:0};
      if (!["approval_required","denied"].includes(result.status)) metrics.runs += 1;
      if (result.status === "passed") metrics.passed += 1;
      if (result.status === "failed") metrics.failed += 1;
      metrics.tokens_avoided_est += Number(result.contextor?.external_tokens_avoided_est || 0);
      metrics.local_tokens_est += Number(result.contextor?.local_llm_input_tokens_est || 0) + Number(result.contextor?.local_llm_output_tokens_est || 0);
      await this.ctx.storage.put("metrics", metrics);
      return json({ok:true});
    }
    if (request.method === "POST" && url.pathname === "/schedule") {
      const d = await bodyJson(request);
      let rows = await this.ctx.storage.get("schedules") || [];
      const row = {...d,id:d.id||crypto.randomUUID(),enabled:d.enabled!==false,updated_at:nowIso()};
      rows = rows.filter(x=>x.id!==row.id); rows.unshift(row);
      await this.ctx.storage.put("schedules", trimHistory(rows,100));
      return json(row);
    }
    if (request.method === "DELETE" && url.pathname.startsWith("/schedule/")) {
      const id = url.pathname.split("/").pop();
      let rows = await this.ctx.storage.get("schedules") || [];
      rows = rows.filter(x=>x.id!==id); await this.ctx.storage.put("schedules",rows);
      return json({ok:true});
    }
    if (request.method === "GET" && url.pathname === "/device-schedules") {
      const deviceId = url.searchParams.get("device_id");
      const rows = (await this.ctx.storage.get("schedules") || []).filter(x=>x.enabled&&x.owner==="device"&&x.device_id===deviceId);
      return json({schedules:rows});
    }
    if (request.method === "POST" && url.pathname === "/device-schedule-state") {
      const d = await bodyJson(request);
      let rows = await this.ctx.storage.get("schedules") || [];
      let found = false;
      rows = rows.map(row => {
        if (row.id !== d.id || row.device_id !== d.device_id || row.owner !== "device") return row;
        found = true;
        return {...row, next_run_at:Number(d.next_run_at)||row.next_run_at, enabled:Boolean(d.enabled), approved_local:Boolean(d.approved_local), last_status:d.last_status||row.last_status, last_run_at:d.last_run_at||row.last_run_at, device_updated_at:nowIso()};
      });
      if (!found) return json({error:"schedule_not_found"},404);
      await this.ctx.storage.put("schedules", rows);
      return json({ok:true});
    }
    return json({error:"not_found"},404);
  }
}

export class PairingHub extends DurableObject {
  constructor(ctx, env) { super(ctx, env); }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/init") {
      const d = await bodyJson(request); await this.ctx.storage.put("pairing",{...d,expires_at:Date.now()+10*60*1000}); return json({ok:true});
    }
    if (request.method === "POST" && url.pathname === "/claim") {
      const p = await this.ctx.storage.get("pairing");
      if (!p || p.expires_at < Date.now()) return json({error:"invalid_or_expired_pair_code"},404);
      await this.ctx.storage.delete("pairing"); return json(p);
    }
    return json({error:"not_found"},404);
  }
}

export class DeviceHub extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.env = env; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/init") {
      const d = await bodyJson(request); const existing = await this.ctx.storage.get("device");
      if (existing && existing.token_hash !== d.token_hash) return json({error:"device_id_already_registered"},409);
      await this.ctx.storage.put("device",{...existing,...d,updated_at:nowIso()}); return json({ok:true});
    }
    if (request.method === "POST" && url.pathname === "/claim") {
      const d = await bodyJson(request); const device = await this.ctx.storage.get("device");
      if (!device) return json({error:"device_not_initialized"},404);
      await this.ctx.storage.put("device",{...device,account_id:d.account_id,claimed_at:nowIso()});
      return json({ok:true,device:{device_id:device.device_id,device_name:device.device_name,platform:device.platform,node_version:device.node_version}});
    }
    if (request.method === "GET" && url.pathname === "/info") return json(await this.ctx.storage.get("device") || {});
    if (request.method === "POST" && url.pathname === "/dispatch") {
      const d = await bodyJson(request); let pending = await this.ctx.storage.get("pending") || []; const sockets = this.ctx.getWebSockets();
      if (sockets.length) {
        for (const ws of sockets) { try { ws.send(JSON.stringify({type:"job",job:d.job})); } catch {} }
      } else {
        pending.push(d.job); await this.ctx.storage.put("pending",trimHistory(pending,50));
      }
      return json({ok:true,online:sockets.length>0});
    }
    if (request.method === "GET" && url.pathname === "/ws") {
      if ((request.headers.get("upgrade")||"").toLowerCase()!=="websocket") return new Response("Expected WebSocket",{status:426});
      const device=await this.ctx.storage.get("device"); const token=url.searchParams.get("token")||"";
      if (!device || !token || await sha256(token)!==device.token_hash) return new Response("Unauthorized",{status:401});
      const pair=new WebSocketPair(); const [client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server); server.serializeAttachment({device_id:device.device_id,account_id:device.account_id});
      const pending=await this.ctx.storage.get("pending")||[];
      for (const job of pending) server.send(JSON.stringify({type:"job",job}));
      if (pending.length) await this.ctx.storage.put("pending",[]);
      await this.ctx.storage.put("last_seen",nowIso());
      return new Response(null,{status:101,webSocket:client});
    }
    return json({error:"not_found"},404);
  }
  async webSocketMessage(ws,message) {
    let data;
    try { data=JSON.parse(typeof message==="string"?message:new TextDecoder().decode(message)); }
    catch { ws.send(JSON.stringify({type:"error",error:"invalid_json"})); return; }
    const attachment=ws.deserializeAttachment()||{}; await this.ctx.storage.put("last_seen",nowIso());
    if (data.type==="hello"||data.type==="heartbeat") { ws.send(JSON.stringify({type:"ack",ts:Date.now()})); return; }
    if (data.type==="result"&&attachment.account_id) {
      const account=this.env.ACCOUNT_HUB.getByName(attachment.account_id);
      await account.fetch(new Request("https://internal/result",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data.result)}));
    }
  }
  async webSocketClose(ws,code,reason) { try { ws.close(code,reason); } catch {} }
  async webSocketError(ws,error) { console.error(JSON.stringify({event:"device_ws_error",error:String(error)})); }
}

export class ScheduleHub extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.env = env; }
  async fetch(request) {
    const url=new URL(request.url);
    if (request.method==="POST"&&url.pathname==="/set") {
      const d=await bodyJson(request); await this.ctx.storage.put("schedule",d);
      if (d.enabled&&d.owner==="cloud") await this.ctx.storage.setAlarm(Number(d.next_run_at)); else await this.ctx.storage.deleteAlarm();
      return json({ok:true});
    }
    if (request.method==="POST"&&url.pathname==="/cancel") { await this.ctx.storage.deleteAlarm(); await this.ctx.storage.delete("schedule"); return json({ok:true}); }
    return json({error:"not_found"},404);
  }
  async alarm() {
    const s=await this.ctx.storage.get("schedule"); if (!s||!s.enabled||s.owner!=="cloud") return;
    const account=this.env.ACCOUNT_HUB.getByName(s.account_id);
    const createResp=await account.fetch(new Request("https://internal/create-job",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      device_id:s.device_id,pack_name:s.pack_name,pack_text:s.pack_text,pack_b64:s.pack_b64,manifest:s.manifest,workspace:s.workspace,
      source:"cloud_schedule",schedule_id:s.id,approved:Boolean(s.approved)
    })}));
    const job=await createResp.json(); const device=this.env.DEVICE_HUB.getByName(s.device_id);
    await device.fetch(new Request("https://internal/dispatch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({job})}));
    if (s.every_seconds) {
      const next=Date.now()+Number(s.every_seconds)*1000; s.next_run_at=next; await this.ctx.storage.put("schedule",s); await this.ctx.storage.setAlarm(next);
    } else { s.enabled=false; await this.ctx.storage.put("schedule",s); }
    await account.fetch(new Request("https://internal/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(s)}));
  }
}

async function accountContext(request, env) {
  const token=bearer(request); if (!token) return null;
  const accountId=await sha256(token); const account=env.ACCOUNT_HUB.getByName(accountId);
  const exists=await (await account.fetch("https://internal/exists")).json();
  if (!exists.exists) return null;
  return {token,accountId,account};
}
async function deviceBelongs(account, deviceId) {
  const state=await (await account.fetch("https://internal/state")).json();
  return state.devices.some(d=>d.device_id===deviceId);
}

export default {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    try {
      if (request.method==="OPTIONS"&&url.pathname.startsWith("/api/")) return new Response(null,{status:204,headers:{
        "access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"GET,POST,DELETE,OPTIONS","access-control-max-age":"600"
      }});
      if (request.method==="GET"&&url.pathname==="/api/health") return json({ok:true,service:"AgentBridge Cloud",version:"0.1.0-alpha.1",time:nowIso()});
      if (request.method==="POST"&&url.pathname==="/api/account/bootstrap") {
        const account_token=randomToken(32); const account_id=await sha256(account_token);
        const account=env.ACCOUNT_HUB.getByName(account_id);
        await account.fetch(new Request("https://internal/init-account",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
        return json({account_token,account_id,plan:"alpha"});
      }
      if (request.method==="POST"&&url.pathname==="/api/pair/request") {
        const d=await bodyJson(request);
        if (!/^[A-Z2-9]{8}$/.test(d.pair_code||"")) return json({error:"invalid_pair_code"},400);
        if (!d.device_id||!d.device_token) return json({error:"missing_device_credentials"},400);
        const device=env.DEVICE_HUB.getByName(d.device_id); const token_hash=await sha256(d.device_token);
        const initBody={...d,token_hash}; delete initBody.device_token;
        let resp=await device.fetch(new Request("https://internal/init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(initBody)}));
        if (!resp.ok) return resp;
        const pairing=env.PAIRING_HUB.getByName(d.pair_code);
        await pairing.fetch(new Request("https://internal/init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
          device_id:d.device_id,device_name:d.device_name,platform:d.platform,node_version:d.node_version
        })}));
        return json({ok:true,expires_in_seconds:600});
      }
      if (request.method==="POST"&&url.pathname==="/api/pair/claim") {
        const auth=await accountContext(request,env); if (!auth) return json({error:"unauthorized"},401);
        const d=await bodyJson(request); const pairing=env.PAIRING_HUB.getByName(String(d.pair_code||"").toUpperCase());
        const claimResp=await pairing.fetch(new Request("https://internal/claim",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
        if (!claimResp.ok) return claimResp;
        const p=await claimResp.json(); const device=env.DEVICE_HUB.getByName(p.device_id);
        const deviceClaim=await device.fetch(new Request("https://internal/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({account_id:auth.accountId})}));
        const info=await deviceClaim.json();
        await auth.account.fetch(new Request("https://internal/claim-device",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(info.device)}));
        return json({ok:true,device:info.device});
      }
      if (request.method==="GET"&&url.pathname==="/api/state") {
        const auth=await accountContext(request,env); if (!auth) return json({error:"unauthorized"},401);
        const resp=await auth.account.fetch("https://internal/state"); return new Response(resp.body,{status:resp.status,headers:JSON_HEADERS});
      }
      if (request.method==="POST"&&url.pathname==="/api/jobs") {
        const auth=await accountContext(request,env); if (!auth) return json({error:"unauthorized"},401);
        const d=await bodyJson(request); if (payloadTooLarge(d)) return json({error:"execution_pack_too_large","limit_bytes":1000000},413); if (!d.device_id||!await deviceBelongs(auth.account,d.device_id)) return json({error:"device_not_owned"},403);
        const createResp=await auth.account.fetch(new Request("https://internal/create-job",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(d)}));
        const job=await createResp.json(); const device=env.DEVICE_HUB.getByName(d.device_id);
        const dispatched=await (await device.fetch(new Request("https://internal/dispatch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({job})}))).json();
        return json({...job,online:dispatched.online});
      }
      const approveMatch=url.pathname.match(/^\/api\/jobs\/([^/]+)\/approve$/);
      if (request.method==="POST"&&approveMatch) {
        const auth=await accountContext(request,env); if (!auth) return json({error:"unauthorized"},401);
        const state=await (await auth.account.fetch("https://internal/state")).json(); const existing=state.jobs.find(j=>j.id===approveMatch[1]);
        if (!existing) return json({error:"job_not_found"},404);
        if (!await deviceBelongs(auth.account,existing.device_id)) return json({error:"device_not_owned"},403);
        const job={...existing,approved:true,status:"queued",updated_at:nowIso()};
        await auth.account.fetch(new Request("https://internal/job-status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:job.id,patch:{approved:true,status:"queued"}})}));
        const device=env.DEVICE_HUB.getByName(job.device_id);
        await device.fetch(new Request("https://internal/dispatch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({job})}));
        return json({ok:true,job});
      }
      if (request.method==="POST"&&url.pathname==="/api/schedules") {
        const auth=await accountContext(request,env); if (!auth) return json({error:"unauthorized"},401);
        const d=await bodyJson(request); if (payloadTooLarge(d)) return json({error:"schedule_payload_too_large","limit_bytes":1000000},413); if (!d.device_id||!await deviceBelongs(auth.account,d.device_id)) return json({error:"device_not_owned"},403);
        const next=Number(d.next_run_at); if (!Number.isFinite(next)||next<Date.now()-1000) return json({error:"invalid_next_run_at"},400);
        const every=d.every_seconds==null?null:Number(d.every_seconds);
        if(every!==null&&(!Number.isFinite(every)||every<60)) return json({error:"invalid_repeat_interval","minimum_seconds":60},400);
        d.every_seconds=every;
        const rowResp=await auth.account.fetch(new Request("https://internal/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...d,account_id:auth.accountId,next_run_at:next})}));
        const row=await rowResp.json(); const sh=env.SCHEDULE_HUB.getByName(`${auth.accountId}:${row.id}`);
        await sh.fetch(new Request("https://internal/set",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...row,account_id:auth.accountId})}));
        return json(row);
      }
      const scheduleDelete=url.pathname.match(/^\/api\/schedules\/([^/]+)$/);
      if (request.method==="DELETE"&&scheduleDelete) {
        const auth=await accountContext(request,env); if (!auth) return json({error:"unauthorized"},401);
        await auth.account.fetch(new Request(`https://internal/schedule/${scheduleDelete[1]}`,{method:"DELETE"}));
        const sh=env.SCHEDULE_HUB.getByName(`${auth.accountId}:${scheduleDelete[1]}`);
        await sh.fetch(new Request("https://internal/cancel",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
        return json({ok:true});
      }
      if (request.method==="GET"&&url.pathname==="/api/device/schedules") {
        const deviceId=url.searchParams.get("device_id")||""; const token=bearer(request);
        if (!deviceId||!token) return json({error:"unauthorized"},401);
        const device=env.DEVICE_HUB.getByName(deviceId); const info=await (await device.fetch("https://internal/info")).json();
        if (!info.token_hash||await sha256(token)!==info.token_hash||!info.account_id) return json({error:"unauthorized"},401);
        const account=env.ACCOUNT_HUB.getByName(info.account_id); return await account.fetch(`https://internal/device-schedules?device_id=${encodeURIComponent(deviceId)}`);
      }
      if (request.method==="POST"&&url.pathname==="/api/device/schedules/state") {
        const d=await bodyJson(request); const deviceId=d.device_id||""; const token=bearer(request);
        if (!deviceId||!token) return json({error:"unauthorized"},401);
        const device=env.DEVICE_HUB.getByName(deviceId); const info=await (await device.fetch("https://internal/info")).json();
        if (!info.token_hash||await sha256(token)!==info.token_hash||!info.account_id) return json({error:"unauthorized"},401);
        const account=env.ACCOUNT_HUB.getByName(info.account_id);
        return await account.fetch(new Request("https://internal/device-schedule-state",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(d)}));
      }
      const wsMatch=url.pathname.match(/^\/ws\/device\/([^/]+)$/);
      if (request.method==="GET"&&wsMatch) {
        const stub=env.DEVICE_HUB.getByName(wsMatch[1]); const u=new URL("https://internal/ws"); u.search=url.search;
        return await stub.fetch(new Request(u,request));
      }
      if (url.pathname.startsWith("/api/")||url.pathname.startsWith("/ws/")) return json({error:"not_found"},404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({event:"request_error",path:url.pathname,error:String(error),stack:error?.stack}));
      return json({error:"internal_error",message:String(error)},500);
    }
  }
};
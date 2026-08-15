import core, { AccountHub, DeviceHub, PairingHub, ScheduleHub as CoreScheduleHub } from "./index.js";
import { TelemetryHub, ProductMetricsHub } from "./telemetry.js";
import { HelpHub } from "./help.js";

export { AccountHub, DeviceHub, PairingHub, TelemetryHub, ProductMetricsHub, HelpHub };

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...JSON_HEADERS,...extra}});
const bearer=(request)=>{const h=request.headers.get("authorization")||"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";};
const sha256=async(s)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");};
const accountContext=async(request,env)=>{
  const token=bearer(request);if(!token)return null;
  const accountId=await sha256(token);
  return{
    token,accountId,
    telemetry:env.TELEMETRY_HUB.getByName(accountId),
    help:env.HELP_HUB.getByName(accountId),
    account:env.ACCOUNT_HUB.getByName(accountId)
  };
};

async function deviceContext(request,env,body){
  const deviceId=String(body?.device_id||"");const token=bearer(request);if(!deviceId||!token)return null;
  const device=env.DEVICE_HUB.getByName(deviceId);const info=await(await device.fetch("https://internal/info")).json();
  if(!info.token_hash||!info.account_id||await sha256(token)!==info.token_hash)return null;
  return{
    deviceId,accountId:info.account_id,
    telemetry:env.TELEMETRY_HUB.getByName(info.account_id),
    help:env.HELP_HUB.getByName(info.account_id)
  };
}

async function recordCloudSend(telemetry,job,status="sent",source="cloud"){
  if(!telemetry||!job?.id)return;
  await telemetry.fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    event_id:`send:${source}:${job.id}:${crypto.randomUUID()}`,
    type:"cloud_send",ts:Date.now(),device_id:job.device_id,job_id:job.id,status,
    metadata:{source}
  })}));
}

export class ScheduleHub extends CoreScheduleHub{
  async alarm(){
    const s=await this.ctx.storage.get("schedule");if(!s||!s.enabled||s.owner!=="cloud")return;
    const account=this.env.ACCOUNT_HUB.getByName(s.account_id);
    const createResp=await account.fetch(new Request("https://internal/create-job",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      device_id:s.device_id,pack_name:s.pack_name,pack_text:s.pack_text,pack_b64:s.pack_b64,manifest:s.manifest,workspace:s.workspace,
      source:"cloud_schedule",schedule_id:s.id,approved:Boolean(s.approved)
    })}));
    const job=await createResp.json();
    const device=this.env.DEVICE_HUB.getByName(s.device_id);
    const dispatched=await(await device.fetch(new Request("https://internal/dispatch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({job})}))).json();
    const telemetry=this.env.TELEMETRY_HUB.getByName(s.account_id);
    await recordCloudSend(telemetry,job,dispatched.online===false?"queued_offline":"sent","cloud_schedule");
    if(s.every_seconds){
      const next=Date.now()+Number(s.every_seconds)*1000;s.next_run_at=next;await this.ctx.storage.put("schedule",s);await this.ctx.storage.setAlarm(next);
    }else{s.enabled=false;await this.ctx.storage.put("schedule",s);}
  }
}

async function reportJson(stub,path){
  const r=await stub.fetch(`https://internal${path}`);return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
}

function reportCsv(report){
  const columns=["event_id","ts","type","device_id","job_id","run_id","status","duration_ms","tokens_avoided_est","net_tokens_saved_est","local_tokens_est","raw_tokens_est","sent_tokens_est","error_kind","error_fingerprint","product_bug","changes_count","patch_count","node_version","error_message"];
  const q=(v)=>`"${String(v??"").replaceAll('"','""')}"`;
  return [columns.join(","),...(report.events||[]).map(row=>columns.map(c=>q(row[c])).join(","))].join("\n");
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    try{
      if(request.method==="POST"&&url.pathname==="/api/device/telemetry"){
        const body=await request.json();const auth=await deviceContext(request,env,body);
        if(!auth)return json({error:"unauthorized"},401);
        const event={...(body.event||{}),device_id:auth.deviceId};
        const r=await auth.telemetry.fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(event)}));
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="POST"&&url.pathname==="/api/device/help/sync"){
        const body=await request.json();const auth=await deviceContext(request,env,body);
        if(!auth)return json({error:"unauthorized"},401);
        const r=await auth.help.fetch(new Request("https://internal/sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({help:body.help||{}})}));
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="GET"&&url.pathname==="/api/help"){
        const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);
        return reportJson(auth.help,"/state");
      }
      if(request.method==="POST"&&url.pathname==="/api/help/sync"){
        const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);
        const body=await request.json();
        const r=await auth.help.fetch(new Request("https://internal/sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({help:body.help||body||{}})}));
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="GET"&&url.pathname==="/api/telemetry/summary"){
        const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);
        return reportJson(auth.telemetry,"/summary");
      }
      if(request.method==="GET"&&url.pathname==="/api/telemetry/report"){
        const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);
        const internal=new URL("https://internal/report");internal.search=url.search;
        const r=await auth.telemetry.fetch(internal.toString());
        if(!r.ok)return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
        if(url.searchParams.get("format")==="csv"){
          const report=await r.json();
          return new Response(reportCsv(report),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=agentbridge-report.csv","cache-control":"no-store"}});
        }
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="POST"&&url.pathname==="/api/telemetry/report-bug"){
        const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);
        const body=await request.json();
        const r=await auth.telemetry.fetch(new Request("https://internal/report-bug",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="GET"&&url.pathname==="/api/internal/product-metrics"){
        const provided=bearer(request);const expected=env.ADMIN_METRICS_TOKEN||"";
        if(!expected||!provided||await sha256(provided)!==await sha256(expected))return json({error:"unauthorized"},401);
        return reportJson(env.PRODUCT_METRICS_HUB.getByName("agentbridge-global"),"/summary");
      }

      const response=await core.fetch(request,env,ctx);
      if(response.ok&&request.method==="POST"&&url.pathname==="/api/jobs"){
        const auth=await accountContext(request,env);
        if(auth){
          try{const job=await response.clone().json();ctx.waitUntil(recordCloudSend(auth.telemetry,job,job.online===false?"queued_offline":"sent","manual"));}catch{}
        }
      }
      const approveMatch=url.pathname.match(/^\/api\/jobs\/([^/]+)\/approve$/);
      if(response.ok&&request.method==="POST"&&approveMatch){
        const auth=await accountContext(request,env);
        if(auth){
          try{const data=await response.clone().json();ctx.waitUntil(recordCloudSend(auth.telemetry,data.job,"sent","approval_retry"));}catch{}
        }
      }
      return response;
    }catch(error){
      console.error(JSON.stringify({event:"control_plane_error",path:url.pathname,error:String(error),stack:error?.stack}));
      return json({error:"internal_error",message:String(error)},500);
    }
  }
};

import core, { AccountHub, DeviceHub, PairingHub, ScheduleHub as CoreScheduleHub } from "./index.js";
import { TelemetryHub, ProductMetricsHub } from "./telemetry.js";
import { HelpHub } from "./help.js";
import { handleMcp, handlePublicApi } from "./public-api.js";

export { AccountHub, DeviceHub, PairingHub, TelemetryHub, ProductMetricsHub, HelpHub };

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...JSON_HEADERS,...extra}});
const bearer=(request)=>{const h=request.headers.get("authorization")||"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";};
const sha256=async(s)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");};
const accountContext=async(request,env)=>{
  const token=bearer(request);if(!token)return null;
  const accountId=await sha256(token);const account=env.ACCOUNT_HUB.getByName(accountId);
  const exists=await(await account.fetch("https://internal/exists")).json();if(!exists.exists)return null;
  return{token,accountId,telemetry:env.TELEMETRY_HUB.getByName(accountId),help:env.HELP_HUB.getByName(accountId),account};
};

async function deviceContext(request,env,body){
  const deviceId=String(body?.device_id||"");const token=bearer(request);if(!deviceId||!token)return null;
  const device=env.DEVICE_HUB.getByName(deviceId);const info=await(await device.fetch("https://internal/info")).json();
  if(!info.token_hash||!info.account_id||await sha256(token)!==info.token_hash)return null;
  return{deviceId,accountId:info.account_id,telemetry:env.TELEMETRY_HUB.getByName(info.account_id),help:env.HELP_HUB.getByName(info.account_id)};
}

async function recordCloudSend(telemetry,job,status="sent",source="cloud"){
  if(!telemetry||!job?.id)return;
  await telemetry.fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event_id:`send:${source}:${job.id}:${crypto.randomUUID()}`,type:"cloud_send",ts:Date.now(),device_id:job.device_id,job_id:job.id,status,metadata:{source}})}));
}

export class ScheduleHub extends CoreScheduleHub{
  async alarm(){
    const s=await this.ctx.storage.get("schedule");if(!s||!s.enabled||s.owner!=="cloud")return;
    const account=this.env.ACCOUNT_HUB.getByName(s.account_id);
    const createResp=await account.fetch(new Request("https://internal/create-job",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({device_id:s.device_id,pack_name:s.pack_name,pack_text:s.pack_text,pack_b64:s.pack_b64,manifest:s.manifest,workspace:s.workspace,source:"cloud_schedule",schedule_id:s.id,approved:Boolean(s.approved)})}));
    const job=await createResp.json();
    const device=this.env.DEVICE_HUB.getByName(s.device_id);
    const dispatched=await(await device.fetch(new Request("https://internal/dispatch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({job})}))).json();
    const telemetry=this.env.TELEMETRY_HUB.getByName(s.account_id);await recordCloudSend(telemetry,job,dispatched.online===false?"queued_offline":"sent","cloud_schedule");
    if(s.every_seconds){const next=Date.now()+Number(s.every_seconds)*1000;s.next_run_at=next;await this.ctx.storage.put("schedule",s);await this.ctx.storage.setAlarm(next);}else{s.enabled=false;await this.ctx.storage.put("schedule",s);}
    await account.fetch(new Request("https://internal/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(s)}));
  }
}

async function reportJson(stub,path){const r=await stub.fetch(`https://internal${path}`);return new Response(r.body,{status:r.status,headers:JSON_HEADERS});}
function reportCsv(report){
  const columns=["event_id","ts","type","device_id","job_id","run_id","status","duration_ms","tokens_avoided_est","net_tokens_saved_est","local_tokens_est","raw_tokens_est","sent_tokens_est","error_kind","error_fingerprint","product_bug","changes_count","patch_count","node_version","error_message"];
  const q=(v)=>`"${String(v??"").replaceAll('"','""')}"`;return [columns.join(","),...(report.events||[]).map(row=>columns.map(c=>q(row[c])).join(","))].join("\n");
}

async function rebrandPublicHtml(request,response){
  if(request.method!=="GET"||!response.ok)return response;
  const contentType=response.headers.get("content-type")||"";const pathname=new URL(request.url).pathname;const isHtml=contentType.includes("text/html");const isJs=contentType.includes("javascript")||pathname==="/app.js";
  if(!isHtml&&!isJs)return response;
  let body=await response.text();if(isHtml){body=body.replaceAll("AgentBridge Cloud","Quillgeist").replaceAll("AGENTBRIDGE","QUILLGEIST").replaceAll("AgentBridge","Quillgeist");}
  body=body.replaceAll("Run <code>quillgeist pair</code>","Run the downloaded Quillgeist executable with <code>pair</code>");
  const headers=new Headers(response.headers);headers.delete("content-length");return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function canonicalBugBody(telemetry,body){
  if(body.event_id||!body.job_id)return body;const r=await telemetry.fetch("https://internal/report?status=failed&limit=500");if(!r.ok)return body;const data=await r.json();const event=(data.events||[]).find(e=>e.job_id===body.job_id&&(e.type==="run_complete"||e.type==="error"));return event?{...body,event_id:event.event_id}:body;
}

async function publicProductStats(env,days=30){
  const stub=env.PRODUCT_METRICS_HUB.getByName("agentbridge-global");
  const r=await stub.fetch(`https://internal/impact?days=${Math.max(7,Math.min(90,Number(days)||30))}`);
  if(!r.ok)return json({error:"stats_unavailable"},503);
  const data=await r.json();const m=data.metrics||{};
  const metrics={
    prompts_compiled:Number(m.prompts_compiled||0),runs:Number(m.runs||0),compactions:Number(m.compactions||0),api_compactions:Number(m.api_compactions||0),pass_through_runs:Number(m.pass_through_runs||0),
    raw_tokens_est:Number(m.raw_tokens_est||0),sent_tokens_est:Number(m.sent_tokens_est||0),gross_tokens_removed_est:Number(m.tokens_avoided_est||0),net_tokens_saved_est:Number(m.net_tokens_saved_est||0),local_tokens_est:Number(m.local_tokens_est||0),
    compaction_rate_pct:Number(m.compaction_rate_pct||0),gross_reduction_pct:Number(m.gross_reduction_pct||0),net_savings_pct:Number(m.net_savings_pct||0),local_overhead_pct:Number(m.local_overhead_pct||0),
    passed:Number(m.passed||0),failed:Number(m.failed||0),patches_applied:Number(m.patches_applied||0),files_changed:Number(m.files_changed||0)
  };
  const trends=(data.trends||[]).map(row=>({date:String(row.date||""),prompts_compiled:Number(row.prompts_compiled||0),runs:Number(row.runs||0),compactions:Number(row.compactions||0),api_compactions:Number(row.api_compactions||0),raw_tokens_est:Number(row.raw_tokens_est||0),sent_tokens_est:Number(row.sent_tokens_est||0),gross_tokens_removed_est:Number(row.tokens_avoided_est||0),net_tokens_saved_est:Number(row.net_tokens_saved_est||0),local_tokens_est:Number(row.local_tokens_est||0),compaction_rate_pct:Number(row.compaction_rate_pct||0),net_savings_pct:Number(row.net_savings_pct||0)}));
  return json({generated_at:new Date().toISOString(),coverage:"participating Quillgeist installs and API/MCP calls with telemetry enabled",estimated_fields:["raw_tokens_est","sent_tokens_est","gross_tokens_removed_est","net_tokens_saved_est","local_tokens_est"],metrics,trends},200,{"cache-control":"public, max-age=120, s-maxage=300"});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    try{
      if(request.method==="GET"&&url.pathname==="/.well-known/openai-apps-challenge"){
        const token=String(env.OPENAI_APPS_CHALLENGE||"").trim();
        if(!token)return new Response("Not configured",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
        return new Response(token,{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
      }
      if(url.pathname==="/mcp")return handleMcp(request,env,ctx);
      if(url.pathname==="/api/v1"||url.pathname.startsWith("/api/v1/")){
        const apiResponse=await handlePublicApi(request,env,ctx);if(apiResponse)return apiResponse;
      }
      if(request.method==="GET"&&url.pathname==="/api/health")return json({ok:true,service:"Quillgeist Cloud",runtime:"AgentBridge Cloud",version:"0.1.0-alpha.3",api_version:"2026-08-23",mcp:"/mcp",time:new Date().toISOString()});
      if(request.method==="GET"&&url.pathname==="/api/public/product-stats")return publicProductStats(env,url.searchParams.get("days"));
      if(request.method==="POST"&&url.pathname==="/api/device/telemetry"){
        const body=await request.json();const auth=await deviceContext(request,env,body);if(!auth)return json({error:"unauthorized"},401);const event={...(body.event||{}),device_id:auth.deviceId};const r=await auth.telemetry.fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(event)}));return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="POST"&&url.pathname==="/api/device/help/sync"){
        const body=await request.json();const auth=await deviceContext(request,env,body);if(!auth)return json({error:"unauthorized"},401);const r=await auth.help.fetch(new Request("https://internal/sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({help:body.help||{}})}));return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="GET"&&url.pathname==="/api/help"){const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);return reportJson(auth.help,"/state");}
      if(request.method==="POST"&&url.pathname==="/api/help/sync"){const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);const body=await request.json();const r=await auth.help.fetch(new Request("https://internal/sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({help:body.help||body||{}})}));return new Response(r.body,{status:r.status,headers:JSON_HEADERS});}
      if(request.method==="GET"&&url.pathname==="/api/telemetry/summary"){const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);return reportJson(auth.telemetry,"/summary");}
      if(request.method==="GET"&&url.pathname==="/api/telemetry/report"){
        const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);const internal=new URL("https://internal/report");internal.search=url.search;const r=await auth.telemetry.fetch(internal.toString());if(!r.ok)return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
        if(url.searchParams.get("format")==="csv"){const report=await r.json();return new Response(reportCsv(report),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=quillgeist-report.csv","cache-control":"no-store"}});}return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }
      if(request.method==="POST"&&url.pathname==="/api/telemetry/report-bug"){const auth=await accountContext(request,env);if(!auth)return json({error:"unauthorized"},401);const requested=await request.json();const body=await canonicalBugBody(auth.telemetry,requested);const r=await auth.telemetry.fetch(new Request("https://internal/report-bug",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));return new Response(r.body,{status:r.status,headers:JSON_HEADERS});}
      if(request.method==="GET"&&url.pathname==="/api/internal/product-metrics"){const provided=bearer(request);const expected=env.ADMIN_METRICS_TOKEN||"";if(!expected||!provided||await sha256(provided)!==await sha256(expected))return json({error:"unauthorized"},401);return reportJson(env.PRODUCT_METRICS_HUB.getByName("agentbridge-global"),"/impact?days=90");}

      const response=await core.fetch(request,env,ctx);
      if(response.ok&&request.method==="POST"&&url.pathname==="/api/jobs"){
        const auth=await accountContext(request,env);if(auth){try{const job=await response.clone().json();ctx.waitUntil(recordCloudSend(auth.telemetry,job,job.online===false?"queued_offline":"sent","manual"));}catch{}}
      }
      const approveMatch=url.pathname.match(/^\/api\/jobs\/([^/]+)\/approve$/);
      if(response.ok&&request.method==="POST"&&approveMatch){const auth=await accountContext(request,env);if(auth){try{const data=await response.clone().json();ctx.waitUntil(recordCloudSend(auth.telemetry,data.job,"sent","approval_retry"));}catch{}}}
      return rebrandPublicHtml(request,response);
    }catch(error){console.error(JSON.stringify({event:"control_plane_error",path:url.pathname,error:String(error),stack:error?.stack}));return json({error:"internal_error",message:String(error)},500);}
  }
};
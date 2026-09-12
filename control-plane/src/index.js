import { DurableObject } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

const VERSION = "2026-09-12";
const JSON_HEADERS = {"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json = (value, status=200, extra={}) => new Response(JSON.stringify(value), {status, headers:{...JSON_HEADERS,...extra}});
const nowIso = () => new Date().toISOString();
const bearer = (request) => {
  const h=request.headers.get("authorization")||"";
  return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";
};
const sha256 = async (s) => {
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(s||"")));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
};
const b64 = (s) => btoa(unescape(encodeURIComponent(String(s))));
const fromB64 = (s) => decodeURIComponent(escape(atob(String(s||""))));
const clampDays = (v) => Math.max(1,Math.min(90,Number(v)||30));
const reqJson = async (request, max=512_000) => {
  const len=Number(request.headers.get("content-length")||0);
  if(len>max) throw Object.assign(new Error("request_too_large"),{status:413});
  const text=await request.text();
  if(text.length>max) throw Object.assign(new Error("request_too_large"),{status:413});
  try{return text?JSON.parse(text):{};}catch{throw Object.assign(new Error("invalid_json"),{status:400});}
};
const safeEq = async (a,b) => {
  if(!a||!b) return false;
  const [x,y]=await Promise.all([sha256(a),sha256(b)]);
  return x===y;
};

const DEFAULT_PROOFOS = {
  product:"proofos",
  environment:"production",
  version:1,
  repo:{owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["proofos/","control-plane/","public/proofos/"],allowed_workflows:["deploy-proofos.yml","deploy-control-plane.yml"]},
  dns:{allowed_names:["proof.clintware.com","mcp.clintware.com"]},
  capabilities:[
    "repo.read:clintware-site",
    "repo.write:proofos/**",
    "repo.write:control-plane/**",
    "repo.branch:create",
    "deployment.read",
    "deployment.execute:proof",
    "dns.ensure:proof.clintware.com",
    "analytics.write:proofos",
    "analytics.read:proofos",
    "research.invoke",
    "cache.read:proofos",
    "cache.write:proofos"
  ],
  deny:["secrets.read","billing.manage","repo.delete","repo.write:unrelated/**","infrastructure.admin:*"],
  telemetry_namespace:"proofos",
  created_at:"2026-09-12T00:00:00.000Z"
};

function normalizeProduct(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");}
function productHub(env, product){return env.PRODUCT_HUB.getByName(`product:${normalizeProduct(product)}`);}
function registryHub(env){return env.REGISTRY_HUB.getByName("registry:v1");}

export class RegistryHub extends DurableObject {
  constructor(ctx,env){super(ctx,env);}
  async ensureDefaults(){
    let products=await this.ctx.storage.get("products");
    if(!products){products={proofos:DEFAULT_PROOFOS};await this.ctx.storage.put("products",products);}
    return products;
  }
  async fetch(request){
    const url=new URL(request.url);
    const products=await this.ensureDefaults();
    if(request.method==="GET"&&url.pathname==="/list") return json({products:Object.values(products)});
    if(request.method==="GET"&&url.pathname.startsWith("/get/")){
      const key=normalizeProduct(url.pathname.split("/").pop());
      const manifest=products[key];
      return manifest?json({manifest}):json({error:"product_not_found"},404);
    }
    if(request.method==="POST"&&url.pathname==="/register"){
      const body=await reqJson(request);
      const product=normalizeProduct(body.product);
      if(!product) return json({error:"product_required"},400);
      const next={...body,product,updated_at:nowIso()};
      products[product]=next;
      await this.ctx.storage.put("products",products);
      return json({ok:true,manifest:next});
    }
    if(request.method==="POST"&&url.pathname==="/client"){
      const body=await reqJson(request);
      const product=normalizeProduct(body.product);
      if(!products[product]) return json({error:"product_not_found"},404);
      if(!body.token_hash) return json({error:"token_hash_required"},400);
      const clients=await this.ctx.storage.get("clients")||{};
      clients[product]={token_hash:String(body.token_hash),scopes:Array.isArray(body.scopes)?body.scopes:products[product].capabilities||[],updated_at:nowIso()};
      await this.ctx.storage.put("clients",clients);
      return json({ok:true});
    }
    if(request.method==="POST"&&url.pathname==="/verify"){
      const body=await reqJson(request);
      const product=normalizeProduct(body.product);
      const clients=await this.ctx.storage.get("clients")||{};
      const client=clients[product];
      if(!client||!body.token_hash||client.token_hash!==body.token_hash) return json({ok:false},401);
      return json({ok:true,scopes:client.scopes||[],manifest:products[product]});
    }
    return json({error:"not_found"},404);
  }
}

function eventTime(e){return Number(e.ts||Date.parse(e.timestamp||"")||Date.now());}
function withinDays(e,days){return eventTime(e)>=Date.now()-clampDays(days)*86400000;}
function inc(map,key,by=1){const k=String(key||"unknown");map[k]=(map[k]||0)+by;}

export class ProductHub extends DurableObject {
  constructor(ctx,env){super(ctx,env);}
  async events(){return await this.ctx.storage.get("events")||[];}
  async fetch(request){
    const url=new URL(request.url);
    if(request.method==="POST"&&url.pathname==="/event"){
      const body=await reqJson(request);
      const event={
        event_id:String(body.event_id||crypto.randomUUID()),
        timestamp:String(body.timestamp||nowIso()),
        ts:Number(body.ts||Date.now()),
        product:normalizeProduct(body.product),
        environment:String(body.environment||"production"),
        anonymous_session_id:String(body.anonymous_session_id||""),
        request_id:String(body.request_id||crypto.randomUUID()),
        feature:String(body.feature||body.type||"unknown"),
        action:String(body.action||body.type||"event"),
        route:String(body.route||""),
        provider:String(body.provider||""),
        model:String(body.model||""),
        cache_status:String(body.cache_status||""),
        research_freshness:String(body.research_freshness||""),
        tool_calls:Number(body.tool_calls||0),
        source_count:Number(body.source_count||0),
        first_party_source_count:Number(body.first_party_source_count||0),
        contradiction_count:Number(body.contradiction_count||0),
        evidence_nodes_considered:Number(body.evidence_nodes_considered||0),
        evidence_nodes_used:Number(body.evidence_nodes_used||0),
        latency_ms:Number(body.latency_ms||0),
        input_size:Number(body.input_size||0),
        output_size:Number(body.output_size||0),
        reported_api_cost:Number(body.reported_api_cost||0),
        estimated_cost_avoided:Number(body.estimated_cost_avoided||0),
        fallback_used:Boolean(body.fallback_used),
        success:body.success!==false,
        error_class:String(body.error_class||""),
        conversion_event:String(body.conversion_event||""),
        metadata:body.metadata&&typeof body.metadata==="object"?body.metadata:{}
      };
      let events=await this.events();
      if(events.some(x=>x.event_id===event.event_id)) return json({ok:true,deduped:true,event_id:event.event_id});
      events.push(event);
      if(events.length>10000) events=events.slice(-10000);
      await this.ctx.storage.put("events",events);
      return json({ok:true,event_id:event.event_id});
    }
    if(request.method==="GET"&&url.pathname==="/summary"){
      const days=clampDays(url.searchParams.get("days"));
      const events=(await this.events()).filter(e=>withinDays(e,days));
      const sessions=new Set(events.map(e=>e.anonymous_session_id).filter(Boolean));
      const providers={},features={},routes={},errors={},costByProvider={};
      let cost=0,avoided=0,cacheHits=0,fallbacks=0,successes=0;
      for(const e of events){
        inc(providers,e.provider||"local");inc(features,e.feature);inc(routes,e.route||"unspecified");
        if(e.error_class) inc(errors,e.error_class);
        const c=Number(e.reported_api_cost||0);cost+=c;avoided+=Number(e.estimated_cost_avoided||0);inc(costByProvider,e.provider||"local",c);
        if(e.cache_status==="hit") cacheHits++;if(e.fallback_used)fallbacks++;if(e.success)successes++;
      }
      return json({days,event_count:events.length,unique_sessions:sessions.size,success_rate:events.length?successes/events.length:1,total_reported_api_cost:cost,estimated_cost_avoided:avoided,cache_hits:cacheHits,cache_hit_rate:events.length?cacheHits/events.length:0,fallbacks,providers,provider_costs:costByProvider,features,routes,errors});
    }
    if(request.method==="GET"&&url.pathname==="/recent"){
      const limit=Math.max(1,Math.min(200,Number(url.searchParams.get("limit"))||50));
      const events=await this.events();return json({events:events.slice(-limit).reverse()});
    }
    if(request.method==="GET"&&url.pathname==="/errors"){
      const limit=Math.max(1,Math.min(200,Number(url.searchParams.get("limit"))||50));
      const events=(await this.events()).filter(e=>!e.success||e.error_class);return json({events:events.slice(-limit).reverse()});
    }
    if(request.method==="GET"&&url.pathname==="/daily"){
      const days=clampDays(url.searchParams.get("days"));
      const events=(await this.events()).filter(e=>withinDays(e,days));
      const daily={};
      for(const e of events){
        const date=new Date(eventTime(e)).toISOString().slice(0,10);
        const row=daily[date]||(daily[date]={date,events:0,sessions:new Set(),cost:0,errors:0,conversions:0});
        row.events++;if(e.anonymous_session_id)row.sessions.add(e.anonymous_session_id);row.cost+=Number(e.reported_api_cost||0);if(!e.success||e.error_class)row.errors++;if(e.conversion_event)row.conversions++;
      }
      return json({days,days_data:Object.values(daily).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({...r,sessions:r.sessions.size}))});
    }
    if(request.method==="GET"&&url.pathname==="/funnel"){
      const days=clampDays(url.searchParams.get("days"));
      const events=(await this.events()).filter(e=>withinDays(e,days));
      const steps=(url.searchParams.get("steps")||"proofos_open,role_analysis_started,role_analysis_completed,evidence_node_opened,resume_opened,meeting_clicked").split(",").map(s=>s.trim()).filter(Boolean);
      const bySession=new Map();
      for(const e of events){
        if(!e.anonymous_session_id)continue;
        const arr=bySession.get(e.anonymous_session_id)||[];arr.push(e);bySession.set(e.anonymous_session_id,arr);
      }
      const counts={};for(const s of steps)counts[s]=0;
      for(const arr of bySession.values()){
        arr.sort((a,b)=>eventTime(a)-eventTime(b));let cursor=0;
        for(const e of arr){
          if(cursor<steps.length&&(e.action===steps[cursor]||e.feature===steps[cursor])){counts[steps[cursor]]++;cursor++;}
        }
      }
      return json({days,steps,counts,sessions:bySession.size});
    }
    if(request.method==="GET"&&url.pathname==="/providers"){
      const days=clampDays(url.searchParams.get("days"));
      const events=(await this.events()).filter(e=>withinDays(e,days));
      const providers={};
      for(const e of events){
        const key=e.provider||"local";const row=providers[key]||(providers[key]={requests:0,cost:0,errors:0,latency_ms_total:0});
        row.requests++;row.cost+=Number(e.reported_api_cost||0);row.latency_ms_total+=Number(e.latency_ms||0);if(!e.success||e.error_class)row.errors++;
      }
      for(const row of Object.values(providers))row.avg_latency_ms=row.requests?row.latency_ms_total/row.requests:0;
      return json({days,providers});
    }
    if(request.method==="GET"&&url.pathname==="/cache"){
      const days=clampDays(url.searchParams.get("days"));
      const events=(await this.events()).filter(e=>withinDays(e,days)&&e.cache_status);
      const hits=events.filter(e=>e.cache_status==="hit").length;
      return json({days,cache_events:events.length,hits,misses:events.length-hits,hit_rate:events.length?hits/events.length:0});
    }
    if(request.method==="GET"&&url.pathname==="/conversions"){
      const days=clampDays(url.searchParams.get("days"));
      const events=(await this.events()).filter(e=>withinDays(e,days)&&e.conversion_event);
      const conversions={};for(const e of events)inc(conversions,e.conversion_event);
      return json({days,total:events.length,conversions});
    }
    return json({error:"not_found"},404);
  }
}

async function manifestFor(env,product){
  const r=await registryHub(env).fetch(`https://internal/get/${encodeURIComponent(normalizeProduct(product))}`);
  if(!r.ok)return null;return (await r.json()).manifest;
}
function capabilityMatches(manifest,capability){
  if(!manifest)return false;
  if((manifest.deny||[]).some(d=>d===capability||d.endsWith("*")&&capability.startsWith(d.slice(0,-1))))return false;
  return (manifest.capabilities||[]).some(c=>c===capability||c.endsWith("**")&&capability.startsWith(c.slice(0,-2))||c.endsWith("*")&&capability.startsWith(c.slice(0,-1)));
}
function pathAllowed(manifest,path){
  const p=String(path||"").replace(/^\/+/ ,"");
  return (manifest?.repo?.write_prefixes||[]).some(prefix=>p.startsWith(prefix));
}
async function verifyProductToken(request,env,product){
  const token=bearer(request);if(!token)return null;
  const token_hash=await sha256(token);
  const r=await registryHub(env).fetch(new Request("https://internal/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({product,token_hash})}));
  if(!r.ok)return null;return await r.json();
}
async function requireAdmin(request,env){
  const expected=String(env.CONTROL_PLANE_ADMIN_TOKEN||"");
  return expected&&await safeEq(bearer(request),expected);
}
async function requireMcp(request,env){
  const expected=String(env.CONTROL_PLANE_MCP_TOKEN||env.CONTROL_PLANE_ADMIN_TOKEN||"");
  return expected&&await safeEq(bearer(request),expected);
}
async function audit(env,product,action,requestId,details={},success=true,error_class=""){
  try{
    await productHub(env,product).fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      product,environment:"control-plane",request_id:requestId||crypto.randomUUID(),feature:"control_plane",action,provider:"clintware",success,error_class,metadata:details
    })}));
  }catch{}
}

async function github(env,path,init={}){
  const headers=new Headers(init.headers||{});
  headers.set("accept","application/vnd.github+json");headers.set("x-github-api-version","2022-11-28");headers.set("user-agent","Clintware-Control-Plane/1.0");
  if(env.GITHUB_CONTROL_PLANE_TOKEN)headers.set("authorization",`Bearer ${env.GITHUB_CONTROL_PLANE_TOKEN}`);
  return fetch(`https://api.github.com${path}`,{...init,headers});
}
async function repoRead(env,manifest,path,ref){
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const q=ref?`?ref=${encodeURIComponent(ref)}`:"";
  const r=await github(env,`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${q}`);
  if(!r.ok)return {ok:false,status:r.status,error:"github_read_failed",detail:await r.text()};
  const data=await r.json();
  if(Array.isArray(data))return {ok:true,type:"directory",items:data.map(x=>({name:x.name,path:x.path,type:x.type,sha:x.sha}))};
  return {ok:true,type:data.type,path:data.path,sha:data.sha,encoding:data.encoding,content:data.content?fromB64(data.content.replace(/\n/g,"")):"",html_url:data.html_url};
}
async function repoCreateBranch(env,manifest,branch,base){
  if(!env.GITHUB_CONTROL_PLANE_TOKEN)return {ok:false,status:503,error:"github_write_not_configured"};
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const get=await github(env,`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(base||manifest.repo.default_branch||"main")}`);
  if(!get.ok)return {ok:false,status:get.status,error:"base_ref_lookup_failed",detail:await get.text()};
  const baseData=await get.json();
  const r=await github(env,`/repos/${owner}/${repo}/git/refs`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:`refs/heads/${branch}`,sha:baseData.object.sha})});
  if(!r.ok)return {ok:false,status:r.status,error:"branch_create_failed",detail:await r.text()};
  return {ok:true,branch,sha:baseData.object.sha};
}
async function repoWrite(env,manifest,{path,content,message,branch,sha}){
  if(!env.GITHUB_CONTROL_PLANE_TOKEN)return {ok:false,status:503,error:"github_write_not_configured"};
  if(!pathAllowed(manifest,path))return {ok:false,status:403,error:"path_not_allowed"};
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const body={message:String(message||`Update ${path} via Clintware Control Plane`),content:b64(content),branch:String(branch||manifest.repo.default_branch||"main")};
  if(sha)body.sha=sha;
  const r=await github(env,`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok)return {ok:false,status:r.status,error:"github_write_failed",detail:await r.text()};
  const data=await r.json();return {ok:true,commit_sha:data.commit?.sha||"",content_sha:data.content?.sha||"",path};
}
async function workflowDispatch(env,manifest,workflow,ref,inputs={}){
  if(!env.GITHUB_CONTROL_PLANE_TOKEN)return {ok:false,status:503,error:"github_actions_not_configured"};
  if(!(manifest.repo.allowed_workflows||[]).includes(workflow))return {ok:false,status:403,error:"workflow_not_allowed"};
  const r=await github(env,`/repos/${manifest.repo.owner}/${manifest.repo.name}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:ref||manifest.repo.default_branch||"main",inputs})});
  if(!r.ok)return {ok:false,status:r.status,error:"workflow_dispatch_failed",detail:await r.text()};
  return {ok:true,workflow,ref:ref||manifest.repo.default_branch||"main"};
}
async function cfRequest(env,path,init={}){
  if(!env.CLOUDFLARE_CONTROL_PLANE_TOKEN)return null;
  const headers=new Headers(init.headers||{});headers.set("authorization",`Bearer ${env.CLOUDFLARE_CONTROL_PLANE_TOKEN}`);headers.set("content-type","application/json");
  return fetch(`https://api.cloudflare.com/client/v4${path}`,{...init,headers});
}
async function ensureDns(env,manifest,{name,type="CNAME",content,proxied=true}){
  if(!env.CLOUDFLARE_CONTROL_PLANE_TOKEN||!env.CLOUDFLARE_ZONE_ID)return {ok:false,status:503,error:"cloudflare_dns_not_configured"};
  name=String(name||"").toLowerCase();
  if(!(manifest.dns?.allowed_names||[]).includes(name))return {ok:false,status:403,error:"dns_name_not_allowed"};
  const lookup=await cfRequest(env,`/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records?name=${encodeURIComponent(name)}`);
  if(!lookup?.ok)return {ok:false,status:lookup?.status||503,error:"dns_lookup_failed"};
  const found=(await lookup.json()).result?.[0];
  const payload={type,name,content,proxied,ttl:1};
  const path=found?`/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${found.id}`:`/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`;
  const r=await cfRequest(env,path,{method:found?"PUT":"POST",body:JSON.stringify(payload)});
  if(!r.ok)return {ok:false,status:r.status,error:"dns_update_failed",detail:await r.text()};
  const data=await r.json();return {ok:true,record:data.result,created:!found};
}

async function productSummary(env,product,days=30,path="/summary"){
  const r=await productHub(env,product).fetch(`https://internal${path}${path.includes("?")?"&":"?"}days=${clampDays(days)}`);
  return await r.json();
}
async function productPath(env,product,path){
  const r=await productHub(env,product).fetch(`https://internal${path}`);
  return await r.json();
}

function createMcpServer(env){
  const server=new McpServer({name:"Clintware Control Plane",version:VERSION});
  server.registerTool("clintware_control_plane_status",{
    title:"Get Clintware Control Plane status",
    description:"Return safe health, configured adapter availability, registered products, and current Control Plane version. Does not expose secrets.",
    inputSchema:{},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async()=>{
    const products=await (await registryHub(env).fetch("https://internal/list")).json();
    return {content:[{type:"text",text:JSON.stringify({ok:true,service:"Clintware Control Plane",version:VERSION,products:products.products?.map(p=>p.product)||[],adapters:{github_read:true,github_write:Boolean(env.GITHUB_CONTROL_PLANE_TOKEN),cloudflare_dns:Boolean(env.CLOUDFLARE_CONTROL_PLANE_TOKEN&&env.CLOUDFLARE_ZONE_ID)}})}]};
  });
  server.registerTool("clintware_product_manifest",{
    title:"Get a Clintware product capability manifest",
    description:"Return the scoped capabilities, repository bounds, DNS bounds, and telemetry namespace for a registered Clintware product.",
    inputSchema:{product:z.string().min(1)},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product})=>{
    const manifest=await manifestFor(env,product);return {content:[{type:"text",text:JSON.stringify(manifest?{manifest}:{error:"product_not_found"})}],isError:!manifest};
  });
  server.registerTool("clintware_capability_check",{
    title:"Check a scoped Clintware capability",
    description:"Check whether a registered product is allowed a named capability without exposing credentials.",
    inputSchema:{product:z.string().min(1),capability:z.string().min(1)},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,capability})=>{
    const manifest=await manifestFor(env,product);const allowed=capabilityMatches(manifest,capability);
    return {content:[{type:"text",text:JSON.stringify({product,capability,allowed})}]};
  });
  server.registerTool("clintware_usage_summary",{
    title:"Get product usage summary",
    description:"Return privacy-safe usage, provider, cost, cache, error, fallback, feature, and session totals for a Clintware product.",
    inputSchema:{product:z.string().default("proofos"),days:z.number().int().min(1).max(90).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,days})=>({content:[{type:"text",text:JSON.stringify(await productSummary(env,product,days||30))}]}));
  server.registerTool("clintware_feature_funnel",{
    title:"Get product feature funnel",
    description:"Return anonymous ordered feature-funnel counts for a Clintware product.",
    inputSchema:{product:z.string().default("proofos"),days:z.number().int().min(1).max(90).optional(),steps:z.array(z.string()).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,days,steps})=>{
    const q=new URLSearchParams({days:String(days||30)});if(steps?.length)q.set("steps",steps.join(","));
    return {content:[{type:"text",text:JSON.stringify(await productPath(env,product,`/funnel?${q}`))}]};
  });
  server.registerTool("clintware_provider_breakdown",{
    title:"Get provider breakdown",
    description:"Return request counts, reported API cost, errors, and latency by provider.",
    inputSchema:{product:z.string().default("proofos"),days:z.number().int().min(1).max(90).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,days})=>({content:[{type:"text",text:JSON.stringify(await productSummary(env,product,days||30,"/providers"))}]}));
  server.registerTool("clintware_cache_performance",{
    title:"Get cache performance",
    description:"Return cache hit/miss performance for a Clintware product.",
    inputSchema:{product:z.string().default("proofos"),days:z.number().int().min(1).max(90).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,days})=>({content:[{type:"text",text:JSON.stringify(await productSummary(env,product,days||30,"/cache"))}]}));
  server.registerTool("clintware_conversion_summary",{
    title:"Get conversion summary",
    description:"Return privacy-safe conversion event counts such as resume, contact, or meeting actions.",
    inputSchema:{product:z.string().default("proofos"),days:z.number().int().min(1).max(90).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,days})=>({content:[{type:"text",text:JSON.stringify(await productSummary(env,product,days||30,"/conversions"))}]}));
  server.registerTool("clintware_recent_errors",{
    title:"Get recent product errors",
    description:"Return recent structured errors without raw sensitive visitor content.",
    inputSchema:{product:z.string().default("proofos"),limit:z.number().int().min(1).max(200).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,limit})=>({content:[{type:"text",text:JSON.stringify(await productPath(env,product,`/errors?limit=${limit||50}`))}]}));
  server.registerTool("clintware_recent_activity",{
    title:"Get recent product activity",
    description:"Return recent canonical activity metadata without requiring raw prompt or response retention.",
    inputSchema:{product:z.string().default("proofos"),limit:z.number().int().min(1).max(200).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,limit})=>({content:[{type:"text",text:JSON.stringify(await productPath(env,product,`/recent?limit=${limit||50}`))}]}));
  server.registerTool("clintware_daily_activity",{
    title:"Get daily product activity",
    description:"Return daily event/session/cost/error/conversion aggregates.",
    inputSchema:{product:z.string().default("proofos"),days:z.number().int().min(1).max(90).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product,days})=>({content:[{type:"text",text:JSON.stringify(await productSummary(env,product,days||30,"/daily"))}]}));
  server.registerTool("clintware_repo_read_file",{
    title:"Read an approved Clintware repository file",
    description:"Read a file or directory from the repository scoped to a registered product. Public repository reads do not require exposing GitHub credentials to the caller.",
    inputSchema:{product:z.string().default("proofos"),path:z.string().min(1),ref:z.string().optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}
  },async({product,path,ref})=>{
    const manifest=await manifestFor(env,product);if(!manifest?.repo?.read)return {isError:true,content:[{type:"text",text:JSON.stringify({error:"repo_read_not_allowed"})}]};
    const result=await repoRead(env,manifest,path,ref);return {isError:!result.ok,content:[{type:"text",text:JSON.stringify(result)}]};
  });
  server.registerTool("clintware_repo_create_branch",{
    title:"Create an approved Clintware repository branch",
    description:"Create a branch in the product's scoped repository using credentials retained by the Clintware Control Plane.",
    inputSchema:{product:z.string().default("proofos"),branch:z.string().regex(/^[A-Za-z0-9._\/-]+$/),base:z.string().optional()},
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}
  },async({product,branch,base})=>{
    const manifest=await manifestFor(env,product);if(!capabilityMatches(manifest,"repo.branch:create"))return {isError:true,content:[{type:"text",text:JSON.stringify({error:"capability_denied"})}]};
    const result=await repoCreateBranch(env,manifest,branch,base);await audit(env,product,"repo_create_branch",crypto.randomUUID(),{branch,base},result.ok,result.error||"");
    return {isError:!result.ok,content:[{type:"text",text:JSON.stringify(result)}]};
  });
  server.registerTool("clintware_repo_write_file",{
    title:"Write an approved Clintware repository file",
    description:"Create or replace a UTF-8 file only inside the product's allowlisted repository path prefixes. Credentials stay in the Clintware Control Plane.",
    inputSchema:{product:z.string().default("proofos"),path:z.string().min(1),content:z.string(),message:z.string().min(1),branch:z.string().optional(),sha:z.string().optional()},
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}
  },async({product,path,content,message,branch,sha})=>{
    const manifest=await manifestFor(env,product);if(!capabilityMatches(manifest,"repo.write:proofos/**")&&!pathAllowed(manifest,path))return {isError:true,content:[{type:"text",text:JSON.stringify({error:"capability_denied"})}]};
    const result=await repoWrite(env,manifest,{path,content,message,branch,sha});await audit(env,product,"repo_write_file",crypto.randomUUID(),{path,branch},result.ok,result.error||"");
    return {isError:!result.ok,content:[{type:"text",text:JSON.stringify(result)}]};
  });
  server.registerTool("clintware_deploy_workflow",{
    title:"Dispatch an approved deployment workflow",
    description:"Dispatch only an allowlisted GitHub Actions workflow for a registered product; caller never receives the GitHub credential.",
    inputSchema:{product:z.string().default("proofos"),workflow:z.string().min(1),ref:z.string().optional(),inputs:z.record(z.string(),z.string()).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}
  },async({product,workflow,ref,inputs})=>{
    const manifest=await manifestFor(env,product);if(!capabilityMatches(manifest,"deployment.execute:proof"))return {isError:true,content:[{type:"text",text:JSON.stringify({error:"capability_denied"})}]};
    const result=await workflowDispatch(env,manifest,workflow,ref,inputs||{});await audit(env,product,"deployment_dispatch",crypto.randomUUID(),{workflow,ref},result.ok,result.error||"");
    return {isError:!result.ok,content:[{type:"text",text:JSON.stringify(result)}]};
  });
  server.registerTool("clintware_dns_ensure_record",{
    title:"Ensure an approved DNS record",
    description:"Create or update only an allowlisted DNS name for a registered product using Cloudflare credentials retained by the Clintware Control Plane.",
    inputSchema:{product:z.string().default("proofos"),name:z.string().min(1),type:z.enum(["CNAME","A","AAAA"]).default("CNAME"),content:z.string().min(1),proxied:z.boolean().optional()},
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}
  },async({product,name,type,content,proxied})=>{
    const manifest=await manifestFor(env,product);if(!capabilityMatches(manifest,`dns.ensure:${name}`))return {isError:true,content:[{type:"text",text:JSON.stringify({error:"capability_denied"})}]};
    const result=await ensureDns(env,manifest,{name,type,content,proxied:proxied!==false});await audit(env,product,"dns_ensure_record",crypto.randomUUID(),{name,type},result.ok,result.error||"");
    return {isError:!result.ok,content:[{type:"text",text:JSON.stringify(result)}]};
  });
  return server;
}

async function handleMcp(request,env,ctx){
  if(!await requireMcp(request,env))return json({error:"unauthorized"},401,{"www-authenticate":"Bearer"});
  const handler=createMcpHandler(()=>createMcpServer(env),{
    route:"/mcp",
    allowedHostnames:["mcp.clintware.com"],
    allowedOriginHostnames:["perplexity.ai","www.perplexity.ai","chatgpt.com","chat.openai.com","platform.openai.com","clintware.com","www.clintware.com"],
    responseMode:"auto"
  });
  return handler(request,env,ctx);
}

function safeConfig(env){
  return {
    github_read:true,
    github_write:Boolean(env.GITHUB_CONTROL_PLANE_TOKEN),
    github_actions:Boolean(env.GITHUB_CONTROL_PLANE_TOKEN),
    cloudflare_dns:Boolean(env.CLOUDFLARE_CONTROL_PLANE_TOKEN&&env.CLOUDFLARE_ZONE_ID),
    mcp_auth:Boolean(env.CONTROL_PLANE_MCP_TOKEN||env.CONTROL_PLANE_ADMIN_TOKEN),
    admin_auth:Boolean(env.CONTROL_PLANE_ADMIN_TOKEN)
  };
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    try{
      if(request.method==="GET"&&url.pathname==="/health"){
        const products=await (await registryHub(env).fetch("https://internal/list")).json();
        return json({ok:true,service:"Clintware Control Plane",version:VERSION,mcp:"/mcp",api:"/api/v1",products:(products.products||[]).map(p=>p.product),adapters:safeConfig(env),time:nowIso()});
      }
      if(url.pathname==="/mcp")return handleMcp(request,env,ctx);

      if(request.method==="GET"&&url.pathname==="/api/v1"){
        return json({name:"Clintware Control Plane",version:VERSION,endpoints:{health:"/health",products:"/api/v1/products",events:"/api/v1/events",summary:"/api/v1/products/:product/summary",mcp:"/mcp"},security:"identity -> policy -> capability -> action -> audit"});
      }
      if(request.method==="GET"&&url.pathname==="/api/v1/products"){
        if(!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        return await registryHub(env).fetch("https://internal/list");
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/products/register"){
        if(!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const body=await reqJson(request);
        return await registryHub(env).fetch(new Request("https://internal/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/products/client"){
        if(!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const body=await reqJson(request);const product=normalizeProduct(body.product);if(!product)return json({error:"product_required"},400);
        const token=String(body.token||crypto.randomUUID()+crypto.randomUUID());const token_hash=await sha256(token);
        const r=await registryHub(env).fetch(new Request("https://internal/client",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({product,token_hash,scopes:body.scopes})}));
        if(!r.ok)return r;
        return json({ok:true,product,token,warning:"Store this token securely; only its hash is retained by Clintware."});
      }

      if(request.method==="POST"&&url.pathname==="/api/v1/events"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        if(!product)return json({error:"product_required"},400);
        const auth=await verifyProductToken(request,env,product);if(!auth)return json({error:"unauthorized"},401);
        if(!capabilityMatches(auth.manifest,`analytics.write:${product}`))return json({error:"capability_denied"},403);
        const event={...body,product};
        const r=await productHub(env,product).fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(event)}));
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }

      const summaryMatch=url.pathname.match(/^\/api\/v1\/products\/([^/]+)\/(summary|recent|errors|daily|funnel|providers|cache|conversions)$/);
      if(request.method==="GET"&&summaryMatch){
        const product=normalizeProduct(summaryMatch[1]);const auth=await verifyProductToken(request,env,product);
        if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const suffix=summaryMatch[2];const internal=new URL(`https://internal/${suffix}`);internal.search=url.search;
        const r=await productHub(env,product).fetch(internal.toString());return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }

      if(request.method==="POST"&&url.pathname==="/api/v1/repo/read"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        const auth=await verifyProductToken(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=await manifestFor(env,product);if(!manifest?.repo?.read)return json({error:"capability_denied"},403);
        const result=await repoRead(env,manifest,String(body.path||""),body.ref);return json(result,result.ok?200:result.status||500);
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/repo/branch"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        const auth=await verifyProductToken(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=await manifestFor(env,product);if(!capabilityMatches(manifest,"repo.branch:create"))return json({error:"capability_denied"},403);
        const result=await repoCreateBranch(env,manifest,String(body.branch||""),body.base);await audit(env,product,"repo_create_branch",body.request_id,{branch:body.branch,base:body.base},result.ok,result.error||"");
        return json(result,result.ok?200:result.status||500);
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/repo/write"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        const auth=await verifyProductToken(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=await manifestFor(env,product);if(!pathAllowed(manifest,body.path))return json({error:"capability_denied"},403);
        const result=await repoWrite(env,manifest,body);await audit(env,product,"repo_write_file",body.request_id,{path:body.path,branch:body.branch},result.ok,result.error||"");
        return json(result,result.ok?200:result.status||500);
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/deploy"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        const auth=await verifyProductToken(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=await manifestFor(env,product);const result=await workflowDispatch(env,manifest,String(body.workflow||""),body.ref,body.inputs||{});
        await audit(env,product,"deployment_dispatch",body.request_id,{workflow:body.workflow,ref:body.ref},result.ok,result.error||"");
        return json(result,result.ok?200:result.status||500);
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/dns/ensure"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        const auth=await verifyProductToken(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=await manifestFor(env,product);const result=await ensureDns(env,manifest,body);
        await audit(env,product,"dns_ensure_record",body.request_id,{name:body.name,type:body.type},result.ok,result.error||"");
        return json(result,result.ok?200:result.status||500);
      }

      return json({error:"not_found"},404);
    }catch(error){
      console.error(JSON.stringify({event:"control_plane_error",path:url.pathname,error:String(error),stack:error?.stack}));
      return json({error:"internal_error",message:String(error?.message||error)},Number(error?.status||500));
    }
  }
};

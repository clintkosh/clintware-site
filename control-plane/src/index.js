import { DurableObject } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { normalizeFlowName, normalizeWorkflow, runWorkflowDefinition } from "./flow.js";

const VERSION = "2026-09-19";
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
  version:3,
  repo:{identity:"clintkosh",owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["proofos/","control-plane/","public/proofos/"],delete_prefixes:["proofos/"],allowed_workflows:["deploy-proofos.yml","deploy-control-plane.yml"]},
  dns:{allowed_names:["proof.clintware.com","mcp.clintware.com"]},
  capabilities:[
    "repo.read:clintware-site",
    "repo.write:proofos/**",
    "repo.write:control-plane/**",
    "repo.delete:proofos/**",
    "repo.branch:create",
    "repo.branch:read",
    "repo.commit:status",
    "repo.workflow:dispatch",
    "repo.workflow:status",
    "deployment.read",
    "deployment.execute:proof",
    "dns.ensure:proof.clintware.com",
    "analytics.write:proofos",
    "analytics.read:proofos",
    "research.invoke",
    "cache.read:proofos",
    "cache.write:proofos",
    "flow.read:proofos",
    "flow.write:proofos",
    "flow.run:proofos"
  ],
  deny:["secrets.read","secrets.export","billing.manage","repo.delete:control-plane/**","repo.write:unrelated/**","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"],
  telemetry_namespace:"proofos",
  created_at:"2026-09-12T00:00:00.000Z"
};

const DEFAULT_LANDTHEPLANE = {
  product:"landtheplane",
  environment:"production",
  version:2,
  repo:{identity:"clintkosh",owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["landtheplane-worker/"],delete_prefixes:["landtheplane-worker/"],allowed_workflows:["deploy-landtheplane-worker.yml"]},
  dns:{allowed_names:["landtheplane.clintware.com"]},
  capabilities:["repo.read:clintware-site","repo.write:landtheplane-worker/**","repo.delete:landtheplane-worker/**","repo.branch:create","repo.branch:read","repo.commit:status","repo.workflow:dispatch","repo.workflow:status","deployment.read","deployment.execute:landtheplane","dns.ensure:landtheplane.clintware.com","analytics.write:landtheplane","analytics.read:landtheplane","flow.read:landtheplane","flow.write:landtheplane","flow.run:landtheplane"],
  deny:["research.invoke","secrets.read","secrets.export","billing.manage","repo.write:unrelated/**","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"],
  telemetry_namespace:"landtheplane",
  created_at:"2026-09-17T00:00:00.000Z"
};

const DEFAULT_BACKGROUND_MIRROR = {
  product:"background-mirror",
  environment:"production",
  version:1,
  repo:{identity:"clintkosh",owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["background-mirror-worker/"],delete_prefixes:["background-mirror-worker/"],allowed_workflows:["deploy-background-mirror.yml"]},
  dns:{allowed_names:["background.clintware.com"]},
  capabilities:["repo.read:clintware-site","repo.write:background-mirror-worker/**","repo.delete:background-mirror-worker/**","repo.branch:create","repo.branch:read","repo.commit:status","repo.workflow:dispatch","repo.workflow:status","deployment.read","deployment.execute:background-mirror","dns.ensure:background.clintware.com","analytics.write:background-mirror","analytics.read:background-mirror"],
  deny:["research.invoke","secrets.read","secrets.export","billing.manage","repo.write:unrelated/**","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"],
  telemetry_namespace:"background-mirror",
  privacy:{identity_storage:"browser-local",finding_storage:"browser-local",telemetry:"anonymous-feature-events-only",pii_in_telemetry:false},
  created_at:"2026-09-17T00:00:00.000Z"
};

const DEFAULT_NEURON7_CASE = {
  product:"neuron7-case",
  environment:"production",
  version:1,
  repo:{identity:"clintkosh",owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["neuron7-case-worker/"],allowed_workflows:["deploy-neuron7-case.yml"]},
  dns:{allowed_names:["n7.clintware.com","n7case.clintware.com"]},
  capabilities:["repo.read:clintware-site","repo.write:neuron7-case-worker/**","repo.branch:create","repo.branch:read","repo.commit:status","repo.workflow:dispatch","repo.workflow:status","deployment.read","deployment.execute:neuron7-case","dns.ensure:n7.clintware.com","dns.ensure:n7case.clintware.com","analytics.write:neuron7-case","analytics.read:neuron7-case"],
  deny:["research.invoke","secrets.read","secrets.export","billing.manage","repo.delete","repo.write:unrelated/**","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"],
  telemetry_namespace:"neuron7-case",
  privacy:{public_viewer:true,indexing:false,customer_data:false,oauth_operator_mode:"optional",identity_boundary:"auth.clintware.com",infrastructure_boundary:"mcp.clintware.com"},
  created_at:"2026-09-18T00:00:00.000Z"
};

const DEFAULT_CODEFEDDY = {
  product:"codefeddy",
  environment:"production",
  version:1,
  repo:{identity:"codefeddy",owner:"codeFEDDY",name:"codeFEDDY.github.io",default_branch:"main",read:true,write_prefixes:[""],delete_prefixes:[""],allowed_workflows:[]},
  dns:{allowed_names:[]},
  capabilities:["repo.read:codeFEDDY.github.io","repo.write:*","repo.delete:*","repo.branch:create","repo.branch:read","repo.commit:status","analytics.write:codefeddy","analytics.read:codefeddy"],
  deny:["secrets.read","secrets.export","billing.manage","repo.workflow:dispatch","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/"],
  telemetry_namespace:"codefeddy",
  created_at:"2026-09-18T00:00:00.000Z"
};

const DEFAULT_MINDTOFORM = {
  product:"mindtoform",
  environment:"production",
  version:1,
  repo:{identity:"clintkosh",owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["mindtoform-worker/"],delete_prefixes:["mindtoform-worker/"],allowed_workflows:["deploy-mindtoform.yml"]},
  dns:{allowed_names:["mindtoform.clintware.com"]},
  capabilities:["repo.read:clintware-site","repo.write:mindtoform-worker/**","repo.delete:mindtoform-worker/**","repo.branch:create","repo.branch:read","repo.commit:status","repo.workflow:dispatch","repo.workflow:status","deployment.read","deployment.execute:mindtoform","dns.ensure:mindtoform.clintware.com","analytics.write:mindtoform","analytics.read:mindtoform","flow.read:mindtoform","flow.write:mindtoform","flow.run:mindtoform"],
  deny:["research.invoke","secrets.read","secrets.export","billing.manage","repo.write:unrelated/**","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"],
  telemetry_namespace:"mindtoform",
  created_at:"2026-09-19T00:00:00.000Z"
};

const DEFAULT_ORGSYNAPSE = {
  product:"orgsynapse",
  environment:"prototype",
  version:1,
  repo:{identity:"clintkosh",owner:"clintkosh",name:"clintware-site",default_branch:"main",read:true,write_prefixes:["orgsynapse/","public/tools/orgsynapse/"],delete_prefixes:["orgsynapse/","public/tools/orgsynapse/"],allowed_workflows:[]},
  dns:{allowed_names:["orgsynapse.clintware.com"]},
  capabilities:["repo.read:clintware-site","repo.write:orgsynapse/**","repo.write:public/tools/orgsynapse/**","repo.delete:orgsynapse/**","repo.delete:public/tools/orgsynapse/**","repo.branch:create","repo.branch:read","repo.commit:status","analytics.write:orgsynapse","analytics.read:orgsynapse","flow.read:orgsynapse","flow.write:orgsynapse","flow.run:orgsynapse"],
  deny:["research.invoke","secrets.read","secrets.export","billing.manage","repo.workflow:dispatch","deployment.execute","repo.write:unrelated/**","infrastructure.admin:*"],
  protected_paths:[".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"],
  telemetry_namespace:"orgsynapse",
  created_at:"2026-09-19T00:00:00.000Z"
};

const DEFAULT_PRODUCTS={proofos:DEFAULT_PROOFOS,landtheplane:DEFAULT_LANDTHEPLANE,"background-mirror":DEFAULT_BACKGROUND_MIRROR,"neuron7-case":DEFAULT_NEURON7_CASE,codefeddy:DEFAULT_CODEFEDDY,mindtoform:DEFAULT_MINDTOFORM,orgsynapse:DEFAULT_ORGSYNAPSE};

// ---- Capability broker: risk tiers, protected resources, policy evaluation ----
// Agents express intent ("delete this file"); Clintware resolves provider-specific
// prerequisites (GitHub SHAs, branch refs, etc.) internally.
const RISK_TIERS = {
  // Tier 0 — READ / OBSERVE (automatic if in product scope)
  "repo.read":0, "repo.file.read":0, "repo.branch":0, "repo.branch.read":0, "repo.branch:read":0,
  "repo.commit":0, "repo.commit.status":0, "repo.commit:status":0,
  "repo.workflow":0, "repo.workflow.status":0, "repo.workflow:status":0,
  "deployment.read":0, "telemetry.read":0,
  "cache.read":0, "analytics.read":0, "flow.read":0,
  // Tier 1 — LOW-RISK SCOPED MUTATION
  "repo.write":1, "repo.file.write":1, "repo.file.create":1,
  "repo.branch:create":1, "repo.branch.create":1,
  "repo.workflow.dispatch":1, "repo.workflow:dispatch":1,
  "deployment.execute":1, "analytics.write":1, "cache.write":1,
  "research.invoke":1, "flow.write":1, "flow.run":1,
  // Tier 2 — DESTRUCTIVE BUT SCOPED
  "repo.delete":2, "repo.file.delete":2, "repo.file.move":2, "repo.file.rename":2,
  "dns.ensure":2,
  // Tier 3 — ADMIN / HIGH RISK (never auto-escalate)
  "secrets.read":3, "secrets.export":3, "billing.manage":3,
  "infrastructure.admin":3
};
const DEFAULT_PROTECTED_PATHS = [".github/workflows/",".github/actions/","control-plane/security/","control-plane/policy/"];

function riskTier(capability){return RISK_TIERS[String(capability||"")]??3;}

function isProtectedPath(manifest,path){
  const p=String(path||"").replace(/^\/+/,"");
  const prots=manifest?.protected_paths||DEFAULT_PROTECTED_PATHS;
  return prots.some(pp=>p.startsWith(pp));
}

function deletePathAllowed(manifest,path){
  const p=String(path||"").replace(/^\/+/,"");
  return (manifest?.repo?.delete_prefixes||[]).some(prefix=>p.startsWith(prefix));
}

// Map a high-level capability to a manifest capability string for matching
function capabilityForMatch(capability,resource,manifest){
  const cap=String(capability||"");
  const path=String(resource?.path||"");
  if(cap==="repo.file.delete"){
    if(path)return `repo.delete:${path.split("/")[0]}/**`;
    return "repo.delete";
  }
  if(cap==="repo.file.write"||cap==="repo.file.create"){
    if(path)return `repo.write:${path.split("/")[0]}/**`;
    return "repo.write";
  }
  if(cap==="repo.file.read") return `repo.read:${manifest?.repo?.name||"unknown"}`;
  if(cap==="repo.branch.create") return "repo.branch:create";
  if(cap==="repo.branch.read") return "repo.branch:read";
  if(cap==="repo.commit.status") return "repo.commit:status";
  if(cap==="repo.workflow.dispatch") return "repo.workflow:dispatch";
  if(cap==="repo.workflow.status") return "repo.workflow:status";
  if(cap==="deployment.execute") return `deployment.execute:${resource?.product||"proofos"}`;
  if(cap==="deployment.read") return "deployment.read";
  if(cap==="dns.ensure") return resource?.name?`dns.ensure:${resource.name}`:"dns.ensure";
  if(cap==="research.invoke") return "research.invoke";
  if(cap==="analytics.read") return `analytics.read:${resource?.product||"proofos"}`;
  if(cap==="analytics.write") return `analytics.write:${resource?.product||"proofos"}`;
  if(cap==="cache.read") return `cache.read:${resource?.product||"proofos"}`;
  if(cap==="cache.write") return `cache.write:${resource?.product||"proofos"}`;
  if(cap==="flow.read"||cap==="flow.write"||cap==="flow.run") return `${cap}:${resource?.product||manifest?.product||"unknown"}`;
  return cap;
}

// Core policy evaluation: identity → context → policy → capability → decision
function evaluatePolicy(manifest,capability,resource,reason){
  if(!manifest) return {decision:"denied",reason:"product_not_found"};
  // Step 1: check deny list
  const capForMatch=capabilityForMatch(capability,resource,manifest);
  const denyList=manifest.deny||[];
  for(const d of denyList){
    if(d===capability||d===capForMatch) return {decision:"denied",reason:"capability_explicitly_denied"};
    if(d.endsWith("*")&&(capability.startsWith(d.slice(0,-1))||capForMatch.startsWith(d.slice(0,-1)))) return {decision:"denied",reason:"capability_globally_denied"};
  }
  // Step 2: path scope checks (before allow-list to give precise denial reasons)
  const path=String(resource?.path||"");
  if(path){
    if(capability==="repo.file.delete"){
      if(!deletePathAllowed(manifest,path)) return {decision:"denied",reason:"delete_path_outside_scope"};
      if(isProtectedPath(manifest,path)) return {decision:"denied",reason:"protected_path"};
    }
    if(capability==="repo.file.write"||capability==="repo.file.create"){
      if(!pathAllowed(manifest,path)) return {decision:"denied",reason:"write_path_outside_scope"};
      if(isProtectedPath(manifest,path)) return {decision:"denied",reason:"protected_path"};
    }
  }
  // Step 3: check allow list
  const allowList=manifest.capabilities||[];
  let allowed=false;
  for(const c of allowList){
    if(c===capability||c===capForMatch){allowed=true;break;}
    if(c.endsWith("**")&&(capability.startsWith(c.slice(0,-2))||capForMatch.startsWith(c.slice(0,-2)))){allowed=true;break;}
    if(c.endsWith("*")&&(capability.startsWith(c.slice(0,-1))||capForMatch.startsWith(c.slice(0,-1)))){allowed=true;break;}
  }
  if(!allowed) return {decision:"unsupported",reason:"capability_not_in_manifest",smallest_capability:capability};
  // Step 4: risk tier evaluation
  const tier=riskTier(capability);
  if(tier>=3) return {decision:"denied",reason:"tier3_admin_only"};
  // Step 5: tier-based approval
  if(tier===2){
    // Tier 2: scoped destructive — allow if path is in delete scope and reason is supplied
    if(path&&deletePathAllowed(manifest,path)&&!isProtectedPath(manifest,path)&&reason){
      return {decision:"executed",reason:"tier2_scoped_deletion_permitted"};
    }
    return {decision:"approval_required",reason:"tier2_destructive_requires_approval"};
  }
  // Tier 0-1: automatic
  return {decision:"executed",reason:"tier01_automatic"};
}

const HANDOFF_MAX_AGE_MS=7*24*60*60*1000;
const HANDOFF_MAX_ITEMS=200;
const clip=(v,max=4000)=>String(v??"").slice(0,max);
const clipList=(v,maxItems=50,maxLen=1000)=>Array.isArray(v)?v.slice(0,maxItems).map(x=>clip(x,maxLen)):[];
function normalizeHandoff(body={}){
  const repo=body.repository&&typeof body.repository==="object"?body.repository:{};
  return {
    handoff_id:clip(body.handoff_id||crypto.randomUUID(),120),
    protocol:"clintware-handoff/v1",
    created_at:nowIso(),
    from_client:clip(body.from_client||"unknown",80),
    target_client:clip(body.target_client||"any",80),
    product:normalizeProduct(body.product||body.project||""),
    project:clip(body.project||body.product||"",120),
    objective:clip(body.objective,4000),
    context_summary:clip(body.context_summary,12000),
    repository:{
      identity:normalizeGithubIdentity(repo.identity||body.repo_identity||""),
      owner:clip(repo.owner||body.repo_owner||"",120),
      name:clip(repo.name||body.repo_name||"",160),
      branch:clip(repo.branch||body.branch||"",160)
    },
    decisions:clipList(body.decisions,50,1200),
    constraints:clipList(body.constraints,50,1200),
    changed_files:clipList(body.changed_files,100,500),
    artifacts:clipList(body.artifacts,100,1000),
    next_actions:clipList(body.next_actions,50,1200),
    notes:clip(body.notes,8000)
  };
}
function normalizeProduct(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");}
function productHub(env, product){return env.PRODUCT_HUB.getByName(`product:${normalizeProduct(product)}`);}
function registryHub(env){return env.REGISTRY_HUB.getByName("registry:v1");}

export class RegistryHub extends DurableObject {
  constructor(ctx,env){super(ctx,env);}
  async ensureDefaults(){
    let products=await this.ctx.storage.get("products");
    if(!products)products={};
    let changed=false;
    for(const [key,defaults] of Object.entries(DEFAULT_PRODUCTS)){
      if(!products[key]){products[key]=defaults;changed=true;continue;}
      if(products[key].version!==defaults.version){
        products[key]={...defaults,...products[key],version:defaults.version,repo:{...defaults.repo,...(products[key].repo||{})},dns:{...defaults.dns,...(products[key].dns||{})},capabilities:defaults.capabilities,deny:defaults.deny,protected_paths:defaults.protected_paths};
        changed=true;
      }
    }
    if(changed)await this.ctx.storage.put("products",products);
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
    if(request.method==="POST"&&url.pathname==="/mcp-client"){
      const body=await reqJson(request);
      const client_id=normalizeProduct(body.client_id||body.name||"");
      if(!client_id)return json({error:"client_id_required"},400);
      if(!body.token_hash)return json({error:"token_hash_required"},400);
      const clients=await this.ctx.storage.get("mcp_clients")||{};
      clients[client_id]={
        client_id,
        name:clip(body.name||client_id,120),
        token_hash:String(body.token_hash),
        allowed_products:Array.isArray(body.allowed_products)&&body.allowed_products.length?body.allowed_products.map(normalizeProduct):["*"],
        enabled:body.enabled!==false,
        created_at:clients[client_id]?.created_at||nowIso(),
        updated_at:nowIso()
      };
      await this.ctx.storage.put("mcp_clients",clients);
      return json({ok:true,client:{client_id,name:clients[client_id].name,allowed_products:clients[client_id].allowed_products,enabled:clients[client_id].enabled,created_at:clients[client_id].created_at,updated_at:clients[client_id].updated_at}});
    }
    if(request.method==="POST"&&url.pathname==="/mcp-verify"){
      const body=await reqJson(request);
      const token_hash=String(body.token_hash||"");
      const clients=await this.ctx.storage.get("mcp_clients")||{};
      const client=Object.values(clients).find(x=>x.enabled!==false&&x.token_hash===token_hash);
      return client?json({ok:true,client:{client_id:client.client_id,name:client.name,allowed_products:client.allowed_products||["*"]}}):json({ok:false},401);
    }
    if(request.method==="GET"&&url.pathname==="/mcp-clients"){
      const clients=await this.ctx.storage.get("mcp_clients")||{};
      return json({ok:true,clients:Object.values(clients).map(x=>({client_id:x.client_id,name:x.name,allowed_products:x.allowed_products||["*"],enabled:x.enabled!==false,created_at:x.created_at||null,updated_at:x.updated_at||null}))});
    }
    if(request.method==="DELETE"&&url.pathname.startsWith("/mcp-client/")){
      const client_id=normalizeProduct(decodeURIComponent(url.pathname.slice("/mcp-client/".length)));
      const clients=await this.ctx.storage.get("mcp_clients")||{};
      if(!clients[client_id])return json({error:"client_not_found"},404);
      delete clients[client_id];
      await this.ctx.storage.put("mcp_clients",clients);
      return json({ok:true,client_id});
    }
    // Research provider configuration (internal). The stored key is used only by
    // the research gateway and is never returned through public endpoints/MCP.
    if(request.method==="GET"&&url.pathname==="/research-config"){
      const cfg=await this.ctx.storage.get("research_config")||{};
      return json({exa_api_key:cfg.exa_api_key||"",updated_at:cfg.updated_at||null});
    }
    if(request.method==="POST"&&url.pathname==="/research-config"){
      const body=await reqJson(request);
      const cfg=await this.ctx.storage.get("research_config")||{};
      if(typeof body.exa_api_key==="string"&&body.exa_api_key)cfg.exa_api_key=body.exa_api_key;
      else if(body.exa_api_key==="")delete cfg.exa_api_key;
      cfg.updated_at=nowIso();
      await this.ctx.storage.put("research_config",cfg);
      return json({ok:true,exa_configured:Boolean(cfg.exa_api_key)});
    }
    if(request.method==="POST"&&url.pathname==="/handoff"){
      const body=await reqJson(request,64_000);
      const packet=normalizeHandoff(body);
      const key=`handoff:${packet.handoff_id}`;
      await this.ctx.storage.put(key,packet);
      let index=await this.ctx.storage.get("handoff_index")||[];
      const cutoff=Date.now()-HANDOFF_MAX_AGE_MS;
      const stale=index.filter(x=>Date.parse(x.created_at||"")<cutoff||x.handoff_id===packet.handoff_id);
      for(const item of stale)await this.ctx.storage.delete(`handoff:${item.handoff_id}`);
      index=index.filter(x=>Date.parse(x.created_at||"")>=cutoff&&x.handoff_id!==packet.handoff_id);
      index.unshift({handoff_id:packet.handoff_id,created_at:packet.created_at,from_client:packet.from_client,target_client:packet.target_client,product:packet.product,project:packet.project});
      for(const item of index.slice(HANDOFF_MAX_ITEMS))await this.ctx.storage.delete(`handoff:${item.handoff_id}`);
      index=index.slice(0,HANDOFF_MAX_ITEMS);
      await this.ctx.storage.put("handoff_index",index);
      return json({ok:true,handoff_id:packet.handoff_id,protocol:packet.protocol,created_at:packet.created_at});
    }
    if(request.method==="GET"&&url.pathname.startsWith("/handoff/")){
      const id=clip(decodeURIComponent(url.pathname.slice("/handoff/".length)),120);
      const packet=await this.ctx.storage.get(`handoff:${id}`);
      return packet?json({ok:true,packet}):json({error:"handoff_not_found"},404);
    }
    if(request.method==="GET"&&url.pathname==="/handoffs"){
      const index=await this.ctx.storage.get("handoff_index")||[];
      return json({ok:true,handoffs:index});
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
      let cost=0,avoided=0,cacheHits=0,fallbacks=0,successes=0,successfulResearchRuns=0;
      for(const e of events){
        inc(providers,e.provider||"local");inc(features,e.feature);inc(routes,e.route||"unspecified");
        if(e.error_class) inc(errors,e.error_class);
        const c=Number(e.reported_api_cost||0);cost+=c;avoided+=Number(e.estimated_cost_avoided||0);inc(costByProvider,e.provider||"local",c);
        if(e.cache_status==="hit") cacheHits++;if(e.fallback_used)fallbacks++;if(e.success)successes++;if(e.success&&e.feature==="brief"&&e.action==="analyze")successfulResearchRuns++;
      }
      return json({days,event_count:events.length,successful_research_runs:successfulResearchRuns,unique_sessions:sessions.size,success_rate:events.length?successes/events.length:1,total_reported_api_cost:cost,estimated_cost_avoided:avoided,cache_hits:cacheHits,cache_hit_rate:events.length?cacheHits/events.length:0,fallbacks,providers,provider_costs:costByProvider,features,routes,errors});
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
// Product workers on the Clintware account reach the Control Plane through Cloudflare
// service bindings. Binding requests never traverse the public edge: they carry the
// calling worker's name and no cf-connecting-ip, so the identity cannot be spoofed
// from outside (public requests always arrive with cf-connecting-ip, which is
// stripped/managed by the edge and absent on binding traffic).
const SERVICE_WORKERS={proofos:"clintware-proofos",landtheplane:"clintware-landtheplane","background-mirror":"clintware-background-mirror"};
function serviceProduct(request){
  if(request.headers.get("cf-connecting-ip"))return null;
  const caller=(request.headers.get("cf-worker")||"").trim().toLowerCase();
  if(!caller)return null;
  for(const[product,name]of Object.entries(SERVICE_WORKERS))if(caller===name)return product;
  return null;
}
async function verifyProductRequest(request,env,product){
  const auth=await verifyProductToken(request,env,product);
  if(auth)return auth;
  if(serviceProduct(request)===normalizeProduct(product)){
    const manifest=await manifestFor(env,product);
    if(manifest)return {ok:true,scopes:manifest.capabilities||[],manifest,identity:"service_binding"};
  }
  return null;
}
async function requireAdmin(request,env){
  const expected=String(env.CONTROL_PLANE_ADMIN_TOKEN||"");
  return expected&&await safeEq(bearer(request),expected);
}
async function requireMcp(request,env){
  const token=bearer(request);
  if(!token)return false;
  const expected=String(env.CONTROL_PLANE_MCP_TOKEN||env.CONTROL_PLANE_ADMIN_TOKEN||"");
  if(expected&&await safeEq(token,expected))return true;
  const token_hash=await sha256(token);
  const r=await registryHub(env).fetch(new Request("https://internal/mcp-verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token_hash})}));
  return r.ok;
}
async function audit(env,product,action,requestId,details={},success=true,error_class=""){
  try{
    await productHub(env,product).fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      product,environment:"control-plane",request_id:requestId||crypto.randomUUID(),feature:"control_plane",action,provider:"clintware",success,error_class,metadata:details
    })}));
  }catch{}
}

function normalizeGithubIdentity(value){
  return String(value||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");
}
function githubSecretName(identity){
  const key=normalizeGithubIdentity(identity).toUpperCase().replace(/[^A-Z0-9]/g,"_");
  return key?`GITHUB_TOKEN_${key}`:"";
}
function githubAuth(env,manifest){
  const identity=normalizeGithubIdentity(manifest?.repo?.identity||manifest?.repo?.owner||"clintkosh");
  const secretName=githubSecretName(identity);
  let token=secretName?String(env[secretName]||""):"";
  let source=token?secretName:"";
  // Backward-compatible migration path for the original Clintware credential.
  if(!token&&identity==="clintkosh"&&env.GITHUB_CONTROL_PLANE_TOKEN){
    token=String(env.GITHUB_CONTROL_PLANE_TOKEN);
    source="GITHUB_CONTROL_PLANE_TOKEN";
  }
  return {identity,secret_name:secretName,configured:Boolean(token),source,token};
}
async function github(env,manifest,path,init={}){
  const headers=new Headers(init.headers||{});
  headers.set("accept","application/vnd.github+json");headers.set("x-github-api-version","2022-11-28");headers.set("user-agent","Clintware-Control-Plane/1.0");
  const auth=githubAuth(env,manifest);
  if(auth.token)headers.set("authorization",`Bearer ${auth.token}`);
  return fetch(`https://api.github.com${path}`,{...init,headers});
}
async function repoRead(env,manifest,path,ref){
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const q=ref?`?ref=${encodeURIComponent(ref)}`:"";
  const r=await github(env,manifest,`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${q}`);
  if(!r.ok)return {ok:false,status:r.status,error:"github_read_failed",detail:await r.text()};
  const data=await r.json();
  if(Array.isArray(data))return {ok:true,type:"directory",items:data.map(x=>({name:x.name,path:x.path,type:x.type,sha:x.sha}))};
  return {ok:true,type:data.type,path:data.path,sha:data.sha,encoding:data.encoding,content:data.content?fromB64(data.content.replace(/\n/g,"")):"",html_url:data.html_url};
}
async function repoCreateBranch(env,manifest,branch,base){
  if(!githubAuth(env,manifest).configured)return {ok:false,status:503,error:"github_write_not_configured",identity:githubAuth(env,manifest).identity,expected_secret:githubAuth(env,manifest).secret_name};
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const get=await github(env,manifest,`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(base||manifest.repo.default_branch||"main")}`);
  if(!get.ok)return {ok:false,status:get.status,error:"base_ref_lookup_failed",detail:await get.text()};
  const baseData=await get.json();
  const r=await github(env,manifest,`/repos/${owner}/${repo}/git/refs`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:`refs/heads/${branch}`,sha:baseData.object.sha})});
  if(!r.ok)return {ok:false,status:r.status,error:"branch_create_failed",detail:await r.text()};
  return {ok:true,branch,sha:baseData.object.sha};
}
async function repoWrite(env,manifest,{path,content,message,branch,sha}){
  if(!githubAuth(env,manifest).configured)return {ok:false,status:503,error:"github_write_not_configured",identity:githubAuth(env,manifest).identity,expected_secret:githubAuth(env,manifest).secret_name};
  if(!pathAllowed(manifest,path))return {ok:false,status:403,error:"path_not_allowed"};
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const body={message:String(message||`Update ${path} via Clintware Control Plane`),content:b64(content),branch:String(branch||manifest.repo.default_branch||"main")};
  if(sha)body.sha=sha;
  const r=await github(env,manifest,`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok)return {ok:false,status:r.status,error:"github_write_failed",detail:await r.text()};
  const data=await r.json();return {ok:true,commit_sha:data.commit?.sha||"",content_sha:data.content?.sha||"",path};
}
// Delete a file — Clintware resolves the GitHub SHA internally so the agent never
// has to. Only allowed within delete_prefixes and never on protected paths.
async function repoFileDelete(env,manifest,{path,message,branch}){
  if(!githubAuth(env,manifest).configured)return {ok:false,status:503,error:"github_write_not_configured",identity:githubAuth(env,manifest).identity,expected_secret:githubAuth(env,manifest).secret_name};
  if(!deletePathAllowed(manifest,path))return {ok:false,status:403,error:"delete_path_not_allowed"};
  if(isProtectedPath(manifest,path))return {ok:false,status:403,error:"protected_path"};
  const owner=manifest.repo.owner,repo=manifest.repo.name;
  const ref=branch||manifest.repo.default_branch||"main";
  // Step 1: resolve the current file SHA internally
  const getR=await github(env,manifest,`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`);
  if(!getR.ok)return {ok:false,status:getR.status,error:"file_lookup_failed",detail:await getR.text()};
  const fileData=await getR.json();
  if(Array.isArray(fileData))return {ok:false,status:400,error:"path_is_directory"};
  // Step 2: delete using the resolved SHA
  const delR=await github(env,manifest,`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({message:String(message||"Delete "+path+" via Clintware Control Plane"),sha:fileData.sha,branch:ref})});
  if(!delR.ok)return {ok:false,status:delR.status,error:"github_delete_failed",detail:await delR.text()};
  const delData=await delR.json();
  return {ok:true,commit_sha:delData.commit?.sha||"",path,sha_resolved_internally:true};
}
// Move/rename a file — Clintware resolves the SHA, reads content, writes new path, deletes old.
async function repoFileMove(env,manifest,{from_path,to_path,message,branch}){
  if(!githubAuth(env,manifest).configured)return {ok:false,status:503,error:"github_write_not_configured",identity:githubAuth(env,manifest).identity,expected_secret:githubAuth(env,manifest).secret_name};
  if(!pathAllowed(manifest,to_path))return {ok:false,status:403,error:"target_path_not_allowed"};
  if(!deletePathAllowed(manifest,from_path))return {ok:false,status:403,error:"source_delete_not_allowed"};
  const readResult=await repoRead(env,manifest,from_path,branch);
  if(!readResult.ok||readResult.type!=="file")return {ok:false,status:400,error:"source_read_failed"};
  const writeResult=await repoWrite(env,manifest,{path:to_path,content:readResult.content,message:String(message||"Move "+from_path+" to "+to_path),branch});
  if(!writeResult.ok)return writeResult;
  const delResult=await repoFileDelete(env,manifest,{path:from_path,message:String(message||"Move "+from_path+" to "+to_path),branch});
  return {ok:true,commit_sha:writeResult.commit_sha,path:to_path,moved_from:from_path};
}
async function workflowDispatch(env,manifest,workflow,ref,inputs={}){
  if(!githubAuth(env,manifest).configured)return {ok:false,status:503,error:"github_actions_not_configured",identity:githubAuth(env,manifest).identity,expected_secret:githubAuth(env,manifest).secret_name};
  if(!(manifest.repo.allowed_workflows||[]).includes(workflow))return {ok:false,status:403,error:"workflow_not_allowed"};
  const r=await github(env,manifest,`/repos/${manifest.repo.owner}/${manifest.repo.name}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:ref||manifest.repo.default_branch||"main",inputs})});
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

// ---- Research gateway (research.invoke) ----
// The Control Plane is the only research gateway for Clintware products. The
// provider chain is abstract: each provider function returns the same shape
// {model, text, citations, search_calls, usage} and can be replaced or extended
// without touching products. Today: Exa retrieval + Cloudflare Workers AI
// synthesis (primary), Exa answer (fallback). Provider credentials live only
// here — EXA_API_KEY worker secret first, else Control Plane durable storage —
// and are never returned through the API or MCP. Results are cached 24h.
const EXA_ENDPOINT="https://api.exa.ai";
const SYNTHESIS_MODEL="@cf/meta/llama-3.3-70b-instruct-fp8-fast"; // Workers AI free allocation
const RESEARCH_CACHE_TTL=86400;
function companySlugKey(company){
  return String(company).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"co";
}
async function researchConfig(env){
  try{
    const r=await registryHub(env).fetch("https://internal/research-config");
    if(!r.ok)return null;
    return await r.json();
  }catch{return null;}
}
async function exaApiKey(env){
  if(env.EXA_API_KEY)return {key:String(env.EXA_API_KEY),source:"worker-secret"};
  const cfg=await researchConfig(env);
  if(cfg&&cfg.exa_api_key)return {key:String(cfg.exa_api_key),source:"control-plane-durable"};
  return null;
}
function researchQuery(company){
  return `Prepare an implementation-focused brief on "${company}" with these markdown H2 sections in order: ## Company snapshot; ## Product and customers; ## Implementation model; ## Recent signals; ## Why this matters for implementations. In Implementation model, reconstruct public onboarding or implementation steps when the sources support them. If no public onboarding process is documented, say that plainly and add "Suggested onboarding path (inference)" with 4-6 practical steps grounded in the product, customer type, implementation requirements, and cited evidence. Never imply an inferred path is the company's actual process. Under 500 words. Be specific and evidence-based.`;
}
async function exaRequest(key,path,body,timeoutMs=40000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let r;
  try{
    r=await fetch(`${EXA_ENDPOINT}${path}`,{method:"POST",headers:{"content-type":"application/json","x-api-key":key},body:JSON.stringify(body),signal:controller.signal});
  }finally{clearTimeout(timer);}
  if(!r.ok){
    const err=new Error(`exa_http_${r.status}`);
    err.code=`exa_http_${r.status}`;
    try{err.body=await r.text();}catch{}
    throw err;
  }
  return await r.json();
}
// Provider A: Exa retrieval + Cloudflare Workers AI synthesis.
async function researchViaExaAndWorkersAI(env,key,company){
  const search=await exaRequest(key,"/search",{
    query:`${company} company products customers implementation onboarding`,
    numResults:6,
    type:"auto",
    category:"company",
    contents:{text:{maxCharacters:1800},highlights:{maxCharacters:400}}
  });
  const results=Array.isArray(search.results)?search.results:[];
  if(!results.length){const err=new Error("exa_no_results");err.code="exa_no_results";throw err;}
  const excerpts=results.map((r,i)=>`[${i+1}] ${r.title} — ${r.url}${r.publishedDate?` (${String(r.publishedDate).slice(0,10)})`:""}\n${String(r.text||(r.highlights||[]).join(" ")||"").slice(0,1800)}`).join("\n\n");
  const ai=await env.AI.run(SYNTHESIS_MODEL,{
    messages:[
      {role:"system",content:"You are the Clintware research service. Synthesize implementation briefs from the provided numbered sources. Cite inline as [n] for every company fact. If evidence is thin or missing, say so plainly. For onboarding, reconstruct the company's published process when supported. If no public process is documented, explicitly say so, then add a clearly labeled Suggested onboarding path (inference) with 4-6 practical steps grounded in cited product, customer, and implementation evidence. Never imply an inferred path is the company's actual process. Never fabricate metrics, dates, names, customers, or events."},
      {role:"user",content:`Company: ${company}\n\nSources:\n${excerpts}\n\nWrite the brief using exactly these markdown H2 sections, in order:\n## Company snapshot\n## Product and customers\n## Implementation model\n## Recent signals\n## Why this matters for implementations\n\nKeep it under 500 words, evidence-based, with [n] citations.`}
    ],
    max_tokens:1200
  });
  const text=String((ai&&(ai.response||ai.message||""))||"");
  if(!text){const err=new Error("workers_ai_empty");err.code="workers_ai_empty";throw err;}
  const usage=(ai&&ai.usage)||{};
  return {
    model:`exa-search+${SYNTHESIS_MODEL}`,
    text,
    citations:results.map(r=>({url:r.url,title:r.title||r.url,publishedDate:r.publishedDate||null})),
    search_calls:1,
    usage:{prompt_tokens:usage.prompt_tokens??null,completion_tokens:usage.completion_tokens??null,total_tokens:usage.total_tokens??null,reported_api_cost:search&&search.costDollars&&typeof search.costDollars.total==="number"?search.costDollars.total:null}
  };
}
// Provider B (fallback): Exa answer — retrieval and synthesis in one call.
async function researchViaExaAnswer(env,key,company){
  const data=await exaRequest(key,"/answer",{query:researchQuery(company)});
  const text=String((data&&data.answer)||"");
  if(!text){const err=new Error("exa_empty");err.code="exa_empty";throw err;}
  return {
    model:"exa-answer",
    text,
    citations:(Array.isArray(data.citations)?data.citations:[]).map(c=>({url:c.url,title:c.title||c.url,publishedDate:c.publishedDate||null})),
    search_calls:1,
    usage:{prompt_tokens:null,completion_tokens:null,total_tokens:null,reported_api_cost:data&&data.costDollars&&typeof data.costDollars.total==="number"?data.costDollars.total:null}
  };
}
async function invokeResearchProvider(env,body){
  const company=String(body.company||"").trim().slice(0,120);
  if(!company)return {ok:false,status:400,error:"company_required"};
  const cache=(typeof caches!=="undefined")&&caches.default?caches.default:null;
  const cacheKey=`https://cache.clintware-control-plane.internal/research/${companySlugKey(company)}.json`;
  if(cache){
    try{
      const hit=await cache.match(new Request(cacheKey));
      if(hit){
        const data=await hit.json();
        if(data&&data.available===true)return {...data,ok:true,cache:"hit",search_calls:0,source_count:(data.citations||[]).length};
      }
    }catch{}
  }
  const auth=await exaApiKey(env);
  if(!auth)return {ok:true,available:false,provider:"clintware-control-plane",reason:"research_provider_not_configured",cache:"miss"};
  const started=Date.now();
  let result=null;let reason="";
  try{
    result=await researchViaExaAndWorkersAI(env,auth.key,company);
  }catch(e){
    reason=(e&&e.code)||"research_provider_error";
    try{
      result=await researchViaExaAnswer(env,auth.key,company);
    }catch(e2){
      reason=(e2&&e2.code)||reason;
      result=null;
    }
  }
  if(!result)return {ok:true,available:false,provider:"clintware-control-plane",reason,cache:"miss",latency_ms:Date.now()-started};
  const payload={
    ok:true,
    available:true,
    provider:"clintware-research",
    model:result.model,
    text:result.text,
    citations:result.citations,
    usage:result.usage,
    search_calls:result.search_calls,
    source_count:result.citations.length,
    latency_ms:Date.now()-started,
    cache:"miss"
  };
  if(cache){
    try{
      await cache.put(new Request(cacheKey),new Response(JSON.stringify({available:true,provider:payload.provider,model:payload.model,text:payload.text,citations:payload.citations,usage:payload.usage}),{headers:{"content-type":"application/json","cache-control":`max-age=${RESEARCH_CACHE_TTL}`}}));
    }catch{}
  }
  return payload;
}

function createMcpServer(env,mcpRequest){
  const headerApiKey=()=>{
    // Secure relay path: the key arrives in the x-api-key header of the MCP
    // request itself (injected by a credential proxy), never in chat or logs.
    const v=mcpRequest&&mcpRequest.headers.get("x-api-key");
    return v&&v.length>=8?v:null;
  };
  const server=new McpServer({name:"Clintware Control Plane",version:VERSION});
  server.registerTool("clintware_control_plane_status",{
    title:"Get Clintware Control Plane status",
    description:"Return safe health, configured adapter availability, registered products, and current Control Plane version. Does not expose secrets.",
    inputSchema:{},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async()=>{
    const products=await (await registryHub(env).fetch("https://internal/list")).json();
    const productList=products.products||[];
    const identities=[...new Map(productList.map(p=>{
      const auth=githubAuth(env,p);
      return [auth.identity,{identity:auth.identity,configured:auth.configured,expected_secret:auth.secret_name}];
    })).values()];
    return {content:[{type:"text",text:JSON.stringify({ok:true,service:"Clintware Control Plane",version:VERSION,products:productList.map(p=>p.product),github_identities:identities,adapters:{github_read:true,github_write:identities.some(x=>x.configured),cloudflare_dns:Boolean(env.CLOUDFLARE_CONTROL_PLANE_TOKEN&&env.CLOUDFLARE_ZONE_ID)}})}]};
  });
  server.registerTool("clintware_client_handshake",{
    title:"Discover Clintware Control Plane client interoperability",
    description:"Return the vendor-neutral connection contract for ChatGPT, Claude, Gemini, Grok, Perplexity, CLI agents, and other MCP-capable clients. Never returns provider credentials.",
    inputSchema:{client:z.string().optional(),product:z.string().optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({client,product})=>{
    const manifest=product?await manifestFor(env,product):null;
    const auth=manifest?githubAuth(env,manifest):null;
    return {content:[{type:"text",text:JSON.stringify({
      ok:true,
      protocol:"clintware-control-plane/v1",
      handoff_protocol:"clintware-handoff/v1",
      mcp_endpoint:"https://mcp.clintware.com/mcp",
      authentication:"Bearer or x-api-key using the scoped Clintware MCP client credential; underlying GitHub/Cloudflare credentials remain server-side.",
      client:clip(client||"unknown",80),
      product:manifest?.product||normalizeProduct(product||""),
      repository:manifest?{identity:auth.identity,owner:manifest.repo?.owner||"",name:manifest.repo?.name||"",default_branch:manifest.repo?.default_branch||"main",credential_configured:auth.configured}:null,
      handoff_fields:["handoff_id","from_client","target_client","product","project","objective","context_summary","repository","decisions","constraints","changed_files","artifacts","next_actions","notes"],
      guidance:[
        "Use Clintware product manifests as the source of truth for repository identity and scope.",
        "Send only compact working context; never place provider tokens, passwords, API keys, cookies, or raw secret values in a handoff.",
        "When another model continues work, preserve handoff_id in notes/commits where useful for traceability.",
        "Use capability discovery/request tools rather than requesting broad infrastructure credentials."
      ]
    })}]};
  });
  server.registerTool("clintware_handoff_put",{
    title:"Store a cross-client Clintware work handoff",
    description:"Store a compact vendor-neutral continuation packet for another LLM/client. Do not include secrets or full raw chat histories.",
    inputSchema:{
      handoff_id:z.string().optional(),
      from_client:z.string().default("unknown"),
      target_client:z.string().default("any"),
      product:z.string().optional(),
      project:z.string().optional(),
      objective:z.string().default(""),
      context_summary:z.string().default(""),
      repository:z.object({identity:z.string().optional(),owner:z.string().optional(),name:z.string().optional(),branch:z.string().optional()}).optional(),
      decisions:z.array(z.string()).optional(),
      constraints:z.array(z.string()).optional(),
      changed_files:z.array(z.string()).optional(),
      artifacts:z.array(z.string()).optional(),
      next_actions:z.array(z.string()).optional(),
      notes:z.string().optional()
    },
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}
  },async(packet)=>{
    const r=await registryHub(env).fetch(new Request("https://internal/handoff",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(packet)}));
    const data=await r.json();
    return {isError:!r.ok,content:[{type:"text",text:JSON.stringify(data)}]};
  });
  server.registerTool("clintware_handoff_get",{
    title:"Retrieve a cross-client Clintware work handoff",
    description:"Retrieve one compact work packet by handoff ID so this client can continue work started by another LLM/client.",
    inputSchema:{handoff_id:z.string().min(1)},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({handoff_id})=>{
    const r=await registryHub(env).fetch(`https://internal/handoff/${encodeURIComponent(handoff_id)}`);
    const data=await r.json();
    return {isError:!r.ok,content:[{type:"text",text:JSON.stringify(data)}]};
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
  server.registerTool("clintware_research_configure",{
    title:"Configure the Clintware research provider",
    description:"Store or clear the Exa API key used by research.invoke. The key is validated against Exa, then kept in Control Plane durable storage (the EXA_API_KEY worker secret takes precedence) and is never returned by any endpoint or tool.",
    inputSchema:{exa_api_key:z.string().min(8).optional(),clear:z.boolean().optional()},
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}
  },async({exa_api_key,clear})=>{
    const relayKey=headerApiKey();
    if(!exa_api_key&&relayKey)exa_api_key=relayKey;
    if(clear){
      await registryHub(env).fetch(new Request("https://internal/research-config",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({exa_api_key:""})}));
      await audit(env,"proofos","research_provider_configured",crypto.randomUUID(),{action:"cleared"},true,"");
      return {content:[{type:"text",text:JSON.stringify({ok:true,exa_configured:Boolean(env.EXA_API_KEY),storage:env.EXA_API_KEY?"worker-secret":"none"})}]};
    }
    if(exa_api_key){
      try{
        await exaRequest(exa_api_key,"/search",{query:"Clintware",numResults:1},15000);
      }catch(e){
        return {isError:true,content:[{type:"text",text:JSON.stringify({error:"exa_key_invalid",detail:(e&&e.code)||"validation_failed"})}]};
      }
      await registryHub(env).fetch(new Request("https://internal/research-config",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({exa_api_key})}));
      await audit(env,"proofos","research_provider_configured",crypto.randomUUID(),{action:"configured",storage:env.EXA_API_KEY?"worker-secret":"control-plane-durable"},true,"");
      return {content:[{type:"text",text:JSON.stringify({ok:true,exa_configured:true,storage:env.EXA_API_KEY?"worker-secret":"control-plane-durable"})}]};
    }
    const cfg=await researchConfig(env);
    return {content:[{type:"text",text:JSON.stringify({ok:true,exa_configured:Boolean(env.EXA_API_KEY||(cfg&&cfg.exa_api_key)),worker_secret_present:Boolean(env.EXA_API_KEY),synthesis:env.AI?SYNTHESIS_MODEL:"disabled"})}]};
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
  server.registerTool("clintware_capabilities",{
    title:"Discover available Clintware capabilities",
    description:"Return all capabilities the active product can request, with scope info (allowed/protected paths, risk tiers). Does not expose secrets.",
    inputSchema:{product:z.string().default("proofos")},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
  },async({product})=>{
    const manifest=await manifestFor(env,product);
    if(!manifest)return {isError:true,content:[{type:"text",text:JSON.stringify({error:"product_not_found"})}]};
    const caps=(manifest.capabilities||[]).map(c=>{
      const baseCap=c.split(":")[0];
      const tier=riskTier(baseCap);
      return {capability:c,risk_tier:tier,risk_label:tier===0?"READ":tier===1?"LOW_RISK_MUTATION":tier===2?"DESTRUCTIVE_SCOPED":"ADMIN_HIGH_RISK"};
    });
    return {content:[{type:"text",text:JSON.stringify({
      product,
      repository:`${manifest.repo.owner}/${manifest.repo.name}`,
      capabilities:caps,
      allowed_write_paths:manifest.repo.write_prefixes||[],
      allowed_delete_paths:manifest.repo.delete_prefixes||[],
      protected_paths:manifest.protected_paths||DEFAULT_PROTECTED_PATHS,
      allowed_workflows:manifest.repo.allowed_workflows||[],
      allowed_dns_names:manifest.dns?.allowed_names||[],
      denied:manifest.deny||[]
    })}]};
  });
  server.registerTool("clintware_capability_request",{
    title:"Request a context-aware capability execution",
    description:"Express an operation intent (e.g. repo.file.delete) and let Clintware resolve provider-specific prerequisites (GitHub SHAs, branch refs) internally. Evaluates identity, context, policy, risk tier, and protected resources before executing.",
    inputSchema:{
      product:z.string().default("proofos"),
      capability:z.string().min(1),
      resource:z.object({
        repository:z.string().optional(),
        branch:z.string().optional(),
        path:z.string().optional(),
        from_path:z.string().optional(),
        to_path:z.string().optional(),
        workflow:z.string().optional(),
        name:z.string().optional(),
        type:z.string().optional(),
        content:z.string().optional(),
        ref:z.string().optional()
      }).default({}),
      reason:z.string().optional(),
      requested_operation:z.string().optional(),
      message:z.string().optional(),
      request_id:z.string().optional(),
      expected_content_hash:z.string().optional()
    },
    annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true}
  },async({product,capability,resource,reason,requested_operation,message,request_id,expected_content_hash})=>{
    const requestId=request_id||crypto.randomUUID();
    const auditId="capreq_"+crypto.randomUUID().slice(0,12);
    const manifest=await manifestFor(env,product);
    if(!manifest)return {isError:true,content:[{type:"text",text:JSON.stringify({status:"denied",audit_id:auditId,capability,reason:"product_not_found"})}]};
    // Evaluate policy
    const policy=evaluatePolicy(manifest,capability,resource,reason||"");
    if(policy.decision==="denied"){
      await audit(env,product,"capability_request"+":"+capability,requestId,{audit_id:auditId,decision:"denied",reason:policy.reason,resource},false,policy.reason);
      return {isError:true,content:[{type:"text",text:JSON.stringify({status:"denied",audit_id:auditId,capability,reason:policy.reason,resource})}]};
    }
    if(policy.decision==="unsupported"){
      await audit(env,product,"capability_request"+":"+capability,requestId,{audit_id:auditId,decision:"unsupported",reason:policy.reason,resource},false,policy.reason);
      return {isError:true,content:[{type:"text",text:JSON.stringify({status:"unsupported",audit_id:auditId,capability,reason:policy.reason,smallest_capability:policy.smallest_capability||capability,resource})}]};
    }
    if(policy.decision==="approval_required"){
      await audit(env,product,"capability_request"+":"+capability,requestId,{audit_id:auditId,decision:"approval_required",reason:policy.reason,resource},false,policy.reason);
      return {isError:true,content:[{type:"text",text:JSON.stringify({status:"approval_required",approval_request_id:auditId,capability,scope:{repository:`${manifest.repo.owner}/${manifest.repo.name}`,path:resource?.path||""},risk_tier:riskTier(capability),reason:policy.reason,expires_at:new Date(Date.now()+3600000).toISOString()})}]};
    }
    // Execute the capability
    let result={ok:false,error:"not_implemented"};
    try{
      if(capability==="repo.file.delete"){
        result=await repoFileDelete(env,manifest,{path:resource.path,message:message||reason||"Delete "+resource.path,branch:resource.branch});
      }else if(capability==="repo.file.write"||capability==="repo.file.create"){
        result=await repoWrite(env,manifest,{path:resource.path,content:resource.content||"",message:message||reason||"Write "+resource.path,branch:resource.branch,sha:resource.sha});
      }else if(capability==="repo.file.read"){
        result=await repoRead(env,manifest,resource.path,resource.ref);
      }else if(capability==="repo.file.move"||capability==="repo.file.rename"){
        result=await repoFileMove(env,manifest,{from_path:resource.from_path||resource.path,to_path:resource.to_path,message:message||reason||"Move file",branch:resource.branch});
      }else if(capability==="repo.branch.create"){
        result=await repoCreateBranch(env,manifest,resource.branch,resource.ref);
      }else if(capability==="repo.workflow.dispatch"){
        result=await workflowDispatch(env,manifest,resource.workflow,resource.ref||resource.branch,{});
      }else if(capability==="deployment.execute"){
        result=await workflowDispatch(env,manifest,resource.workflow,resource.ref||resource.branch,{});
      }else if(capability==="dns.ensure"){
        result=await ensureDns(env,manifest,{name:resource.name,type:resource.type||"CNAME",content:resource.content||"",proxied:true});
      }else{
        result={ok:false,error:"capability_not_implemented",detail:"The Control Plane does not currently implement execution of "+capability};
      }
    }catch(e){
      result={ok:false,error:"execution_error",detail:String(e&&e.message||e)};
    }
    await audit(env,product,"capability_request"+":"+capability,requestId,{audit_id:auditId,decision:"executed",capability,resource,reason:reason||"",result:{ok:result.ok,commit_sha:result.commit_sha||"",error:result.error||""},risk_tier:riskTier(capability)},result.ok,result.error||"");
    return {isError:!result.ok,content:[{type:"text",text:JSON.stringify({status:result.ok?"executed":"error",audit_id:auditId,capability,reason:policy.reason,result,sha_resolved_internally:result.sha_resolved_internally||false})}]};
  });
  return server;
}

async function handleMcp(request,env,ctx){
  if(!await requireMcp(request,env))return json({error:"unauthorized"},401,{"www-authenticate":"Bearer"});
  const handler=createMcpHandler(()=>createMcpServer(env,request),{
    route:"/mcp",
    allowedHostnames:["mcp.clintware.com"],
    allowedOriginHostnames:["perplexity.ai","www.perplexity.ai","chatgpt.com","chat.openai.com","platform.openai.com","claude.ai","www.claude.ai","console.anthropic.com","gemini.google.com","aistudio.google.com","grok.com","www.grok.com","x.com","www.x.com","copilot.microsoft.com","clintware.com","www.clintware.com"],
    responseMode:"auto"
  });
  return handler(request,env,ctx);
}

function safeConfig(env){
  const knownGithub=Boolean(env.GITHUB_CONTROL_PLANE_TOKEN||env.GITHUB_TOKEN_CLINTKOSH||env.GITHUB_TOKEN_CODEFEDDY);
  return {
    github_read:true,
    github_write:knownGithub,
    github_actions:knownGithub,
    github_multi_identity:true,
    cloudflare_dns:Boolean(env.CLOUDFLARE_CONTROL_PLANE_TOKEN&&env.CLOUDFLARE_ZONE_ID),
    mcp_auth:Boolean(env.CONTROL_PLANE_MCP_TOKEN||env.CONTROL_PLANE_ADMIN_TOKEN),
    mcp_per_client_credentials:true,
    admin_auth:Boolean(env.CONTROL_PLANE_ADMIN_TOKEN)
  };
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    try{
      if(request.method==="GET"&&url.pathname==="/health"){
        const products=await (await registryHub(env).fetch("https://internal/list")).json();
        const rconfig=await researchConfig(env);
        const productList=products.products||[];
        const githubIdentities=[...new Map(productList.map(p=>{
          const auth=githubAuth(env,p);
          return [auth.identity,{identity:auth.identity,configured:auth.configured,expected_secret:auth.secret_name,repositories:[]}];
        })).values()];
        for(const p of productList){
          const identity=normalizeGithubIdentity(p?.repo?.identity||p?.repo?.owner||"clintkosh");
          const row=githubIdentities.find(x=>x.identity===identity);
          if(row&&p?.repo?.owner&&p?.repo?.name)row.repositories.push(`${p.repo.owner}/${p.repo.name}`);
        }
        const adapters={...safeConfig(env),github_write:githubIdentities.some(x=>x.configured),github_actions:githubIdentities.some(x=>x.configured)};
        return json({ok:true,service:"Clintware Control Plane",version:VERSION,mcp:"/mcp",api:"/api/v1",products:productList.map(p=>p.product),github_identities:githubIdentities,adapters,research:{provider:"exa",configured:Boolean(env.EXA_API_KEY||(rconfig&&rconfig.exa_api_key)),synthesis:env.AI?SYNTHESIS_MODEL:"disabled"},time:nowIso()});
      }
      if(url.pathname==="/mcp")return handleMcp(request,env,ctx);

      if(request.method==="GET"&&url.pathname==="/api/v1"){
        return json({name:"Clintware Control Plane",version:VERSION,endpoints:{health:"/health",products:"/api/v1/products",mcp_clients:"/api/v1/mcp/clients",events:"/api/v1/events",research:"/api/v1/research",capability:"/api/v1/capability",handoffs:"/api/v1/handoffs/:id",summary:"/api/v1/products/:product/summary",mcp:"/mcp"},security:"identity -> context -> policy -> capability -> action -> audit"});
      }
      if(request.method==="GET"&&url.pathname==="/api/v1/mcp/clients"){
        if(!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        return await registryHub(env).fetch("https://internal/mcp-clients");
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/mcp/clients"){
        if(!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const body=await reqJson(request);
        const client_id=normalizeProduct(body.client_id||body.name||("client-"+crypto.randomUUID().slice(0,8)));
        const token=String(body.token||crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID());
        const token_hash=await sha256(token);
        const r=await registryHub(env).fetch(new Request("https://internal/mcp-client",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({client_id,name:body.name||client_id,token_hash,allowed_products:body.allowed_products,enabled:true})}));
        if(!r.ok)return r;
        return json({ok:true,client_id,token,warning:"This is the only response that contains the plaintext client token. Store it in that LLM/client only; Clintware retains only its hash."});
      }
      const mcpClientMatch=url.pathname.match(/^\/api\/v1\/mcp\/clients\/([^/]+)$/);
      if(request.method==="DELETE"&&mcpClientMatch){
        if(!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        return await registryHub(env).fetch(new Request(`https://internal/mcp-client/${encodeURIComponent(decodeURIComponent(mcpClientMatch[1]))}`,{method:"DELETE"}));
      }
      if(request.method==="POST"&&url.pathname==="/api/v1/handoffs"){
        if(!await requireMcp(request,env))return json({error:"unauthorized"},401);
        const body=await reqJson(request,64_000);
        return await registryHub(env).fetch(new Request("https://internal/handoff",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
      }
      const handoffMatch=url.pathname.match(/^\/api\/v1\/handoffs\/([^/]+)$/);
      if(request.method==="GET"&&handoffMatch){
        if(!await requireMcp(request,env))return json({error:"unauthorized"},401);
        return await registryHub(env).fetch(`https://internal/handoff/${encodeURIComponent(decodeURIComponent(handoffMatch[1]))}`);
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
        const body=await reqJson(request);const product=normalizeProduct(body.product)||serviceProduct(request);
        if(!product)return json({error:"product_required"},400);
        const auth=await verifyProductRequest(request,env,product);if(!auth)return json({error:"unauthorized"},401);
        if(!capabilityMatches(auth.manifest,`analytics.write:${product}`))return json({error:"capability_denied"},403);
        const event={...body,product};
        const r=await productHub(env,product).fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(event)}));
        return new Response(r.body,{status:r.status,headers:JSON_HEADERS});
      }

      if(request.method==="POST"&&url.pathname==="/api/v1/research"){
        const body=await reqJson(request);const product=normalizeProduct(body.product)||serviceProduct(request);
        if(!product)return json({error:"product_required"},400);
        const auth=await verifyProductRequest(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=auth?auth.manifest:await manifestFor(env,product);
        if(!capabilityMatches(manifest,"research.invoke"))return json({error:"capability_denied"},403);
        const result=await invokeResearchProvider(env,body);
        if(result.status)return json({ok:false,error:result.error},result.status);
        await audit(env,product,"research_invoke",body.request_id,{company:body.company,provider:result.provider||"",model:result.model||"",available:result.available,cache:result.cache||"miss",search_calls:result.search_calls??0,source_count:result.source_count??((result.citations||[]).length),latency_ms:result.latency_ms??null,reported_api_cost:(result.usage&&result.usage.reported_api_cost)??null,reason:result.reason||""},result.available,result.available?"":(result.reason||"unavailable"));
        return json(result);
      }

      const summaryMatch=url.pathname.match(/^\/api\/v1\/products\/([^/]+)\/(summary|recent|errors|daily|funnel|providers|cache|conversions)$/);
      if(request.method==="GET"&&summaryMatch){
        const product=normalizeProduct(summaryMatch[1]);const auth=await verifyProductRequest(request,env,product);
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
      // REST endpoint for capability requests (same logic as MCP tool)
      if(request.method==="POST"&&url.pathname==="/api/v1/capability"){
        const body=await reqJson(request);const product=normalizeProduct(body.product);
        const auth=await verifyProductToken(request,env,product);if(!auth&&!await requireAdmin(request,env))return json({error:"unauthorized"},401);
        const manifest=await manifestFor(env,product);
        if(!manifest)return json({error:"product_not_found"},404);
        const requestId=body.request_id||crypto.randomUUID();
        const auditId="capreq_"+crypto.randomUUID().slice(0,12);
        const policy=evaluatePolicy(manifest,body.capability,body.resource||{},body.reason||"");
        if(policy.decision!=="executed"){
          await audit(env,product,"capability_request"+":"+body.capability,requestId,{audit_id:auditId,decision:policy.decision,reason:policy.reason,resource:body.resource||{}},false,policy.reason);
          return json({status:policy.decision,audit_id:auditId,capability:body.capability,reason:policy.reason},policy.decision==="denied"?403:policy.decision==="unsupported"?501:202);
        }
        let result={ok:false,error:"not_implemented"};
        try{
          if(body.capability==="repo.file.delete"){
            result=await repoFileDelete(env,manifest,{path:body.resource.path,message:body.message||body.reason,branch:body.resource.branch});
          }else if(body.capability==="repo.file.write"||body.capability==="repo.file.create"){
            result=await repoWrite(env,manifest,{path:body.resource.path,content:body.resource.content||"",message:body.message||body.reason,branch:body.resource.branch,sha:body.resource.sha});
          }else if(body.capability==="repo.file.read"){
            result=await repoRead(env,manifest,body.resource.path,body.resource.ref);
          }else if(body.capability==="repo.file.move"){
            result=await repoFileMove(env,manifest,{from_path:body.resource.from_path,to_path:body.resource.to_path,message:body.message||body.reason,branch:body.resource.branch});
          }else if(body.capability==="repo.branch.create"){
            result=await repoCreateBranch(env,manifest,body.resource.branch,body.resource.ref);
          }else if(body.capability==="repo.workflow.dispatch"||body.capability==="deployment.execute"){
            result=await workflowDispatch(env,manifest,body.resource.workflow,body.resource.ref||body.resource.branch,{});
          }else if(body.capability==="dns.ensure"){
            result=await ensureDns(env,manifest,{name:body.resource.name,type:body.resource.type||"CNAME",content:body.resource.content||"",proxied:true});
          }
        }catch(e){
          result={ok:false,error:"execution_error",detail:String(e&&e.message||e)};
        }
        await audit(env,product,"capability_request"+":"+body.capability,requestId,{audit_id:auditId,decision:"executed",capability:body.capability,resource:body.resource||{},reason:body.reason||"",result:{ok:result.ok,commit_sha:result.commit_sha||"",error:result.error||""},risk_tier:riskTier(body.capability)},result.ok,result.error||"");
        return json({status:result.ok?"executed":"error",audit_id:auditId,capability:body.capability,result,sha_resolved_internally:result.sha_resolved_internally||false},result.ok?200:500);
      }

      return json({error:"not_found"},404);
    }catch(error){
      console.error(JSON.stringify({event:"control_plane_error",path:url.pathname,error:String(error),stack:error?.stack}));
      return json({error:"internal_error",message:String(error?.message||error)},Number(error?.status||500));
    }
  }
};

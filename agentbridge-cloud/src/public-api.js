import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

const API_VERSION="2026-08-23";
const MAX_BODY_BYTES=262_144;
const MAX_TEXT_CHARS=200_000;
const DEFAULT_THRESHOLD_CHARS=6_000;
const DEFAULT_MAX_CHARS=24_000;
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const ERROR_RE=/(error|exception|traceback|failed|failure|fatal|panic|denied|not found|syntax)/i;
const MCP_ORIGINS=["chatgpt.com","chat.openai.com","platform.openai.com","quillgeist.clintware.com"];
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...JSON_HEADERS,...extra}});

export function estimateTokens(text){const value=String(text??"");return value?Math.max(1,Math.ceil(value.length/4)):0;}

function dedupe(lines){
  const out=[];let previous=null,count=0;
  const flush=()=>{if(previous===null)return;out.push(previous);if(count>1)out.push(`[Quillgeist: previous line repeated ${count-1} more times]`);};
  for(const line of lines){if(line===previous)count+=1;else{flush();previous=line;count=1;}}flush();return out;
}

export function compactText(text,options={}){
  const input=String(text??"");
  const thresholdChars=Math.max(500,Math.min(50_000,Number(options.threshold_chars)||DEFAULT_THRESHOLD_CHARS));
  const maxChars=Math.max(1_000,Math.min(100_000,Number(options.max_chars)||DEFAULT_MAX_CHARS));
  const rawTokens=estimateTokens(input);
  if(input.length<=thresholdChars)return{output:input,metrics:{method:"pass",compacted:false,raw_chars:input.length,output_chars:input.length,raw_tokens_est:rawTokens,output_tokens_est:rawTokens,gross_tokens_removed_est:0,reduction_pct:0}};

  const lines=dedupe(input.split(/\r?\n/));let output=lines.join("\n"),method="dedupe";
  if(output.length>maxChars){
    const important=new Set(),chosen=new Set();
    for(let i=0;i<lines.length;i+=1)if(ERROR_RE.test(lines[i]))for(let j=Math.max(0,i-2);j<Math.min(lines.length,i+4);j+=1)important.add(j);
    for(let i=0;i<Math.min(80,lines.length);i+=1)chosen.add(i);
    for(let i=Math.max(0,lines.length-80);i<lines.length;i+=1)chosen.add(i);
    for(const index of important)chosen.add(index);
    const selected=[];let last=-2;
    for(const index of [...chosen].sort((a,b)=>a-b)){if(index>last+1)selected.push("[Quillgeist: non-critical context omitted]");selected.push(lines[index]);last=index;}
    output=selected.join("\n");method="evidence_preserving";
    if(output.length>maxChars){const marker="\n[Quillgeist: middle context omitted]\n";const half=Math.max(1,Math.floor((maxChars-marker.length)/2));output=output.slice(0,half)+marker+output.slice(-half);method="evidence_preserving_truncated";}
  }
  const outputTokens=estimateTokens(output),removed=Math.max(0,rawTokens-outputTokens);
  return{output,metrics:{method,compacted:removed>0,raw_chars:input.length,output_chars:output.length,raw_tokens_est:rawTokens,output_tokens_est:outputTokens,gross_tokens_removed_est:removed,reduction_pct:rawTokens?removed/rawTokens*100:0}};
}

async function readJsonLimited(request){
  const declared=Number(request.headers.get("content-length")||0);if(declared>MAX_BODY_BYTES)throw Object.assign(new Error("request_too_large"),{status:413});if(!request.body)return{};
  const reader=request.body.getReader(),chunks=[];let total=0;
  while(true){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BODY_BYTES){try{await reader.cancel();}catch{}throw Object.assign(new Error("request_too_large"),{status:413});}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder().decode(bytes)||"{}");}catch{throw Object.assign(new Error("invalid_json"),{status:400});}
}

async function productImpact(env,days=30){
  const boundedDays=Math.max(7,Math.min(90,Number(days)||30));const stub=env.PRODUCT_METRICS_HUB.getByName("agentbridge-global");const response=await stub.fetch(`https://internal/impact?days=${boundedDays}`);if(!response.ok)throw new Error("impact_unavailable");
  const data=await response.json(),m=data.metrics||{};
  return{generated_at:new Date().toISOString(),coverage:"participating Quillgeist installs and API/MCP calls with telemetry enabled",estimated_fields:["raw_tokens_est","sent_tokens_est","gross_tokens_removed_est","net_tokens_saved_est","local_tokens_est"],metrics:{prompts_compiled:Number(m.prompts_compiled||0),runs:Number(m.runs||0),compactions:Number(m.compactions||0),api_compactions:Number(m.api_compactions||0),pass_through_runs:Number(m.pass_through_runs||0),raw_tokens_est:Number(m.raw_tokens_est||0),sent_tokens_est:Number(m.sent_tokens_est||0),gross_tokens_removed_est:Number(m.tokens_avoided_est||0),net_tokens_saved_est:Number(m.net_tokens_saved_est||0),local_tokens_est:Number(m.local_tokens_est||0),compaction_rate_pct:Number(m.compaction_rate_pct||0),gross_reduction_pct:Number(m.gross_reduction_pct||0),net_savings_pct:Number(m.net_savings_pct||0),passed:Number(m.passed||0),failed:Number(m.failed||0),patches_applied:Number(m.patches_applied||0),files_changed:Number(m.files_changed||0)},trends:(data.trends||[]).map(row=>({date:String(row.date||""),prompts_compiled:Number(row.prompts_compiled||0),runs:Number(row.runs||0),compactions:Number(row.compactions||0),api_compactions:Number(row.api_compactions||0),raw_tokens_est:Number(row.raw_tokens_est||0),sent_tokens_est:Number(row.sent_tokens_est||0),gross_tokens_removed_est:Number(row.tokens_avoided_est||0),net_tokens_saved_est:Number(row.net_tokens_saved_est||0)}))};
}

async function recordApiCompaction(env,metrics,source){
  const product=env.PRODUCT_METRICS_HUB.getByName("agentbridge-global");
  const event={event_id:`public:${crypto.randomUUID()}`,type:"api_compaction",ts:Date.now(),status:metrics.compacted?"compacted":"pass",raw_tokens_est:metrics.raw_tokens_est,sent_tokens_est:metrics.output_tokens_est,tokens_avoided_est:metrics.gross_tokens_removed_est,net_tokens_saved_est:metrics.gross_tokens_removed_est,local_tokens_est:0,node_version:`public-api-${API_VERSION}`,metadata:{source,method:metrics.method,content_collected:false,aggregate_only:true}};
  await product.fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(event)}));
}

function apiIndex(){return{name:"Quillgeist Public API",version:API_VERSION,base_url:"https://quillgeist.clintware.com/api/v1",mcp_url:"https://quillgeist.clintware.com/mcp",endpoints:{compact:{method:"POST",path:"/api/v1/compact"},impact:{method:"GET",path:"/api/v1/impact?days=30"},openapi:{method:"GET",path:"/api/v1/openapi.json"}},privacy:"https://quillgeist.clintware.com/privacy.html",terms:"https://quillgeist.clintware.com/terms.html",support:"https://quillgeist.clintware.com/support.html",documentation:"https://quillgeist.clintware.com/developers.html"};}

function openApiDocument(){return{openapi:"3.1.0",info:{title:"Quillgeist Public API",version:API_VERSION,description:"Privacy-conscious prompt/context compaction and aggregate Quillgeist impact metrics."},servers:[{url:"https://quillgeist.clintware.com"}],paths:{"/api/v1/compact":{post:{operationId:"compactContext",summary:"Compact prompt or execution context while preserving high-signal evidence",requestBody:{required:true,content:{"application/json":{schema:{type:"object",required:["text"],properties:{text:{type:"string",maxLength:MAX_TEXT_CHARS},threshold_chars:{type:"integer",minimum:500,maximum:50_000,default:DEFAULT_THRESHOLD_CHARS},max_chars:{type:"integer",minimum:1_000,maximum:100_000,default:DEFAULT_MAX_CHARS}}}}}},responses:{"200":{description:"Compacted context and estimated token metrics"}}}},"/api/v1/impact":{get:{operationId:"getProductImpact",summary:"Get aggregate Quillgeist impact metrics and trends",parameters:[{name:"days",in:"query",schema:{type:"integer",minimum:7,maximum:90,default:30}}],responses:{"200":{description:"Aggregate, privacy-safe product metrics"}}}}}};}

export async function handlePublicApi(request,env,ctx){
  const url=new URL(request.url),cors={"access-control-allow-origin":"*"};
  if(request.method==="GET"&&url.pathname==="/api/v1")return json(apiIndex(),200,cors);
  if(request.method==="GET"&&url.pathname==="/api/v1/openapi.json")return json(openApiDocument(),200,{...cors,"cache-control":"public, max-age=300"});
  if(request.method==="GET"&&url.pathname==="/api/v1/impact"){try{return json(await productImpact(env,url.searchParams.get("days")),200,{...cors,"cache-control":"public, max-age=120, s-maxage=300"});}catch{return json({error:"impact_unavailable"},503,cors);}}
  if(request.method==="OPTIONS"&&url.pathname.startsWith("/api/v1/"))return new Response(null,{status:204,headers:{...cors,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","access-control-max-age":"86400"}});
  if(request.method==="POST"&&url.pathname==="/api/v1/compact"){
    try{const body=await readJsonLimited(request),text=String(body.text??"");if(!text.trim())return json({error:"text_required"},400,cors);if(text.length>MAX_TEXT_CHARS)return json({error:"text_too_large",max_chars:MAX_TEXT_CHARS},413,cors);const result=compactText(text,body);ctx.waitUntil(recordApiCompaction(env,result.metrics,"public_api"));return json({version:API_VERSION,output:result.output,metrics:result.metrics,privacy:{content_stored_by_quillgeist:false,content_logged_to_quillgeist_telemetry:false,aggregate_metrics_recorded:true}},200,cors);}catch(error){return json({error:String(error?.message||"bad_request")},Number(error?.status||400),cors);}
  }
  return null;
}

function createQuillgeistMcpServer(env){
  const server=new McpServer({name:"Quillgeist",version:API_VERSION});
  server.registerTool("quillgeist_compact_context",{title:"Compact context with Quillgeist",description:"Reduce repetitive or low-signal prompt, log, transcript, or execution context before sending it to another model. Preserve error-adjacent evidence plus the beginning and end of long inputs. Return compacted text and estimated token reduction. This tool records an aggregate compaction event containing token estimates and method/source metadata, but not the submitted prompt or context text.",inputSchema:{text:z.string().min(1).max(MAX_TEXT_CHARS).describe("Prompt or context to compact."),threshold_chars:z.number().int().min(500).max(50_000).optional().describe("Do not compact below this character count. Default 6000."),max_chars:z.number().int().min(1_000).max(100_000).optional().describe("Target maximum compacted character count. Default 24000.")},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},async({text,threshold_chars,max_chars})=>{const result=compactText(text,{threshold_chars,max_chars});await recordApiCompaction(env,result.metrics,"chatgpt_mcp");return{content:[{type:"text",text:JSON.stringify({output:result.output,metrics:result.metrics,privacy:{content_logged_to_quillgeist_telemetry:false,aggregate_metrics_recorded:true}})}]};});
  server.registerTool("quillgeist_product_impact",{title:"Get Quillgeist impact metrics",description:"Return privacy-safe aggregate Quillgeist usage, compaction, token-savings, execution, and trend metrics across participating installs and API/MCP use. Token fields are estimates where labeled.",inputSchema:{days:z.number().int().min(7).max(90).optional().describe("Daily trend window, 7 to 90 days. Default 30.")},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async({days})=>{const impact=await productImpact(env,days||30);return{content:[{type:"text",text:JSON.stringify(impact)}]};});
  return server;
}

export function handleMcp(request,env,ctx){
  const handler=createMcpHandler(()=>createQuillgeistMcpServer(env),{route:"/mcp",allowedHostnames:["quillgeist.clintware.com"],allowedOriginHostnames:MCP_ORIGINS,responseMode:"auto"});
  return handler(request,env,ctx);
}

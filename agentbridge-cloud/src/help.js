import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:JSON_HEADERS});
const nowIso=()=>new Date().toISOString();

export const BASE_HELP={
  schema:1,
  updated_at:"2026-08-15T00:00:00Z",
  getting_started:[
    {id:"quick-start",title:"Quick start",body:"Run `agentbridge init`, pair with AgentBridge Cloud, start `agentbridge daemon`, inspect an Execution Pack, then run locally or send it from Cloud."},
    {id:"execution-pack",title:"Execution Packs",body:"AgentBridge accepts `.abpack`, AgentBridge JSON, and AgentBridge Markdown. Inspect a pack before execution to review its workspace, permissions, steps, and Definition of Done."},
    {id:"cloud-pairing",title:"Pair a device",body:"Run `agentbridge pair --cloud https://agentbridge.clintware.com`, then enter the eight-character pairing code in Cloud. The Node connects outbound; no inbound admin port is exposed."},
    {id:"permissions",title:"Permissions",body:"Local policy is authoritative. `always` permits a capability, `ask` requires approval, and `never` cannot be overridden remotely."},
    {id:"contextor",title:"Contextor",body:"Contextor reduces execution output before it returns to an upstream planner. Small results pass through, large results use deterministic compaction, and Smart mode can optionally use a local model when the savings justify it."},
    {id:"scheduling",title:"Scheduling",body:"Schedules may be device-owned or cloud-owned. Device-owned schedules can continue while Cloud is unavailable. Cloud-owned schedules are dispatched to the selected paired Node."},
    {id:"telemetry",title:"Metrics and error reporting",body:"AgentBridge records operational metadata such as connections, sends/receives, run status and duration, Contextor token estimates, patch/file counts, and redacted errors. Prompt text and file contents are not part of the telemetry event."}
  ],
  setup_removal:[
    {id:"install-node",title:"Initial setup",body:"Download the correct Node for Windows, macOS, or Linux. Run `agentbridge init`, review `~/.agentbridge/config.json`, then pair the Node with Cloud."},
    {id:"workspace",title:"Restrict workspaces",body:"Add trusted directories to `allowed_workspaces`. Production use should normally use explicit allowed workspaces."},
    {id:"start-daemon",title:"Start Cloud routing",body:"Run `agentbridge daemon` to keep Cloud routing, telemetry delivery, Help Center sync, and schedule synchronization active."},
    {id:"remove-associations",title:"Remove file associations",body:"Until the signed installer provides one-click removal, use the operating system Default Apps/File Associations settings to change `.abpack` and `.abresult` handlers."},
    {id:"remove-node",title:"Remove AgentBridge",body:"Stop the daemon, remove the executable/package, and delete `~/.agentbridge` only if you also want to remove local settings, schedules, run evidence, snapshots, queued telemetry, and Help Center history."},
    {id:"disconnect-cloud",title:"Disconnect Cloud",body:"Stop the daemon or remove/change the Cloud pairing. Local Execution Packs and device-owned schedules can continue independently."}
  ],
  faq:[
    {id:"faq-llm",q:"Does AgentBridge require a local LLM?",a:"No. Explicit Execution Packs use the deterministic executor. A local model is optional for Smart Contextor and future intent interpretation."},
    {id:"faq-admin",q:"Does Clintware get unrestricted administrator access?",a:"No. Cloud requests work; the local Node enforces device policy. A local `never` capability cannot be overridden remotely."},
    {id:"faq-offline",q:"Can AgentBridge work without Cloud?",a:"Yes. Local Execution Packs and device-owned schedules can operate independently. Cloud adds routing, synchronization, remote control, history, and reporting."},
    {id:"faq-data",q:"What metrics go to Cloud?",a:"Operational metadata such as connection/send/receive counts, run status and duration, estimated token savings, patch/file counts, Node version, and redacted errors. Prompt text and file contents are not sent as telemetry."},
    {id:"faq-error",q:"What happens when a run fails?",a:"AgentBridge stores the Result Pack locally, sends a redacted error/metrics event when telemetry is enabled, and returns compact planner feedback for a repair iteration."},
    {id:"faq-bugs",q:"How are product bugs tracked?",a:"AgentBridge-internal or user-reported failures receive a stable bug fingerprint. Successful repair packs can identify bugs they fix, allowing Cloud to move them from open to resolved and reopen them if they recur."},
    {id:"faq-reports",q:"Can I export my data?",a:"Yes. Cloud provides account-scoped metrics and report exports. Users see only their own account data; Clintware product-health metrics are maintained separately as de-identified aggregates."},
    {id:"faq-abpack",q:"What is an .abpack?",a:"A portable AgentBridge Execution Pack containing structured instructions, requested capabilities, Definition of Done, and optionally embedded files."}
  ],
  glossary:[
    {term:"AgentBridge Cloud",definition:"Hosted control plane for pairing devices, routing jobs, synchronizing schedules/help, and storing account-scoped operational history."},
    {term:"AgentBridge Node",definition:"Local Windows, macOS, or Linux executor that enforces local permissions and performs authorized work."},
    {term:"Execution Pack (.abpack)",definition:"Portable structured work instructions sent to AgentBridge for local validation and execution."},
    {term:"Result Pack (.abresult)",definition:"Structured evidence from a run, including status, Definition-of-Done results, changes, errors, Contextor metrics, and planner feedback."},
    {term:"Contextor",definition:"Local context-efficiency layer that reduces what must be sent to an external model while preserving evidence required for the next decision."},
    {term:"Definition of Done",definition:"Machine-checkable success criteria AgentBridge evaluates after execution."},
    {term:"Capability policy",definition:"Local allow/ask/deny rules for actions such as file writes, process execution, Git push, admin operations, and network writes."},
    {term:"Owner Mode",definition:"Advanced local mode for trusted automation where policy allows it. It never overrides `never` rules."},
    {term:"Device-owned schedule",definition:"Schedule stored/executed by the Node so it can continue while Cloud is unavailable."},
    {term:"Cloud-owned schedule",definition:"Schedule triggered by Cloud and dispatched to a selected paired Node."},
    {term:"Product bug",definition:"A failure attributed to AgentBridge rather than the user's task, environment, or denied permission."},
    {term:"Bug fingerprint",definition:"Normalized hash of a redacted error signature used to group repeat occurrences without storing a user's prompt or file contents."},
    {term:"Telemetry",definition:"Operational metadata used for the user's dashboard/reporting and separate de-identified aggregate product-health metrics."}
  ],
  fixes:[
    {id:"alpha-1",date:"2026-08-15",version:"0.1.0-alpha.1",title:"Public alpha execution backbone",body:"Cross-platform Nodes, Cloud routing, Execution/Result Packs, local capability policy, rollback, schedules, Contextor, file associations, and mobile/PWA control."},
    {id:"alpha-2-quality",date:"2026-08-15",version:"0.1.0-alpha.2",title:"Quality loop and synchronized Help Center",body:"Automatic operational metrics/error reporting, account reports, de-identified product-health aggregation, bug lifecycle tracking, and a local/cloud synchronized Help Center."}
  ]
};

const sectionKeys={getting_started:"id",setup_removal:"id",faq:"id",glossary:"term",fixes:"id"};
const clone=(x)=>JSON.parse(JSON.stringify(x));

function mergeRows(base=[],...sets){
  const key=sets.pop();
  const map=new Map();const order=[];
  for(const rows of [base,...sets])for(const row of rows||[]){
    const id=String(row?.[key]??"").trim();if(!id)continue;
    if(!map.has(id))order.push(id);
    map.set(id,{...(map.get(id)||{}),...row});
  }
  return order.map(id=>map.get(id));
}

export function mergeHelp(...docs){
  const out=clone(BASE_HELP);
  for(const [section,key] of Object.entries(sectionKeys)){
    const additions=docs.map(d=>d?.[section]||[]);
    out[section]=mergeRows(BASE_HELP[section]||[],...additions,key);
  }
  out.schema=1;out.updated_at=nowIso();
  return out;
}

export class HelpHub extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.env=env;}
  async state(){return mergeHelp(await this.ctx.storage.get("help")||{});}
  async fetch(request){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/state")return json({help:await this.state()});
    if(request.method==="POST"&&url.pathname==="/sync"){
      const incoming=await request.json();
      const merged=mergeHelp(await this.ctx.storage.get("help")||{},incoming?.help||incoming||{});
      await this.ctx.storage.put("help",merged);
      return json({ok:true,help:merged});
    }
    return json({error:"not_found"},404);
  }
}

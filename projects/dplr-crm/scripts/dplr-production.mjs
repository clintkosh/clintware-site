import fs from "node:fs";

const p = new URL("./src/index.js", import.meta.url);
const samplesPath = new URL("./src/sample-customers.js", import.meta.url);
let src = fs.readFileSync(p, "utf8");
let samples = fs.readFileSync(samplesPath, "utf8");
if (samples.includes("SAMPLE_SEED_VERSION=3")) samples = samples.replace("SAMPLE_SEED_VERSION=3", "SAMPLE_SEED_VERSION=5");
else if (samples.includes("SAMPLE_SEED_VERSION=4")) samples = samples.replace("SAMPLE_SEED_VERSION=4", "SAMPLE_SEED_VERSION=5");
fs.writeFileSync(samplesPath, samples);

// DPLR is deliberately no-login. Keep one anonymous browser workspace stable for
// 180 days and remove the live identity entry points from this candidate demo.
src = src.replace(
  'cookie:fresh?sessionCookie(GUEST_COOKIE,id):""',
  'cookie:fresh?setCookie(GUEST_COOKIE,id,15552000):""'
);
src = src.replaceAll('persistence:"guest-session"', 'persistence:"browser-persistent"');
src = src.replaceAll('session?"account":"guest-session"', 'session?"account":"browser-persistent"');
src = src.replace(
  "form-action 'self' https://auth.clintware.com;",
  "form-action 'self';"
);
src = src.replace(
  'identity:AUTH_ORIGIN,oauthApp:APP_ID,',
  'identity:"disabled-no-login-demo",oauthApp:"none",'
);
src = src.replace(
  'if(req.method==="GET"&&u.pathname==="/auth/login")return startLogin();',
  'if(req.method==="GET"&&u.pathname==="/auth/login")return j({error:"not_found"},404);'
);
src = src.replace(
  'if(req.method==="GET"&&u.pathname==="/auth/callback")return finishLogin(req,env);',
  'if(req.method==="GET"&&u.pathname==="/auth/callback")return j({error:"not_found"},404);'
);
src = src.replace(
  'if(req.method==="POST"&&u.pathname==="/auth/logout"){const s=await currentSession(req,env).catch(()=>null);if(s)await doStub(env).fetch("https://internal/session/"+encodeURIComponent(s.sid),{method:"DELETE"});return new Response(null,{status:303,headers:secureHeaders(new Headers({location:"/","set-cookie":clearCookie(SESSION_COOKIE)}))})}',
  'if(u.pathname==="/auth/logout")return j({error:"not_found"},404)'
);
src = src.replace(
  'const session=await currentSession(req,env).catch(()=>null);',
  'const session=null;'
);

// Every curated sample should look like an operating account, not a blank card.
// Public Doppel customer references receive discovery proposals only; private facts
// are never invented. Synthetic accounts receive clearly labeled technical scenarios.
const marker = "\n return a}\n async seed()";
if (!src.includes(marker)) throw new Error("DPLR sampleRecords return marker missing");
const add = `
 const sampleProv=pub?"internal_proposal":p;
 a.push(
  ["call_prep",sampleProv,{title:"Default technical review prep · "+s.n,meetingDate:"",meetingType:"Technical customer review",objective:pub?"Validate the private technical architecture and identify the highest-value technical discovery questions without inventing account facts.":"Resolve the highest-risk technical unknown while preserving customer context and leaving explicit owners, evidence, and the next decision.",attendees:"CSM; Technical Customer Engineer; customer security / technical owner; Support or specialist team as required",opening:"Restate customer impact and the known technical state. Separate facts from hypotheses before changing configuration or escalating.",currentState:(s.st||"")+" | Systems: "+(s.sys||"Discovery required")+" | Open dependency: "+(s.dep||"Validate current state"),evidenceReady:"Known-good control; affected example; last-known-good / change window; raw payload or event ID; downstream transform / field mapping; relevant logs; rollback or workaround; business impact.",questions:"What changed since the last known-good state?\\nWhere is the first point of divergence?\\nIs this authentication or authorization, configuration, integration transformation, expected behavior, or a reproducible product defect?\\nWhat evidence would change our conclusion?\\nWho owns the next technical decision?",decisions:"Root-cause class; technical owner; next evidence; safe workaround / rollback; specialist escalation yes/no; what should become Support guidance if the pattern repeats.",escalationCriteria:"Escalate only after the supported path is reproduced with expected-versus-actual behavior, scope / blast radius, correlation IDs or evidence, troubleshooting already completed, customer impact, and a bounded ask.",followUp:"Send decisions, owners, checkpoints, evidence links, unresolved questions, and the reusable lesson. Graduate deterministic work to Support / self-service when safe.",technologyNotes:"Use current vendor and Doppel documentation. Validate tenant-specific values before production changes.",assistantNotes:"Live Assist is advisory only. Ground on this account, expose uncertainty, never invent commitments, and prefer a clean evidence-backed handoff over speculation."}],
  ["assistant_profile","template",{name:"Evidence-first Technical Customer Engineering baseline",status:"Approved demo baseline",updatedFrom:"Curated role-aligned operating model",playbook:"Use the smallest reproducible example. Establish a known-good control and last-known-good state. Separate authentication from authorization. Compare raw source payload to normalized / transformed downstream data. Record expected vs actual, scope / blast radius, request / event / alert IDs, timestamps, logs, prior troubleshooting, workaround, and business impact. Resolve directly when within supported TCE scope. Escalate custom architecture to Solutions Architecture and reproducible product defects to Engineering with a bounded ask. After resolution, decide whether the pattern should become a Support diagnostic, runbook, training module, automation, self-service path, or Product signal."}],
  ["meeting",sampleProv,{title:pub?"Technical discovery / architecture validation":"Weekly technical customer review",type:pub?"Discovery proposal":"Technical Services",date:"Next checkpoint",attendees:"CSM; TCE; customer security / technical owner",objective:pub?"Validate systems, integration paths, routing, reporting, ownership, and current technical priorities before treating any private implementation detail as fact.":"Review current impact, evidence, dependencies, ownership, and the next technical decision.",notes:pub?"Proposed discovery cadence derived from public-source context; not a claim about the customer's actual process.":"Synthetic role-training cadence."}],
  ["milestone",sampleProv,{title:pub?"Validate private technical architecture":"Close highest-risk technical dependency",owner:"Technical Customer Engineer + customer technical owner",due:"Next technical checkpoint",status:"Planned",dependencies:s.dep||"Discovery required"}],
  ["action",sampleProv,{title:pub?"Confirm current integrations, identity model, alert routing, and reporting ownership":"Capture affected example + known-good control for the highest-risk open issue",owner:"Technical Customer Engineer",due:"Next checkpoint",status:"Planned",audience:"Customer / internal"}],
  ["action",sampleProv,{title:"Identify one recurring technical request that can graduate to Support or self-service",owner:"Technical Customer Engineer + Support",due:"After resolution pattern is validated",status:"Planned",audience:"Internal"}],
  ["adoption",sampleProv,{name:"Repeatable technical work shifted left",value:pub?"Baseline to establish during discovery":"Target: 50% of deterministic repeat requests documented or graduated",period:"First operating cycle",source:pub?"Proposed operating metric":"Synthetic enablement tracker",owner:"Technical Customer Engineering"}],
  ["stakeholder",sampleProv,{name:pub?"Customer Security Lead (proposed role)":"Morgan Lee (Synthetic)",role:"Security / SOC Lead",organization:s.n,email:"",phone:"",decisionRole:"Security workflow, alert routing, and operational priority",status:pub?"Discovery required":"Active",notes:pub?"Role placeholder only; validate the real stakeholder and ownership with the customer.":"Synthetic stakeholder for role-training."}],
  ["stakeholder",sampleProv,{name:pub?"Customer Integration Owner (proposed role)":"Jordan Patel (Synthetic)",role:"Identity / Integration Lead",organization:s.n,email:"",phone:"",decisionRole:"SSO, API, SIEM, automation, and production-change ownership",status:pub?"Discovery required":"Active",notes:pub?"Role placeholder only; validate the real stakeholder and ownership with the customer.":"Synthetic stakeholder for role-training."}],
  ["deployment_card",sampleProv,{title:pub?"Private architecture validation":"Technical evidence + ownership checkpoint",column:"Planned",stageOrder:1,sprint:"Current cycle",owner:"Technical Customer Engineer",dependency:s.dep||"Discovery required",jiraKey:"",jiraUrl:"",notes:pub?"Discovery proposal only; no private customer configuration is inferred.":"Synthetic customer-work item."}]
 );
 if(pub){
  a.push(
   ["note","internal_proposal",{title:"Public-source boundary",body:"This account contains Doppel-published customer context only. SSO, SIEM, API, ticketing, support, reporting, and escalation details remain unknown until validated directly with the customer."}],
   ["risk","internal_proposal",{title:"Private implementation details are intentionally unknown",impact:"Assuming architecture from a public case study could create false confidence and poor technical guidance.",owner:"Technical Customer Engineer",mitigation:"Use the public story for outcome context only. Validate systems, supported paths, ownership, and current evidence in discovery.",escalationStatus:"Proposed",nextDecision:"Confirm the first private technical discovery session and source-of-truth owners."}]
  );
 } else if(s.n==="Northstar Commerce"){
  a.push(
   ["incident",p,{title:"Brand-policy alert path creates duplicate escalations",affected:"Trust & Safety analysts reviewing one brand-policy configuration",severity:"Medium",status:"Investigating",businessImpact:"Duplicate cases increase triage noise and reduce confidence in escalation routing.",owner:"Technical Customer Engineer",nextAction:"Compare one affected alert against a known-good policy path before Zendesk/Jira automation.",sourceSystem:"Alert workflow + downstream ticket automation",configuration:"One brand-policy configuration",connector:"Webhooks -> Zendesk / Jira",product:"Brand protection workflow",unknown:"Whether duplication begins in source event generation, webhook retries, or downstream automation."}],
   ["engineering_issue",p,{title:"Duplicate escalation path remains after downstream automation is bypassed",severity:"Medium",affected:"One synthetic policy path",environment:"Synthetic enterprise tenant",actual:"Same logical finding can produce two downstream escalation events under the test condition.",expected:"One intended escalation per logical finding unless retry semantics explicitly document otherwise.",reproducible:"Pending evidence gate",reproSteps:"Capture source finding ID; disable downstream duplication; replay supported path; compare delivery/event identifiers and acknowledgements.",evidence:"Synthetic scenario only.",troubleshooting:"Known-good policy path identified; downstream ticket rules isolated for comparison.",workaround:"Deduplicate downstream on stable event identity while root cause is isolated.",businessImpact:"Analyst triage noise and duplicate customer work.",engineeringAsk:"Only escalate if duplication reproduces before customer-side automation; then confirm canonical event/retry contract.",status:"Evidence gathering"}]
  );
 } else if(s.n==="Harbor Health Network"){
  a.push(
   ["incident",p,{title:"Sentinel routing misses one normalized entity field",affected:"SOC routing for one eligible alert class",severity:"High",status:"Investigating",businessImpact:"Some eligible findings require manual triage instead of automatic routing.",owner:"Technical Customer Engineer",nextAction:"Compare raw Doppel payload, Sentinel connector ingestion, normalized entity mapping, and analytics rule input for the same event ID.",sourceSystem:"Microsoft Sentinel",configuration:"Production-candidate schema",connector:"REST / SIEM connector",product:"Threat-intelligence workflow",unknown:"First point of divergence between source payload and normalized entity mapping."}],
   ["risk",p,{title:"Entra group mapping and Sentinel schema have separate owners",impact:"A single cutover could hide two independent failure modes.",owner:"TCE + customer IAM + SOC",mitigation:"Use separate acceptance gates for SSO role mapping and SIEM data-contract validation.",escalationStatus:"Open",nextDecision:"Approve cutover only when both gates have evidence."}]
  );
 } else if(s.n==="Crescent Web3 Labs"){
  a.push(
   ["incident",p,{title:"Custom enrichment worker receives HTTP 429 during campaign bursts",affected:"Automated enrichment of high-volume scam / impersonation findings",severity:"Medium",status:"Investigating",businessImpact:"Enrichment can lag during active campaigns and force manual analyst work.",owner:"Technical Customer Engineer",nextAction:"Capture Retry-After / rate-limit headers, request IDs, concurrency, retry count, and whether retries are idempotent.",sourceSystem:"Customer enrichment worker",configuration:"Burst concurrency enabled",connector:"REST API",product:"API-driven enrichment",unknown:"Whether client concurrency exceeds supported limits or retry/backoff behavior is unsafe."}],
   ["action",p,{title:"Define bounded exponential backoff + jitter + dead-letter behavior for enrichment retries",owner:"Customer Engineering + customer developer",due:"Current sprint",status:"In Progress",audience:"Internal / customer technical"}]
  );
 } else if(s.n==="Ironwood Bank"){
  a.push(
   ["incident",p,{title:"Webhook retry duplicates one takedown workflow action",affected:"SOC / fraud automation for one synthetic finding path",severity:"High",status:"Investigating",businessImpact:"Duplicate downstream actions could create conflicting case ownership or repeated takedown work.",owner:"Technical Customer Engineer",nextAction:"Correlate source event ID, each delivery attempt, consumer acknowledgement, and Tines action ID.",sourceSystem:"Doppel webhook + Tines",configuration:"Retry path enabled",connector:"Webhook -> Tines -> Jira",product:"Alert / takedown workflow",unknown:"Whether duplicate work starts at delivery retry or consumer idempotency."}],
   ["engineering_issue",p,{title:"Severity differs between platform view and raw API payload for one alert subtype",severity:"Medium",affected:"One synthetic alert subtype",environment:"Production-hardening lab",actual:"Platform view and raw API severity differ before Splunk normalization for the affected test case.",expected:"Canonical severity should be consistent across supported surfaces unless the contract documents a transformation.",reproducible:"Yes - synthetic lab",reproSteps:"Capture one affected alert ID; retrieve raw API payload; compare UI; repeat with a known-good subtype; exclude Splunk transforms.",evidence:"Synthetic sanitized payload comparison + timestamps + control alert.",troubleshooting:"Customer transform removed; two affected examples reproduce; control path matches.",workaround:"Route using secondary validated signal until canonical contract is confirmed.",businessImpact:"Severity-driven SOC routing may be inconsistent.",engineeringAsk:"Confirm the canonical severity contract for this subtype and whether the API/UI divergence is a product defect.",status:"Engineering-ready"}]
  );
 } else if(s.n==="Meridian Manufacturing"){
  a.push(
   ["incident",p,{title:"Regional transform rewrites timestamp and entity state",affected:"One region's SOC case routing",severity:"High",status:"Investigating",businessImpact:"Cases can appear stale or attach the wrong entity state after normalization.",owner:"Technical Customer Engineer",nextAction:"Trace one event from raw source payload through Sentinel mapping, ServiceNow field transform, and orchestration output.",sourceSystem:"Sentinel / ServiceNow / Tines",configuration:"Regional transform set",connector:"SIEM -> ITSM -> SOAR",product:"Threat-response orchestration",unknown:"Which transform first changes timestamp/entity state."}],
   ["risk",p,{title:"Regional Entra exceptions could mix identity and workflow cutover risk",impact:"Troubleshooting could conflate access-control failure with downstream data-flow failure.",owner:"TCE + regional IAM + SOC",mitigation:"Gate identity and data-flow acceptance separately with known-good controls.",escalationStatus:"Open",nextDecision:"Approve region two only after both acceptance gates pass."}]
  );
 } else if(s.n==="NovaCloud SaaS"){
  a.push(
   ["incident",p,{title:"Webhook retries create duplicate BI enrichment actions",affected:"Customer analytics and reporting workflow",severity:"Medium",status:"Investigating",businessImpact:"Duplicate enrichment can inflate metrics and reopen already-processed work.",owner:"Technical Customer Engineer",nextAction:"Compare stable event identity, webhook delivery attempts, consumer acknowledgement, and BI dedupe logic.",sourceSystem:"Webhooks + custom BI",configuration:"Retry enabled",connector:"REST API / Webhooks",product:"Reporting / enrichment",unknown:"Whether duplicate action is provider retry behavior or consumer idempotency gap."}],
   ["risk",p,{title:"Two metric definitions conflict across customer reporting",impact:"Executive reporting could be technically correct but operationally misleading.",owner:"TCE + CSM + customer data owner",mitigation:"Create a metric contract with definition, source, calculation, cadence, and approver before automating the report.",escalationStatus:"Open",nextDecision:"Approve canonical definitions before Support graduation."}]
  );
 }
 return a}
 async seed()`;
src = src.replace(marker, add);

fs.writeFileSync(p, src);
console.log("DPLR no-login persistence, seed v5, and rich default preparation/scenario enrichment applied.");

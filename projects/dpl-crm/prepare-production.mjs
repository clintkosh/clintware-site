import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const write=(p,s)=>fs.writeFileSync(new URL(p,import.meta.url),s);

// Keep source modules readable while applying repeatable production enrichments at validation/deploy time.
let cfg=read('./public/app-config.js');
cfg=cfg.replace('scenario:"Scenario",synthetic_sample:"Synthetic sample"','scenario:"Scenario",synthetic_sample:"Synthetic sample",public_research:"Public research / Doppel-published"');
write('./public/app-config.js',cfg);

let samples=read('./src/sample-customers.js').replace('SAMPLE_SEED_VERSION=2','SAMPLE_SEED_VERSION=3');
write('./src/sample-customers.js',samples);

let src=read('./src/index.js');
const start=src.indexOf(' sampleRecords(s){');
const end=src.indexOf(' async seed()',start);
if(start<0||end<0) throw new Error('sampleRecords production patch anchor missing');
const richer=` sampleRecords(s){const p=s.pv==="public_research"?"public_research":"synthetic_sample",pub=p==="public_research",label=pub?"Public Doppel source":"Synthetic sample",a=[
  ["handoff",p,{title:"Operating context",value:s.sm||"",validation:label,note:pub?"Publicly documented context only; private account details remain unknown.":"Synthetic Technical Customer Engineering scenario."}],
  ["handoff",p,{title:"Customer goal / use case",value:s.g||"",validation:label,note:s.met||""}],
  ["handoff",p,{title:"Timeline / lifecycle context",value:s.tl||"",validation:label,note:s.st||""}],
  ["risk",pub?"internal_proposal":p,{title:pub?"Private technical architecture requires discovery":(s.dep||"Technical dependency to validate"),impact:pub?"Public case studies do not disclose the complete integration, identity, routing, reporting, or escalation architecture.":"May affect customer outcome, technical scope, or specialist ownership.",owner:"Technical Customer Engineer",mitigation:s.dep||"Validate during technical discovery.",escalationStatus:pub?"Proposed discovery":"Open",nextDecision:"Confirm system owner, expected behavior, evidence source, and escalation boundary."}],
  ["kpi",p,{name:"Customer outcome",hypothesis:s.g||"",baseline:"",target:s.met||"",metricDefinition:pub?"Publicly reported outcome. Preserve as external evidence; do not reinterpret as a private account KPI.":"Synthetic target for role demonstration.",sourceSystem:pub?"Doppel public customer story":(s.sys||""),owner:"",cadence:pub?"Public reference":"Weekly during active technical work",calculation:"",currentValue:"",realizedValue:pub?(s.met||""):"",approval:label}],
  ["adoption",pub?"public_research":p,{name:pub?"Published customer outcome evidence":"Support-scale progress",value:pub?(s.met||"Published outcome available"):"Initial technical workflow mapped; repeatable work being documented",period:pub?"Public customer story":"Current synthetic sprint",source:pub?"Doppel public customer story":"Synthetic support-scale tracker",owner:pub?"Public reference":"Technical Customer Engineer"}],
  ["document",p,{name:s.f||"Sample source",classification:pub?"Public Doppel customer story":"Synthetic customer scenario",binaryStatus:pub?"External public reference":"Built-in sample",approvedForBriefs:"Yes"}],
  ["raci","template",{title:"Technical Customer Engineering RACI",rows:[{item:"Advanced technical investigation",responsible:"Technical Customer Engineer",accountable:"Technical Customer Engineering",consulted:"CSM / Support / specialist team as needed",informed:"Customer technical owner"},{item:"Customer commercial ownership",responsible:"CSM",accountable:"Customer Success",consulted:"Technical Customer Engineer",informed:"Customer stakeholders"},{item:"Product defect resolution",responsible:"Engineering",accountable:"Engineering",consulted:"Technical Customer Engineer / Product",informed:"CSM / Customer"}],roles:["Customer","Customer Success Manager","Technical Customer Engineer","Frontline Support","Solutions Architecture","Product","Engineering"],note:pub?"Public source does not disclose private ownership; rows represent the proposed operating model.":"Synthetic role-aligned operating model."}],
  ["milestone",pub?"internal_proposal":p,{title:"Validate current account architecture",owner:"Technical Customer Engineer + customer technical owner",due:"Discovery",status:pub?"Planned":"In Progress",dependencies:"Identity, APIs, data flows, alert routing, reporting, support workflow, specialist ownership"}],
  ["milestone",pub?"internal_proposal":p,{title:"Agree escalation evidence contract",owner:"Technical Customer Engineer + Support + Engineering",due:"Early lifecycle",status:"Planned",dependencies:"Expected-versus-actual behavior, reproducibility, logs / IDs, troubleshooting completed, business impact"}],
  ["meeting",pub?"template":p,{title:"Technical customer review",type:"Customer Engineering",date:"Cadence to validate",attendees:"CSM; Technical Customer Engineer; customer security / technical owner; specialists as required",objective:"Review complex requests, technical risk, decisions, investigations, projects, and next owners.",notes:pub?"Template derived from the role, not a claim about this public customer's private cadence.":"Synthetic customer cadence."}],
  ["action",pub?"internal_proposal":p,{title:"Map recurring advanced requests into frontline Support playbooks",owner:"Technical Customer Engineer",due:"Ongoing",status:"Planned",audience:"Internal"}],
  ["action",pub?"internal_proposal":p,{title:"Define reusable reporting / data-delivery pattern",owner:"Technical Customer Engineer",due:"Technical Services",status:"Planned",audience:"Customer / Internal"}],
  ["deployment_card",pub?"internal_proposal":p,{title:"Architecture + ownership discovery",column:pub?"Backlog":"In Progress",stageOrder:1,sprint:"Technical discovery",owner:"Technical Customer Engineer",dependency:"Customer technical owners",jiraKey:"",jiraUrl:"",notes:"APIs, auth/SSO, alert flows, reporting, configuration, support path."}],
  ["deployment_card",pub?"internal_proposal":p,{title:"Advanced investigation evidence contract",column:"Ready",stageOrder:2,sprint:"Support scale",owner:"Technical Customer Engineer",dependency:"Support + Engineering alignment",jiraKey:"",jiraUrl:"",notes:"Standardize facts required before specialist escalation."}],
  ["deployment_card",pub?"internal_proposal":p,{title:"Reusable customer reporting pattern",column:"Backlog",stageOrder:3,sprint:"Technical Services",owner:"Technical Customer Engineer",dependency:"Metric definitions + delivery mechanism",jiraKey:"",jiraUrl:"",notes:"Alert metrics, platform activity, and technical analysis."}],
  ["sprint",pub?"internal_proposal":p,{name:"TCE operating sprint",weeks:"2-week view",goal:"Resolve the hardest customer request while converting the repeatable part into Support or self-service capability.",planned:5,completed:pub?0:2,notes:pub?"Proposed operating model based on the role.":"Synthetic demonstration."}]
 ];
 for(const x of String(s.sys||"").split(";").map(v=>v.trim()).filter(Boolean))a.splice(3,0,["integration",p,{name:x,purpose:pub?"Publicly referenced technology / workflow context":"Synthetic customer integration",connectorStatus:pub?"Public context only":(s.cs||"Not validated"),technicalValidation:pub?"Private implementation details are not public; validate directly with the account.":(s.dep||"Needs human review")}]);
 if(!pub){a.push(
  ["stakeholder",p,{name:"Customer Security Operations Lead (Synthetic)",role:"Primary technical owner",organization:s.n,email:"",phone:"",decisionRole:"Owns security workflow, integrations, and technical acceptance",status:"Active",notes:"Synthetic role used to demonstrate customer-facing technical ownership."}],
  ["stakeholder",p,{name:"Customer Identity / Platform Owner (Synthetic)",role:"Integration stakeholder",organization:s.n,email:"",phone:"",decisionRole:"Owns SSO, API, SIEM, data-flow, or platform configuration as applicable",status:"Active",notes:"Synthetic role; adapt to the actual customer architecture."}],
  ["incident",p,{title:"Advanced technical request requires fact isolation",affected:"Customer technical workflow",severity:"Medium",status:"Investigating",businessImpact:"Customer cannot confidently distinguish platform behavior from configuration / integration behavior.",owner:"Technical Customer Engineer",nextAction:"Reproduce with one canonical example; capture expected vs actual; remove downstream transforms; identify technical owner.",jira:"",userBehavior:"Customer workflow under investigation",contentFreshness:"Current",sourceSystem:s.sys||"Customer environment",configuration:"Validate",connector:"Validate",product:s.sc||"Doppel platform",unknown:s.dep||"Root cause not yet established."}],
  ["engineering_issue",p,{title:"Engineering handoff candidate — only after reproduction",severity:"Medium",affected:"Bounded customer workflow",environment:"Customer-specific SaaS configuration",firstObserved:"Current synthetic scenario",lastObserved:"Current synthetic scenario",actual:"Observed behavior differs from the customer's documented expectation after customer-side transforms are isolated.",expected:"Supported platform behavior matches the agreed technical contract.",reproducible:"Intermittent / validate",reproSteps:"1. Select one canonical record or alert. 2. Capture platform/UI value. 3. Capture API or integration value. 4. Remove downstream transform. 5. Repeat with a control example.",evidence:"Alert / record ID, timestamps, sanitized payloads, screenshots, integration logs, configuration snapshot.",troubleshooting:"Authentication and permissions checked; downstream mapping isolated; control case identified.",workaround:"Use documented supported path while root cause is confirmed.",businessImpact:"May affect routing, reporting, or customer trust in the workflow.",engineeringAsk:"Confirm expected platform contract and investigate only if mismatch remains reproducible after configuration/integration isolation.",jiraKey:"",jiraUrl:"",status:"Needs Evidence"}]
 )}
 return a}
`;
src=src.slice(0,start)+richer+src.slice(end);
src=src.replaceAll('"N7 Guest Demo"','"Doppel Guest Demo"');
src=src.replaceAll('feature:"n7demo_crm"','feature:"dpl_crm"');
src=src.replaceAll('task:"n7_public_research_query"','task:"dpl_public_research_query"');
src=src.replaceAll('task:"n7_"+mode+"_assistant"','task:"dpl_"+mode+"_assistant"');
src=src.replaceAll('task:"n7_crm_change_interpreter"','task:"dpl_crm_change_interpreter"');
src=src.replaceAll('task:"n7_live_customer_assistant"','task:"dpl_live_customer_assistant"');
write('./src/index.js',src);

console.log('Doppel production enrichment applied.');

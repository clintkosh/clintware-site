const API="/api";
const TABS=[
["customers","Customers"],["accounts","Accounts"],["command","Command Center"],["live_prompt","Live Prompt"],["live_assistant","Live Assist"],["kb","Technical Playbooks"],["handoff","Technical Handoff"],["implementation","Technical Services"],["raci","RACI"],["deployment","Service Projects"],["rollout","Work Queue / Sprints"],["risks","Risks"],["roi","Value / KPIs"],["adoption","Support Scale"],["issues","Engineering Handoffs"],["triage","Advanced Investigations"],["meetings","Customer Reviews"],["renewal","Account Health"],["documents","Evidence / Documents"]
];
const NAV_GROUPS=[
["Operate",["customers","command","live_prompt","live_assistant","triage","risks"]],
["Deliver",["handoff","implementation","deployment","issues","raci","rollout"]],
["Scale",["adoption","kb"]],
["Customer",["roi","meetings","renewal"]],
["Evidence",["documents"]],
["Admin",["accounts"]]
];
const SCEN=[
{id:"sso",label:"Production SSO fails for one customer role",impact:"Validate identity mapping, isolate tenant/configuration behavior, and preserve a safe rollback path before escalation."},
{id:"alert",label:"API alert severity differs from platform UI",impact:"Reproduce on the same alert ID, remove downstream transforms, gather evidence, and determine the correct technical owner."},
{id:"report",label:"Customer requests a recurring executive report",impact:"Define metric contracts, build a reusable delivery pattern, and decide what can shift to Support or self-service."}
];
const SCHEMA={
handoff:[["title","Item"],["value","Value"],["validation","Validation"],["note","Notes"]],
integration:[["name","System"],["purpose","Purpose"],["connectorStatus","Connector status"],["technicalValidation","Technical validation"]],
milestone:[["title","Milestone"],["owner","Owner"],["due","Due"],["status","Status"],["dependencies","Dependencies"]],
risk:[["title","Risk"],["impact","Impact"],["owner","Owner"],["mitigation","Mitigation"],["escalationStatus","Escalation status"],["nextDecision","Next decision/date"]],
kpi:[["name","Metric"],["hypothesis","Hypothesis"],["baseline","Baseline"],["target","Target"],["metricDefinition","Definition"],["sourceSystem","Source"],["owner","Owner"],["cadence","Cadence"],["calculation","Calculation"],["currentValue","Current"],["realizedValue","Realized"],["approval","Approval"]],
adoption:[["name","Metric"],["value","Value"],["period","Period"],["source","Source"],["owner","Owner"]],
incident:[["title","Issue / symptom"],["affected","Affected users/cohort"],["severity","Severity"],["status","Status"],["businessImpact","Business impact"],["owner","Owner"],["nextAction","Next action"],["jira","Jira link"],["userBehavior","User behavior"],["contentFreshness","Content freshness"],["sourceSystem","Source system"],["configuration","Configuration"],["connector","Connector"],["product","Product"],["unknown","Unknown / escalation"]],
engineering_issue:[["title","Engineering issue"],["severity","Severity"],["affected","Affected users / scope"],["environment","Environment / version"],["firstObserved","First observed"],["lastObserved","Last observed"],["actual","Actual behavior"],["expected","Expected behavior"],["reproducible","Reproducible? Yes / No / Intermittent"],["reproSteps","Reproduction steps"],["evidence","Logs / screenshots / query IDs / examples"],["troubleshooting","Troubleshooting already completed"],["workaround","Customer workaround"],["businessImpact","Business impact"],["engineeringAsk","Specific Engineering ask"],["jiraKey","Jira key"],["jiraUrl","Jira URL"],["status","Status"]],
meeting:[["title","Meeting title"],["type","Type"],["date","Date"],["attendees","Attendees"],["objective","Objective"],["notes","Notes"]],
stakeholder:[["name","Name"],["role","Role / title"],["organization","Organization"],["email","Email"],["phone","Phone"],["decisionRole","Decision / influence role"],["status","Engagement status"],["notes","Notes"]],
renewal:[["renewalDate","Renewal date"],["term","Term"],["arr","ARR / commercial value"],["valueRealized","Value realized"],["renewalPlan","Renewal plan"],["expansionSignals","Expansion signals"],["notes","Notes"]],
document:[["name","Document"],["classification","Classification"],["binaryStatus","File status"],["approvedForBriefs","Approved for briefs"]],
action:[["title","Action"],["owner","Owner"],["due","Due"],["status","Status"],["audience","Customer / Internal"]],
deployment_card:[["title","Card"],["column","Kanban column"],["stageOrder","Stage order"],["sprint","Sprint / week"],["owner","Owner"],["dependency","Dependency"],["jiraKey","Jira key"],["jiraUrl","Jira URL"],["notes","Notes"]],
sprint:[["name","Sprint"],["weeks","Planned weeks"],["goal","Goal"],["planned","Planned cards"],["completed","Completed cards"],["notes","Notes"]],
jira_config:[["siteUrl","Jira site URL"],["projectKey","Project key"],["deploymentBoardId","Deployment board ID"],["issueBoardId","Issue board ID"],["connection","Connection status"],["mode","Integration mode"]],
assistant_profile:[["title","Profile"],["playbook","Assistant playbook"],["updatedFrom","Updated from"]],
assistant_session:[["title","Session"],["startedAt","Started"],["endedAt","Ended"],["source","Source"],["consentConfirmed","Consent"],["transcript","Transcript"],["suggestions","Suggestions"]]
};
let S={customer:null,customers:[],records:[],workspace:null,access:{authenticated:false,mode:"guest"}},K={articles:[],latest:[],trending:[],config:{},usageSignalAvailable:false},I={jira:null,confluence:null,controlPlane:null,ai:null},tab="customers",scen=new Set(),theme=localStorage.getItem("dpltheme")||"dark";
document.documentElement.dataset.theme=theme;
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=x=>{try{let u=new URL(String(x||""),location.origin);return /^https?:$/.test(u.protocol)?u.href:""}catch{return""}};
const R=t=>S.records.filter(r=>r.type===t);
const P=p=>({customer_provided:"Customer-provided",internal_record:"Internal record",internal_proposal:"Internal proposed plan",derived_calculation:"Derived",ai_suggestion:"AI suggestion",template:"Template",scenario:"Scenario",synthetic_sample:"Synthetic sample"}[p]||p);
const api=async(p,o={})=>{let r=await fetch(API+p,{headers:{"content-type":"application/json"},...o});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||r.statusText);return r.json()};const maybe=async(p,o={})=>{try{return await api(p,o)}catch{return null}};
async function load(id){let q=id?"?customer="+encodeURIComponent(id):"",base=await Promise.all([api("/state"+q),maybe("/kb"),maybe("/ai/status")]),state=base[0],kb=base[1],ai=base[2];S=state;K=kb||{articles:[],latest:[],trending:[],config:{},usageSignalAvailable:false};if(state.access?.authenticated){let out=await Promise.all([maybe("/integrations/jira/status"),maybe("/integrations/confluence/status"),maybe("/control-plane/status")]);I={jira:out[0],confluence:out[1],controlPlane:out[2],ai}}else I={jira:null,confluence:null,controlPlane:null,ai};render();return S}

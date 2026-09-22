const API="/api";
const TABS=[
["command","Command Center"],["kb","Team KB"],["handoff","Handoff"],["implementation","Implementation"],["raci","RACI"],["deployment","Deployment Board"],["rollout","Rollout / Sprints"],["risks","Risks"],["roi","ROI"],["adoption","Adoption"],["issues","Engineering Issues"],["triage","Issue Triage"],["meetings","Meetings"],["renewal","Renewal"],["documents","Documents"]
];
const SCEN=[
{id:"sap",label:"SAP connector slips beyond Week 10",impact:"Reassess full-scope go-live, escalation timing, and parallel work."},
{id:"manuals",label:"SAP manuals are incomplete / stale / inaccessible",impact:"Content readiness becomes a separate blocker."},
{id:"roi",label:"ROI baseline cannot be defended",impact:"Define an approved baseline method before claiming realized ROI."}
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
renewal:[["renewalDate","Renewal date"],["term","Term"],["arr","ARR / commercial value"],["valueRealized","Value realized"],["renewalPlan","Renewal plan"],["expansionSignals","Expansion signals"],["notes","Notes"]],
document:[["name","Document"],["classification","Classification"],["binaryStatus","File status"],["approvedForBriefs","Approved for briefs"]],
action:[["title","Action"],["owner","Owner"],["due","Due"],["status","Status"],["audience","Customer / Internal"]],
deployment_card:[["title","Card"],["column","Kanban column"],["stageOrder","Stage order"],["sprint","Sprint / week"],["owner","Owner"],["dependency","Dependency"],["jiraKey","Jira key"],["jiraUrl","Jira URL"],["notes","Notes"]],
sprint:[["name","Sprint"],["weeks","Planned weeks"],["goal","Goal"],["planned","Planned cards"],["completed","Completed cards"],["notes","Notes"]],
jira_config:[["siteUrl","Jira site URL"],["projectKey","Project key"],["deploymentBoardId","Deployment board ID"],["issueBoardId","Issue board ID"],["connection","Connection status"],["mode","Integration mode"]]
};
let S={customer:null,customers:[],records:[],workspace:null},K={articles:[],latest:[],trending:[],config:{},usageSignalAvailable:false},I={jira:null,controlPlane:null},tab="command",scen=new Set(),theme=localStorage.getItem("n7theme")||"dark";
document.documentElement.dataset.theme=theme;
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R=t=>S.records.filter(r=>r.type===t);
const P=p=>({customer_provided:"Customer-provided",internal_record:"Internal record",internal_proposal:"Internal proposed plan",derived_calculation:"Derived",ai_suggestion:"AI suggestion",template:"Template",scenario:"Scenario"}[p]||p);
const api=async(p,o={})=>{let r=await fetch(API+p,{headers:{"content-type":"application/json"},...o});if(r.status===401){location.href="/";throw Error("Sign-in required")}if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||r.statusText);return r.json()};const maybe=async(p,o={})=>{try{return await api(p,o)}catch{return null}};
async function load(id){let q=id?"?customer="+encodeURIComponent(id):"";let out=await Promise.all([api("/state"+q),api("/kb"),maybe("/integrations/jira/status"),maybe("/control-plane/status")]);S=out[0];K=out[1];I={jira:out[2],controlPlane:out[3]};render()}

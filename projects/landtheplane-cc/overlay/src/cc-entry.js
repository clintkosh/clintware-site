import base,{DPLCRM} from "./index.js";
export {DPLCRM};

const ORIGIN="https://cc.clintware.com";
const GOOGLE_TOKEN_URL="https://auth.clintware.com/internal/google-access-token";
const GOOGLE_CONNECT_URL="https://auth.clintware.com/delegated/google/start?return_to="+encodeURIComponent(ORIGIN+"/?google=connected");
const REQUIRED_GOOGLE_SCOPES=[
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly"
];
const APP_RECORD_TYPES=new Set(["job_profile","application_event","interview","follow_up","offer","search_digest","active_role","role_goal","performance_evidence","jira_config"]);
const SECURITY_HEADERS={"cache-control":"no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow, noarchive","strict-transport-security":"max-age=31536000; includeSubDomains","x-frame-options":"DENY","referrer-policy":"no-referrer","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin"};
const JSON_HEADERS={"content-type":"application/json; charset=utf-8",...SECURITY_HEADERS};
const ATLASSIAN_PROJECT_KEY="LTP";
const ATLASSIAN_PROJECT_NAME="LandThePlane Career Operations";
const ATLASSIAN_BOARD_NAME="LandThePlane Career Operations";
const ATLASSIAN_DASHBOARD_NAME="LandThePlane Career Operations Dashboard";
const ATLASSIAN_SPACE_KEY="LTP";
const ATLASSIAN_SPACE_NAME="LandThePlane Career OS";
const REQUIRED_ATLASSIAN_SCOPES=["manage:jira-configuration","read:board-scope:jira-software","write:board-scope:jira-software","read:board-scope.admin:jira-software","write:board-scope.admin:jira-software","read:sprint:jira-software","write:sprint:jira-software"];

function redirect(location,status=302){return new Response(null,{status,headers:{...SECURITY_HEADERS,location}})}

function j(value,status=200,extra={}){return new Response(JSON.stringify(value),{status,headers:{...JSON_HEADERS,...extra}})}
function safeText(value,max=5000){return String(value??"").replace(/\s+/g," ").trim().slice(0,max)}
function iso(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString():""}
function minDate(values){const a=values.map(iso).filter(Boolean).sort();return a[0]||""}
function maxDate(values){const a=values.map(iso).filter(Boolean).sort();return a[a.length-1]||""}
function daysBetween(a,b){const x=new Date(a).getTime(),y=new Date(b).getTime();return Number.isFinite(x)&&Number.isFinite(y)&&y>=x?Math.round((y-x)/864000)/10:null}
function keyPart(v){return safeText(v,200).toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim()}
function opportunityKey(company,role){return keyPart(company)+"|"+keyPart(role||"unknown role")}
function headersOf(payload){const out={};for(const h of payload?.headers||[])out[String(h.name||"").toLowerCase()]=h.value||"";return out}
function decode64url(value){try{let s=String(value||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const bin=atob(s),u8=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(u8)}catch{return ""}}
function payloadText(payload){
  if(!payload)return "";
  if(payload.mimeType==="text/plain"&&payload.body?.data)return decode64url(payload.body.data);
  let plain="";
  for(const p of payload.parts||[]){const x=payloadText(p);if(x){plain+=x+"\n";if(p.mimeType==="text/plain")break}}
  if(plain)return plain;
  if(payload.body?.data)return decode64url(payload.body.data).replace(/<[^>]+>/g," ");
  return "";
}
function senderDisplay(from){
  const raw=safeText(from,300);
  const m=raw.match(/^\s*"?([^"<]+?)"?\s*</);
  if(m?.[1])return m[1].trim();
  const em=raw.match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  return em?em[1].replace(/^(mail|jobs|careers|recruiting|talent)\./i,""):raw;
}
const ATS=new Set(["greenhouse.io","greenhouse-mail.io","lever.co","ashbyhq.com","workday.com","myworkdayjobs.com","smartrecruiters.com","icims.com","jobvite.com","indeed.com","linkedin.com","eightfold.ai","gem.com","rippling.com"]);
function senderDomain(from){const m=String(from||"").match(/@([^>\s]+)/);return (m?.[1]||"").toLowerCase().replace(/[>.,;]+$/,"")}
function cleanCompany(v){
  return safeText(v,160)
    .replace(/^(the|your)\s+/i,"")
    .replace(/\s+(careers|recruiting|talent|jobs|team)$/i,"")
    .replace(/\s*[|:\-–—].*$/,"")
    .replace(/\b(application|interview|candidate|role|position)\b.*$/i,"")
    .trim();
}
function inferCompany(subject,from,text){
  const s=safeText(subject,600);
  const patterns=[
    /(?:application|interest)\s+(?:at|with|to)\s+([^|:–—-]{2,80})/i,
    /thank(?:s| you)\s+for\s+(?:applying|your interest)\s+(?:to|in|at)\s+([^|:–—-]{2,80})/i,
    /(?:interview|conversation)\s+(?:with|at)\s+([^|:–—-]{2,80})/i,
    /next steps?\s+(?:with|at)\s+([^|:–—-]{2,80})/i
  ];
  for(const re of patterns){const m=s.match(re);if(m){const c=cleanCompany(m[1]);if(c.length>1)return c}}
  const display=senderDisplay(from);
  const dom=senderDomain(from);
  if(display&&display.includes(".")===false&&!/^(no.?reply|recruiting|talent|careers|jobs|team|human resources)$/i.test(display)){
    const c=cleanCompany(display);if(c.length>1&&c.length<80)return c;
  }
  if(dom&&!ATS.has(dom)&&![...ATS].some(x=>dom.endsWith("."+x))){
    const root=dom.split(".").slice(-2,-1)[0]||dom.split(".")[0];
    if(root&&!["gmail","outlook","google","microsoft","mail"].includes(root))return root.replace(/(^|[-_])([a-z])/g,(_,a,b)=>(a?" ":"")+b.toUpperCase());
  }
  const t=safeText(text,1000);
  const m=t.match(/(?:at|with)\s+([A-Z][A-Za-z0-9&.' ]{2,50})(?:\s+(?:for|as|regarding)|[,.])/);
  return m?cleanCompany(m[1]):"Unknown company";
}
function inferRole(subject,text){
  const s=safeText(subject,700),t=safeText(text,1800);
  const patterns=[
    /application\s+(?:for|to)\s+(?:the\s+)?["']?([^|:–—]{3,100}?)(?:["']?\s+(?:at|with)\s+|$)/i,
    /(?:role|position)\s*[:\-]\s*([^|–—]{3,110})/i,
    /(?:for|regarding)\s+(?:the\s+)?([^|:–—]{3,110}?)\s+(?:role|position)/i,
    /interview\s*[:\-]\s*([^|–—]{3,110})/i
  ];
  for(const re of patterns){const m=s.match(re)||t.match(re);if(m){const r=safeText(m[1],120).replace(/\s+(?:at|with)\s+.*$/i,"").trim();if(r.length>2)return r}}
  return "Role not identified";
}
function classify(text){
  const s=String(text||"").toLowerCase();
  if(/offer letter|pleased to offer|extend an offer|employment offer/.test(s))return "offer";
  if(/not moving forward|unfortunately|other candidates|position (?:has been|is) filled|decided not to (?:move|proceed)|will not be moving|regret to inform|not selected/.test(s))return "closed";
  if(/on hold|hiring pause|pause (?:the|this|our) (?:role|search|process)|put .* on hold/.test(s))return "paused";
  if(/final (?:round|interview)|meet (?:the )?(?:ceo|founder|executive)|executive interview/.test(s))return "final";
  if(/panel interview|interview panel|panel with/.test(s))return "panel";
  if(/hiring manager|meet (?:with )?(?:the )?manager/.test(s))return "hiring_manager";
  if(/interview|next step|schedule .*call|schedule .*conversation|availability|meet with|phone screen|screening call/.test(s))return "interview";
  if(/thank(?:s| you) for applying|application received|we received your application|received your application|application confirmation|application has been received|submitted your application/.test(s))return "applied";
  if(/recruiter|talent partner|talent acquisition|introduction|intro to/.test(s))return "responded";
  return "other";
}
function stageFor(evidence){
  const statuses=evidence.map(x=>x.status);
  if(statuses.includes("offer"))return "Offer";
  if(statuses.includes("closed"))return "Closed / Rejected";
  if(statuses.includes("final"))return "Final";
  if(statuses.includes("panel"))return "Panel";
  if(statuses.includes("hiring_manager"))return "Hiring Manager";
  if(statuses.includes("interview"))return "Recruiter / Interview";
  if(statuses.includes("paused"))return "Paused";
  if(statuses.includes("responded"))return "Responded";
  return "Applied";
}
function compensationFrom(text,role){
  const s=String(text||"");
  const range=s.match(/\$\s?([1-3]\d{2})(?:[,.]?\d{3})?\s*(?:k|K)?\s*(?:-|–|—|to)\s*\$?\s?([1-3]\d{2})(?:[,.]?\d{3})?\s*(?:k|K)?/);
  if(range){const a=Number(range[1]),b=Number(range[2]);if(a>=80&&b>=a)return {value:"$"+a+"K–$"+b+"K",source:"observed evidence"}}
  const one=s.match(/\$\s?([1-3]\d{2})(?:[,.]?\d{3})?\s*(?:k|K)/);
  if(one)return {value:"~$"+one[1]+"K",source:"observed evidence"};
  const r=String(role||"").toLowerCase();
  if(/director|head of/.test(r))return {value:"$160K–$220K est.",source:"role-band estimate"};
  if(/principal|senior|enterprise/.test(r)&&/customer success|success manager|cs\b/.test(r))return {value:"$140K–$185K est.",source:"role-band estimate"};
  if(/manager/.test(r)&&/success|support|operations|implementation/.test(r))return {value:"$135K–$180K est.",source:"role-band estimate"};
  if(/implementation|professional services|solutions architect|technical account/.test(r))return {value:"$130K–$175K est.",source:"role-band estimate"};
  if(/customer success|support/.test(r))return {value:"$120K–$165K est.",source:"role-band estimate"};
  return {value:"Not observed",source:"needs job description"};
}
function fitEstimate(role,text){
  const s=(String(role||"")+" "+String(text||"")).toLowerCase();let score=42,reasons=[];
  const tests=[
    [/customer success|customer operations|cs ops/,24,"Customer Success / operations"],
    [/implementation|professional services|onboarding/,18,"Implementation / services delivery"],
    [/technical account|tam\b|technical support|support operations/,17,"Technical customer work"],
    [/director|head of|senior manager|principal/,13,"Senior scope"],
    [/senior|enterprise|strategic/,10,"Enterprise / senior motion"],
    [/cyber|security|saas|cloud/,9,"Security / cloud domain"],
    [/ai\b|automation|genai|agent/,8,"AI / automation"]
  ];
  for(const [re,n,label] of tests)if(re.test(s)){score+=n;reasons.push(label)}
  score=Math.max(35,Math.min(96,score));
  return {score,label:score>=85?"High":score>=70?"Strong":score>=55?"Moderate":"Review",reasons:reasons.slice(0,4),source:"deterministic role-fit estimate; verify against full job description"};
}
function normalizeEvidence(x){
  return {
    source:x.source,status:x.status,id:safeText(x.id,180),at:iso(x.at),subject:safeText(x.subject,500),
    from:safeText(x.from,300),snippet:safeText(x.snippet,700),context:safeText(x.context||x.snippet,2600),url:safeText(x.url,1000)
  };
}
function deriveOpportunity(company,role,evidence,extra={}){
  const ev=evidence.map(normalizeEvidence).filter(x=>x.at).sort((a,b)=>a.at.localeCompare(b.at));
  const appliedAt=minDate(ev.filter(x=>x.status==="applied").map(x=>x.at));
  const responses=ev.filter(x=>!["applied","other"].includes(x.status));
  const firstResponseAt=minDate(responses.map(x=>x.at));
  const firstInterviewAt=minDate(ev.filter(x=>["interview","hiring_manager","panel","final"].includes(x.status)).map(x=>x.at));
  const combined=ev.map(x=>x.subject+" "+x.snippet+" "+(x.context||"")).join(" ");
  const comp=compensationFrom(combined,role),fit=fitEstimate(role,combined);
  return {
    key:opportunityKey(company,role),company:safeText(company,160),role:safeText(role,180),
    stage:stageFor(ev),applicationDate:appliedAt,firstResponseDate:firstResponseAt,
    responseTimeDays:appliedAt&&firstResponseAt?daysBetween(appliedAt,firstResponseAt):null,
    firstInterviewDate:firstInterviewAt,lastActivityDate:maxDate(ev.map(x=>x.at)),
    estimatedPay:comp.value,paySource:comp.source,fitScore:fit.score,fitLabel:fit.label,fitReasons:fit.reasons,fitSource:fit.source,
    jobDescription:extra.jobDescription||"",jobUrl:extra.jobUrl||"",nextAction:extra.nextAction||"",
    evidence:ev.slice(-100),evidenceCount:ev.length,lastSyncedAt:new Date().toISOString()
  };
}
function mergeOpportunity(a,b){
  if(!a)return b;if(!b)return a;
  const m=new Map();
  for(const x of [...(a.evidence||[]),...(b.evidence||[])])m.set((x.source||"")+"|"+(x.id||x.at+"|"+x.subject),x);
  const ev=[...m.values()];
  const next=deriveOpportunity(b.company||a.company,b.role!=="Role not identified"?b.role:a.role,ev,{
    jobDescription:b.jobDescription||a.jobDescription,jobUrl:b.jobUrl||a.jobUrl,nextAction:a.nextAction||b.nextAction
  });
  for(const k of ["jiraKey","jiraIssueId","jiraUrl","jiraProjectKey","jiraLastSyncedAt","jiraLabel"])next[k]=b[k]||a[k]||"";
  return next;
}
function guessFromEvent(event){
  const summary=safeText(event.summary||"",500),desc=safeText(event.description||"",2500),text=summary+" "+desc;
  if(!/interview|hiring manager|recruiter|panel|candidate|phone screen|screening|final round/i.test(text))return null;
  let company=inferCompany(summary,event.organizer?.email||"",desc),role=inferRole(summary,desc);
  const dash=summary.split(/\s+[|–—-]\s+/).map(x=>x.trim()).filter(Boolean);
  if(dash.length>=2){
    const interviewIndex=dash.findIndex(x=>/interview|screen|hiring manager|panel/i.test(x));
    if(interviewIndex===0){if(company==="Unknown company")company=cleanCompany(dash[1]);if(role==="Role not identified"&&dash[2])role=dash[2]}
    else if(interviewIndex>0&&company==="Unknown company")company=cleanCompany(dash[0]);
  }
  const at=event.start?.dateTime||event.start?.date||"";
  const status=/final/i.test(text)?"final":/panel/i.test(text)?"panel":/hiring manager/i.test(text)?"hiring_manager":"interview";
  const urlMatch=desc.match(/https?:\/\/[^\s<>"']+/i);
  return {company,role,evidence:{source:"Google Calendar",status,id:event.id||crypto.randomUUID(),at,subject:summary,from:event.organizer?.email||"",snippet:desc.slice(0,700),url:event.htmlLink||""},jobUrl:urlMatch?.[0]||"",jobDescription:desc.slice(0,2200)};
}
async function googleAccess(env){
  const secret=String(env.GOOGLE_DELEGATED_BRIDGE_SECRET||"");
  if(!secret)return {ok:false,status:503,error:"google_bridge_not_configured"};
  const r=await fetch(GOOGLE_TOKEN_URL,{method:"POST",headers:{"x-clintware-google-secret":secret,"content-type":"application/json"}});
  const x=await r.json().catch(()=>({}));
  if(!r.ok||!x.access_token)return {ok:false,status:r.status,error:x.error||"google_access_unavailable"};
  const evidenceEmail=String(x.email||"").toLowerCase();
  const allowedEvidenceEmail=evidenceEmail==="clint.kosh@gmail.com"||evidenceEmail.endsWith("@clintware.com");
  if(!allowedEvidenceEmail)return {ok:false,status:428,error:"google_evidence_account_not_allowed",email:evidenceEmail};
  const granted=String(x.scope||"").split(/\s+/).filter(Boolean),missing=REQUIRED_GOOGLE_SCOPES.filter(s=>!granted.includes(s));
  if(missing.length)return {ok:false,status:428,error:"google_reauthorization_required",missing,email:evidenceEmail};
  return {ok:true,token:x.access_token,scope:granted,email:evidenceEmail};
}
async function gfetch(token,url){
  const r=await fetch(url,{headers:{authorization:"Bearer "+token,accept:"application/json"}});
  const x=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(x.error?.message||x.error||("Google API "+r.status));
  return x;
}
async function callBase(req,env,ctx,path,method="GET",body){
  const u=new URL(path,new URL(req.url).origin),h=new Headers();
  const cookie=req.headers.get("cookie");if(cookie)h.set("cookie",cookie);
  h.set("accept","application/json");
  if(body!==undefined)h.set("content-type","application/json");
  return base.fetch(new Request(u,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}),env,ctx);
}
async function sessionInfo(req,env,ctx){
  const r=await callBase(req,env,ctx,"/me");if(!r.ok)return null;
  const x=await r.json().catch(()=>({}));return x.authenticated?x:null;
}
async function board(req,env,ctx){
  const r=await callBase(req,env,ctx,"/api/career-board");if(!r.ok)throw new Error("career_board_unavailable");
  return r.json();
}

function atlassianHeaders(){
  return {"content-type":"application/json","x-clintware-service-product":"landtheplane-cc","x-clintware-service-worker":"clintware-landtheplane-cc"};
}
async function cpJira(env,operation,args={}){
  const r=await env.CONTROL_PLANE.fetch("https://mcp.clintware.internal/api/v1/jira/bridge",{method:"POST",headers:atlassianHeaders(),body:JSON.stringify({product:"landtheplane-cc",operation,args,request_id:crypto.randomUUID()})});
  const x=await r.json().catch(()=>({error:"invalid_control_plane_response"}));return{ok:r.ok&&x.ok!==false,status:r.status,data:x};
}
async function cpConfluence(env,operation,args={}){
  const r=await env.CONTROL_PLANE.fetch("https://mcp.clintware.internal/api/v1/confluence/bridge",{method:"POST",headers:atlassianHeaders(),body:JSON.stringify({product:"landtheplane-cc",operation,args,request_id:crypto.randomUUID()})});
  const x=await r.json().catch(()=>({error:"invalid_control_plane_response"}));return{ok:r.ok&&x.ok!==false,status:r.status,data:x};
}
async function cpAtlassianOauth(env){
  const r=await env.CONTROL_PLANE.fetch("https://mcp.clintware.internal/api/v1/jira/oauth/start",{method:"POST",headers:atlassianHeaders(),body:"{}"});
  const x=await r.json().catch(()=>({error:"invalid_control_plane_response"}));return{ok:r.ok&&x.ok!==false,status:r.status,data:x};
}
function hashKey(value){
  let h=2166136261>>>0;for(const c of String(value||"")){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36);
}
function labelSlug(value){
  return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"unknown";
}
function sprintWindow(){
  const anchor=new Date("2026-09-28T05:00:00Z"),now=new Date(),span=14*86400000;
  const n=Math.max(0,Math.floor((now-anchor)/span)),start=new Date(anchor.getTime()+n*span),end=new Date(start.getTime()+span);
  return {name:"LandThePlane Sprint "+start.toISOString().slice(0,10),start:start.toISOString(),end:end.toISOString()};
}
function opportunityDescription(p){
  return [
    "LandThePlane CRM opportunity",
    "",
    "Company: "+(p.company||""),
    "Role: "+(p.role||""),
    "CRM stage: "+(p.stage||""),
    "Applied: "+(p.applicationDate||"Not observed"),
    "First response: "+(p.firstResponseDate||"Not observed"),
    "First interview: "+(p.firstInterviewDate||"Not observed"),
    "Response time: "+(p.responseTimeDays==null?"Not observed":p.responseTimeDays+" days"),
    "Compensation: "+(p.estimatedPay||"Not observed"),
    "Fit: "+(p.fitScore==null?"Not scored":p.fitScore+"% "+(p.fitLabel||"")),
    "Next action: "+(p.nextAction||"Review and determine next step"),
    p.jobUrl?"Source: "+p.jobUrl:"",
    "",
    "CRM key: "+(p.key||""),
    "Synced from cc.clintware.com. Gmail/Calendar raw content is intentionally not copied into Jira."
  ].filter(Boolean).join("\n");
}
function opportunityMetrics(data){
  const p=(data.records||[]).filter(r=>r.type==="job_profile").map(r=>r.data||{}),applied=p.filter(x=>x.applicationDate),responded=p.filter(x=>x.firstResponseDate),loops=p.filter(x=>x.firstInterviewDate),active=p.filter(x=>!["Closed / Rejected","Offer"].includes(x.stage)),offers=p.filter(x=>x.stage==="Offer");
  const digest=(data.records||[]).find(r=>r.type==="search_digest")?.data||{};
  return {reconstructed:p.length,verifiedApplications:applied.length,responded:responded.length,interviewLoops:loops.length,active:active.length,offers:offers.length,responseRate:applied.length?Math.round(responded.length/applied.length*100):0,reported:digest.fieldReport||null,digest};
}
function knowledgePages(data){
  const m=opportunityMetrics(data),reported=m.reported||{};
  const snapshot=[
    "RECONSTRUCTED PRIVATE CRM",
    "Company-role records: "+m.reconstructed,
    "Verified application dates: "+m.verifiedApplications,
    "Responses observed: "+m.responded,
    "Interview-stage records: "+m.interviewLoops,
    "Active processes: "+m.active,
    "Offers observed: "+m.offers,
    "Response rate on reconstructed applications: "+m.responseRate+"%",
    "",
    "LATEST FULL FIELD REPORT",
    "Application actions: "+(reported.applicationActions??"Not synced"),
    "Distinct company-role applications: "+(reported.distinctApplications??"Not synced"),
    "Interview-stage processes: "+(reported.interviewStageProcesses??"Not synced"),
    "Completed live processes: "+(reported.completedLiveProcesses??"Not synced"),
    "Round 2 / manager / panel: "+(reported.round2Plus??"Not synced"),
    "Offers: "+(reported.offers??"Not synced")
  ].join("\n");
  return [
    {slug:"start-here",title:"Start Here — LandThePlane Career Operating System",body:[
      "PURPOSE","LandThePlane is the operating system for the complete career lifecycle: discover roles, apply, manage responses, prepare interviews, close the offer, then convert the same record into active-job management.",
      "SYSTEM OF RECORD","cc.clintware.com owns company-role facts, evidence dates, compensation context, fit estimates, and lifecycle stage. Jira owns executable work and throughput. Confluence owns reusable knowledge and operating standards.",
      "GET STARTED","1. Sign in to cc.clintware.com with the authorized Google identity.","2. Run Google evidence sync until the historical backfill is complete.","3. Run Atlassian reconcile. Each company-role gets a stable Jira ticket and the mapping is written back to the CRM.","4. Work actionable interview/follow-up tickets from the Jira sprint board.","5. Use this Confluence space for standards, lessons, templates, and weekly reviews.","6. When an offer is accepted, activate the role in the CRM instead of starting a separate system."
    ].join("\n")},
    {slug:"job-search-os",title:"Job Search Operating System",body:[
      "OPERATING MODEL","Treat the search as a measurable funnel rather than a pile of applications. Acquisition volume, verified applications, responses, interviews, late-stage processes, offers, and accepted roles are separate metrics.",
      "DAILY FLOW","Source verified roles → assess fit and pay → apply with accurate materials → record company-role → capture confirmation → schedule follow-up → prepare from evidence → update after every interview.",
      "SOURCE OF TRUTH RULE","Do not count jobs scanned as applications. Do not count duplicate ATS actions as distinct company-role applications. Preserve evidence dates and distinguish observed facts from estimates.",
      "HIGH-SIGNAL PRIORITY","Human response, recruiter screen, hiring manager, panel, case study, final round, executive conversation, and explicit next steps outrank passive application volume."
    ].join("\n")},
    {slug:"application-definition-of-done",title:"Application Standards & Definition of Done",body:[
      "AN APPLICATION IS DONE WHEN","The role is verified active; company and role are normalized; application is submitted; source URL is retained; application date is captured; compensation and fit are recorded as observed or estimated; and a next follow-up date/action exists.",
      "QUALITY CHECK","Resume and answers match the role without inventing experience. Portfolio proof is relevant to the employer. Application-specific demos are clearly labeled as proposed/sample work. Public links do not expose private health, family, credentials, or unrelated brand material.",
      "TRACKING","One CRM opportunity per company-role. Multiple emails or ATS notices attach as evidence to that record rather than creating duplicate opportunities."
    ].join("\n")},
    {slug:"interview-playbook",title:"Interview Preparation Playbook",body:[
      "BEFORE","Read the role, company, interviewer context, known product/customer motion, compensation, and every prior conversation. Build a short objective: what the interviewer needs to believe by the end.",
      "DURING","Answer the actual question first. Use specific examples, measurable outcomes, technical detail when relevant, and concise ownership language. Capture unknowns instead of bluffing.",
      "AFTER","Record what was learned, decisions, objections, commitments, next steps, stakeholders, and timing. Update CRM stage and Jira action work. Send a targeted follow-up when it adds signal rather than sending generic persistence.",
      "EVIDENCE","Use interview transcripts/notes where available to improve future answers and preserve exact commitments."
    ].join("\n")},
    {slug:"follow-up-cadence",title:"Follow-Up Cadence & Communication",body:[
      "PRINCIPLE","Follow up to advance a real next step, not to prove persistence.",
      "GOOD FOLLOW-UP","References the conversation, adds one useful artifact or clarification, restates the relevant outcome, and makes the next action easy.",
      "AVOID","Repeated generic check-ins, urgency without new information, or contacting multiple people with inconsistent messages.",
      "JIRA","Create sprintable follow-up work only when there is a concrete action. Close it when the action is completed, not when the company process ends."
    ].join("\n")},
    {slug:"case-study-playbook",title:"Case Study & Take-Home Playbook",body:[
      "START WITH THE DECISION","Identify what the reviewer must decide and what evidence supports that decision.",
      "SHOW THE SYSTEM","Use a realistic operating model: intake, stakeholders, milestones, telemetry, risks, escalation, ROI, reporting, and next actions. Make assumptions explicit.",
      "SEPARATE FACT FROM SAMPLE","Never present synthetic customer details as employer facts. Label proposed workflows and sample data.",
      "DELIVERY","Keep an executive summary, deep technical/operating layer, and a live demo path. Verify every link and artifact before sending."
    ].join("\n")},
    {slug:"metrics-funnel",title:"Job Search Metrics & Funnel",body:snapshot+"\n\nREPORTING RULES\nUse the latest full field report for historical aggregate totals. Use reconstructed CRM records for auditable company-level analysis. Use Jira completed sprint work for execution velocity. Never merge these denominators."},
    {slug:"best-practices",title:"Best Practices Learned",body:[
      "1. Separate acquisition volume from conversion evidence.","2. Preserve a company-role key so ATS duplicates do not inflate the funnel.","3. Build employer-specific proof when it demonstrates the requested job, but keep it clearly sample/proposed.","4. Record first response and first interview dates; speed is an operational metric.","5. Review interview evidence immediately while details are fresh.","6. Late-stage opportunities deserve deeper preparation than unresponsive applications.","7. Compensation should say observed versus estimated.","8. A fit score is a prioritization aid, not a fact.","9. Keep raw private mailbox content out of public repositories.","10. Convert accepted offers into an active-role workspace so 30/60/90 plans, wins, metrics, and review evidence continue in the same system.","11. Automate capture and reconciliation; keep judgment and externally visible commitments reviewable.","12. Make every repeated lesson reusable through this knowledge base."
    ].join("\n")},
    {slug:"jira-working-agreements",title:"Jira Working Agreements & Velocity",body:[
      "WHAT JIRA MEASURES","Jira measures executable career work and process throughput. The CRM remains authoritative for interview stage.",
      "PROJECT","LTP — LandThePlane Career Operations.",
      "BOARD","Scrum board using the project filter ordered by Rank.",
      "COMPANY-ROLE TICKETS","Every CRM opportunity gets a stable LTP ticket number and sync label. High-signal active work is placed in the current sprint.",
      "VELOCITY","Review completed sprint tickets, cycle time, aging work, and carryover. Do not inflate velocity by splitting trivial administrative actions.",
      "REPORTS","Weekly reporting should show acquisition volume, verified applications, response rate, interview conversion, active high-signal processes, completed Jira work, sprint carryover, and next-week priorities."
    ].join("\n")},
    {slug:"sync-model",title:"CRM ↔ Jira ↔ Confluence Sync Model",body:[
      "CRM","Authoritative: company-role identity, application date, first response, first interview, compensation context, fit, lifecycle stage, evidence links.",
      "JIRA","Authoritative: work item state, sprint membership, execution history, ticket key, velocity.",
      "CONFLUENCE","Authoritative: reusable playbooks, standards, lessons, reporting narratives, templates.",
      "SYNC KEY","CRM job_profile.key → deterministic Jira label → Jira issue key stored back on the CRM job_profile.",
      "CONFLICT RULE","Do not let a Jira board transition silently overwrite a CRM interview stage. Stage changes originate from verified recruiting evidence or an explicit CRM edit."
    ].join("\n")},
    {slug:"active-job-transition",title:"Transition to Active Job Management",body:[
      "TRIGGER","An offer is accepted and start date is known.",
      "KEEP","The full application/interview history remains attached to the company-role record.",
      "ADD","30/60/90 outcomes, stakeholder map, onboarding milestones, risks, projects, wins, feedback, metrics, and review evidence.",
      "JIRA","The same project model can track onboarding and role execution, but job-search sprint metrics should be closed and a new active-role board/reporting period started.",
      "CONFLUENCE","Create a role-specific operating page only after acceptance; do not pollute the reusable job-search playbook with employer-confidential data."
    ].join("\n")},
    {slug:"weekly-review",title:"Weekly Review Template",body:[
      "FUNNEL","New verified applications:","New responses:","New interview loops:","Late-stage processes:","Offers:","Accepted roles:",
      "EXECUTION","Sprint completed:","Sprint carryover:","Oldest open action:","Blocked items:",
      "LEARNINGS","What produced responses?","Where did processes stall?","What interview question exposed a preparation gap?","What reusable asset or KB point should be created?",
      "NEXT WEEK","Top five company-role priorities:","Applications worth deep customization:","Follow-ups due:","Interviews/case studies requiring preparation:"
    ].join("\n")}
  ];
}
async function saveJiraConfig(req,env,ctx,data,config){
  const sys=await ensureSystemCustomer(req,env,ctx,data);
  const old=(data.records||[]).find(r=>r.customerId===sys.id&&r.type==="jira_config");
  const payload={...config,updatedAt:new Date().toISOString()};
  await putRecord(req,env,ctx,sys.id,"jira_config",payload,"atlassian_sync",old);
  if(old)old.data=payload;else data.records.push({id:"pending-jira-config",customerId:sys.id,type:"jira_config",data:payload,provenance:"atlassian_sync"});
  return payload;
}
async function atlassianStatus(env){
  const [jira,confluence]=await Promise.all([cpJira(env,"status"),cpConfluence(env,"status")]);
  const granted=new Set(String(jira.data?.granted_scope||"").split(/\s+/).filter(Boolean));
  const missing=REQUIRED_ATLASSIAN_SCOPES.filter(x=>!granted.has(x));
  return {jira:jira.data||{},confluence:confluence.data||{},connected:Boolean(jira.data?.connected),reauthorizationRequired:Boolean(jira.data?.connected&&missing.length)||Boolean(confluence.data?.reauthorization_required),missingScopes:missing,connectUrl:"/api/atlassian/connect"};
}
async function reconcileAtlassian(req,env,ctx){
  const body=await req.json().catch(()=>({})),data=await board(req,env,ctx),status=await atlassianStatus(env);
  if(!status.connected)return j({ok:false,error:"atlassian_not_connected",...status},409);
  if(status.reauthorizationRequired)return j({ok:false,error:"atlassian_reauthorization_required",...status},428);
  const sites=await cpJira(env,"sites");
  if(!sites.ok)return j({ok:false,error:sites.data?.error||"jira_sites_unavailable"},sites.status||502);
  const authorized=sites.data?.sites||[],cloudId=String(body.cloudId||"");
  const site=cloudId?authorized.find(x=>String(x.id)===cloudId):(authorized.length===1?authorized[0]:null);
  if(!site)return j({ok:false,error:"jira_site_selection_required",sites:authorized},409);
  const project=await cpJira(env,"ensure_project",{cloud_id:site.id,key:ATLASSIAN_PROJECT_KEY,name:ATLASSIAN_PROJECT_NAME,description:"Private career operations project synchronized from LandThePlane Command Center."});
  if(!project.ok)return j({ok:false,error:project.data?.error||"jira_project_failed",detail:project.data},project.status||502);
  const projectId=String(project.data?.project?.id||ATLASSIAN_PROJECT_KEY),projectKey=String(project.data?.project?.key||ATLASSIAN_PROJECT_KEY);
  const mainFilter=await cpJira(env,"ensure_filter",{cloud_id:site.id,name:"LandThePlane — Board",jql:`project = ${projectKey} ORDER BY Rank ASC`,description:"Canonical LandThePlane career-operations board filter."});
  if(!mainFilter.ok)return j({ok:false,error:mainFilter.data?.error||"jira_filter_failed",detail:mainFilter.data},mainFilter.status||502);
  const boardResult=await cpJira(env,"ensure_board",{cloud_id:site.id,name:ATLASSIAN_BOARD_NAME,filter_id:mainFilter.data?.filter?.id,project_key_or_id:projectId,type:"scrum"});
  if(!boardResult.ok)return j({ok:false,error:boardResult.data?.error||"jira_board_failed",detail:boardResult.data},boardResult.status||502);
  const boardId=String(boardResult.data?.board?.id||"");
  const dash=await cpJira(env,"ensure_dashboard",{cloud_id:site.id,name:ATLASSIAN_DASHBOARD_NAME,description:"LandThePlane execution, application, interview, and throughput reporting."});
  if(!dash.ok)return j({ok:false,error:dash.data?.error||"jira_dashboard_failed",detail:dash.data},dash.status||502);
  const activeFilter=await cpJira(env,"ensure_filter",{cloud_id:site.id,name:"LandThePlane — Active Opportunities",jql:`project = ${projectKey} AND labels = landtheplane AND labels != stage-closed-rejected ORDER BY updated DESC`,description:"Active LandThePlane company-role processes."});
  const interviewFilter=await cpJira(env,"ensure_filter",{cloud_id:site.id,name:"LandThePlane — Interview Loops",jql:`project = ${projectKey} AND labels in (stage-recruiter-interview,stage-hiring-manager,stage-panel,stage-final) ORDER BY updated DESC`,description:"Company-role processes with verified interview-stage activity."});
  const sw=sprintWindow(),sprint=await cpJira(env,"ensure_sprint",{cloud_id:site.id,board_id:boardId,name:sw.name,goal:"Move the highest-signal career actions forward with evidence-based next steps.",start_date:sw.start,end_date:sw.end});
  if(!sprint.ok)return j({ok:false,error:sprint.data?.error||"jira_sprint_failed",detail:sprint.data},sprint.status||502);

  const profiles=(data.records||[]).filter(r=>r.type==="job_profile").sort((a,b)=>String(b.data?.lastActivityDate||"").localeCompare(String(a.data?.lastActivityDate||"")));
  const offset=Math.max(0,Number(body.offset)||0),limit=Math.max(1,Math.min(50,Number(body.limit)||25)),slice=profiles.slice(offset,offset+limit);
  const synced=[],sprintKeys=[];
  for(const rec of slice){
    const p=rec.data||{},tag=p.jiraLabel||("ltp-"+hashKey(p.key||((p.company||"")+"|"+(p.role||"")))),stage="stage-"+labelSlug(p.stage);
    let issueKey=String(p.jiraKey||""),issueId=String(p.jiraIssueId||"");
    if(!issueKey){
      const found=await cpJira(env,"search",{cloud_id:site.id,jql:`project = ${projectKey} AND labels = "${tag}"`,max_results:2,fields:["summary","status","labels"]});
      const issue=found.ok?(found.data?.issues||[])[0]:null;if(issue){issueKey=String(issue.key||"");issueId=String(issue.id||"")}
    }
    const issueArgs={cloud_id:site.id,project_key:projectKey,summary:(p.company||"Unknown company")+" — "+(p.role||"Role not identified"),issue_type:"Task",description:opportunityDescription(p),labels:["landtheplane","crm-sync",tag,stage]};
    if(issueKey){
      const up=await cpJira(env,"update",{cloud_id:site.id,issue_key:issueKey,summary:issueArgs.summary,description:issueArgs.description,labels:issueArgs.labels});
      if(!up.ok){synced.push({key:p.key,error:up.data?.error||"update_failed"});continue}
    }else{
      const cr=await cpJira(env,"create",issueArgs);
      if(!cr.ok){synced.push({key:p.key,error:cr.data?.error||"create_failed"});continue}
      issueKey=String(cr.data?.issue?.key||"");issueId=String(cr.data?.issue?.id||"");
    }
    const active=["Responded","Recruiter / Interview","Hiring Manager","Panel","Final"].includes(p.stage)||Boolean(p.nextAction);
    if(active&&issueKey)sprintKeys.push(issueKey);
    const updated={...p,jiraKey:issueKey,jiraIssueId:issueId,jiraProjectKey:projectKey,jiraUrl:String(site.url||"").replace(/\/$/,"")+"/browse/"+issueKey,jiraLastSyncedAt:new Date().toISOString(),jiraLabel:tag};
    await putRecord(req,env,ctx,rec.customerId,"job_profile",updated,"atlassian_sync",rec);
    rec.data=updated;synced.push({crmKey:p.key,jiraKey:issueKey,stage:p.stage});
  }
  if(sprintKeys.length)await cpJira(env,"add_to_sprint",{cloud_id:site.id,sprint_id:sprint.data?.sprint?.id,issue_keys:sprintKeys.slice(0,50)});

  let config=(data.records||[]).find(r=>r.type==="jira_config")?.data||{};
  const spaces=await cpConfluence(env,"spaces",{cloud_id:site.id,limit:100});
  if(!spaces.ok)return j({ok:false,error:spaces.data?.error||"confluence_spaces_failed",detail:spaces.data},spaces.status||502);
  let space=(spaces.data?.spaces||[]).find(x=>String(x.key||"").toUpperCase()===ATLASSIAN_SPACE_KEY);
  if(!space){
    const cs=await cpConfluence(env,"create_space",{cloud_id:site.id,key:ATLASSIAN_SPACE_KEY,name:ATLASSIAN_SPACE_NAME,description:"LandThePlane career operating system, job-search playbook, best practices, metrics, and reusable templates."});
    if(!cs.ok)return j({ok:false,error:cs.data?.error||"confluence_space_create_failed",detail:cs.data},cs.status||502);
    space=cs.data?.space||{};
  }
  const pageMap={...(config.confluence?.pages||{})},pages=knowledgePages(data);
  let rootId=String(config.confluence?.rootPageId||pageMap["start-here"]?.id||"");
  for(const page of pages){
    const prior=pageMap[page.slug]||{},isRoot=page.slug==="start-here";
    const x=await cpConfluence(env,"upsert",{cloud_id:site.id,space_id:space.id,space_key:space.key||ATLASSIAN_SPACE_KEY,parent_id:isRoot?undefined:(rootId||undefined),page_id:prior.id||undefined,title:page.title,body:page.body,version_message:"LandThePlane CRM/Atlassian reconcile"});
    if(!x.ok)return j({ok:false,error:x.data?.error||"confluence_page_failed",page:page.slug,detail:x.data},x.status||502);
    const pg=x.data?.page||{},id=String(pg.id||prior.id||""),webui=pg._links?.webui||"",pageUrl=webui?(String(site.url||"").replace(/\/$/,"")+(webui.startsWith("/wiki")?"":"/wiki")+webui):"";
    pageMap[page.slug]={id,url:pageUrl,title:page.title};if(isRoot)rootId=id;
  }
  config=await saveJiraConfig(req,env,ctx,data,{
    jira:{cloudId:site.id,siteUrl:site.url,projectId,projectKey,projectName:ATLASSIAN_PROJECT_NAME,boardId,boardName:ATLASSIAN_BOARD_NAME,dashboardId:String(dash.data?.dashboard?.id||""),dashboardUrl:dash.data?.dashboard?.view||"",sprintId:String(sprint.data?.sprint?.id||""),sprintName:sw.name,filters:{board:String(mainFilter.data?.filter?.id||""),active:String(activeFilter.data?.filter?.id||""),interviews:String(interviewFilter.data?.filter?.id||"")}},
    confluence:{cloudId:site.id,siteUrl:site.url,spaceId:String(space.id||""),spaceKey:String(space.key||ATLASSIAN_SPACE_KEY),spaceName:ATLASSIAN_SPACE_NAME,rootPageId:rootId,pages:pageMap}
  });
  const nextOffset=offset+slice.length<profiles.length?offset+slice.length:null;
  return j({ok:true,project:config.jira,confluence:config.confluence,syncedCount:synced.filter(x=>x.jiraKey).length,results:synced,nextOffset,totalProfiles:profiles.length,complete:nextOffset===null});
}
async function gmailPage(token,cursor){
  const q='after:2026/04/14 {application interview "hiring manager" "next step" "not moving forward" "thank you for applying" "application received" "application has been received" unfortunately offer recruiter panel screening}';
  const u=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  u.searchParams.set("maxResults","40");u.searchParams.set("q",q);if(cursor)u.searchParams.set("pageToken",cursor);
  const list=await gfetch(token,u.toString()),ids=(list.messages||[]).map(x=>x.id);
  const rows=[];
  for(const id of ids){
    const m=await gfetch(token,"https://gmail.googleapis.com/gmail/v1/users/me/messages/"+encodeURIComponent(id)+"?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date");
    const h=headersOf(m.payload),subject=h.subject||"",snippet=m.snippet||"",status=classify(subject+" "+snippet);
    if(status==="other")continue;
    const at=m.internalDate?new Date(Number(m.internalDate)).toISOString():iso(h.date);
    const company=inferCompany(subject,h.from||"",snippet),role=inferRole(subject,snippet);
    rows.push({company,role,evidence:{source:"Gmail",status,id:m.id,at,subject,from:h.from||"",snippet,context:snippet,url:"https://mail.google.com/mail/u/0/#all/"+m.id}});
  }
  return {rows,nextCursor:list.nextPageToken||""};
}
async function calendarEvidence(token){
  const start="2026-04-15T00:00:00Z",end=new Date(Date.now()+120*86400000).toISOString();
  const u=new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  u.searchParams.set("timeMin",start);u.searchParams.set("timeMax",end);u.searchParams.set("singleEvents","true");u.searchParams.set("orderBy","startTime");u.searchParams.set("maxResults","2500");
  const data=await gfetch(token,u.toString()),rows=[];
  for(const event of data.items||[]){const x=guessFromEvent(event);if(x)rows.push(x)}
  return rows;
}
async function latestDigest(token){
  const u=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  u.searchParams.set("maxResults","5");u.searchParams.set("q",'subject:"Daily Job Finder Digest" newer_than:30d');
  const list=await gfetch(token,u.toString()),ids=(list.messages||[]).map(x=>x.id);let best=null;
  for(const id of ids){
    const m=await gfetch(token,"https://gmail.googleapis.com/gmail/v1/users/me/messages/"+encodeURIComponent(id)+"?format=full");
    if(!best||Number(m.internalDate||0)>Number(best.internalDate||0))best=m;
  }
  if(!best)return null;
  const h=headersOf(best.payload),body=payloadText(best.payload),all=body+" "+(best.snippet||"");
  const scanned=all.match(/(\d{1,3})\s+(?:DAILY\s+TARGET\s+)?JOBS?\s+SCANNED/i);
  const sheets=all.match(/(\d{1,2})\s+(?:CSV\s+)?SPREADSHEETS?\s+MAINTAINED/i);
  const cadence=all.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s+(?:DAILY\s+)?CADENCE/i);
  return {subject:h.subject||"Daily Job Finder Digest",date:best.internalDate?new Date(Number(best.internalDate)).toISOString():iso(h.date),jobsScanned:scanned?Number(scanned[1]):null,spreadsheetsMaintained:sheets?Number(sheets[1]):null,cadence:cadence?cadence[1]:"",snippet:safeText(best.snippet,900),source:"Gmail",messageId:best.id};
}

async function latestFieldReport(token){
  const u=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  u.searchParams.set("maxResults","10");
  u.searchParams.set("q",'after:2026/04/14 subject:"Job Search" "FIELD REPORT"');
  const list=await gfetch(token,u.toString()),ids=(list.messages||[]).map(x=>x.id);let best=null;
  for(const id of ids){
    const m=await gfetch(token,"https://gmail.googleapis.com/gmail/v1/users/me/messages/"+encodeURIComponent(id)+"?format=full");
    if(!best||Number(m.internalDate||0)>Number(best.internalDate||0))best=m;
  }
  if(!best)return null;
  const h=headersOf(best.payload),body=payloadText(best.payload),all=body+" "+(best.snippet||"");
  const number=(re)=>{const m=all.match(re);return m?Number(String(m[1]).replace(/,/g,"")):null};
  const excerpt=(start,end)=>{
    const a=body.toUpperCase().indexOf(start.toUpperCase());if(a<0)return "";
    const b=end?body.toUpperCase().indexOf(end.toUpperCase(),a+start.length):-1;
    return safeText(body.slice(a+(start.length),b>a?b:undefined),1800);
  };
  const searchDays=number(/search clock is now about\s+([\d.]+)\s+days/i);
  const searchMonths=number(/(?:or|about)\s+([\d.]+)\s+months/i);
  return {
    subject:h.subject||"Job Search Field Report",
    date:best.internalDate?new Date(Number(best.internalDate)).toISOString():iso(h.date),
    searchStart:"2026-04-15",
    searchDays,searchMonths,
    applicationActions:number(/([\d,]+)\+?\s+APPLICATION ACTIONS/i),
    distinctApplications:number(/([\d,]+)\+?\s+DISTINCT(?:\s+COMPANY-ROLE)?\s+APPLICATIONS/i),
    interviewStageProcesses:number(/([\d,]+)\+?\s+INTERVIEW-STAGE PROCESSES/i),
    completedLiveProcesses:number(/([\d,]+)\+?\s+COMPLETED LIVE(?:\s+DISTINCT)?\s+PROCESSES/i),
    round2Plus:number(/([\d,]+)\+?\s+ROUND 2\s*\/\s*MANAGER\s*\/\s*PANEL/i),
    offers:number(/([\d,]+)\+?\s+OFFERS/i),
    funnelRead:excerpt("05 / WHAT THE FUNNEL SAYS","06 /"),
    highSignalBoard:excerpt("06 / CURRENT HIGH-SIGNAL BOARD","07 /"),
    source:"Gmail",messageId:best.id
  };
}
async function latestSearchSnapshot(token){
  const [daily,fieldReport]=await Promise.all([latestDigest(token),latestFieldReport(token)]);
  if(!daily&&!fieldReport)return null;
  return {...(daily||{subject:"LandThePlane Search Snapshot",date:fieldReport?.date||""}),fieldReport};
}

async function ensureSystemCustomer(req,env,ctx,data){
  let c=data.customers.find(x=>x.name==="LandThePlane Search Engine");
  if(c)return c;
  const r=await callBase(req,env,ctx,"/api/customers","POST",{name:"LandThePlane Search Engine",industry:"Private search telemetry"});
  if(!r.ok)throw new Error("system_customer_create_failed");c=(await r.json()).customer;data.customers.push(c);return c;
}
async function putRecord(req,env,ctx,customerId,type,data,provenance,existing){
  if(existing){
    const r=await callBase(req,env,ctx,"/api/records/"+encodeURIComponent(existing.id),"PATCH",{data,provenance});
    if(!r.ok)throw new Error("record_update_failed:"+type);return existing.id;
  }
  const r=await callBase(req,env,ctx,"/api/records","POST",{customerId,type,provenance,data});
  if(!r.ok)throw new Error("record_create_failed:"+type);return (await r.json()).id;
}
async function persistDigest(req,env,ctx,data,digest){
  if(!digest)return;
  const sys=await ensureSystemCustomer(req,env,ctx,data);
  const old=data.records.find(r=>r.customerId===sys.id&&r.type==="search_digest");
  await putRecord(req,env,ctx,sys.id,"search_digest",digest,"search_digest",old);
  if(old)old.data={...old.data,...digest};else data.records.push({id:"pending-digest",customerId:sys.id,type:"search_digest",data:digest});
}
async function upsertOpportunity(req,env,ctx,data,opp){
  if(!opp.company||opp.company==="Unknown company")return {created:false,skipped:true};
  const profiles=data.records.filter(r=>r.type==="job_profile");
  let old=profiles.find(r=>r.data?.key===opp.key);
  if(!old&&opp.role==="Role not identified"){
    const same=profiles.filter(r=>keyPart(r.data?.company)===keyPart(opp.company));
    if(same.length===1)old=same[0];
  }
  if(old){
    const merged=mergeOpportunity(old.data,opp);
    await putRecord(req,env,ctx,old.customerId,"job_profile",merged,"google_evidence",old);
    old.data=merged;return {created:false,updated:true};
  }
  const name=opp.company+(opp.role&&opp.role!=="Role not identified"?" · "+opp.role:"");
  const cr=await callBase(req,env,ctx,"/api/customers","POST",{name,industry:"Job opportunity"});
  if(!cr.ok)throw new Error("company_ticket_create_failed");
  const customer=(await cr.json()).customer;data.customers.push(customer);
  const id=await putRecord(req,env,ctx,customer.id,"job_profile",opp,"google_evidence",null);
  data.records.push({id,customerId:customer.id,type:"job_profile",data:opp,provenance:"google_evidence"});
  return {created:true,updated:false};
}
async function syncGoogle(req,env,ctx){
  const access=await googleAccess(env);
  if(!access.ok)return j({ok:false,error:access.error,missing:access.missing||[],connectUrl:GOOGLE_CONNECT_URL},access.status||503);
  const url=new URL(req.url),cursor=url.searchParams.get("cursor")||"",data=await board(req,env,ctx);
  const page=await gmailPage(access.token,cursor);
  const grouped=new Map();
  for(const row of page.rows){
    const key=opportunityKey(row.company,row.role),current=grouped.get(key);
    const next=deriveOpportunity(row.company,row.role,[row.evidence]);
    grouped.set(key,mergeOpportunity(current,next));
  }
  if(!cursor){
    const [cal,digest]=await Promise.all([calendarEvidence(access.token),latestSearchSnapshot(access.token)]);
    for(const row of cal){
      const key=opportunityKey(row.company,row.role),current=grouped.get(key);
      const next=deriveOpportunity(row.company,row.role,[row.evidence],{jobUrl:row.jobUrl,jobDescription:row.jobDescription});
      grouped.set(key,mergeOpportunity(current,next));
    }
    await persistDigest(req,env,ctx,data,digest);
  }
  let created=0,updated=0,skipped=0;
  for(const opp of grouped.values()){
    const r=await upsertOpportunity(req,env,ctx,data,opp);created+=r.created?1:0;updated+=r.updated?1:0;skipped+=r.skipped?1:0;
  }
  return j({ok:true,created,updated,skipped,processedMessages:page.rows.length,nextCursor:page.nextCursor,complete:!page.nextCursor});
}
function publicAsset(path){return ["/cc.css","/cc.js","/favicon.ico"].includes(path)}

export default {
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    if(u.pathname==="/health")return j({ok:true,service:"clintware-landtheplane-cc",canonicalUrl:ORIGIN,storage:"private Durable Objects SQLite with audit history",identity:"Clintware Identity / Google",oauthApp:"landtheplane-cc",access:"clint.kosh@gmail.com or verified @clintware.com Google identity",googleEvidence:"delegated Gmail read + Calendar read",guest:false,mode:"job-search-to-active-role"});
    if(u.pathname.startsWith("/auth/")||publicAsset(u.pathname))return base.fetch(req,env,ctx);
    const session=await sessionInfo(req,env,ctx);
    if(!session){
      if(u.pathname==="/")return redirect("/auth/login");
      if(u.pathname.startsWith("/api/")||u.pathname==="/me")return j({error:"authentication_required"},401);
      return new Response("Not found",{status:404,headers:JSON_HEADERS});
    }
    if(u.pathname==="/api/atlassian/status")return j(await atlassianStatus(env));
    if(u.pathname==="/api/atlassian/connect"){
      const start=await cpAtlassianOauth(env);if(!start.ok||!start.data?.authorize_url)return j({error:start.data?.error||"atlassian_authorization_unavailable"},start.status||502);
      return redirect(start.data.authorize_url);
    }
    if(u.pathname==="/api/atlassian/reconcile"&&req.method==="POST")return reconcileAtlassian(req,env,ctx);
    if(u.pathname==="/api/google/status"){
      const access=await googleAccess(env);
      return j({connected:access.ok,reauthorizationRequired:["google_reauthorization_required","google_delegated_grant_missing","google_evidence_account_not_allowed"].includes(access.error),error:access.ok?null:access.error,email:access.email||"",missing:access.missing||[],connectUrl:GOOGLE_CONNECT_URL});
    }
    if(u.pathname==="/api/google/connect")return redirect(GOOGLE_CONNECT_URL);
    if(u.pathname==="/api/google/sync"&&req.method==="POST")return syncGoogle(req,env,ctx);
    if(u.pathname.startsWith("/api/career/")&&!u.pathname.includes("board"))return j({error:"not_found"},404);
    return base.fetch(req,env,ctx);
  }
};

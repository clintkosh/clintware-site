import base from "./index.js";

const ORIGIN="https://cc.clintware.com";
const GOOGLE_TOKEN_URL="https://auth.clintware.com/internal/google-access-token";
const GOOGLE_CONNECT_URL="https://auth.clintware.com/delegated/google/start?return_to="+encodeURIComponent(ORIGIN+"/?google=connected");
const REQUIRED_GOOGLE_SCOPES=[
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly"
];
const APP_RECORD_TYPES=new Set(["job_profile","application_event","interview","follow_up","offer","search_digest","active_role","role_goal","performance_evidence"]);
const SECURITY_HEADERS={"cache-control":"no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow, noarchive","strict-transport-security":"max-age=31536000; includeSubDomains","x-frame-options":"DENY","referrer-policy":"no-referrer","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin"};
const JSON_HEADERS={"content-type":"application/json; charset=utf-8",...SECURITY_HEADERS};
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
  if(/implementation|professional services|solutions consultant|technical account/.test(r))return {value:"$130K–$175K est.",source:"role-band estimate"};
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
    from:safeText(x.from,300),snippet:safeText(x.snippet,700),url:safeText(x.url,1000)
  };
}
function deriveOpportunity(company,role,evidence,extra={}){
  const ev=evidence.map(normalizeEvidence).filter(x=>x.at).sort((a,b)=>a.at.localeCompare(b.at));
  const appliedAt=minDate(ev.filter(x=>x.status==="applied").map(x=>x.at));
  const responses=ev.filter(x=>!["applied","other"].includes(x.status));
  const firstResponseAt=minDate(responses.map(x=>x.at));
  const firstInterviewAt=minDate(ev.filter(x=>["interview","hiring_manager","panel","final"].includes(x.status)).map(x=>x.at));
  const combined=ev.map(x=>x.subject+" "+x.snippet).join(" ");
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
  return deriveOpportunity(b.company||a.company,b.role!=="Role not identified"?b.role:a.role,ev,{
    jobDescription:b.jobDescription||a.jobDescription,jobUrl:b.jobUrl||a.jobUrl,nextAction:a.nextAction||b.nextAction
  });
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
async function gmailPage(token,cursor){
  const q='newer_than:365d {application interview "hiring manager" "next step" "not moving forward" "thank you for applying" unfortunately offer recruiter panel}';
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
    rows.push({company,role,evidence:{source:"Gmail",status,id:m.id,at,subject,from:h.from||"",snippet,url:"https://mail.google.com/mail/u/0/#all/"+m.id}});
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
    const [cal,digest]=await Promise.all([calendarEvidence(access.token),latestDigest(access.token)]);
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

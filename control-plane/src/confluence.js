import { atlassianAccessToken } from "./jira.js";

const API_ORIGIN = "https://api.atlassian.com";
const REQUIRED_READ = ["read:confluence-content.all","read:confluence-space.summary"];
const REQUIRED_WRITE = ["write:confluence-content"];

function scopeSet(grant){
  return new Set(String(grant?.scope||"").split(/\s+/).filter(Boolean));
}
function hasScopes(grant, required){
  const s=scopeSet(grant);
  return required.every(x=>s.has(x));
}
function selectSite(grant, cloudId){
  const sites=Array.isArray(grant?.sites)?grant.sites:[];
  if(cloudId){
    const site=sites.find(x=>String(x.id)===String(cloudId));
    return site?{ok:true,site}:{ok:false,error:"confluence_cloud_id_not_authorized",sites};
  }
  if(sites.length===1)return{ok:true,site:sites[0]};
  if(!sites.length)return{ok:false,error:"confluence_no_accessible_sites",sites:[]};
  return{ok:false,error:"confluence_cloud_id_required",sites};
}
async function callConfluence(env,{cloud_id,method="GET",path,body}){
  let auth=await atlassianAccessToken(env,false);
  if(!auth.ok)return auth;
  if(!hasScopes(auth.grant,REQUIRED_READ))return{ok:false,error:"confluence_reauthorization_required",missing_scopes:REQUIRED_READ.filter(x=>!scopeSet(auth.grant).has(x))};
  const selected=selectSite(auth.grant,cloud_id);
  if(!selected.ok)return selected;
  const apiUrl=API_ORIGIN+"/ex/confluence/"+encodeURIComponent(selected.site.id)+"/wiki/api/v2/"+String(path||"").replace(/^\/+/, "");
  const doFetch=token=>fetch(apiUrl,{
    method,
    headers:{
      authorization:"Bearer "+token,
      accept:"application/json",
      ...(body===undefined?{}:{"content-type":"application/json"})
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  let response=await doFetch(auth.access_token);
  if(response.status===401){
    auth=await atlassianAccessToken(env,true);
    if(!auth.ok)return auth;
    response=await doFetch(auth.access_token);
  }
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{};}catch{data={text:text.slice(0,8000)}}
  return{ok:response.ok,status:response.status,site:selected.site,data,grant:auth.grant};
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function storageBody(value){
  const lines=String(value||"").split(/\r?\n/);
  let html="",inList=false;
  const closeList=()=>{if(inList){html+="</ul>";inList=false;}};
  for(const raw of lines){
    const line=raw.trimEnd();
    if(!line.trim()){closeList();continue;}
    if(/^•\s+/.test(line)){
      if(!inList){html+="<ul>";inList=true;}
      html+="<li>"+escapeHtml(line.replace(/^•\s+/,""))+"</li>";
      continue;
    }
    closeList();
    if(/^[A-Z0-9 /&+—–:-]{4,}$/.test(line.trim())&&line.trim().length<100)html+="<h2>"+escapeHtml(line.trim())+"</h2>";
    else html+="<p>"+escapeHtml(line)+"</p>";
  }
  closeList();
  return html||"<p></p>";
}
async function resolveSpace(env,{cloud_id,space_id,space_key}){
  if(space_id)return{ok:true,space:{id:String(space_id),key:String(space_key||"")}};
  const spaces=await confluenceSpaces(env,{cloud_id});
  if(!spaces.ok)return spaces;
  const target=spaces.spaces.find(s=>String(s.key||"").toLowerCase()===String(space_key||"").toLowerCase());
  return target?{ok:true,space:target}:{ok:false,error:"confluence_space_not_found",space_key:String(space_key||"")};
}

export async function confluenceStatus(env){
  const auth=await atlassianAccessToken(env,false);
  if(!auth.ok)return{ok:true,configured:true,connected:false,error:auth.error||"atlassian_not_connected",required_scopes:[...REQUIRED_READ,...REQUIRED_WRITE]};
  const readReady=hasScopes(auth.grant,REQUIRED_READ);
  const writeReady=hasScopes(auth.grant,[...REQUIRED_READ,...REQUIRED_WRITE]);
  return{
    ok:true,
    configured:true,
    connected:readReady,
    writable:writeReady,
    reauthorization_required:!writeReady,
    granted_scope:String(auth.grant?.scope||""),
    required_scopes:[...REQUIRED_READ,...REQUIRED_WRITE],
    sites:(auth.grant?.sites||[]).map(s=>({id:s.id,name:s.name,url:s.url,scopes:s.scopes||[]}))
  };
}
export async function confluenceSpaces(env,{cloud_id}={}){
  const r=await callConfluence(env,{cloud_id,path:"spaces?limit=100"});
  if(!r.ok)return r;
  return{ok:true,site:r.site,spaces:(r.data?.results||[]).map(s=>({id:s.id,key:s.key,name:s.name,type:s.type,status:s.status,_links:s._links||{}}))};
}
export async function confluenceUpsertPage(env,args={}){
  const auth=await atlassianAccessToken(env,false);
  if(!auth.ok)return auth;
  if(!hasScopes(auth.grant,[...REQUIRED_READ,...REQUIRED_WRITE]))return{ok:false,error:"confluence_reauthorization_required",missing_scopes:[...REQUIRED_READ,...REQUIRED_WRITE].filter(x=>!scopeSet(auth.grant).has(x))};
  const resolved=await resolveSpace(env,args);
  if(!resolved.ok)return resolved;
  const spaceId=String(resolved.space.id);
  const title=String(args.title||"").trim();
  if(!title)return{ok:false,error:"confluence_title_required"};
  const body={representation:"storage",value:storageBody(args.body||"")};
  if(args.page_id){
    const current=await callConfluence(env,{cloud_id:args.cloud_id,path:"pages/"+encodeURIComponent(args.page_id)+"?body-format=storage"});
    if(!current.ok)return current;
    const payload={
      id:String(args.page_id),
      status:"current",
      title,
      spaceId,
      body,
      version:{number:Number(current.data?.version?.number||1)+1,message:String(args.version_message||"Updated from N7 Demo CRM Implementation Best Practice KB").slice(0,250)}
    };
    if(args.parent_id)payload.parentId=String(args.parent_id);
    const updated=await callConfluence(env,{cloud_id:args.cloud_id,method:"PUT",path:"pages/"+encodeURIComponent(args.page_id),body:payload});
    return updated.ok?{ok:true,site:updated.site,page:updated.data,operation:"updated"}:updated;
  }
  const payload={spaceId,status:"current",title,body};
  if(args.parent_id)payload.parentId=String(args.parent_id);
  const created=await callConfluence(env,{cloud_id:args.cloud_id,method:"POST",path:"pages",body:payload});
  return created.ok?{ok:true,site:created.site,page:created.data,operation:"created"}:created;
}

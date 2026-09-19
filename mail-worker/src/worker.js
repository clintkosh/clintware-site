import { DurableObject } from "cloudflare:workers";
import { pageHtml } from "./ui.js";

const AUTH_ORIGIN = "https://auth.clintware.com";
const SESSION_COOKIE = "__Host-clintmail-session";
const BIND_COOKIE = "__Host-clintmail-bind";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const TX_TTL_MS = 10 * 60 * 1000;

const te = new TextEncoder();
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}})}
function html(data,status=200,headers={}){return new Response(data,{status,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","content-security-policy":"default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://auth.clintware.com",...headers}})}
function randomToken(bytes=32){const v=new Uint8Array(bytes);crypto.getRandomValues(v);return btoa(String.fromCharCode(...v)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
async function sha256(v){const d=await crypto.subtle.digest("SHA-256",te.encode(String(v||"")));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function cookie(request,name){for(const p of (request.headers.get("cookie")||"").split(";")){const i=p.indexOf("=");if(i>0&&p.slice(0,i).trim()===name)return decodeURIComponent(p.slice(i+1).trim())}return ""}
function setCookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`}
function clearCookie(name){return `${name}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`}
function mailbox(env){return env.MAILBOX.getByName("clintware-mail-v1")}
function textBody(raw){
  const split=raw.search(/\r?\n\r?\n/); if(split<0)return "";
  let body=raw.slice(split).replace(/^\r?\n\r?\n/,"");
  const ct=(raw.match(/^Content-Type:\s*([^\r\n]+)/im)||[])[1]||"";
  const enc=((raw.match(/^Content-Transfer-Encoding:\s*([^\r\n]+)/im)||[])[1]||"").trim().toLowerCase();
  if(/^text\/plain/i.test(ct)){
    if(enc==="base64"){try{return atob(body.replace(/\s+/g,"")).slice(0,200000)}catch{}}
    if(enc==="quoted-printable") body=body.replace(/=\r?\n/g,"").replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
    return body.slice(0,200000);
  }
  const plain=body.match(/Content-Type:\s*text\/plain[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)(?=\r?\n--[-A-Za-z0-9_=]+)/i);
  return (plain?.[1]||body).slice(0,200000);
}
async function authConfig(){
  const r=await fetch(`${AUTH_ORIGIN}/client-config/mail`,{headers:{accept:"application/json"}});
  if(!r.ok)throw new Error("auth_config_unavailable");
  return r.json();
}
async function sessionFor(request,env){
  const token=cookie(request,SESSION_COOKIE); if(!token)return null;
  return mailbox(env).getSession(await sha256(token));
}
function allowedEmail(env,email){
  const allowed=String(env.MAIL_ALLOWED_EMAILS||env.MAIL_OWNER_EMAIL||"clint@clintware.com").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(String(email||"").toLowerCase());
}
async function requireSession(request,env){
  const s=await sessionFor(request,env); if(!s) return null; return s;
}
async function startLogin(request,env){
  const cfg=await authConfig();
  const state=randomToken(24), verifier=randomToken(48), binding=randomToken(32);
  const digest=await crypto.subtle.digest("SHA-256",te.encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  await mailbox(env).putAuthTxn({state,bindingHash:await sha256(binding),verifier,createdAt:Date.now()});
  const u=new URL(cfg.authorization_endpoint);
  u.searchParams.set("response_type","code");
  u.searchParams.set("client_id",cfg.client_id);
  u.searchParams.set("redirect_uri",cfg.redirect_uri);
  u.searchParams.set("scope",(cfg.scopes||["identity","email","profile"]).join(" "));
  u.searchParams.set("state",state);
  u.searchParams.set("code_challenge",challenge);
  u.searchParams.set("code_challenge_method","S256");
  u.searchParams.set("resource",cfg.resource);
  return new Response(null,{status:302,headers:{location:u.toString(),"set-cookie":setCookie(BIND_COOKIE,binding,600),"cache-control":"no-store"}});
}
async function finishLogin(request,env){
  const url=new URL(request.url), code=url.searchParams.get("code")||"", state=url.searchParams.get("state")||"";
  if(!code||!state)return html("<h1>Login failed</h1><p>Missing authorization response.</p>",400);
  const binding=cookie(request,BIND_COOKIE);
  const tx=await mailbox(env).takeAuthTxn(state);
  if(!tx||!binding||(await sha256(binding))!==tx.bindingHash)return html("<h1>Login expired</h1><p>Start again from Clintware Mail.</p>",400,{"set-cookie":clearCookie(BIND_COOKIE)});
  const cfg=await authConfig();
  const tokenResp=await fetch(cfg.token_endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:cfg.client_id,code,redirect_uri:cfg.redirect_uri,code_verifier:tx.verifier})});
  const tokens=await tokenResp.json().catch(()=>({}));
  if(!tokenResp.ok||!tokens.access_token)return html("<h1>Login failed</h1><p>Clintware could not complete authorization.</p>",502);
  const userResp=await fetch(cfg.userinfo_endpoint,{headers:{authorization:`Bearer ${tokens.access_token}`}});
  const user=await userResp.json().catch(()=>({}));
  if(!userResp.ok||!user.sub||!allowedEmail(env,user.email))return html("<h1>Access denied</h1><p>This Clintware account is not authorized for this mailbox.</p>",403);
  const session=randomToken(40);
  await mailbox(env).createSession({sessionHash:await sha256(session),userId:user.sub,email:user.email,name:user.name||"",expiresAt:Date.now()+SESSION_TTL_MS});
  const headers=new Headers({location:"/","cache-control":"no-store"});
  headers.append("set-cookie",setCookie(SESSION_COOKIE,session,SESSION_TTL_MS/1000));
  headers.append("set-cookie",clearCookie(BIND_COOKIE));
  return new Response(null,{status:302,headers});
}
async function sendMessage(request,env,session){
  if(!env.INTERNAL_MAIL_SECRET)return json({error:"outbound_mail_not_configured"},503);
  const p=await request.json().catch(()=>({}));
  const to=String(p.to||"").trim(), subject=String(p.subject||"").trim().slice(0,180), body=String(p.body||"").slice(0,60000);
  if(!/^\S+@\S+\.\S+$/.test(to)||!subject||!body)return json({error:"invalid_message"},422);
  const payload={to:[to],subject,text:body,reply_to:env.MAIL_FROM_ADDRESS||env.MAIL_OWNER_EMAIL||"clint@clintware.com",category:"clintware_mail"};
  const r=await env.MAILER.fetch("https://mailer.internal/internal/send",{method:"POST",headers:{"content-type":"application/json","x-clintware-mail-secret":env.INTERNAL_MAIL_SECRET},body:JSON.stringify(payload)});
  if(!r.ok)return json({error:"delivery_failed"},502);
  await mailbox(env).saveSent({id:crypto.randomUUID(),fromAddr:env.MAIL_FROM_ADDRESS||env.MAIL_OWNER_EMAIL||"clint@clintware.com",toAddr:to,subject,body,preview:body.slice(0,220),sentAt:new Date().toISOString(),userId:session.userId});
  return json({ok:true},202);
}

export class MailStore extends DurableObject {
  constructor(ctx,env){
    super(ctx,env); this.sql=ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages(
        id TEXT PRIMARY KEY,direction TEXT NOT NULL,from_addr TEXT NOT NULL,to_addr TEXT NOT NULL,subject TEXT NOT NULL,
        received_at TEXT,sent_at TEXT,message_id TEXT,in_reply_to TEXT,preview TEXT,body TEXT,raw TEXT,unread INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_dir_time ON messages(direction,created_at DESC);
      CREATE TABLE IF NOT EXISTS auth_txn(state TEXT PRIMARY KEY,binding_hash TEXT NOT NULL,verifier TEXT NOT NULL,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(session_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,email TEXT NOT NULL,name TEXT,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
    `);
  }
  async ping(){return {ok:true}}
  async putAuthTxn(x){this.sql.exec("DELETE FROM auth_txn WHERE created_at < ?",Date.now()-TX_TTL_MS);this.sql.exec("INSERT OR REPLACE INTO auth_txn VALUES(?,?,?,?)",x.state,x.bindingHash,x.verifier,x.createdAt);return {ok:true}}
  async takeAuthTxn(state){const r=this.sql.exec("SELECT state,binding_hash AS bindingHash,verifier,created_at AS createdAt FROM auth_txn WHERE state=?",state).toArray()[0];this.sql.exec("DELETE FROM auth_txn WHERE state=?",state);return r&&Number(r.createdAt)>=Date.now()-TX_TTL_MS?r:null}
  async createSession(s){this.sql.exec("DELETE FROM sessions WHERE expires_at < ?",Date.now());this.sql.exec("INSERT OR REPLACE INTO sessions(session_hash,user_id,email,name,expires_at,created_at) VALUES(?,?,?,?,?,?)",s.sessionHash,s.userId,s.email,s.name,s.expiresAt,Date.now());return {ok:true}}
  async getSession(hash){const r=this.sql.exec("SELECT user_id AS userId,email,name,expires_at AS expiresAt FROM sessions WHERE session_hash=?",hash).toArray()[0];if(!r||Number(r.expiresAt)<Date.now()){if(r)this.sql.exec("DELETE FROM sessions WHERE session_hash=?",hash);return null}return r}
  async deleteSession(hash){this.sql.exec("DELETE FROM sessions WHERE session_hash=?",hash);return {ok:true}}
  async saveInbound(m){this.sql.exec("INSERT OR REPLACE INTO messages(id,direction,from_addr,to_addr,subject,received_at,message_id,in_reply_to,preview,body,raw,unread,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",m.id,"inbound",m.fromAddr,m.toAddr,m.subject,m.receivedAt,m.messageId,m.inReplyTo,m.preview,m.body,m.raw,1,Date.now());return {ok:true}}
  async saveSent(m){this.sql.exec("INSERT OR REPLACE INTO messages(id,direction,from_addr,to_addr,subject,sent_at,preview,body,unread,created_at) VALUES(?,?,?,?,?,?,?,?,0,?)",m.id,"sent",m.fromAddr,m.toAddr,m.subject,m.sentAt,m.preview,m.body,Date.now());return {ok:true}}
  async listMessages(folder,q=""){
    const dir=folder==="sent"?"sent":"inbound"; const term=`%${String(q||"").slice(0,120)}%`;
    const rows=q?this.sql.exec("SELECT id,from_addr,to_addr,subject,received_at,sent_at,preview,unread,created_at FROM messages WHERE direction=? AND (subject LIKE ? OR from_addr LIKE ? OR to_addr LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT 200",dir,term,term,term,term).toArray():this.sql.exec("SELECT id,from_addr,to_addr,subject,received_at,sent_at,preview,unread,created_at FROM messages WHERE direction=? ORDER BY created_at DESC LIMIT 200",dir).toArray();
    return rows;
  }
  async getMessage(id){return this.sql.exec("SELECT id,direction,from_addr,to_addr,subject,received_at,sent_at,message_id,in_reply_to,preview,body,unread,created_at FROM messages WHERE id=?",id).toArray()[0]||null}
  async markRead(id){this.sql.exec("UPDATE messages SET unread=0 WHERE id=?",id);return {ok:true}}
}

export default {
  async email(message,env,ctx){
    const raw=await new Response(message.raw).text();
    const h=message.headers;
    const body=textBody(raw);
    const record={id:crypto.randomUUID(),fromAddr:String(message.from||h.get("from")||""),toAddr:String(message.to||h.get("to")||""),subject:String(h.get("subject")||"(no subject)").slice(0,500),receivedAt:new Date().toISOString(),messageId:String(h.get("message-id")||""),inReplyTo:String(h.get("in-reply-to")||""),preview:body.replace(/\s+/g," ").trim().slice(0,220),body,raw:raw.slice(0,10_000_000)};
    await mailbox(env).saveInbound(record);
    if(env.FORWARD_COPY_TO){try{await message.forward(env.FORWARD_COPY_TO)}catch(e){console.error(JSON.stringify({event:"mail_forward_copy_failed",message:String(e?.message||e)}))}}
  },
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(request.method==="GET"&&url.pathname==="/health"){
        const storage=await mailbox(env).ping().catch(()=>({ok:false}));
        const mailer=await env.MAILER.fetch("https://mailer.internal/health").then(r=>r.json()).catch(()=>({}));
        const auth=await authConfig().then(()=>true).catch(()=>false);
        return json({ok:Boolean(storage.ok&&auth),service:"clintware-mail",storage:storage.ok?"sqlite":"error",identity:auth?"clintware":"error",outbound:mailer.deliveryConfigured?(mailer.provider||"configured"):"pending",forwardCopy:Boolean(env.FORWARD_COPY_TO)});
      }
      if(request.method==="GET"&&url.pathname==="/login")return startLogin(request,env);
      if(request.method==="GET"&&url.pathname==="/callback")return finishLogin(request,env);
      if(request.method==="POST"&&url.pathname==="/logout"){const t=cookie(request,SESSION_COOKIE);if(t)await mailbox(env).deleteSession(await sha256(t));return json({ok:true},200,{"set-cookie":clearCookie(SESSION_COOKIE)})}
      if(request.method==="GET"&&url.pathname==="/")return html(pageHtml());
      const session=await requireSession(request,env);
      if(!session)return json({error:"unauthorized"},401);
      if(request.method==="GET"&&url.pathname==="/api/me")return json({sub:session.userId,email:session.email,name:session.name});
      if(request.method==="GET"&&url.pathname==="/api/messages")return json({messages:await mailbox(env).listMessages(url.searchParams.get("folder")||"inbox",url.searchParams.get("q")||"")});
      if(request.method==="GET"&&url.pathname.startsWith("/api/message/")){const id=decodeURIComponent(url.pathname.split("/")[3]||"");const m=await mailbox(env).getMessage(id);return m?json({message:m}):json({error:"not_found"},404)}
      if(request.method==="POST"&&url.pathname.match(/^\/api\/message\/[^/]+\/read$/)){const id=decodeURIComponent(url.pathname.split("/")[3]||"");await mailbox(env).markRead(id);return json({ok:true})}
      if(request.method==="POST"&&url.pathname==="/api/send")return sendMessage(request,env,session);
      return json({error:"not_found"},404);
    }catch(error){console.error(JSON.stringify({event:"clintware_mail_error",path:url.pathname,code:error.code||error.message||"internal_error"}));return json({error:"request_failed"},500)}
  }
};

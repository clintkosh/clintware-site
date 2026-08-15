import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:JSON_HEADERS});
const now=()=>Date.now();
const bugId=(fingerprint)=>`AB-${String(fingerprint||"").slice(0,12).toUpperCase()}`;
const clampText=(value,max=8000)=>String(value??"").slice(0,max);
const toInt=(value)=>Number.isFinite(Number(value))?Math.trunc(Number(value)):0;
const boolInt=(value)=>value?1:0;

function normalizedEvent(input={}){
  const metadata={...(input.metadata||{})};
  if(input.fixes_bug_ids)metadata.fixes_bug_ids=input.fixes_bug_ids;
  if(input.retry_of)metadata.retry_of=input.retry_of;
  if(input.affected_paths)metadata.affected_paths=input.affected_paths;
  return {
    event_id:clampText(input.event_id||crypto.randomUUID(),160),
    ts:toInt(input.ts)||now(),
    type:clampText(input.type||"event",80),
    device_id:clampText(input.device_id,160),
    job_id:clampText(input.job_id,160),
    run_id:clampText(input.run_id,200),
    status:clampText(input.status,80),
    duration_ms:Math.max(0,toInt(input.duration_ms)),
    tokens_avoided_est:Math.max(0,toInt(input.tokens_avoided_est)),
    net_tokens_saved_est:Math.max(0,toInt(input.net_tokens_saved_est)),
    local_tokens_est:Math.max(0,toInt(input.local_tokens_est)),
    raw_tokens_est:Math.max(0,toInt(input.raw_tokens_est)),
    sent_tokens_est:Math.max(0,toInt(input.sent_tokens_est)),
    error_kind:clampText(input.error_kind,100),
    error_fingerprint:clampText(input.error_fingerprint,100),
    error_message:clampText(input.error_message,8000),
    product_bug:boolInt(input.product_bug),
    changes_count:Math.max(0,toInt(input.changes_count)),
    patch_count:Math.max(0,toInt(input.patch_count)),
    node_version:clampText(input.node_version,80),
    metadata_json:JSON.stringify(metadata).slice(0,16000),
  };
}

function eventInsert(sql,e){
  return sql.exec(`INSERT INTO telemetry_events(
    event_id,ts,type,device_id,job_id,run_id,status,duration_ms,tokens_avoided_est,net_tokens_saved_est,local_tokens_est,
    raw_tokens_est,sent_tokens_est,error_kind,error_fingerprint,error_message,product_bug,changes_count,patch_count,node_version,metadata_json
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    e.event_id,e.ts,e.type,e.device_id,e.job_id,e.run_id,e.status,e.duration_ms,e.tokens_avoided_est,e.net_tokens_saved_est,e.local_tokens_est,
    e.raw_tokens_est,e.sent_tokens_est,e.error_kind,e.error_fingerprint,e.error_message,e.product_bug,e.changes_count,e.patch_count,e.node_version,e.metadata_json);
}

function createSchema(sql){
  sql.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_events(
      event_id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      type TEXT NOT NULL,
      device_id TEXT,
      job_id TEXT,
      run_id TEXT,
      status TEXT,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      tokens_avoided_est INTEGER NOT NULL DEFAULT 0,
      net_tokens_saved_est INTEGER NOT NULL DEFAULT 0,
      local_tokens_est INTEGER NOT NULL DEFAULT 0,
      raw_tokens_est INTEGER NOT NULL DEFAULT 0,
      sent_tokens_est INTEGER NOT NULL DEFAULT 0,
      error_kind TEXT,
      error_fingerprint TEXT,
      error_message TEXT,
      product_bug INTEGER NOT NULL DEFAULT 0,
      changes_count INTEGER NOT NULL DEFAULT 0,
      patch_count INTEGER NOT NULL DEFAULT 0,
      node_version TEXT,
      metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS telemetry_ts_idx ON telemetry_events(ts DESC);
    CREATE INDEX IF NOT EXISTS telemetry_device_idx ON telemetry_events(device_id,ts DESC);
    CREATE INDEX IF NOT EXISTS telemetry_status_idx ON telemetry_events(status,ts DESC);
    CREATE TABLE IF NOT EXISTS bugs(
      bug_id TEXT PRIMARY KEY,
      fingerprint TEXT UNIQUE NOT NULL,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      status TEXT NOT NULL,
      occurrences INTEGER NOT NULL DEFAULT 1,
      resolved_at INTEGER,
      resolved_by_job_id TEXT,
      last_job_id TEXT,
      last_version TEXT,
      sample_error TEXT,
      affected_paths_json TEXT
    );
    CREATE INDEX IF NOT EXISTS bugs_status_idx ON bugs(status,last_seen DESC);
  `);
}

function summarize(sql){
  const row=sql.exec(`SELECT
    COUNT(*) AS events_total,
    SUM(CASE WHEN type='connection_open' THEN 1 ELSE 0 END) AS connections,
    SUM(CASE WHEN type='cloud_send' THEN 1 ELSE 0 END) AS sends,
    SUM(CASE WHEN type IN ('run_complete','error') THEN 1 ELSE 0 END) AS receives,
    SUM(CASE WHEN type='run_complete' AND status NOT IN ('approval_required','denied') THEN 1 ELSE 0 END) AS runs,
    SUM(CASE WHEN type='run_complete' AND status='passed' THEN 1 ELSE 0 END) AS passed,
    SUM(CASE WHEN type='run_complete' AND status='failed' THEN 1 ELSE 0 END) AS failed,
    SUM(CASE WHEN type='run_complete' AND status IN ('denied','approval_required') THEN 1 ELSE 0 END) AS gated_runs,
    SUM(CASE WHEN status='failed' OR type='error' THEN 1 ELSE 0 END) AS errors,
    COALESCE(SUM(tokens_avoided_est),0) AS tokens_avoided_est,
    COALESCE(SUM(net_tokens_saved_est),0) AS net_tokens_saved_est,
    COALESCE(SUM(local_tokens_est),0) AS local_tokens_est,
    COALESCE(SUM(patch_count),0) AS patches_applied,
    COALESCE(SUM(changes_count),0) AS files_changed,
    COALESCE(AVG(CASE WHEN type='run_complete' AND status NOT IN ('approval_required','denied') THEN duration_ms END),0) AS avg_work_session_ms,
    COALESCE(AVG(CASE WHEN type='connection_close' THEN duration_ms END),0) AS avg_connection_session_ms
    FROM telemetry_events`).toArray()[0]||{};
  const bugs=sql.exec(`SELECT
    COUNT(*) AS bugs_reported,
    SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS bugs_open,
    SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) AS bugs_resolved,
    SUM(CASE WHEN status='reopened' THEN 1 ELSE 0 END) AS bugs_reopened
    FROM bugs`).toArray()[0]||{};
  const out={...row,...bugs};
  for(const [key,value] of Object.entries(out))out[key]=Number(value||0);
  return out;
}

function recentBugs(sql,limit=50){
  return sql.exec(`SELECT bug_id,fingerprint,first_seen,last_seen,status,occurrences,resolved_at,resolved_by_job_id,last_job_id,last_version,sample_error,affected_paths_json FROM bugs ORDER BY last_seen DESC LIMIT ?`,Math.max(1,Math.min(200,toInt(limit)||50))).toArray().map(row=>({
    ...row,
    affected_paths:JSON.parse(row.affected_paths_json||"[]")
  }));
}

function resolveBug(sql,id,jobId,ts=now()){
  const cursor=sql.exec(`UPDATE bugs SET status='resolved',resolved_at=?,resolved_by_job_id=? WHERE bug_id=? AND status!='resolved'`,ts,jobId||"",id);
  return cursor.rowsWritten>0;
}

function upsertBug(sql,event){
  if(!event.product_bug||!event.error_fingerprint)return null;
  const id=bugId(event.error_fingerprint);
  const existing=sql.exec(`SELECT status FROM bugs WHERE bug_id=?`,id).toArray()[0];
  const paths=JSON.parse(event.metadata_json||"{}").affected_paths||[];
  if(existing){
    const nextStatus=existing.status==='resolved'?'reopened':existing.status;
    sql.exec(`UPDATE bugs SET last_seen=?,status=?,occurrences=occurrences+1,last_job_id=?,last_version=?,sample_error=?,affected_paths_json=? WHERE bug_id=?`,
      event.ts,nextStatus,event.job_id,event.node_version,event.error_message,JSON.stringify(paths).slice(0,8000),id);
  }else{
    sql.exec(`INSERT INTO bugs(bug_id,fingerprint,first_seen,last_seen,status,occurrences,last_job_id,last_version,sample_error,affected_paths_json) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      id,event.error_fingerprint,event.ts,event.ts,'open',1,event.job_id,event.node_version,event.error_message,JSON.stringify(paths).slice(0,8000));
  }
  return id;
}

export class TelemetryHub extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.env=env;this.sql=ctx.storage.sql;createSchema(this.sql);}
  async _productEvent(event){
    const product=this.env.PRODUCT_METRICS_HUB.getByName("agentbridge-global");
    const aggregate={...event,error_message:event.product_bug?event.error_message.slice(0,1000):"",metadata_json:"{}",device_id:"",job_id:event.job_id?"present":"",run_id:""};
    await product.fetch(new Request("https://internal/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(aggregate)}));
  }
  async _record(input){
    const event=normalizedEvent(input);
    const exists=this.sql.exec(`SELECT event_id FROM telemetry_events WHERE event_id=? LIMIT 1`,event.event_id).toArray().length>0;
    if(exists)return {ok:true,duplicate:true};
    eventInsert(this.sql,event);
    const openedBugId=upsertBug(this.sql,event);
    const meta=JSON.parse(event.metadata_json||"{}");
    const resolved=[];
    if(event.type==='run_complete'&&event.status==='passed'){
      for(const id of Array.isArray(meta.fixes_bug_ids)?meta.fixes_bug_ids:[]){if(resolveBug(this.sql,String(id),event.job_id,event.ts))resolved.push(String(id));}
      if(meta.retry_of){
        const rows=this.sql.exec(`SELECT bug_id FROM bugs WHERE last_job_id=? AND status!='resolved'`,String(meta.retry_of)).toArray();
        for(const row of rows){if(resolveBug(this.sql,row.bug_id,event.job_id,event.ts))resolved.push(row.bug_id);}
      }
    }
    await this._productEvent({...event,opened_bug_id:openedBugId,resolved_bug_ids:resolved});
    return {ok:true,bug_id:openedBugId,resolved_bug_ids:resolved};
  }
  async fetch(request){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/event')return json(await this._record(await request.json()));
    if(request.method==='GET'&&url.pathname==='/summary')return json({metrics:summarize(this.sql),bugs:recentBugs(this.sql,20)});
    if(request.method==='POST'&&url.pathname==='/report-bug'){
      const d=await request.json();
      let rows=[];
      if(d.event_id)rows=this.sql.exec(`SELECT * FROM telemetry_events WHERE event_id=? LIMIT 1`,String(d.event_id)).toArray();
      else if(d.job_id)rows=this.sql.exec(`SELECT * FROM telemetry_events WHERE job_id=? ORDER BY ts DESC LIMIT 1`,String(d.job_id)).toArray();
      if(!rows.length)return json({error:'event_not_found'},404);
      const e={...rows[0],product_bug:1,error_kind:rows[0].error_kind||'user_reported'};
      if(!e.error_fingerprint)e.error_fingerprint=(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(e.error_message||e.event_id))).byteLength?e.event_id.replace(/[^A-Za-z0-9]/g,'').slice(-24):e.event_id;
      this.sql.exec(`UPDATE telemetry_events SET product_bug=1,error_kind=? WHERE event_id=?`,e.error_kind,e.event_id);
      const id=upsertBug(this.sql,normalizedEvent(e));
      await this._productEvent({...normalizedEvent(e),opened_bug_id:id,resolved_bug_ids:[]});
      return json({ok:true,bug_id:id});
    }
    if(request.method==='GET'&&url.pathname==='/report'){
      const where=[];const args=[];
      const from=Number(url.searchParams.get('from'));const to=Number(url.searchParams.get('to'));
      if(Number.isFinite(from)&&from>0){where.push('ts>=?');args.push(from);}
      if(Number.isFinite(to)&&to>0){where.push('ts<=?');args.push(to);}
      for(const [param,column] of [['device_id','device_id'],['type','type'],['status','status']]){const value=url.searchParams.get(param);if(value){where.push(`${column}=?`);args.push(value);}}
      const limit=Math.max(1,Math.min(2000,Number(url.searchParams.get('limit'))||500));
      const sqlText=`SELECT event_id,ts,type,device_id,job_id,run_id,status,duration_ms,tokens_avoided_est,net_tokens_saved_est,local_tokens_est,raw_tokens_est,sent_tokens_est,error_kind,error_fingerprint,error_message,product_bug,changes_count,patch_count,node_version,metadata_json FROM telemetry_events ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY ts DESC LIMIT ?`;
      const events=this.sql.exec(sqlText,...args,limit).toArray().map(row=>({...row,product_bug:Boolean(row.product_bug),metadata:JSON.parse(row.metadata_json||'{}')}));
      return json({generated_at:new Date().toISOString(),filters:Object.fromEntries(url.searchParams.entries()),metrics:summarize(this.sql),bugs:recentBugs(this.sql,100),events});
    }
    return json({error:'not_found'},404);
  }
}

export class ProductMetricsHub extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;createSchema(this.sql);}
  async fetch(request){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/event'){
      const event=normalizedEvent(await request.json());
      const exists=this.sql.exec(`SELECT event_id FROM telemetry_events WHERE event_id=? LIMIT 1`,event.event_id).toArray().length>0;
      if(!exists){
        eventInsert(this.sql,event);
        upsertBug(this.sql,event);
        const meta=JSON.parse(event.metadata_json||'{}');
        for(const id of Array.isArray(meta.resolved_bug_ids)?meta.resolved_bug_ids:[])resolveBug(this.sql,String(id),event.job_id,event.ts);
      }
      return json({ok:true,duplicate:exists});
    }
    if(request.method==='POST'&&url.pathname==='/resolve'){
      const d=await request.json();return json({ok:true,resolved:resolveBug(this.sql,String(d.bug_id||''),d.job_id)});
    }
    if(request.method==='GET'&&url.pathname==='/summary')return json({metrics:summarize(this.sql),bugs:recentBugs(this.sql,100)});
    return json({error:'not_found'},404);
  }
}

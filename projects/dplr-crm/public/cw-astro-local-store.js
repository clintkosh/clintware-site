(()=>{
  const BOOT=window.CW_ASTRO_LOCAL_BOOTSTRAP;
  if(!BOOT||!Array.isArray(BOOT.customers)||!Array.isArray(BOOT.records))return;

  const KEY=String(BOOT.storageKey||("cw-astro:"+BOOT.appId+":workspace:v"+(BOOT.version||1)));
  const VERSION=Number(BOOT.version||1);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const now=()=>new Date().toISOString();
  const uid=(prefix="id")=>prefix+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36));
  const json=(value,status=200)=>Promise.resolve(new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}}));
  const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"item";
  let memory=null;
  let storageMode="localStorage";

  function persist(db){
    db.updatedAt=now();
    memory=db;
    try{
      localStorage.setItem(KEY,JSON.stringify(db));
      storageMode="localStorage";
    }catch{
      storageMode="memory";
    }
    return db;
  }
  function fresh(){
    return persist({
      version:VERSION,
      selectedCustomerId:BOOT.customers.find(c=>c.isGoldenExample)?.id||BOOT.customers[0]?.id||"",
      customers:clone(BOOT.customers),
      records:clone(BOOT.records),
      kb:clone(BOOT.kb||[]),
      kbConfig:{mode:"Browser-local",connection:"Not connected"},
      createdAt:now(),
      updatedAt:now()
    });
  }
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      const x=raw?JSON.parse(raw):null;
      if(x&&x.version===VERSION&&Array.isArray(x.customers)&&Array.isArray(x.records)){
        memory=x;storageMode="localStorage";return x;
      }
    }catch{}
    if(memory&&memory.version===VERSION)return memory;
    return fresh();
  }
  function recordShape(customerId,type,provenance,data,recordId){
    const t=now();
    return {id:recordId||uid("rec"),customerId,type:String(type||"note"),provenance:String(provenance||"internal_record"),data:clone(data||{}),createdAt:t,updatedAt:t};
  }
  function state(db,requested){
    const golden=db.customers.find(c=>c.isGoldenExample);
    const customer=db.customers.find(c=>c.id===requested)||db.customers.find(c=>c.id===db.selectedCustomerId)||golden||db.customers[0]||null;
    if(customer&&customer.id!==db.selectedCustomerId){db.selectedCustomerId=customer.id;persist(db)}
    return {
      customer,
      customers:clone(db.customers),
      records:customer?clone(db.records.filter(r=>r.customerId===customer.id&&!r.archived)):[],
      workspace:{id:BOOT.workspaceId||"browser-local",name:BOOT.workspaceName||"Browser-local demo workspace",mode:"browser-local"},
      access:{authenticated:false,canWrite:true,mode:"browser-persistent",persistence:storageMode,storage:"browser-local",quotaIndependent:true}
    };
  }
  async function bodyOf(input,init){
    if(init&&typeof init.body==="string"){try{return JSON.parse(init.body)}catch{return{}}}
    if(input instanceof Request){try{const t=await input.clone().text();return t?JSON.parse(t):{}}catch{return{}}}
    return {};
  }

  const nativeFetch=window.fetch.bind(window);
  window.CW_ASTRO_LOCAL_MODE=true;
  window.fetch=async function(input,init={}){
    const raw=input instanceof Request?input.url:String(input);
    const u=new URL(raw,location.href);
    if(u.origin!==location.origin)return nativeFetch(input,init);
    const method=String(init.method||(input instanceof Request?input.method:"GET")||"GET").toUpperCase();

    if(u.pathname==="/me"){
      return json({authenticated:false,workspaceId:BOOT.workspaceId||"browser-local",persistence:storageMode,storage:"browser-local",quotaIndependent:true});
    }
    if(!u.pathname.startsWith("/api"))return nativeFetch(input,init);

    const p=u.pathname.replace(/^\/api/,"")||"/";
    let db=load();

    if(method==="GET"&&p==="/state")return json(state(db,u.searchParams.get("customer")||""));
    if(method==="GET"&&p==="/kb"){
      const articles=clone((db.kb||[]).filter(x=>x.status!=="archived"));
      return json({articles,latest:articles.slice(0,8),trending:articles.slice(0,8),config:clone(db.kbConfig||{}),usageSignalAvailable:false});
    }
    if(method==="GET"&&p==="/ai/status")return json({available:false,configured:false,enabled:false,reason:"browser_local_mode",research:{configured:false}});
    if(method==="GET"&&p==="/control-plane/status")return json({connected:false,configured:false,mode:"browser-local-demo"});
    if(method==="GET"&&/^\/integrations\/(jira|confluence)\/(status|sites)$/.test(p))return json({connected:false,writable:false,configured:false,sites:[]});
    if(method==="GET"&&(p==="/export"||p==="/backup")){
      return json({format:"cw-astro-browser-local-v1",exportedAt:now(),workspace:BOOT.workspaceId||"browser-local",customers:clone(db.customers),records:clone(db.records),kb:clone(db.kb||[])});
    }

    if(method==="POST"&&p==="/records"){
      const b=await bodyOf(input,init),customerId=String(b.customerId||"");
      if(!db.customers.some(c=>c.id===customerId))return json({error:"customer_not_found"},404);
      const r=recordShape(customerId,b.type,b.provenance,b.data);
      db.records.push(r);persist(db);return json({id:r.id,...r},201);
    }
    const rm=p.match(/^\/records\/([^/]+)$/);
    if(rm&&method==="PATCH"){
      const b=await bodyOf(input,init),r=db.records.find(x=>x.id===decodeURIComponent(rm[1]));
      if(!r)return json({error:"record_not_found"},404);
      r.data={...(r.data||{}),...(b.data||{})};
      if(b.provenance)r.provenance=String(b.provenance);
      r.updatedAt=now();persist(db);return json({ok:true,record:clone(r)});
    }
    if(rm&&method==="DELETE"){
      const r=db.records.find(x=>x.id===decodeURIComponent(rm[1]));
      if(!r)return json({error:"record_not_found"},404);
      r.archived=true;r.updatedAt=now();persist(db);return json({ok:true,id:r.id});
    }

    if(method==="POST"&&p==="/customers"){
      const b=await bodyOf(input,init),cid=uid("customer");
      const customer={id:cid,name:String(b.name||"New Customer"),nameStatus:b.name?"User-entered":"Name not provided",industry:String(b.industry||""),stage:"Discovery",week:null,provenance:"internal_record",isSynthetic:false,defaultSample:false,sourceFile:"Browser-local entry",facts:{}};
      db.customers.push(customer);
      db.records.push(recordShape(cid,"raci","template",{title:"Operating RACI",rows:[],roles:["Customer","Sales","Customer Success","Technical","Support","Product"],note:"Assign responsibilities explicitly."}));
      db.selectedCustomerId=cid;persist(db);return json({customer},201);
    }
    const cm=p.match(/^\/customers\/([^/]+)$/);
    if(cm&&method==="PATCH"){
      const b=await bodyOf(input,init),c=db.customers.find(x=>x.id===decodeURIComponent(cm[1]));
      if(!c)return json({error:"customer_not_found"},404);
      Object.assign(c,b,{id:c.id});persist(db);return json({customer:clone(c)});
    }
    if(method==="POST"&&p==="/customers/clear"){
      const b=await bodyOf(input,init),override=b.overrideGolden===true,remove=new Set(db.customers.filter(c=>override||!c.isGoldenExample).map(c=>c.id));
      const removed=remove.size;
      db.customers=db.customers.filter(c=>!remove.has(c.id));
      db.records=db.records.filter(r=>!remove.has(r.customerId));
      db.selectedCustomerId=db.customers.find(c=>c.isGoldenExample)?.id||db.customers[0]?.id||"";
      persist(db);return json({ok:true,removed,goldenPreserved:!override});
    }
    if(method==="POST"&&p==="/customers/reset-samples"){
      db=fresh();return json({ok:true,version:VERSION,customerIds:db.customers.map(c=>c.id)});
    }
    if(method==="POST"&&p==="/customers/bulk-import"){
      const b=await bodyOf(input,init),list=Array.isArray(b.customers)?b.customers:[],ids=[];
      for(const src of list){
        const cid=uid("customer");
        const c={id:cid,name:String(src.name||src.customer_name||"Imported Customer"),nameStatus:"Imported from file",industry:String(src.industry||""),stage:String(src.stage||src.technical_services_stage||"Imported"),week:null,provenance:"customer_provided",isSynthetic:false,defaultSample:false,sourceFile:String(src.sourceName||"Imported source"),facts:{serviceModel:String(src.serviceModel||""),product:String(src.scope||""),currentSystems:String(src.systems||src.current_systems||""),businessGoal:String(src.goal||src.business_goal||""),successMetrics:String(src.metrics||src.success_metrics||""),committedTimeline:String(src.timeline||src.target_timeline||""),unvalidatedDependencies:String(src.dependencies||"")}};
        db.customers.push(c);
        db.records.push(recordShape(cid,"raci","template",{title:"Operating RACI",rows:[],roles:[],note:"Imported customer. Assign responsibilities explicitly."}));
        ids.push(cid);
      }
      if(ids[0])db.selectedCustomerId=ids[0];persist(db);return json({customerIds:ids,count:ids.length},201);
    }
    if(method==="POST"&&p==="/import"){
      const b=await bodyOf(input,init),customerId=String(b.customerId||""),ids=[];
      for(const fact of (Array.isArray(b.facts)?b.facts:[])){
        const r=recordShape(customerId,fact.type||"note","customer_provided",{...(fact.data||{}),importSource:String(b.sourceName||"Uploaded source"),sourceSnippet:String(fact.sourceSnippet||"")});
        db.records.push(r);ids.push(r.id);
      }
      persist(db);return json({inserted:ids},201);
    }

    const useful=p.match(/^\/kb\/articles\/([^/]+)\/useful$/);
    if(useful&&method==="POST"){
      const a=db.kb.find(x=>x.id===decodeURIComponent(useful[1]));
      if(!a)return json({error:"article_not_found"},404);
      a.useful=Number(a.useful||0)+1;a.updatedAt=now();persist(db);return json({ok:true,useful:a.useful});
    }
    const ka=p.match(/^\/kb\/articles\/([^/]+)$/);
    if(method==="POST"&&p==="/kb/articles"){
      const b=await bodyOf(input,init),article={id:uid("kb"),slug:slug(b.title)+"-"+Date.now().toString(36),title:String(b.title||"Untitled article"),summary:String(b.summary||""),body:String(b.body||""),category:String(b.category||"Operations"),tags:Array.isArray(b.tags)?b.tags:[],status:String(b.status||"published"),source:"internal_best_practice",authorLabel:String(b.authorLabel||"Team"),views:0,useful:0,createdAt:now(),updatedAt:now()};
      db.kb.push(article);persist(db);return json({id:article.id,slug:article.slug,article},201);
    }
    if(ka&&method==="GET"){
      const a=db.kb.find(x=>x.id===decodeURIComponent(ka[1]));if(!a)return json({error:"article_not_found"},404);
      a.views=Number(a.views||0)+1;persist(db);return json({article:clone(a)});
    }
    if(ka&&method==="PATCH"){
      const b=await bodyOf(input,init),a=db.kb.find(x=>x.id===decodeURIComponent(ka[1]));if(!a)return json({error:"article_not_found"},404);
      Object.assign(a,clone(b),{id:a.id,updatedAt:now()});persist(db);return json({ok:true,article:clone(a)});
    }
    if(ka&&method==="DELETE"){
      const a=db.kb.find(x=>x.id===decodeURIComponent(ka[1]));if(!a)return json({error:"article_not_found"},404);
      a.status="archived";a.updatedAt=now();persist(db);return json({ok:true});
    }
    if(method==="POST"&&p==="/kb/guidelines/append"){
      const b=await bodyOf(input,init);let a=db.kb.find(x=>x.slug==="implementation-kb-guidelines"||x.slug==="customer-solutions-guidelines");
      if(!a){a={id:uid("kb"),slug:"customer-solutions-guidelines",title:"Customer Operations Guidelines",summary:"Reusable operating lessons",category:"Operations",tags:["guidelines"],status:"published",source:"internal_best_practice",authorLabel:"Team",body:"",views:0,useful:0,createdAt:now(),updatedAt:now()};db.kb.push(a)}
      a.body+=(a.body?"\n\n":"")+String(b.point||"");a.updatedAt=now();persist(db);return json({articleId:a.id});
    }
    if(method==="PATCH"&&p==="/kb/config"){
      const b=await bodyOf(input,init);db.kbConfig={...(db.kbConfig||{}),...clone(b),mode:"Browser-local",connection:"Not connected"};persist(db);return json({ok:true,config:clone(db.kbConfig)});
    }

    if(method==="POST"&&(p==="/integrations/jira/create"||p==="/integrations/confluence/publish")){
      return json({error:"integration_not_connected",detail:"This browser-local demo keeps provider credentials out of the browser. Connect a scoped server capability only when the demo requires a real provider action."},409);
    }

    return json({error:"browser_local_route_not_available",path:p,method},404);
  };

  window.CWAstroLocalStore={key:KEY,read:load,reset:fresh,state:()=>state(load()),version:VERSION,get storageMode(){return storageMode}};
})();
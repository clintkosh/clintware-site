(()=>{
  const BOOT=window.SMSPC_LOCAL_BOOTSTRAP;
  if(!BOOT||!Array.isArray(BOOT.customers)||!Array.isArray(BOOT.records))return;

  const KEY="smspc-browser-workspace-v3";
  const VERSION=Number(BOOT.version||1);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const now=()=>new Date().toISOString();
  const id=(prefix="id")=>prefix+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36));
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
  const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"customer";

  function fresh(){
    const data={
      version:VERSION,
      selectedCustomerId:BOOT.customers.find(c=>c.isGoldenExample)?.id||BOOT.customers[0]?.id||"",
      customers:clone(BOOT.customers),
      records:clone(BOOT.records),
      kb:clone(BOOT.kb||[]),
      kbConfig:{mode:"Browser-local",connection:"Not connected"}
    };
    localStorage.setItem(KEY,JSON.stringify(data));
    return data;
  }
  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||"null");
      if(x&&x.version===VERSION&&Array.isArray(x.customers)&&Array.isArray(x.records))return x;
    }catch{}
    return fresh();
  }
  function save(db){localStorage.setItem(KEY,JSON.stringify(db));return db}
  function recordShape(customerId,type,provenance,data,recordId){
    const t=now();
    return {id:recordId||id("rec"),customerId,type:String(type||"note"),provenance:String(provenance||"internal_record"),data:clone(data||{}),createdAt:t,updatedAt:t};
  }
  function state(db,requested){
    const golden=db.customers.find(c=>c.isGoldenExample);
    const customer=db.customers.find(c=>c.id===requested)||db.customers.find(c=>c.id===db.selectedCustomerId)||golden||db.customers[0]||null;
    if(customer&&customer.id!==db.selectedCustomerId){db.selectedCustomerId=customer.id;save(db)}
    return {
      customer,
      customers:clone(db.customers),
      records:customer?clone(db.records.filter(r=>r.customerId===customer.id&&!r.archived)):[],
      workspace:{id:"browser-local",name:"SimSpace SE browser-local workspace"},
      access:{authenticated:false,canWrite:true,mode:"browser-persistent"}
    };
  }
  async function body(input,init){
    if(init&&typeof init.body==="string"){try{return JSON.parse(init.body)}catch{return{}}}
    if(input instanceof Request){
      try{const t=await input.clone().text();return t?JSON.parse(t):{}}catch{return{}}
    }
    return {};
  }

  const nativeFetch=window.fetch.bind(window);
  window.SMSPC_LOCAL_MODE=true;
  window.fetch=async function(input,init={}){
    const raw=input instanceof Request?input.url:String(input);
    const u=new URL(raw,location.href);
    if(u.origin!==location.origin)return nativeFetch(input,init);
    const method=String(init.method||(input instanceof Request?input.method:"GET")||"GET").toUpperCase();

    if(u.pathname==="/me"){
      return json({authenticated:false,workspaceId:"browser-local",persistence:"browser-persistent"});
    }
    if(!u.pathname.startsWith("/api"))return nativeFetch(input,init);

    const p=u.pathname.replace(/^\/api/,"")||"/";
    let db=load();

    if(method==="GET"&&p==="/state")return json(state(db,u.searchParams.get("customer")||""));
    if(method==="GET"&&p==="/kb"){
      const articles=clone(db.kb||[]);
      return json({articles,latest:articles.slice(0,8),trending:articles.slice(0,8),config:clone(db.kbConfig||{}),usageSignalAvailable:false});
    }
    if(method==="GET"&&p==="/ai/status")return json({available:false,reason:"browser_local_mode"});
    if(method==="GET"&&(p==="/export"||p==="/backup")){
      return json({format:"smspc-browser-local-v1",exportedAt:now(),workspace:"browser-local",customers:clone(db.customers),records:clone(db.records),kb:clone(db.kb||[])});
    }

    if(method==="POST"&&p==="/records"){
      const b=await body(input,init),customerId=String(b.customerId||"");
      if(!db.customers.some(c=>c.id===customerId))return json({error:"customer_not_found"},404);
      const r=recordShape(customerId,b.type,b.provenance,b.data);
      db.records.push(r);save(db);return json({id:r.id},201);
    }
    const rm=p.match(/^\/records\/([^/]+)$/);
    if(rm&&method==="PATCH"){
      const b=await body(input,init),r=db.records.find(x=>x.id===decodeURIComponent(rm[1]));
      if(!r)return json({error:"Not found"},404);
      r.data={...(r.data||{}),...(b.data||{})};
      if(b.provenance)r.provenance=String(b.provenance);
      r.updatedAt=now();save(db);return json({ok:true});
    }
    if(rm&&method==="DELETE"){
      const r=db.records.find(x=>x.id===decodeURIComponent(rm[1]));
      if(!r)return json({error:"Not found"},404);
      r.archived=true;r.updatedAt=now();save(db);return json({ok:true});
    }

    if(method==="POST"&&p==="/customers"){
      const b=await body(input,init),cid=id("customer"),t=now();
      const customer={id:cid,name:String(b.name||"New Customer"),nameStatus:b.name?"User-entered":"Name not provided",industry:String(b.industry||""),stage:"Discovery",week:null,provenance:"internal_record",isSynthetic:true,defaultSample:false,sourceFile:"Browser-local entry",facts:{}};
      db.customers.push(customer);
      db.records.push(recordShape(cid,"raci","template",{title:"Solution Engineering RACI",rows:[],roles:["Customer","Sales","Solution Engineer","Customer Success","Professional Services","Product"],note:"Assign responsibilities explicitly."}));
      db.selectedCustomerId=cid;save(db);return json({customer},201);
    }
    const cm=p.match(/^\/customers\/([^/]+)$/);
    if(cm&&method==="PATCH"){
      const b=await body(input,init),c=db.customers.find(x=>x.id===decodeURIComponent(cm[1]));
      if(!c)return json({error:"customer_not_found"},404);
      Object.assign(c,b,{id:c.id});save(db);return json({customer:clone(c)});
    }
    if(method==="POST"&&p==="/customers/clear"){
      const b=await body(input,init),override=b.overrideGolden===true,remove=new Set(db.customers.filter(c=>override||!c.isGoldenExample).map(c=>c.id));
      const removed=remove.size;
      db.customers=db.customers.filter(c=>!remove.has(c.id));
      db.records=db.records.filter(r=>!remove.has(r.customerId));
      db.selectedCustomerId=db.customers.find(c=>c.isGoldenExample)?.id||db.customers[0]?.id||"";
      save(db);return json({ok:true,removed,goldenPreserved:!override});
    }
    if(method==="POST"&&p==="/customers/reset-samples"){db=fresh();return json({ok:true,version:VERSION})}
    if(method==="POST"&&p==="/customers/bulk-import"){
      const b=await body(input,init),list=Array.isArray(b.customers)?b.customers:[],ids=[];
      for(const src of list){
        const cid=id("customer"),c={id:cid,name:String(src.name||"Imported Customer"),nameStatus:"Imported from file",industry:String(src.industry||""),stage:String(src.stage||"Discovery"),week:null,provenance:"customer_provided",isSynthetic:false,defaultSample:false,sourceFile:String(src.sourceName||"Imported source"),facts:{serviceModel:String(src.serviceModel||""),product:String(src.scope||""),currentSystems:String(src.systems||""),businessGoal:String(src.goal||""),successMetrics:String(src.metrics||""),committedTimeline:String(src.timeline||""),unvalidatedDependencies:String(src.dependencies||"")}};
        db.customers.push(c);db.records.push(recordShape(cid,"raci","template",{title:"Solution Engineering RACI",rows:[],roles:[],note:"Imported customer. Assign responsibilities explicitly."}));ids.push(cid);
      }
      if(ids[0])db.selectedCustomerId=ids[0];save(db);return json({customerIds:ids,count:ids.length},201);
    }
    if(method==="POST"&&p==="/import"){
      const b=await body(input,init),customerId=String(b.customerId||""),ids=[];
      for(const fact of (Array.isArray(b.facts)?b.facts:[])){
        const r=recordShape(customerId,fact.type||"note","customer_provided",{...(fact.data||{}),importSource:String(b.sourceName||"Uploaded source"),sourceSnippet:String(fact.sourceSnippet||"")});
        db.records.push(r);ids.push(r.id);
      }
      save(db);return json({inserted:ids},201);
    }

    const ka=p.match(/^\/kb\/articles\/([^/]+)$/);
    if(method==="POST"&&p==="/kb/articles"){
      const b=await body(input,init),article={id:id("kb"),slug:slug(b.title)+"-"+Date.now().toString(36),title:String(b.title||"Untitled article"),summary:String(b.summary||""),body:String(b.body||""),category:String(b.category||"Solution Engineering"),tags:Array.isArray(b.tags)?b.tags:[],status:String(b.status||"published"),source:"internal_best_practice",authorLabel:String(b.authorLabel||"Solution Engineering Team"),views:0,useful:0,createdAt:now(),updatedAt:now()};
      db.kb.push(article);save(db);return json({id:article.id,slug:article.slug},201);
    }
    if(ka&&method==="GET"){
      const a=db.kb.find(x=>x.id===decodeURIComponent(ka[1]));return a?json({article:clone(a)}):json({error:"Not found"},404);
    }
    if(ka&&method==="PATCH"){
      const b=await body(input,init),a=db.kb.find(x=>x.id===decodeURIComponent(ka[1]));if(!a)return json({error:"Not found"},404);Object.assign(a,b,{id:a.id,updatedAt:now()});save(db);return json({ok:true});
    }
    if(ka&&method==="DELETE"){
      db.kb=db.kb.filter(x=>x.id!==decodeURIComponent(ka[1]));save(db);return json({ok:true});
    }
    if(method==="PATCH"&&p==="/kb/config"){const b=await body(input,init);db.kbConfig={...(db.kbConfig||{}),...b,mode:"Browser-local"};save(db);return json({config:clone(db.kbConfig)})}

    return json({error:"browser_local_route_not_available",path:p},404);
  };
})();

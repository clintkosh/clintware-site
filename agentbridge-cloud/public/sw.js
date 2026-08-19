const CACHE="quillgeist-alpha-v5";
const LEGACY_PREFIXES=["agentbridge-alpha-","quillgeist-alpha-"];
const ASSETS=["/","/app.js","/styles.css","/terminal.css","/fluid.js","/manifest.webmanifest","/icon.svg"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>LEGACY_PREFIXES.some(prefix=>key.startsWith(prefix))&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET"||url.pathname.startsWith("/api/")||url.pathname.startsWith("/ws/"))return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
        }
        return response;
      })
      .catch(async()=>{
        const hit=await caches.match(event.request);
        if(hit)return hit;
        if(event.request.mode==="navigate")return (await caches.match("/"))||new Response("Quillgeist is offline.",{status:503,headers:{"content-type":"text/plain; charset=utf-8"}});
        return new Response("Offline",{status:503,headers:{"content-type":"text/plain; charset=utf-8"}});
      })
  );
});

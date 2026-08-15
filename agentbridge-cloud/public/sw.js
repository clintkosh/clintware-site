const CACHE="agentbridge-alpha-v3";
const ASSETS=["/","/app.js","/styles.css","/fluid.js","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("agentbridge-alpha-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET"||url.pathname.startsWith("/api/")||url.pathname.startsWith("/ws/"))return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("/"))));
});

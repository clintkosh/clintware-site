const CACHE="agentbridge-alpha-v1";
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["/","/app.js","/manifest.webmanifest","/icon.svg"]))));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(u.pathname.startsWith("/api/")||u.pathname.startsWith("/ws/"))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});

const CACHE_NAME = "torti-cache-v2";
const urlsToCache = ["/","/index.html","/main.jsx"];

self.addEventListener("install", e=>{
 e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", e=>{
 e.respondWith(
  caches.match(e.request).then(res=> res || fetch(e.request).catch(()=>caches.match("/")))
 );
});

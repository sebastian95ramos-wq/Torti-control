const CACHE_NAME = "torti-cache-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => new Response("Sin conexión"))
  );
});
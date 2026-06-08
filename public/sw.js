// Service Worker minimal — habilita PWA install.
// Estratégia: network-first com fallback offline.

const CACHE_NAME = "sistema-trafego-v1";
const OFFLINE_FALLBACK = "/dashboard";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_FALLBACK, "/manifest.json"])),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Não interceptar API calls — sempre rede.
  if (req.url.includes("/api/") || req.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_FALLBACK))),
  );
});

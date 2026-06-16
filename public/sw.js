// Service Worker minimal — habilita PWA install.
// Estratégia: network-first; fallback offline SÓ pra navegação (HTML).
// Nunca responder asset (JS/CSS) com HTML — quebra a página após deploys.

const CACHE_NAME = "sistema-trafego-v3";
const OFFLINE_FALLBACK = "/dashboard";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_FALLBACK, "/manifest.json"])),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpa caches de versões antigas (chunks de deploys anteriores)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Não interceptar API calls — sempre rede.
  if (req.url.includes("/api/") || req.url.includes("supabase.co")) return;

  const isNavigation = req.mode === "navigate";

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Fallback de página offline SÓ pra navegação — nunca pra JS/CSS/imagem
        if (isNavigation) {
          const fb = await caches.match(OFFLINE_FALLBACK);
          if (fb) return fb;
        }
        return Response.error();
      }),
  );
});

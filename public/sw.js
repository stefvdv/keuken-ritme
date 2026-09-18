// Ritme — service worker voor offline opstarten.
// Strategie: altijd eerst het netwerk (dus na een deploy meteen de nieuwste
// versie); lukt dat niet, dan de laatst opgehaalde kopie uit de cache.
// Alleen eigen bestanden worden bewaard — Supabase en /api/mice nooit.
const CACHE = "ritme-app-v1";

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // extern (Supabase e.d.): niet bemoeien
  if (url.pathname.startsWith("/api/")) return;    // MICE-proxy: altijd live
  e.respondWith((async () => {
    try {
      const vers = await fetch(req);
      if (vers && vers.ok) {
        const c = await caches.open(CACHE);
        c.put(req, vers.clone());
      }
      return vers;
    } catch (err) {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: req.mode === "navigate" });
      if (hit) return hit;
      if (req.mode === "navigate") {
        // Onbekende pagina zonder netwerk: val terug op de app-schil.
        const schil = (await c.match("/")) || (await c.match("/index.html"));
        if (schil) return schil;
      }
      throw err;
    }
  })());
});

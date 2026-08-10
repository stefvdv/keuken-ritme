// Service worker — In het ritme van het land (Ritme, Wilde Wortels)
// Netwerk-eerst voor pagina's: een nieuwe deploy is direct zichtbaar, en de
// cache dient alleen als vangnet zonder verbinding. Oude caches (ook die van
// per ongeluk hier beland zijnde andere apps) worden bij activatie opgeruimd.
const CACHE = "ritme-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      if (net && net.ok && new URL(req.url).origin === self.location.origin) {
        const c = await caches.open(CACHE);
        c.put(req, net.clone());
      }
      return net;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === "navigate") {
        const start = await caches.match("/");
        if (start) return start;
      }
      throw err;
    }
  })());
});

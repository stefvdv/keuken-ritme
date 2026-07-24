// Service worker — maakt de app installeerbaar en laadt de schil offline.
//
// Belangrijk: de pagina zelf (index.html) wordt ALTIJD eerst van het internet
// gehaald. Anders blijft de app naar de oude JavaScript verwijzen en zie je na
// een update de oude versie. De gebouwde bestanden in /assets/ hebben een
// unieke naam per versie en mogen daarom wél uit de cache komen.
const CACHE = "ritme-v3";
const SHELL = ["/", "/index.html", "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Vanuit de pagina kunnen we vragen om direct over te schakelen.
self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                  // geen POST/PUT cachen
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase/API nooit cachen

  const isPage = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  // 1. Pagina's: eerst het internet, cache alleen als noodrantsoen (offline).
  if (isPage) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }

  // 2. Gebouwde bestanden (/assets/…) hebben een unieke naam per versie:
  //    die mogen direct uit de cache komen.
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // 3. Rest (iconen, manifest): eerst internet, cache als achtervang.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});

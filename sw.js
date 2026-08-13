const CACHE_NAME = "atomic-habits-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./habit.js",
  "./focus.js",
  "./airemind.js",
  "./habit.css",
  "./focus.css",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && e.request.method === "GET") {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});

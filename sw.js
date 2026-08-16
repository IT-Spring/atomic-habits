const CACHE_NAME = "atomic-habits-v2";
// 应用代码（HTML/JS）：每次都从网络取最新，确保桌面图标点开即刷新
const APP_CODE = ["/", "/index.html", "/app.js", "/habit.js", "/focus.js", "/airemind.js"];
// 静态资源：网络优先，失败回退缓存（用于离线时仍能打开外壳）
const STATIC = ["/styles.css", "/habit.css", "/focus.css", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...APP_CODE, ...STATIC]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const path = url.pathname;
  const isAppCode = APP_CODE.some((p) => path === p || path.endsWith(p));

  if (isAppCode) {
    // 关键：cache:'reload' 绕过浏览器/ CDN 的 HTTP 缓存，永远拿到服务端最新文件
    e.respondWith(
      fetch(e.request, { cache: "reload" })
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            caches.open(CACHE_NAME).then((c) => c.put(e.request, resp.clone()));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 其余静态资源：网络优先（同样绕过 HTTP 缓存取最新），断网回退缓存
  e.respondWith(
    fetch(e.request, { cache: "reload" })
      .then((resp) => {
        if (resp && resp.status === 200) {
          caches.open(CACHE_NAME).then((c) => c.put(e.request, resp.clone()));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});

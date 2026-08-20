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

/* ========== 后台提醒（锁屏/应用后台时由 SW 保活触发） ========== */
let reminderTimer = null;
let reminderIntervalMin = 30;

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'REMINDER_CONFIG') {
    reminderIntervalMin = Math.max(1, d.intervalMin || 30);
    if (d.enabled) startSWReminder();
    else stopSWReminder();
  } else if (d.type === 'REMINDER_TEST') {
    swFireReminder();
  }
});

function startSWReminder() {
  stopSWReminder();
  reminderTimer = setInterval(swFireReminder, reminderIntervalMin * 60 * 1000);
}

function stopSWReminder() {
  if (reminderTimer) { clearInterval(reminderTimer); reminderTimer = null; }
}

function swFireReminder() {
  self.registration.showNotification('⏰ 时间记录提醒', {
    body: '你刚才在做什么？花10秒记录一下吧～',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'plan-reminder',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: '/' },
  }).catch(() => {});
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
      return undefined;
    })
  );
});

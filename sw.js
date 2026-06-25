// Service worker: офлайн-кэш и установка как приложение.
const VERSION = 'v28';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/tabler-icons.css',
  './fonts/tabler-icons.woff2',
  './js/seed.json',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // навигация → отдаём оболочку приложения
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  // тяжёлые статичные файлы (шрифт, иконки, картинки) — из кэша (быстро, не меняются)
  const isStatic = /\.(woff2|woff|ttf|png|jpe?g|svg|ico)$/i.test(url.pathname);

  const cacheThenPut = (res) => {
    const copy = res.clone();
    caches.open(RUNTIME).then((c) => c.put(request, copy));
    return res;
  };

  if (sameOrigin && !isStatic) {
    // код (html/js/css/json) — network-first: всегда свежая версия, офлайн — из кэша
    e.respondWith(
      fetch(request).then(cacheThenPut).catch(() => caches.match(request).then((c) => c || caches.match('./index.html')))
    );
  } else if (sameOrigin) {
    // статика — cache-first
    e.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(cacheThenPut)));
  } else {
    // внешнее (обложки) — cache-first с фоновым обновлением
    e.respondWith(
      caches.match(request).then((cached) => {
        const net = fetch(request).then(cacheThenPut).catch(() => cached);
        return cached || net;
      })
    );
  }
});

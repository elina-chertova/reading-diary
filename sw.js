// Service worker: мгновенная загрузка из кэша + тихое обновление в фоне.
const VERSION = 'v39';
const CACHE = `app-${VERSION}`;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/tabler-icons.css',
  './fonts/tabler-icons.woff2',
  './js/seed.json',
  './icons/icon.svg',
  // все модули приложения — чтобы загрузка всегда была из кэша (мгновенно), а не из сети
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/stats.js',
  './js/charts.js',
  './js/ui.js',
  './js/covers.js',
  './js/actions.js',
  './js/share.js',
  './js/screens/home.js',
  './js/screens/library.js',
  './js/screens/book.js',
  './js/screens/edit.js',
  './js/screens/stats.js',
  './js/screens/calendar.js',
  './js/screens/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// положить ответ в единый кэш
function put(request, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
  return res;
}

// «показать из кэша сразу, а свежее скачать в фоне» — мгновенная загрузка
function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const network = fetch(request).then((res) => put(request, res)).catch(() => cached);
    return cached || network; // если в кэше есть — отдаём сразу, не ждём сеть
  });
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // навигация → оболочка из кэша мгновенно, обновление в фоне
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((cached) => {
        const network = fetch(request).then((res) => put(request, res)).catch(() => cached || caches.match('./'));
        return cached || network;
      })
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  // статика (шрифт, иконки, картинки, вендор) — из кэша; не меняется
  const isStatic = /\.(woff2|woff|ttf|png|jpe?g|svg|ico)$/i.test(url.pathname) || url.pathname.includes('/vendor/');

  if (sameOrigin && isStatic) {
    e.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((res) => put(request, res))));
  } else if (sameOrigin) {
    // код (html/js/css/json) — мгновенно из кэша + фоновое обновление
    e.respondWith(staleWhileRevalidate(request));
  } else {
    // внешнее (обложки) — из кэша, обновление в фоне
    e.respondWith(staleWhileRevalidate(request));
  }
});

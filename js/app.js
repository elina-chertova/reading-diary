import { ensureSeeded } from './store.js';
import { home } from './screens/home.js';
import { library } from './screens/library.js';
import { book } from './screens/book.js';
import { edit } from './screens/edit.js';
import { stats } from './screens/stats.js';
import { calendar } from './screens/calendar.js';
import { settings } from './screens/settings.js';

const routes = [
  { re: /^\/?$/, screen: home },
  { re: /^\/library$/, screen: library },
  { re: /^\/book\/(\d+)$/, screen: book, keys: ['id'] },
  { re: /^\/add$/, screen: edit },
  { re: /^\/edit\/(\d+)$/, screen: edit, keys: ['id'] },
  { re: /^\/stats$/, screen: stats },
  { re: /^\/calendar$/, screen: calendar },
  { re: /^\/settings$/, screen: settings },
];

const app = document.getElementById('app');

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  for (const r of routes) {
    const m = raw.match(r.re);
    if (m) {
      const params = {};
      (r.keys || []).forEach((k, i) => { params[k] = m[i + 1]; });
      return { screen: r.screen, params };
    }
  }
  return { screen: home, params: {} };
}

let rendering = false;
async function renderRoute() {
  if (rendering) return;
  rendering = true;
  const { screen, params } = parseHash();
  try {
    const { html, mount } = await screen(params);
    app.innerHTML = html;
    window.scrollTo(0, 0);
    mount?.(app);
  } catch (e) {
    console.error('Ошибка экрана', e);
    app.innerHTML = `<div class="screen"><div class="empty"><i class="ti ti-alert-triangle"></i>Что-то пошло не так<br><span style="font-size:12px">${e.message}</span></div></div>`;
  }
  rendering = false;
}
window.__refresh = renderRoute;

// делегирование переходов по data-go
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go]');
  if (t) { e.preventDefault(); location.hash = t.dataset.go; }
});

window.addEventListener('hashchange', renderRoute);

// PWA install prompt (Android/desktop Chrome)
window.__deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__deferredPrompt = e; });

async function boot() {
  await ensureSeeded();
  await renderRoute();
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) { console.warn('SW не зарегистрирован', e); }
  }
}
boot();

// Генерация карточки статистики в PNG (html2canvas) и системный «Поделиться».
import { esc, fmtNum } from './ui.js';

// лениво подгружаем html2canvas (локально, один раз)
let libPromise = null;
function loadLib() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('./vendor/html2canvas.min.js', import.meta.url).href;
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error('lib'));
    document.head.appendChild(s);
  });
  return libPromise;
}

const fmt = (n) => fmtNum(n);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// мини-график страниц по месяцам столбиками (html2canvas рисует HTML надёжно)
function miniBars(values) {
  const max = Math.max(1, ...values);
  const H = 80;
  const bars = values.map((v) => {
    const ht = v > 0 ? Math.max(4, Math.round((v / max) * H)) : 2;
    const isMax = v === max && v > 0;
    return `<div style="flex:1;height:${ht}px;background:${isMax ? '#b5a8ff' : '#7c5cff'};border-radius:3px 3px 0 0;"></div>`;
  }).join('');
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:${H}px;">${bars}</div>
    <div style="display:flex;justify-content:space-between;font-size:8px;color:#6b6b85;margin-top:6px;"><span>янв</span><span>апр</span><span>июл</span><span>дек</span></div>`;
}

function genreBlock(genres) {
  if (!genres.length) return '';
  const palette = ['#7c5cff', '#1d9e75', '#d4537e', '#ba7517'];
  const top = genres.slice(0, 4);
  const restPct = genres.slice(4).reduce((s, g) => s + g.pct, 0);
  const segs = top.map((g, i) => `<div style="width:${(g.pct * 100).toFixed(1)}%;background:${palette[i]}"></div>`).join('')
    + (restPct > 0.001 ? `<div style="width:${(restPct * 100).toFixed(1)}%;background:#444441"></div>` : '');
  const legend = top.map((g, i) => `<div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:2px;background:${palette[i]}"></span><span style="color:#8b8b99;">${esc(g.name)}</span><span style="margin-left:auto;">${Math.round(g.pct * 100)}%</span></div>`).join('')
    + (restPct > 0.001 ? `<div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:2px;background:#444441"></span><span style="color:#8b8b99;">Другое</span><span style="margin-left:auto;">${Math.round(restPct * 100)}%</span></div>` : '');
  return `<div style="font-size:10.5px;letter-spacing:.06em;color:#6b6b85;text-transform:uppercase;margin-bottom:8px;">Любимые жанры</div>
    <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin-bottom:10px;">${segs}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 14px;font-size:11.5px;margin-bottom:18px;">${legend}</div>`;
}

function buildCardHTML(st) {
  const year = st.year;
  const series = st.monthlyPages(year);
  const authors = st.topAuthors || [];
  const records = [];
  if (st.bestBook) records.push(['⭐ Лучшая', `«${st.bestBook.title}» · ${st.bestBook.rating}`]);
  if (st.longestBook) records.push(['📖 Длиннее всех', `«${st.longestBook.title}»`]);
  if (st.fastestBook) records.push(['⚡ Быстрее всех', `${Math.round(st.fastestBook.ppd)} стр./день`]);
  if (st.recordMonth) records.push(['🏆 Месяц-рекорд', `${st.recordMonth.label} · ${fmt(st.recordMonth.pages)} стр.`]);

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div style="font-size:11px;letter-spacing:.12em;color:#8b7cc8;">ДНЕВНИК ЧТЕНИЯ</div>
      <div style="font-size:12px;color:#8b8b99;">${year}</div>
    </div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:500;line-height:1.15;margin-bottom:18px;">Моя статистика чтения</div>

    <div style="display:flex;gap:8px;margin-bottom:18px;">
      <div style="flex:1;background:#1a1530;border-radius:13px;padding:12px;"><div style="font-size:24px;font-weight:700;color:#b5a8ff;line-height:1;">${st.totalFinished}</div><div style="font-size:10.5px;color:#8b8b99;margin-top:5px;">книг</div></div>
      <div style="flex:1;background:#1a1530;border-radius:13px;padding:12px;"><div style="font-size:24px;font-weight:700;line-height:1;">${fmt(st.allTimePages)}</div><div style="font-size:10.5px;color:#8b8b99;margin-top:5px;">страниц</div></div>
      <div style="flex:1;background:#1a1530;border-radius:13px;padding:12px;"><div style="font-size:24px;font-weight:700;line-height:1;">${fmt(st.avgPerMonth)}</div><div style="font-size:10.5px;color:#8b8b99;margin-top:5px;">стр./мес</div></div>
    </div>

    <div style="font-size:10.5px;letter-spacing:.06em;color:#6b6b85;text-transform:uppercase;margin-bottom:8px;">Страниц по месяцам · ${year}</div>
    <div style="background:#1a1530;border-radius:13px;padding:12px 10px;margin-bottom:18px;">${miniBars(series)}</div>

    ${genreBlock(st.genres || [])}

    <div style="display:flex;gap:7px;margin-bottom:18px;">
      <div style="flex:1;background:#1a1530;border-radius:11px;padding:9px;text-align:center;"><div style="font-size:16px;">🔥</div><div style="font-size:13px;font-weight:500;margin-top:2px;">${st.streak} дн.</div><div style="font-size:9px;color:#8b8b99;">серия</div></div>
      <div style="flex:1;background:#1a1530;border-radius:11px;padding:9px;text-align:center;"><div style="font-size:16px;">⭐</div><div style="font-size:13px;font-weight:500;margin-top:2px;">${st.avgRating ? st.avgRating.toFixed(1) : '—'}</div><div style="font-size:9px;color:#8b8b99;">средняя</div></div>
      <div style="flex:1;background:#1a1530;border-radius:11px;padding:9px;text-align:center;"><div style="font-size:16px;">📅</div><div style="font-size:13px;font-weight:500;margin-top:2px;">${cap(st.peakWd?.label || '—')}</div><div style="font-size:9px;color:#8b8b99;">пик чтения</div></div>
    </div>

    ${authors.length ? `<div style="font-size:10.5px;letter-spacing:.06em;color:#6b6b85;text-transform:uppercase;margin-bottom:8px;">Топ-${authors.length} ${authors.length === 1 ? 'автор' : 'автора'}</div>
    <div style="background:#1a1530;border-radius:13px;padding:6px 13px;margin-bottom:18px;font-size:13px;">
      ${authors.map((a, i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;${i < authors.length - 1 ? 'border-bottom:1px solid #2a2440;' : ''}"><span><b style="color:#b5a8ff;">${i + 1}</b>&nbsp;&nbsp;${esc(a.name)}</span><span style="color:#8b8b99;">${a.count} кн.</span></div>`).join('')}
    </div>` : ''}

    ${records.length ? `<div style="font-size:10.5px;letter-spacing:.06em;color:#6b6b85;text-transform:uppercase;margin-bottom:8px;">Рекорды</div>
    <div style="background:#1a1530;border-radius:13px;padding:6px 13px;margin-bottom:18px;font-size:12.5px;">
      ${records.map(([k, v], i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;${i < records.length - 1 ? 'border-bottom:1px solid #2a2440;' : ''}"><span style="color:#8b8b99;white-space:nowrap;">${k}</span><span style="text-align:right;">${esc(v)}</span></div>`).join('')}
    </div>` : ''}

    <div style="text-align:center;font-size:11px;color:#55556a;">elina-chertova.github.io/reading-diary</div>`;
}

// Собрать карточку, отрендерить в PNG, открыть «Поделиться» (иначе скачать).
export async function shareStats(st, { onStatus } = {}) {
  if (!st.totalFinished && !st.allTimePages) {
    onStatus && onStatus('Сначала добавьте книги');
    return;
  }
  onStatus && onStatus('Готовлю картинку…');
  const card = document.createElement('div');
  card.style.cssText = 'position:fixed;left:-10000px;top:0;width:348px;background:#0f0b1e;border-radius:22px;padding:24px 20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;';
  card.innerHTML = buildCardHTML(st);
  document.body.appendChild(card);
  try {
    const h2c = await loadLib();
    const canvas = await h2c(card, { backgroundColor: '#0f0b1e', scale: 2.5, logging: false });
    card.remove();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('blob');
    const file = new File([blob], 'статистика-чтения.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Моя статистика чтения', text: 'Моя статистика чтения 📚' }); } catch { /* отмена — не ошибка */ }
      onStatus && onStatus('');
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
      onStatus && onStatus('Картинка сохранена');
    }
  } catch (e) {
    card.remove();
    console.warn('share error', e);
    onStatus && onStatus('Не удалось создать картинку');
  }
}

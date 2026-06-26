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
      try { await navigator.share({ files: [file] }); } catch { /* отмена — не ошибка */ }
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

// ============ PDF-отчёт (полная статистика) ============
let pdfPromise = null;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  if (pdfPromise) return pdfPromise;
  pdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('./vendor/jspdf.umd.min.js', import.meta.url).href;
    s.onload = () => resolve(window.jspdf);
    s.onerror = () => reject(new Error('jspdf'));
    document.head.appendChild(s);
  });
  return pdfPromise;
}

const repSection = (title, inner) => `<div style="margin-bottom:22px;">
  <div style="font-size:11px;letter-spacing:.08em;color:#8b7cc8;text-transform:uppercase;margin-bottom:11px;">${title}</div>${inner}</div>`;

const repTiles = (items) => `<div style="display:flex;gap:10px;">${items.map(([v, l]) =>
  `<div style="flex:1;background:#1a1530;border-radius:12px;padding:13px;"><div style="font-size:22px;font-weight:700;">${v}</div><div style="font-size:11px;color:#8b8b99;margin-top:4px;">${l}</div></div>`).join('')}</div>`;

function repBars(values, labelsEvery) {
  const max = Math.max(1, ...values);
  const bars = values.map((v) => `<div style="flex:1;height:${v > 0 ? Math.max(4, Math.round((v / max) * 90)) : 2}px;background:${v === max && v > 0 ? '#b5a8ff' : '#7c5cff'};border-radius:3px 3px 0 0;"></div>`).join('');
  const labs = values.map((_, i) => `<div style="flex:1;text-align:center;font-size:9px;color:#6b6b85;">${labelsEvery[i] || ''}</div>`).join('');
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:90px;">${bars}</div><div style="display:flex;gap:3px;margin-top:6px;">${labs}</div>`;
}

function buildReportHTML(st) {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const pagesSeries = st.monthlyPages(st.year);
  const booksSeries = st.monthlyBooks(st.year);
  const palette = ['#7c5cff', '#1d9e75', '#d4537e', '#ba7517', '#185fa5', '#993c1d', '#534ab7', '#1d9e75'];
  const genres = (st.genres || []).slice(0, 8);
  const maxRating = Math.max(1, ...st.ratingDist.map((r) => r.count));
  const wdMax = Math.max(1, ...st.weekday.map((w) => w.avg));

  const goalPct = Math.min(100, Math.round((st.thisYearBooks / st.goal) * 100));

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <div style="font-size:12px;letter-spacing:.12em;color:#8b7cc8;">ДНЕВНИК ЧТЕНИЯ</div>
      <div style="font-size:13px;color:#8b8b99;">${st.year}</div>
    </div>
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:500;margin-bottom:26px;">Полная статистика чтения</div>

    ${repSection('Прочитано страниц', repTiles([[fmt(st.thisMonthPages), 'за месяц'], [fmt(st.thisYearPages), 'за год'], [fmt(st.allTimePages), 'за всё время']]) + `<div style="font-size:12px;color:#8b8b99;margin-top:8px;">В среднем ${fmt(st.avgPerMonth)} стр./мес</div>`)}

    ${repSection('Прочитано книг', repTiles([[st.thisMonthBooks, 'за месяц'], [st.thisYearBooks, 'за год'], [st.totalFinished, 'за всё время']]) + `<div style="font-size:12px;color:#8b8b99;margin-top:8px;">Брошено: ${st.dropped}</div>`)}

    ${repSection('Серия дней', `<div style="display:flex;gap:10px;"><div style="flex:1;background:#1a1530;border-radius:12px;padding:13px;"><div style="font-size:22px;font-weight:700;">🔥 ${st.streak}</div><div style="font-size:11px;color:#8b8b99;margin-top:4px;">сейчас подряд</div></div><div style="flex:1;background:#1a1530;border-radius:12px;padding:13px;"><div style="font-size:22px;font-weight:700;">${st.streakRecord}</div><div style="font-size:11px;color:#8b8b99;margin-top:4px;">рекорд</div></div></div>`)}

    ${repSection(`Страниц по месяцам · ${st.year}`, `<div style="background:#1a1530;border-radius:12px;padding:14px 12px;">${repBars(pagesSeries, months)}</div>`)}

    ${repSection(`Книг по месяцам · ${st.year}`, `<div style="background:#1a1530;border-radius:12px;padding:14px 12px;">${repBars(booksSeries, months)}</div>`)}

    ${repSection('Когда читаешь', `<div style="background:#1a1530;border-radius:12px;padding:14px 12px;">
      <div style="display:flex;align-items:flex-end;gap:6px;height:80px;">${st.weekday.map((w) => `<div style="flex:1;height:${Math.max(4, Math.round((w.avg / wdMax) * 80))}px;background:${w.label === st.peakWd.label ? '#7c5cff' : '#3a3358'};border-radius:3px 3px 0 0;"></div>`).join('')}</div>
      <div style="display:flex;gap:6px;margin-top:6px;">${st.weekday.map((w) => `<div style="flex:1;text-align:center;font-size:9px;color:#6b6b85;">${w.label}</div>`).join('')}</div>
      <div style="font-size:11px;color:#b5a8ff;margin-top:8px;">Пик — ${st.peakWd.full}</div></div>`)}

    ${genres.length ? repSection('Жанры (по прочитанным)', genres.map((g, i) => `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px;"><span>${esc(g.name)}</span><span style="color:#8b8b99;">${g.count} · ${Math.round(g.pct * 100)}%</span></div>
      <div style="height:7px;background:#1a1530;border-radius:4px;overflow:hidden;"><div style="width:${(g.pct * 100).toFixed(0)}%;height:100%;background:${palette[i % palette.length]};"></div></div></div>`).join('')) : ''}

    ${st.ratedCount ? repSection('Распределение оценок', `<div style="background:#1a1530;border-radius:12px;padding:14px 12px;">
      <div style="display:flex;align-items:flex-end;gap:4px;height:60px;">${st.ratingDist.map((r) => `<div style="flex:1;height:${Math.max(3, Math.round((r.count / maxRating) * 100))}%;background:${r.score >= 8 ? '#7c5cff' : '#3a3358'};border-radius:2px 2px 0 0;"></div>`).join('')}</div>
      <div style="display:flex;gap:4px;margin-top:5px;">${st.ratingDist.map((r) => `<div style="flex:1;text-align:center;font-size:8px;color:#6b6b85;">${r.score}</div>`).join('')}</div>
      <div style="font-size:11px;color:#8b8b99;margin-top:8px;">Средняя — ${st.avgRating.toFixed(1)} / 10</div></div>`) : ''}

    ${st.topAuthors.length ? repSection('Топ авторов', `<div style="background:#1a1530;border-radius:12px;padding:6px 14px;font-size:13px;">${st.topAuthors.map((a, i) => `<div style="display:flex;justify-content:space-between;padding:7px 0;${i < st.topAuthors.length - 1 ? 'border-bottom:1px solid #2a2440;' : ''}"><span><b style="color:#b5a8ff;">${i + 1}</b>&nbsp;&nbsp;${esc(a.name)}</span><span style="color:#8b8b99;">${a.count} кн.</span></div>`).join('')}</div>`) : ''}

    ${repSection('Рекорды', `<div style="background:#1a1530;border-radius:12px;padding:6px 14px;font-size:12.5px;">
      ${st.bestBook ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #2a2440;"><span style="color:#8b8b99;">⭐ Лучшая оценка</span><span style="text-align:right;">«${esc(st.bestBook.title)}» · ${st.bestBook.rating}</span></div>` : ''}
      ${st.longestBook ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #2a2440;"><span style="color:#8b8b99;">📖 Самая длинная</span><span style="text-align:right;">«${esc(st.longestBook.title)}» · ${st.longestBook.total} стр.</span></div>` : ''}
      ${st.fastestBook ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #2a2440;"><span style="color:#8b8b99;">⚡ Самая быстрая</span><span style="text-align:right;">«${esc(st.fastestBook.book.title)}» · ${Math.round(st.fastestBook.ppd)} стр./день</span></div>` : ''}
      ${st.recordMonth ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;"><span style="color:#8b8b99;">🏆 Рекордный месяц</span><span style="text-align:right;">${st.recordMonth.label} ${st.recordMonth.year} · ${fmt(st.recordMonth.pages)} стр.</span></div>` : ''}
    </div>`)}

    ${repSection('Цель года', `<div style="background:#1a1530;border-radius:12px;padding:14px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;"><span>${st.thisYearBooks} из ${st.goal} книг</span><span style="color:#b5a8ff;">${goalPct}%</span></div>
      <div style="height:8px;background:#0f0b1e;border-radius:4px;overflow:hidden;"><div style="width:${goalPct}%;height:100%;background:#7c5cff;"></div></div>
      <div style="font-size:11px;color:#8b8b99;margin-top:8px;">При текущем темпе за год — около ${st.projectedYear} книг</div></div>`)}

    ${st.insights.length ? repSection('Наблюдения', st.insights.map((i) => `<div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:9px;font-size:13px;line-height:1.45;"><span>•</span><span>${i.html}</span></div>`).join('')) : ''}

    <div style="text-align:center;font-size:11px;color:#55556a;margin-top:8px;">Сформировано в приложении «Дневник чтения» · elina-chertova.github.io/reading-diary</div>`;
}

// Собрать полный отчёт, отрендерить и сохранить PDF.
export async function exportStatsPDF(st, { onStatus } = {}) {
  if (!st.totalFinished && !st.allTimePages) { onStatus && onStatus('Сначала добавьте книги'); return; }
  onStatus && onStatus('Готовлю PDF…');
  const report = document.createElement('div');
  report.style.cssText = 'position:fixed;left:-10000px;top:0;width:680px;background:#0f0b1e;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;';
  report.innerHTML = buildReportHTML(st);
  document.body.appendChild(report);
  try {
    const [h2c, ns] = await Promise.all([loadLib(), loadJsPDF()]);
    const canvas = await h2c(report, { backgroundColor: '#0f0b1e', scale: 2, logging: false });
    report.remove();
    const jsPDF = ns.jsPDF;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const fillDark = () => { pdf.setFillColor(15, 11, 30); pdf.rect(0, 0, pageW, pageH, 'F'); };
    // нарезаем холст на страницы (каждый кусок встраиваем ОДИН раз, JPEG — без раздувания файла)
    const sliceMaxPx = Math.floor(canvas.width * (pageH / pageW));
    let rendered = 0, first = true;
    while (rendered < canvas.height) {
      const sliceH = Math.min(sliceMaxPx, canvas.height - rendered);
      const pc = document.createElement('canvas');
      pc.width = canvas.width; pc.height = sliceH;
      const ctx = pc.getContext('2d');
      ctx.fillStyle = '#0f0b1e'; ctx.fillRect(0, 0, pc.width, pc.height);
      ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (!first) pdf.addPage();
      fillDark();
      pdf.addImage(pc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, sliceH * (pageW / canvas.width));
      rendered += sliceH; first = false;
    }
    const blob = pdf.output('blob');
    const file = new File([blob], 'статистика-чтения.pdf', { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch { /* отмена */ }
      onStatus && onStatus('');
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
      onStatus && onStatus('PDF сохранён');
    }
  } catch (e) {
    report.remove();
    console.warn('pdf error', e);
    onStatus && onStatus('Не удалось создать PDF');
  }
}

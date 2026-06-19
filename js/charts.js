// Графики на чистом SVG/HTML — без зависимостей.
import { monthShort } from './stats.js';

// Линейный график по 12 месяцам (или произвольным значениям).
// selected — индекс выделенной точки (по тапу): рисуем маркер и значение.
export function lineChart(values, { labels = null, height = 150, selected = null } = {}) {
  const W = 300, H = height, padL = 8, padR = 8, padT = 22, padB = 22;
  const max = Math.max(1, ...values);
  const n = values.length;
  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid = [0.5, 1].map((g) => {
    const gy = padT + (1 - g) * (H - padT - padB);
    return `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" stroke="#232330" stroke-width="1"/>`;
  }).join('');
  const dots = values.map((v, i) => v > 0 ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="#b5a8ff"/>` : '').join('');
  const lab = (labels || values.map((_, i) => monthShort(i)));
  const labelEls = lab.map((t, i) => (i % 2 === 0 || n <= 6)
    ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" font-size="9" fill="#8b8b99" text-anchor="middle">${t}</text>` : '').join('');
  const base = (H - padB).toFixed(1);
  const area = `${x(0).toFixed(1)},${base} ${pts} ${x(n - 1).toFixed(1)},${base}`;
  const seg = (W - padL - padR) / Math.max(1, n - 1);
  const hits = values.map((v, i) => `<rect class="hit" data-l="${lab[i]}" data-v="${Math.round(v)}" x="${(x(i) - seg / 2).toFixed(1)}" y="0" width="${seg.toFixed(1)}" height="${H}" fill="transparent" pointer-events="all" style="cursor:pointer"/>`).join('');
  let marker = '';
  if (selected != null && values[selected] != null) {
    const mx = x(selected), my = y(values[selected]);
    const lx = Math.max(20, Math.min(W - 20, mx));
    marker = `<line x1="${mx.toFixed(1)}" y1="${padT}" x2="${mx.toFixed(1)}" y2="${base}" stroke="#7c5cff" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5.5" fill="#7c5cff" stroke="#fff" stroke-width="2"/>
      <text x="${lx.toFixed(1)}" y="${Math.max(12, my - 11).toFixed(1)}" font-size="12" font-weight="600" fill="#b5a8ff" text-anchor="middle">${Math.round(values[selected]).toLocaleString('ru-RU')}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="График по месяцам">
    ${grid}
    <polygon points="${area}" fill="#7c5cff" opacity="0.08"/>
    <polyline points="${pts}" fill="none" stroke="#7c5cff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labelEls}${marker}${hits}
  </svg>`;
}

// Столбики (например, книги по месяцам). selected — выделенный столбец.
export function barChart(values, { labels = null, height = 150, selected = null } = {}) {
  const W = 300, H = height, padB = 22, padT = 18, gap = 4;
  const max = Math.max(1, ...values);
  const n = values.length;
  const bw = (W - gap * (n - 1)) / n;
  const lab = labels || values.map((_, i) => monthShort(i));
  const bars = values.map((v, i) => {
    const h = (v / max) * (H - padT - padB);
    const x = i * (bw + gap);
    const y = H - padB - h;
    const color = i === selected ? '#b5a8ff' : (v > 0 ? '#7c5cff' : '#232330');
    let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, h).toFixed(1)}" rx="3" fill="${color}"/>`;
    if (i === selected) out += `<text x="${(x + bw / 2).toFixed(1)}" y="${Math.max(12, y - 5).toFixed(1)}" font-size="12" font-weight="600" fill="#b5a8ff" text-anchor="middle">${Math.round(v)}</text>`;
    if (i % 2 === 0 || n <= 6) out += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" font-size="9" fill="#8b8b99" text-anchor="middle">${lab[i]}</text>`;
    return out;
  }).join('');
  const hits = values.map((v, i) => {
    const x = i * (bw + gap);
    return `<rect class="hit" data-l="${lab[i]}" data-v="${Math.round(v)}" x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H}" fill="transparent" pointer-events="all" style="cursor:pointer"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Столбчатый график">${bars}${hits}</svg>`;
}

// Кольцо прогресса
export function ring(pct, { size = 54, stroke = 6, color = '#7c5cff', track = '#2a2a33' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  const cx = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${cx} ${cx})"/>
  </svg>`;
}

// Тепловая карта последних N недель
export function heatmap(tracker, weeks = 18) {
  const byDate = {};
  tracker.forEach((t) => { byDate[t.date] = t.pages; });
  const days = weeks * 7;
  const end = new Date();
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const p = byDate[iso] || 0;
    let bg = '#222229';
    if (p > 0 && p < 30) bg = '#3a2f6b';
    else if (p >= 30 && p < 80) bg = '#5a47b5';
    else if (p >= 80 && p < 150) bg = '#7c5cff';
    else if (p >= 150) bg = '#b5a8ff';
    cells.push(`<i data-iso="${iso}" data-pages="${p}" style="background:${bg};cursor:pointer"></i>`);
  }
  return `<div class="heat">${cells.join('')}</div>`;
}

// Горизонтальная полоса по жанрам + легенда
export function genreBreakdown(genres) {
  if (!genres.length) return '<div class="muted" style="font-size:13px">Пока нет прочитанных книг</div>';
  const palette = ['#7c5cff', '#1d9e75', '#d4537e', '#ba7517', '#185fa5', '#444441'];
  const top = genres.slice(0, 5);
  const restPct = genres.slice(5).reduce((s, g) => s + g.pct, 0);
  const segs = top.map((g, i) => `<i style="width:${(g.pct * 100).toFixed(1)}%;background:${palette[i]}"></i>`).join('') +
    (restPct > 0 ? `<i style="width:${(restPct * 100).toFixed(1)}%;background:${palette[5]}"></i>` : '');
  const legend = top.map((g, i) =>
    `<div class="leg"><span class="dot" style="background:${palette[i]}"></span><span class="muted">${g.name}</span><span style="margin-left:auto">${Math.round(g.pct * 100)}%</span></div>`).join('') +
    (restPct > 0 ? `<div class="leg"><span class="dot" style="background:${palette[5]}"></span><span class="muted">Другое</span><span style="margin-left:auto">${Math.round(restPct * 100)}%</span></div>` : '');
  return `<div class="genrebar">${segs}</div><div class="genre-legend">${legend}</div>`;
}

// Столбики по дням недели
export function weekdayBars(weekday, peakLabel) {
  const max = Math.max(1, ...weekday.map((w) => w.avg));
  const bars = weekday.map((w) =>
    `<div class="wb ${w.label === peakLabel ? 'peak' : ''}" style="height:${Math.max(6, (w.avg / max) * 100).toFixed(0)}%"></div>`).join('');
  const labels = weekday.map((w) => `<span${w.label === peakLabel ? ' style="color:var(--acc-2)"' : ''}>${w.label}</span>`).join('');
  return `<div class="wbars">${bars}</div><div class="wlabels">${labels}</div>`;
}

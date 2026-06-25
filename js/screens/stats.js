import { getBooks, getTracker, getSettings, setSettings } from '../store.js';
import { computeStats, plural, monthShort } from '../stats.js';
import { lineChart, barChart, ring, weekdayBars, genreBreakdown } from '../charts.js';
import { navBar, esc, fmtNum, sheet, toast, coverHTML, monthName, go } from '../ui.js';
import { refresh } from '../actions.js';
import { shareStats } from '../share.js';

let tab = 'pages';
let pagesMode = 'months';
let insightsOpen = false;

// Рисует график в карточку и вешает тапы: по тапу выделяет точку и показывает значение.
function drawChart(card, type, series, labels, unit) {
  const area = card.querySelector('.chart-area');
  const readout = card.querySelector('.chart-readout');
  const render = (selected) => {
    area.innerHTML = type === 'bar' ? barChart(series, { labels, selected }) : lineChart(series, { labels, selected });
    if (selected != null) {
      const v = series[selected];
      const label = (labels || series.map((_, i) => monthShort(i)))[selected];
      const u = unit === 'books' ? plural(v, 'книга', 'книги', 'книг') : plural(v, 'страница', 'страницы', 'страниц');
      readout.style.color = 'var(--acc-2)';
      readout.textContent = `${label}: ${v.toLocaleString('ru-RU')} ${u}`;
    }
    area.querySelectorAll('.hit').forEach((hit, i) => hit.addEventListener('click', () => render(i)));
  };
  render(null);
}

export async function stats() {
  const [books, tracker, settings] = await Promise.all([getBooks(), getTracker(), getSettings()]);
  const st = computeStats(books, tracker, settings);

  const insightsHTML = st.insights.map((i) =>
    `<div class="card insight"><div class="ic"><i class="ti ${i.icon}"></i></div><div class="tx">${i.html}</div></div>`).join('');

  const html = `
    <div class="screen">
      <div class="topbar"><h1>Статистика</h1>
        <div class="topbar-actions">
          <span class="pill">${st.year}</span>
          <button class="iconbtn" id="st-share" aria-label="Поделиться"><i class="ti ti-share"></i></button>
        </div>
      </div>
      <div class="content">
        <button class="collapse-head ${insightsOpen ? 'open' : ''}" id="ins-toggle">
          <i class="ti ti-bulb lead"></i> Наблюдения <span class="cnt">${st.insights.length}</span>
          <i class="ti ti-chevron-down chev"></i>
        </button>
        <div class="stack" id="ins-body" style="margin-top:10px;margin-bottom:6px;display:${insightsOpen ? 'block' : 'none'}">${insightsHTML}</div>
        <div class="seg" id="st-tabs" style="margin:18px 0 14px">
          <button data-tab="books" class="${tab === 'books' ? 'on' : ''}">Книги</button>
          <button data-tab="pages" class="${tab === 'pages' ? 'on' : ''}">Страницы</button>
          <button data-tab="goal" class="${tab === 'goal' ? 'on' : ''}">Цель</button>
        </div>
        <div id="st-body"></div>
      </div>
      ${navBar('stats')}
    </div>`;

  const body = (st_) => {
    if (tab === 'pages') return pagesTab(st);
    if (tab === 'books') return booksTab(st);
    return goalTab(st);
  };

  const mount = (root) => {
    const renderBody = () => { root.querySelector('#st-body').innerHTML = body(st); wireBody(root, st); };
    renderBody();
    const insToggle = root.querySelector('#ins-toggle');
    const insBody = root.querySelector('#ins-body');
    insToggle.addEventListener('click', () => {
      insightsOpen = !insightsOpen;
      insBody.style.display = insightsOpen ? 'block' : 'none';
      insToggle.classList.toggle('open', insightsOpen);
    });
    root.querySelectorAll('#st-tabs button').forEach((btn) => btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      root.querySelectorAll('#st-tabs button').forEach((x) => x.classList.toggle('on', x === btn));
      renderBody();
    }));
    root.querySelector('#st-share').addEventListener('click', () => shareStats(st, { onStatus: (m) => m && toast(m) }));
  };

  return { html, mount };
}

function pagesTab(st) {
  const years = st.years;
  const series = pagesMode === 'months' ? st.monthlyPages(st.year) : st.yearlyPages.map((y) => y.pages);
  const labels = pagesMode === 'months' ? null : st.yearlyPages.map((y) => String(y.year));
  return `
    <div class="card wrapped" style="background:#1a1530;text-align:left;padding:16px">
      <div class="muted" style="font-size:12px">За всё время</div>
      <div class="row" style="gap:18px;margin-top:6px">
        <div><div style="font-size:28px;font-weight:700;color:var(--acc-2)">${fmtNum(st.allTimePages)}</div><div class="muted" style="font-size:12px">страниц</div></div>
        <div><div style="font-size:28px;font-weight:700">${st.totalFinished}</div><div class="muted" style="font-size:12px">книг прочитано</div></div>
      </div>
    </div>
    <div class="tiles" style="margin-top:12px">
      <div class="tile"><div class="v">${fmtNum(st.thisMonthPages)}</div><div class="l">в этом месяце</div></div>
      <div class="tile"><div class="v">${fmtNum(st.thisYearPages)}</div><div class="l">в этом году</div></div>
      <div class="tile"><div class="v">${fmtNum(st.avgPerMonth)}</div><div class="l">в среднем/мес</div></div>
    </div>
    <div class="seg" id="st-pmode" style="margin:14px 0 10px;max-width:240px">
      <button data-pmode="months" class="${pagesMode === 'months' ? 'on' : ''}">По месяцам</button>
      <button data-pmode="years" class="${pagesMode === 'years' ? 'on' : ''}">По годам</button>
    </div>
    <div class="card" data-unit="pages" id="chart-pages"><div class="chart-area"></div><div class="chart-readout"><i class="ti ti-hand-finger"></i> Нажми на точку — покажет страницы</div></div>
    <div class="card" style="margin-top:12px">
      <div class="spread" style="margin-bottom:12px"><span class="muted" style="font-size:12px">Когда читаешь</span><span style="font-size:11px;color:var(--acc-2)">пик — ${st.peakWd.label}</span></div>
      ${weekdayBars(st.weekday, st.peakWd.label)}
    </div>`;
}

function booksTab(st) {
  const series = st.monthlyBooks(st.year);
  const authors = st.topAuthors;
  const maxRating = Math.max(1, ...st.ratingDist.map((r) => r.count));
  return `
    <div class="tiles">
      <div class="tile"><div class="v">${st.thisYearBooks}</div><div class="l">в этом году</div></div>
      <div class="tile"><div class="v">${st.totalFinished}</div><div class="l">всего</div></div>
      <div class="tile"><div class="v">${st.dropped}</div><div class="l">брошено</div></div>
    </div>
    <div class="card" data-unit="books" id="chart-books" style="margin-top:12px"><div class="muted" style="font-size:12px;margin-bottom:8px">Книг по месяцам · ${st.year}</div><div class="chart-area"></div><div class="chart-readout"><i class="ti ti-hand-finger"></i> Нажми на столбец — покажет книги</div></div>
    <div class="card" style="margin-top:12px">
      <div class="muted" style="font-size:12px;margin-bottom:11px">По жанрам</div>
      ${genreBreakdown(st.genres)}
    </div>
    ${authors.length ? `<div class="card" style="margin-top:12px">
      <div class="muted" style="font-size:12px;margin-bottom:11px">Топ-3 автора</div>
      ${authors.map((a, i) => `<div class="spread" style="padding:6px 0${i ? ';border-top:.5px solid var(--line)' : ''}">
        <span><span style="color:var(--acc-2);font-weight:600;margin-right:8px">${i + 1}</span>${esc(a.name)}</span>
        <span class="muted">${a.count} ${plural(a.count, 'книга', 'книги', 'книг')}</span></div>`).join('')}
    </div>` : ''}
    ${st.ratedCount ? `<div class="card" style="margin-top:12px">
      <div class="spread" style="margin-bottom:11px"><span class="muted" style="font-size:12px">Оценки</span><span style="font-size:12px;color:var(--acc-2)">средняя ${st.avgRating.toFixed(1)}/10</span></div>
      <div class="wbars" style="height:50px">${st.ratingDist.map((r) => `<div class="wb" style="height:${Math.max(4, (r.count / maxRating) * 100)}%;background:${r.score >= 8 ? 'var(--acc)' : '#3a3358'}"></div>`).join('')}</div>
      <div class="wlabels">${st.ratingDist.map((r) => `<span>${r.score}</span>`).join('')}</div>
    </div>` : ''}
    ${st.bestBook || st.longestBook || st.fastestBook ? `<div class="sectlabel">Рекорды</div><div class="card kv">
      ${st.bestBook ? `<div><span class="muted">Лучшая оценка</span><span>«${esc(st.bestBook.title)}» · ${st.bestBook.rating}/10</span></div>` : ''}
      ${st.longestBook ? `<div><span class="muted">Самая длинная</span><span>«${esc(st.longestBook.title)}» · ${st.longestBook.total} стр.</span></div>` : ''}
      ${st.fastestBook ? `<div><span class="muted">Самая быстрая</span><span>«${esc(st.fastestBook.book.title)}» · ${Math.round(st.fastestBook.ppd)} стр./день</span></div>` : ''}
      ${st.recordMonth ? `<div><span class="muted">Рекордный месяц</span><span>${st.recordMonth.label} ${st.recordMonth.year} · ${fmtNum(st.recordMonth.pages)} стр.</span></div>` : ''}
    </div>` : ''}`;
}

function goalTab(st) {
  const pct = Math.min(100, (st.thisYearBooks / st.goal) * 100);
  const ahead = st.goalDiff >= 0;
  const diffAbs = Math.abs(Math.round(st.goalDiff));
  return `
    <div class="card tac" style="padding:22px">
      <div style="display:inline-block">${ring(pct, { size: 132, stroke: 12 })}</div>
      <div style="margin-top:-86px;margin-bottom:60px"><div style="font-size:30px;font-weight:700;color:var(--acc-2)">${st.thisYearBooks}</div><div class="muted" style="font-size:12px">из ${st.goal}</div></div>
      <div style="font-size:14px">${ahead
        ? `Ты <b style="color:var(--acc-2)">опережаешь план</b> на ${diffAbs} ${plural(diffAbs, 'книгу', 'книги', 'книг')} 🎯`
        : `Чтобы успеть, нужно ещё ${diffAbs} ${plural(diffAbs, 'книгу', 'книги', 'книг')} к графику`}</div>
      <div class="muted" style="font-size:13px;margin-top:8px">При текущем темпе за год — около <b style="color:var(--txt)">${st.projectedYear}</b> ${plural(st.projectedYear, 'книги', 'книг', 'книг')}</div>
      <button class="btn sec sm" id="goal-edit" style="margin:18px auto 0"><i class="ti ti-edit"></i> Изменить цель</button>
    </div>`;
}

function wireBody(root, st) {
  // графики: рисуем и делаем нажимаемыми (тап выделяет точку и показывает значение)
  const pagesCard = root.querySelector('#chart-pages');
  if (pagesCard) {
    const series = pagesMode === 'months' ? st.monthlyPages(st.year) : st.yearlyPages.map((y) => y.pages);
    const labels = pagesMode === 'months' ? null : st.yearlyPages.map((y) => String(y.year));
    drawChart(pagesCard, 'line', series, labels, 'pages');
  }
  const booksCard = root.querySelector('#chart-books');
  if (booksCard) drawChart(booksCard, 'bar', st.monthlyBooks(st.year), null, 'books');

  root.querySelectorAll('#st-pmode button').forEach((btn) => btn.addEventListener('click', () => {
    pagesMode = btn.dataset.pmode;
    root.querySelector('#st-body').innerHTML = pagesTab(st); wireBody(root, st);
  }));
  root.querySelector('#goal-edit')?.addEventListener('click', () => {
    const { el, close } = sheet(`<h3>Цель на год</h3>
      <div class="muted" style="font-size:13px;margin:4px 0 12px">Сколько книг хочешь прочитать за год?</div>
      <input class="input" id="goal-val" type="number" inputmode="numeric" value="${st.goal}" style="text-align:center;font-size:20px" />
      <button class="btn" id="goal-save" style="margin-top:14px">Сохранить</button>`);
    el.querySelector('#goal-save').addEventListener('click', async () => {
      const v = Math.max(1, Number(el.querySelector('#goal-val').value) || st.goal);
      await setSettings({ yearGoalBooks: v }); close(); toast('Цель обновлена'); setTimeout(refresh, 50);
    });
  });
}

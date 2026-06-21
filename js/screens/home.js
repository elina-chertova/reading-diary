import { getBooks, getTracker, getSettings } from '../store.js';
import { computeStats, predictFinish, plural } from '../stats.js';
import { ring, heatmap } from '../charts.js';
import { coverHTML, progress, navBar, esc, fmtNum, go, toast, fmtDateShort } from '../ui.js';
import { openLogPages } from '../actions.js';

export async function home() {
  const [books, tracker, settings] = await Promise.all([getBooks(), getTracker(), getSettings()]);
  const st = computeStats(books, tracker, settings);

  const reading = books.filter((b) => b.status === 'Читаю')
    .sort((a, b) => String(b.lastRead || b.dateStart || '').localeCompare(String(a.lastRead || a.dateStart || '')));
  const hero = reading[0];
  const goalPct = Math.min(100, (st.thisYearBooks / st.goal) * 100);

  let heroHTML;
  if (hero) {
    const pct = progress(hero);
    const pred = predictFinish(hero);
    heroHTML = `
      <div class="card hero" data-book="${hero.id}">
        ${coverHTML(hero)}
        <div class="hero-info">
          <div class="muted" style="font-size:12px">Продолжить · ${hero.current || 0} стр.</div>
          <div class="serif" style="font-size:16px;font-weight:500;margin:3px 0 9px;line-height:1.2">${esc(hero.title)}</div>
          <div class="bar"><span style="width:${pct}%"></span></div>
          <div style="font-size:12px;color:var(--acc-2);margin-top:7px">${pct}%${pred ? ` · осталось ~${pred.daysLeft} ${plural(pred.daysLeft, 'день', 'дня', 'дней')}` : ''}</div>
          <button class="btn sm" id="hero-add" style="margin-top:10px"><i class="ti ti-plus"></i> страницы</button>
        </div>
      </div>`;
  } else {
    heroHTML = `<div class="card tac" style="padding:26px 16px">
      <i class="ti ti-book" style="font-size:32px;color:var(--faint)"></i>
      <div style="margin:10px 0 14px;font-size:14px" class="muted">Нет книг в процессе чтения</div>
      <button class="btn sm" data-go="#/add" style="margin:0 auto"><i class="ti ti-plus"></i> Добавить книгу</button>
    </div>`;
  }

  const html = `
    <div class="screen">
      <div class="topbar">
        <div><div class="sub">с возвращением</div><h1>Сегодня</h1></div>
        <div class="topbar-actions">
          <span class="pill acc" title="Серия дней подряд"><i class="ti ti-flame"></i> ${st.streak} ${plural(st.streak, 'день', 'дня', 'дней')}</span>
          <button class="iconbtn" data-go="#/settings"><i class="ti ti-settings"></i></button>
        </div>
      </div>
      <div class="content stack">
        ${heroHTML}
        <div class="tiles">
          <div class="tile"><div class="v">${fmtNum(st.thisMonthPages)}</div><div class="l">стр. за месяц</div></div>
          <div class="tile"><div class="v">${st.thisYearBooks}</div><div class="l">книг в году</div></div>
          <div class="tile"><div class="v">${st.totalFinished}</div><div class="l">всего</div></div>
        </div>
        <div class="card ringwrap" data-go="#/stats">
          ${ring(goalPct)}
          <div>
            <div style="font-weight:500">Цель года</div>
            <div class="muted" style="font-size:13px">${st.thisYearBooks} из ${st.goal} книг · ${Math.round(goalPct)}%</div>
          </div>
          <i class="ti ti-chevron-right muted" style="margin-left:auto"></i>
        </div>
        <div class="card">
          <div class="spread" style="margin-bottom:11px"><span class="muted" style="font-size:12px">Дни чтения</span><span style="font-size:11px;color:var(--acc-2)">серия ${st.streak} · рекорд ${st.streakRecord}</span></div>
          ${heatmap(tracker)}
        </div>
      </div>
      ${navBar('')}
    </div>`;

  const mount = (root) => {
    root.querySelector('#hero-add')?.addEventListener('click', (e) => { e.stopPropagation(); openLogPages(hero); });
    root.querySelector('.hero')?.addEventListener('click', () => go(`#/book/${hero.id}`));
    root.querySelectorAll('.heat i').forEach((cell) => cell.addEventListener('click', () => {
      const p = Number(cell.dataset.pages);
      toast(p > 0 ? `${fmtDateShort(cell.dataset.iso)} — ${fmtNum(p)} стр.` : `${fmtDateShort(cell.dataset.iso)} — без чтения`);
    }));
  };
  return { html, mount };
}

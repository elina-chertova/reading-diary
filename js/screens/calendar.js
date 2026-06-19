import { getTracker, getSettings, setSettings, setDayPages } from '../store.js';
import { navBar, monthNom, monthName, fmtNum, sheet, toast } from '../ui.js';
import { refresh } from '../actions.js';

let viewYear = null, viewMonth = null;

export async function calendar() {
  const [tracker, settings] = await Promise.all([getTracker(), getSettings()]);
  const byDate = {};
  tracker.forEach((t) => { byDate[t.date] = t.pages; });
  const dailyGoal = settings.dailyGoalPages || 10;

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (viewYear === null) { viewYear = now.getFullYear(); viewMonth = now.getMonth(); }

  const html = `
    <div class="screen">
      <div class="topbar"><h1>Трекер</h1>
        <div class="topbar-actions"><button class="iconbtn" data-go="#/settings"><i class="ti ti-settings"></i></button></div>
      </div>
      <div class="content"><div id="cal-body"></div></div>
      ${navBar('calendar')}
    </div>`;

  const renderCal = (root) => {
    const first = new Date(viewYear, viewMonth, 1);
    const startWd = (first.getDay() + 6) % 7; // пн=0
    const daysIn = new Date(viewYear, viewMonth + 1, 0).getDate();
    let monthPages = 0, daysRead = 0, daysHitGoal = 0;
    const cells = [];
    for (let i = 0; i < startWd; i++) cells.push('<div class="cal-empty"></div>');
    for (let d = 1; d <= daysIn; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const p = byDate[iso] || 0;
      const isFuture = iso > todayISO;
      const isToday = iso === todayISO;
      monthPages += p;
      if (p > 0) daysRead++;
      if (p >= dailyGoal) daysHitGoal++;
      // число страниц прямо в дне: синим если норма выполнена, красным если нет
      let numHTML = '';
      if (!isFuture) {
        const cls = p >= dailyGoal ? 'hit' : 'miss';
        numHTML = `<span class="cal-p ${cls}">${p}</span>`;
      }
      cells.push(`<div class="cal-cell${isToday ? ' today' : ''}" data-iso="${iso}" data-pages="${p}" data-day="${d}">
        <span class="cal-d">${d}</span>${numHTML}</div>`);
    }
    root.querySelector('#cal-body').innerHTML = `
      <div class="card">
        <div class="spread" style="margin-bottom:14px">
          <button class="iconbtn ghost" data-nav="-1"><i class="ti ti-chevron-left"></i></button>
          <div style="font-weight:600;font-size:16px">${monthNom(viewMonth)} ${viewYear}</div>
          <button class="iconbtn ghost" data-nav="1"><i class="ti ti-chevron-right"></i></button>
        </div>
        <div class="cal-grid-head">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid cal-num">${cells.join('')}</div>
      </div>
      <button class="card cal-goal" id="cal-goal">Моя цель — <b>${dailyGoal}</b> стр. в день <i class="ti ti-edit"></i></button>
      <div class="tiles" style="margin-top:12px">
        <div class="tile"><div class="v">${fmtNum(monthPages)}</div><div class="l">страниц за месяц</div></div>
        <div class="tile"><div class="v">${daysHitGoal}</div><div class="l">дней с нормой</div></div>
      </div>`;
    // тап по дню — вписать/поправить страницы за этот день
    root.querySelectorAll('.cal-cell').forEach((cell) => cell.addEventListener('click', () => {
      const iso = cell.dataset.iso;
      const day = Number(cell.dataset.day);
      const cur = Number(cell.dataset.pages);
      const { el, close } = sheet(`<h3>${day} ${monthName(viewMonth)} ${viewYear}</h3>
        <div class="muted" style="font-size:13px;margin:4px 0 12px">Сколько страниц прочитано в этот день?</div>
        <input class="input" id="day-val" type="number" inputmode="numeric" min="0" value="${cur}" style="text-align:center;font-size:20px" />
        <button class="btn" id="day-save" style="margin-top:14px">Сохранить</button>`);
      el.querySelector('#day-val').focus();
      el.querySelector('#day-save').addEventListener('click', async () => {
        const v = Math.max(0, Number(el.querySelector('#day-val').value) || 0);
        await setDayPages(iso, v); close(); toast('Сохранено');
        byDate[iso] = v; renderCal(root);
      });
    }));
    root.querySelector('#cal-goal').addEventListener('click', () => {
      const { el, close } = sheet(`<h3>Дневная цель</h3>
        <div class="muted" style="font-size:13px;margin:4px 0 12px">Сколько страниц в день хочешь читать?</div>
        <input class="input" id="dg-val" type="number" inputmode="numeric" value="${dailyGoal}" style="text-align:center;font-size:20px" />
        <button class="btn" id="dg-save" style="margin-top:14px">Сохранить</button>`);
      el.querySelector('#dg-save').addEventListener('click', async () => {
        const v = Math.max(1, Number(el.querySelector('#dg-val').value) || dailyGoal);
        await setSettings({ dailyGoalPages: v }); close(); toast('Цель обновлена'); setTimeout(refresh, 50);
      });
    });
    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      viewMonth += Number(b.dataset.nav);
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCal(root);
    }));
  };

  return { html, mount: renderCal };
}

// Общие действия над книгой (отметить прогресс), используются на нескольких экранах.
import { setBookProgress } from './store.js';
import { sheet, toast, esc, progress } from './ui.js';

export function refresh() { if (window.__refresh) window.__refresh(); }

export function openLogPages(book) {
  const unit = book.unit === 'chapters' ? 'глав' : 'стр.';
  const max = book.total || 9999;
  const { el, close } = sheet(`
    <h3>«${esc(book.title)}»</h3>
    <div class="muted" style="font-size:13px;margin-bottom:14px">Сейчас: ${book.current || 0} из ${book.total || '—'} ${unit}</div>
    <div class="row" style="gap:10px">
      <input class="input" id="lp-val" type="number" inputmode="numeric" min="0" max="${max}" value="${book.current || 0}" style="text-align:center;font-size:18px" />
    </div>
    <div class="chips" style="margin-top:12px;justify-content:center">
      <button class="chip" data-add="10">+10</button>
      <button class="chip" data-add="25">+25</button>
      <button class="chip" data-add="50">+50</button>
      <button class="chip" data-done>Дочитал(а)</button>
    </div>
    <button class="btn" id="lp-save" style="margin-top:16px">Сохранить</button>
  `);
  const input = el.querySelector('#lp-val');
  el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    input.value = Math.min(max, (Number(input.value) || 0) + Number(b.dataset.add));
  }));
  el.querySelector('[data-done]')?.addEventListener('click', () => { input.value = book.total || input.value; });
  el.querySelector('#lp-save').addEventListener('click', async () => {
    const v = Math.max(0, Number(input.value) || 0);
    await setBookProgress(book, v);
    close();
    const done = book.total && v >= book.total;
    toast(done ? 'Книга прочитана! 🎉' : 'Прогресс сохранён');
    setTimeout(refresh, 60);
  });
}

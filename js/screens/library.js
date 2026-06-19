import { getBooks } from '../store.js';
import { coverHTML, progress, navBar, esc, go, STATUSES, fmtDateShort, readingDays } from '../ui.js';
import { plural } from '../stats.js';
import { openLogPages } from '../actions.js';

function metaLine(b) {
  const days = readingDays(b);
  const dstr = days ? ` · ${days} ${plural(days, 'день', 'дня', 'дней')}` : '';
  if (b.status === 'Прочитано') {
    const rating = b.rating ? ` · <span class="gold-star"><i class="ti ti-star"></i> ${b.rating}</span>` : '';
    return `<i class="ti ti-check" style="color:var(--green)"></i> ${fmtDateShort(b.dateEnd || b.dateStart)}${dstr}${rating}`;
  }
  if (b.status === 'Читаю') return `<i class="ti ti-book"></i> с ${fmtDateShort(b.dateStart)}${dstr}`;
  if (b.status === 'Брошено') return `Брошено${dstr}`;
  return `<i class="ti ti-bookmark"></i> В планах`;
}

let filter = 'Все';
let query = '';

export async function library() {
  const books = await getBooks();

  const chips = ['Все', ...STATUSES];
  const html = `
    <div class="screen">
      <div class="topbar">
        <h1>Мои книги</h1>
        <div class="topbar-actions">
          <button class="iconbtn" id="lib-search-btn"><i class="ti ti-search"></i></button>
        </div>
      </div>
      <div class="content">
        <div id="lib-search-wrap" style="display:${query ? 'block' : 'none'};margin-bottom:12px">
          <input class="input" id="lib-search" placeholder="Поиск по названию или автору" value="${esc(query)}" />
        </div>
        <div class="chips" id="lib-chips" style="margin-bottom:14px">
          ${chips.map((c) => `<button class="chip ${c === filter ? 'on' : ''}" data-filter="${c}">${c}</button>`).join('')}
        </div>
        <div id="lib-grid"></div>
      </div>
      <button class="fab" data-go="#/add"><i class="ti ti-plus"></i></button>
      ${navBar('library')}
    </div>`;

  const renderGrid = (root) => {
    let list = books;
    if (filter !== 'Все') list = list.filter((b) => b.status === filter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((b) => (b.title + ' ' + b.author).toLowerCase().includes(q));
    }
    // дата для группировки: завершение (если прочитана) или начало
    const refDate = (b) => b.dateEnd || b.dateStart || null;
    // сортируем по дате — новые сверху; без даты — в конец
    list = [...list].sort((a, b) => String(refDate(b) || '').localeCompare(String(refDate(a) || '')));

    const grid = root.querySelector('#lib-grid');
    if (!list.length) {
      grid.innerHTML = books.length === 0
        ? `<div class="empty">
            <i class="ti ti-books"></i>
            <div style="font-size:17px;color:var(--txt);margin-bottom:6px">Здесь будут ваши книги</div>
            <div style="margin-bottom:20px">Добавьте первую книгу или загрузите сохранённую базу</div>
            <button class="btn sm" data-go="#/add" style="margin:0 auto 10px"><i class="ti ti-plus"></i> Добавить книгу</button>
            <button class="btn sec sm" data-go="#/settings" style="margin:0 auto"><i class="ti ti-upload"></i> Загрузить базу</button>
          </div>`
        : `<div class="empty"><i class="ti ti-books"></i>Ничего не найдено</div>`;
      return;
    }
    // разбивка по годам с заголовками
    let lastYear = null;
    const rows = list.map((b) => {
      const rd = refDate(b);
      const yearLabel = rd ? new Date(rd).getFullYear() : 'Без даты';
      let head = '';
      if (yearLabel !== lastYear) { head = `<div class="year-head">${yearLabel}</div>`; lastYear = yearLabel; }
      return `${head}
        <div class="lrow" data-book="${b.id}">
          ${coverHTML(b)}
          <div class="lr-main">
            <div class="lr-title">${esc(b.title)}</div>
            <div class="lr-author">${esc(b.author)}</div>
            <div class="lr-meta">${metaLine(b)}</div>
            ${b.status === 'Читаю' || b.status === 'Брошено' ? `<div class="bar lr-bar"><span style="width:${progress(b)}%"></span></div>` : ''}
          </div>
          <button class="lrow-edit" data-edit="${b.id}" aria-label="Изменить прогресс"><i class="ti ti-edit"></i></button>
        </div>`;
    }).join('');
    grid.innerHTML = `<div class="list">${rows}</div>`;
    grid.querySelectorAll('.lrow').forEach((c) => c.addEventListener('click', () => go(`#/book/${c.dataset.book}`)));
    grid.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = books.find((x) => x.id === Number(btn.dataset.edit));
      if (b) openLogPages(b);
    }));
  };

  const mount = (root) => {
    renderGrid(root);
    root.querySelectorAll('#lib-chips .chip').forEach((c) => c.addEventListener('click', () => {
      filter = c.dataset.filter;
      root.querySelectorAll('#lib-chips .chip').forEach((x) => x.classList.toggle('on', x === c));
      renderGrid(root);
    }));
    const sBtn = root.querySelector('#lib-search-btn');
    const sWrap = root.querySelector('#lib-search-wrap');
    const sInp = root.querySelector('#lib-search');
    sBtn.addEventListener('click', () => {
      const show = sWrap.style.display === 'none';
      sWrap.style.display = show ? 'block' : 'none';
      if (show) sInp.focus();
    });
    sInp.addEventListener('input', () => { query = sInp.value; renderGrid(root); });
  };

  return { html, mount };
}

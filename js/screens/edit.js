import { getBook, saveBook, getSettings, addPages } from '../store.js';
import { searchBooks, resolveCover, blobToDataURL } from '../covers.js';
import { coverHTML, esc, toast, STATUSES, FORMATS, GENRES } from '../ui.js';

let searchTimer = null;

export async function edit(params) {
  const isEdit = !!params.id;
  const settings = await getSettings();
  const b = isEdit ? await getBook(params.id) : {
    title: '', author: '', genre: 'Без жанра', format: 'Печатная', status: 'Читаю',
    unit: 'pages', total: null, current: 0, rating: null, dateStart: new Date().toISOString(),
    description: '', info: {}, quotes: [], cover: null,
  };
  const dateVal = b.dateStart ? new Date(b.dateStart).toISOString().slice(0, 10) : '';
  const info = b.info || {};
  // большой список жанров + любые пользовательские/уже использованные
  const allGenres = new Set(['Без жанра', ...GENRES, ...(settings.genres || []), b.genre].filter(Boolean));
  const genres = ['Без жанра', ...[...allGenres].filter((g) => g !== 'Без жанра').sort((a, c) => a.localeCompare(c, 'ru'))];

  const html = `
    <div class="screen">
      <div class="topbar">
        <button class="iconbtn ghost" data-back><i class="ti ti-arrow-left"></i></button>
        <h1 style="font-size:18px">${isEdit ? 'Изменить' : 'Добавить книгу'}</h1>
        <span style="width:38px"></span>
      </div>
      <div class="content">
        ${!isEdit ? `
        <div class="card" id="lookup-card" style="padding:10px">
          <div class="row" style="gap:8px"><i class="ti ti-search muted"></i>
            <input class="input" id="lookup" placeholder="Найти книгу по названию…" style="border:none;background:transparent;padding:8px 0" />
          </div>
          <div class="lookup-res" id="lookup-res"></div>
        </div>
        <div class="divider">— или вручную —</div>` : ''}

        <div class="row" style="gap:14px;align-items:flex-start">
          <div id="cover-prev" style="width:74px;flex-shrink:0">${coverHTML(b, '')}</div>
          <div style="flex:1">
            <button class="btn sec sm" id="pick-photo" style="width:100%"><i class="ti ti-photo"></i> Загрузить обложку</button>
            <div class="muted" style="font-size:11px;margin-top:7px">или найди книгу выше — обложка подтянется сама</div>
          </div>
        </div>
        <input type="file" id="photo-input" accept="image/*" style="display:none" />

        <div class="field"><label>Название</label><input class="input" id="f-title" value="${esc(b.title)}" /></div>
        <div class="field"><label>Автор</label><input class="input" id="f-author" value="${esc(b.author)}" /></div>
        <div class="two">
          <div class="field"><label>Жанр</label><select class="input" id="f-genre">${genres.map((g) => `<option ${g === b.genre ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></div>
          <div class="field"><label>Статус</label><select class="input" id="f-status">${STATUSES.map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Тип</label><select class="input" id="f-format">${FORMATS.map((s) => `<option ${s === b.format ? 'selected' : ''}>${s}</option>`).join('')}</select></div>

        <div class="two">
          <div class="field"><label>Всего страниц</label><input class="input" id="f-total" type="number" inputmode="numeric" value="${b.total ?? ''}" /></div>
          <div class="field"><label>Прочитано</label><input class="input" id="f-current" type="number" inputmode="numeric" value="${b.current ?? 0}" /></div>
        </div>
        <div class="field"><label>Дата начала</label><input class="input" id="f-date" type="date" value="${dateVal}" /></div>
        <div class="field"><label>Описание</label><textarea class="input" id="f-desc" placeholder="Заметки о книге">${esc(b.description || '')}</textarea></div>

        <button class="btn" id="save" style="margin-top:22px">Сохранить</button>
      </div>
    </div>`;

  const mount = (root) => {
    let cover = b.cover || null;
    let pickedInfo = {}; // издательство/год/ISBN из авто-поиска (поля в форме скрыты)

    root.querySelector('[data-back]').addEventListener('click', () => history.back());

    const setCover = (newCover, previewBook) => {
      cover = newCover;
      root.querySelector('#cover-prev').innerHTML = coverHTML({ ...previewBook, cover: newCover });
    };

    // загрузка фото
    const fileInput = root.querySelector('#photo-input');
    root.querySelector('#pick-photo').addEventListener('click', () => fileInput.click());
    root.querySelector('#cover-prev').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const dataUrl = await blobToDataURL(file);
      setCover(dataUrl, getFormValues());
      toast('Обложка загружена');
    });

    // авто-поиск
    const lookup = root.querySelector('#lookup');
    const resBox = root.querySelector('#lookup-res');
    lookup?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = lookup.value.trim();
      if (q.length < 3) { resBox.innerHTML = ''; return; }
      if (navigator.onLine === false) { resBox.innerHTML = `<div class="muted" style="font-size:12px;padding:6px"><i class="ti ti-info-circle"></i> Поиск книг работает только онлайн — заполни вручную</div>`; return; }
      resBox.innerHTML = `<div class="muted" style="font-size:12px;padding:6px">Ищу…</div>`;
      searchTimer = setTimeout(async () => {
        const results = await searchBooks(q);
        if (!results.length) { resBox.innerHTML = `<div class="muted" style="font-size:12px;padding:6px">Ничего не нашлось — заполни вручную</div>`; return; }
        resBox.innerHTML = results.map((r, i) => `
          <button class="lookup-item" data-i="${i}">
            ${r.thumbnail ? `<div class="cover" style="background-image:url('${r.thumbnail}')"></div>` : `<div class="cover" style="background:#3c3489"></div>`}
            <div style="flex:1;min-width:0"><div class="ttl">${esc(r.title)}</div><div class="meta">${esc(r.author || '')}${r.pageCount ? ' · ' + r.pageCount + ' стр.' : ''}${r.year ? ' · ' + r.year : ''}</div></div>
            <i class="ti ti-plus" style="color:var(--acc-2)"></i>
          </button>`).join('');
        resBox.querySelectorAll('.lookup-item').forEach((el) => el.addEventListener('click', async () => {
          const r = results[Number(el.dataset.i)];
          root.querySelector('#f-title').value = r.title;
          root.querySelector('#f-author').value = r.author || '';
          if (r.pageCount) root.querySelector('#f-total').value = r.pageCount;
          // данные из поиска сохраняем тихо (раздел «Подробнее» убран из формы)
          pickedInfo = { publisher: r.publisher || '', year: r.year || '', isbn: r.isbn || '' };
          resBox.innerHTML = '';
          lookup.value = r.title;
          const coverUrl = r.coverLarge || r.thumbnail;
          if (coverUrl) { toast('Подгружаю обложку…'); setCover(await resolveCover(coverUrl), getFormValues()); }
        }));
      }, 450);
    });

    const getFormValues = () => ({
      title: root.querySelector('#f-title').value.trim(),
      author: root.querySelector('#f-author').value.trim(),
    });

    root.querySelector('#save').addEventListener('click', async () => {
      const title = root.querySelector('#f-title').value.trim();
      if (!title) { toast('Введите название'); return; }
      const total = Number(root.querySelector('#f-total').value) || null;
      let current = Number(root.querySelector('#f-current').value) || 0;
      const status = root.querySelector('#f-status').value;
      if (status === 'Прочитано' && total) current = total;
      const dateStr = root.querySelector('#f-date').value;
      const next = {
        ...b,
        title,
        author: root.querySelector('#f-author').value.trim(),
        genre: root.querySelector('#f-genre').value,
        format: root.querySelector('#f-format').value,
        status, unit: 'pages', total, current,
        cover,
        dateStart: dateStr ? new Date(dateStr).toISOString() : b.dateStart,
        dateEnd: status === 'Прочитано' ? (b.dateEnd || new Date().toISOString()) : (status === 'Читаю' ? null : b.dateEnd),
        description: root.querySelector('#f-desc').value.trim(),
        info: { ...info, ...pickedInfo },
        lastRead: new Date().toISOString(),
      };
      const id = await saveBook(next);
      // новая книга с уже прочитанными страницами → добавим их в трекер (на дату начала)
      if (!isEdit && current > 0) {
        const day = (next.dateStart || new Date().toISOString()).slice(0, 10);
        await addPages(day, current);
      }
      toast(isEdit ? 'Сохранено' : 'Книга добавлена');
      if (isEdit) {
        // вернуться назад на карточку книги (откуда зашли), без лишней записи в истории
        history.back();
      } else {
        // заменить запись «#/add» карточкой новой книги — чтобы «назад» вёл в библиотеку
        history.replaceState(null, '', `#/book/${id}`);
        if (window.__refresh) window.__refresh();
      }
    });
  };

  return { html, mount };
}

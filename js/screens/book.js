import { getBook, saveBook, deleteBook } from '../store.js';
import { predictFinish, plural } from '../stats.js';
import { coverHTML, progress, esc, nl2br, fmtDate, go, statusPill, sheet, toast } from '../ui.js';
import { openLogPages, refresh } from '../actions.js';

export async function book(params) {
  const b = await getBook(params.id);
  if (!b) return { html: `<div class="screen"><div class="empty">Книга не найдена</div></div>` };

  const pct = progress(b);
  const pred = b.status === 'Читаю' ? predictFinish(b) : null;
  const unit = 'стр.';
  const info = b.info || {};
  const hasInfo = info.isbn || info.publisher || info.year || info.series;
  const star = (i) => `<i class="ti ti-star${i <= (b.rating || 0) ? ' on' : ''}" data-star="${i}"></i>`;

  const html = `
    <div class="screen">
      <div class="topbar">
        <button class="iconbtn ghost" data-back><i class="ti ti-arrow-left"></i></button>
        <div class="topbar-actions"><button class="iconbtn ghost" id="bk-menu"><i class="ti ti-dots-vertical"></i></button></div>
      </div>
      <div class="content">
        <div class="detail-head">
          ${coverHTML(b)}
          <div class="ttl serif">${esc(b.title)}</div>
          <div class="auth">${esc(b.author)}</div>
          <div class="stars ten" id="bk-stars" style="justify-content:center;margin-top:10px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star).join('')}</div>
          <div class="muted" id="bk-rating-num" style="font-size:12px;margin-top:5px">${b.rating ? b.rating + ' из 10' : 'Поставь оценку'}</div>
          <div class="row" style="gap:6px;justify-content:center;margin-top:12px">
            ${statusPill(b.status)}
          </div>
        </div>

        ${b.status !== 'Прочитано' && b.status !== 'Хочу прочитать' || b.status === 'Читаю' ? `
        <div class="card" style="margin-top:18px">
          <div class="bar"><span style="width:${pct}%"></span></div>
          <div class="spread" style="font-size:13px;margin:9px 0 12px"><span class="muted">${b.current || 0} / ${b.total || '—'} ${unit}</span><span style="color:var(--acc-2)">${pct}%</span></div>
          <button class="btn" id="bk-log"><i class="ti ti-plus"></i> Отметить прочитанное</button>
        </div>` : `
        <div class="card" style="margin-top:18px">
          <button class="btn" id="bk-log"><i class="ti ti-plus"></i> Отметить прочитанное</button>
        </div>`}

        <div class="card kv" style="margin-top:12px">
          <div><span class="muted">Жанр</span><span>${esc(b.genre)}</span></div>
          <div><span class="muted">Тип</span><span>${esc(b.format)}</span></div>
          <div><span class="muted">Начато</span><span>${fmtDate(b.dateStart)}</span></div>
          ${b.dateEnd ? `<div><span class="muted">Завершено</span><span>${fmtDate(b.dateEnd)}</span></div>` : ''}
          ${b.total ? `<div><span class="muted">Объём</span><span>${b.total} ${unit}</span></div>` : ''}
          ${pred ? `<div><span class="muted">Темп</span><span>~${pred.ppd} стр./день</span></div>
          <div><span class="muted">Осталось</span><span>~${pred.daysLeft} ${plural(pred.daysLeft, 'день', 'дня', 'дней')}</span></div>` : ''}
        </div>

        ${b.description ? `<div class="sectlabel">Описание</div><div class="card" style="font-size:14px;line-height:1.55">${nl2br(b.description)}</div>` : ''}

        ${hasInfo ? `<div class="sectlabel">Подробнее</div><div class="card kv">
          ${info.series ? `<div><span class="muted">Серия</span><span>${esc(info.series)}</span></div>` : ''}
          ${info.publisher ? `<div><span class="muted">Издательство</span><span>${esc(info.publisher)}</span></div>` : ''}
          ${info.year ? `<div><span class="muted">Год</span><span>${esc(info.year)}</span></div>` : ''}
          ${info.isbn ? `<div><span class="muted">ISBN</span><span>${esc(info.isbn)}</span></div>` : ''}
        </div>` : ''}

        <div class="sectlabel">Цитаты</div>
        <div id="bk-quotes" class="stack"></div>
        <button class="btn sec sm" id="bk-addquote" style="margin-top:10px"><i class="ti ti-quote"></i> Добавить цитату</button>
      </div>
    </div>`;

  const mount = (root) => {
    // --- цитаты: добавление, редактирование, заметки ---
    const qText = (q) => (typeof q === 'string' ? q : (q?.text || ''));
    const qNote = (q) => (q && typeof q === 'object' ? (q.note || '') : '');
    const renderQuotes = () => {
      const wrap = root.querySelector('#bk-quotes');
      const quotes = b.quotes || [];
      if (!quotes.length) { wrap.innerHTML = `<div class="muted" style="font-size:13px">Пока нет цитат</div>`; return; }
      wrap.innerHTML = quotes.map((q, i) => `
        <div class="card quote-card" data-editq="${i}">
          <div class="quote">«${nl2br(qText(q))}»</div>
          ${qNote(q) ? `<div class="quote-note"><i class="ti ti-note"></i> <span>${nl2br(qNote(q))}</span></div>` : ''}
          <div class="quote-foot"><span class="muted" style="font-size:11px">нажми, чтобы изменить</span>
            <button class="iconbtn ghost quote-del" data-delq="${i}" aria-label="Удалить"><i class="ti ti-trash"></i></button></div>
        </div>`).join('');
      wrap.querySelectorAll('.quote-card').forEach((c) => c.addEventListener('click', () => openQuoteEditor(Number(c.dataset.editq))));
      wrap.querySelectorAll('[data-delq]').forEach((btn) => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        b.quotes.splice(Number(btn.dataset.delq), 1); await saveBook(b); renderQuotes(); toast('Цитата удалена');
      }));
    };
    const openQuoteEditor = (index) => {
      const editing = index != null && index >= 0;
      const q = editing ? b.quotes[index] : null;
      const { el, close } = sheet(`<h3>${editing ? 'Цитата' : 'Новая цитата'}</h3>
        <div class="field"><label>Цитата</label><textarea class="input" id="q-text" placeholder="Текст цитаты" style="min-height:110px">${esc(qText(q))}</textarea></div>
        <div class="field"><label>Комментарий (необязательно)</label><textarea class="input" id="q-note" placeholder="Ваша мысль, контекст, страница…" style="min-height:96px">${esc(qNote(q))}</textarea></div>
        <button class="btn" id="q-save" style="margin-top:16px">Сохранить</button>`);
      el.querySelector('#q-text').focus();
      el.querySelector('#q-save').addEventListener('click', async () => {
        const text = el.querySelector('#q-text').value.trim();
        const note = el.querySelector('#q-note').value.trim();
        if (!text) { close(); return; }
        b.quotes = b.quotes || [];
        if (editing) b.quotes[index] = { text, note };
        else b.quotes.push({ text, note });
        await saveBook(b); close(); renderQuotes(); toast('Сохранено');
      });
    };

    root.querySelector('[data-back]').addEventListener('click', () => history.back());
    root.querySelector('#bk-log').addEventListener('click', () => openLogPages(b));
    // быстрый рейтинг по звёздам (1 звезда = 2 балла)
    root.querySelectorAll('#bk-stars i').forEach((s) => s.addEventListener('click', async () => {
      const val = Number(s.dataset.star);
      b.rating = b.rating === val ? val - 1 || null : val; // повторный тап по той же звезде убавляет на 1
      await saveBook(b);
      root.querySelectorAll('#bk-stars i').forEach((x) => x.classList.toggle('on', Number(x.dataset.star) <= (b.rating || 0)));
      root.querySelector('#bk-rating-num').textContent = b.rating ? `${b.rating} из 10` : 'Поставь оценку';
      toast(b.rating ? `Оценка ${b.rating}/10` : 'Оценка снята');
    }));
    root.querySelector('#bk-menu').addEventListener('click', () => {
      const { el, close } = sheet(`
        <button class="btn sec" data-edit><i class="ti ti-edit"></i> Изменить</button>
        <button class="btn danger" data-del style="margin-top:10px"><i class="ti ti-trash"></i> Удалить книгу</button>`);
      el.querySelector('[data-edit]').addEventListener('click', () => { close(); go(`#/edit/${b.id}`); });
      el.querySelector('[data-del]').addEventListener('click', async () => {
        await deleteBook(b.id); close(); toast('Книга удалена'); go('#/library');
      });
    });
    root.querySelector('#bk-addquote').addEventListener('click', () => openQuoteEditor());
    renderQuotes();
  };

  return { html, mount };
}

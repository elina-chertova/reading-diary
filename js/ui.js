// Помощники интерфейса: шаблоны, форматирование, обложки, тосты, навигация.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// безопасный текст в HTML
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// экранируем и превращаем переносы строк в <br> (любые: \n, \r\n, \r)
export function nl2br(s) {
  return esc(s).replace(/\r\n|\r|\n/g, '<br>');
}

// навигация по hash-роутеру
export function go(path) { location.hash = path; }

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const monthName = (i) => MONTHS[i] ?? '';        // родительный: «5 января»
export const monthNom = (i) => MONTHS_NOM[i] ?? '';     // именительный: «месяц — Январь»
export const monthShort = (i) => MONTHS_SHORT[i] ?? '';

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// сколько дней заняло (или длится) чтение книги
export function readingDays(b) {
  if (!b.dateStart) return null;
  const s = new Date(b.dateStart);
  const e = b.dateEnd ? new Date(b.dateEnd) : new Date();
  return Math.max(1, Math.round((e - s) / 86400000));
}

export function fmtNum(n) {
  return Math.round(n || 0).toLocaleString('ru-RU');
}

// палитра для обложек-заглушек (по хешу названия)
const COVER_COLORS = ['#7c5cff', '#0f6e56', '#72243e', '#185fa5', '#854f0b', '#3c3489', '#04342c', '#993c1d', '#1d9e75', '#534ab7'];
export function coverColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return COVER_COLORS[h % COVER_COLORS.length];
}

// HTML обложки книги (картинка или цветная заглушка с названием)
export function coverHTML(book, extraClass = '') {
  if (book.cover) {
    return `<div class="cover ${extraClass}" style="background-image:url('${book.cover}')"></div>`;
  }
  const col = coverColor(book.title + book.author);
  return `<div class="cover ${extraClass}" style="background:${col}">
    <div class="ph"><div class="ph-t">${esc(book.title)}</div><div class="ph-a">${esc(book.author)}</div></div>
  </div>`;
}

export function progress(book) {
  if (!book.total || book.total <= 0) return 0;
  return Math.min(100, Math.round((book.current / book.total) * 100));
}

export const STATUSES = ['Читаю', 'Прочитано', 'Хочу прочитать', 'Брошено'];
export const FORMATS = ['Печатная', 'Электронная', 'Аудиокнига'];

// Большой набор жанров на выбор (можно добавлять свои при необходимости).
export const GENRES = [
  'Без жанра',
  'Автобиография', 'Антиутопия', 'Бизнес', 'Биография', 'Боевик',
  'Военная проза', 'Детектив', 'Детская литература', 'Документальная проза', 'Драма',
  'Историческая проза', 'Исторический роман', 'История', 'Искусство',
  'Классика', 'Комиксы и графика', 'Кулинария', 'Культурология',
  'Любовный роман', 'Магический реализм', 'Медицина и здоровье', 'Мемуары',
  'Менеджмент', 'Микроистория', 'Мистика', 'Молодёжная проза', 'Музыка',
  'Научная фантастика', 'Научно-популярное', 'Нон-фикшн',
  'Поэзия', 'Политика', 'Приключения', 'Притча', 'Проза',
  'Психология', 'Публицистика', 'Путешествия',
  'Рассказы', 'Религия и духовность', 'Роман', 'Саморазвитие', 'Сатира и юмор',
  'Сказки', 'Современная проза', 'Социология', 'Спорт', 'Справочник',
  'Техническая литература', 'Технологии и IT', 'Триллер',
  'Ужасы', 'Фантастика', 'Финансы', 'Философия', 'Фэнтези',
  'Экономика', 'Эзотерика', 'Эпопея', 'Эссе', 'Юмор',
];

export function statusPill(status) {
  const acc = status === 'Читаю' || status === 'Прочитано';
  return `<span class="pill ${acc ? 'acc' : ''}">${esc(status)}</span>`;
}

// рейтинг 1–10: только для чтения
export function ratingStarsRO(rating) {
  if (!rating) return '';
  const full = Math.round(rating / 2); // 10 → 5 звёзд визуально
  let s = '<div class="stars ro">';
  for (let i = 1; i <= 5; i++) s += `<i class="ti ti-star${i <= full ? ' on' : ''}"></i>`;
  s += `</div>`;
  return s;
}

let toastTimer = null;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

// модальное «нижнее окно»
export function sheet(innerHTML) {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet"><div class="grip"></div>${innerHTML}</div>`;
  document.body.appendChild(bg);
  const sheetEl = bg.querySelector('.sheet');
  requestAnimationFrame(() => bg.classList.add('show'));

  // поднимаем окно над экранной клавиатурой
  const vv = window.visualViewport;
  const adjust = () => {
    if (!vv) return;
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    sheetEl.style.transform = kb > 80 ? `translateY(-${kb}px)` : '';
  };
  if (vv) { vv.addEventListener('resize', adjust); vv.addEventListener('scroll', adjust); }

  const close = () => {
    if (vv) { vv.removeEventListener('resize', adjust); vv.removeEventListener('scroll', adjust); }
    bg.classList.remove('show');
    setTimeout(() => bg.remove(), 250);
  };
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  return { el: bg, close };
}

// нижняя навигация
export function navBar(active) {
  const items = [
    ['', 'ti-home', 'Главная'],
    ['library', 'ti-books', 'Книги'],
    ['calendar', 'ti-calendar', 'Трекер'],
    ['stats', 'ti-chart-bar', 'Статистика'],
  ];
  return `<nav class="nav">${items.map(([path, icon, label]) =>
    `<button class="${active === path ? 'on' : ''}" data-go="#/${path}">
      <i class="ti ${icon}"></i><span>${label}</span></button>`).join('')}</nav>`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

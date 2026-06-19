// Преобразует сырой дамп из book-diary-pro.db в seed.json для приложения.
// Запуск: node tools/build-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const rawBooks = JSON.parse(readFileSync(new URL('../data/raw-books.json', import.meta.url)));
const rawTracker = JSON.parse(readFileSync(new URL('../data/raw-tracker.json', import.meta.url)));

const safeJSON = (s, fallback) => {
  if (s == null || s === '') return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};

const statusOf = (b) => {
  if (b.reading === 1) return 'Прочитано';
  if (b.reading === 2) return 'Хочу прочитать';
  if (b.reading === 0 && b.leave === 1) return 'Брошено';
  return 'Читаю';
};

const books = rawBooks.map((b) => {
  const status = statusOf(b);
  const isPlanned = status === 'Хочу прочитать';
  const total = isPlanned && (b.allpage == null || b.allpage <= 1) ? null : b.allpage ?? null;
  const info = safeJSON(b.addinfo, {});
  return {
    id: b.id,
    title: (b.title || '').trim(),
    author: (b.author || '').trim(),
    genre: (b.genre || 'Без жанра').trim(),
    format: b.typebook === 1 ? 'Печатная' : 'Электронная',
    status,
    unit: 'pages',
    total,
    current: status === 'Прочитано' && total ? total : (b.currentpage ?? 0),
    rating: b.estimation > 0 ? b.estimation * 2 : null,        // 0–5 → 1–10
    dateStart: b.datestart || null,
    dateEnd: b.dateend && b.dateend !== '' ? b.dateend : null,
    description: (b.description || '').trim(),
    info: {
      isbn: info.isbn || '',
      publisher: info.publishinghouse || '',
      year: info.yearpublication || '',
      series: info.series || '',
      language: info.language || '',
      notes: info.notes || '',
    },
    quotes: Array.isArray(safeJSON(b.quotes, [])) ? safeJSON(b.quotes, []) : [],
    cover: null,                 // обложек в базе нет — только имена файлов
    legacyImg: b.img || null,    // на случай, если найдётся папка с картинками
  };
});

// 'DD.MM.YYYY' -> 'YYYY-MM-DD'
const toISO = (d) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
};
const tracker = rawTracker
  .map((t) => ({ date: toISO(t.date), pages: t.pages }))
  .sort((a, b) => a.date.localeCompare(b.date));

const genres = [...new Set(books.map((b) => b.genre))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));

const seed = {
  version: 1,
  exportedAt: new Date().toISOString().slice(0, 10),
  books,
  tracker,
  genres,
  settings: { yearGoalBooks: 30, ratingMax: 10 },
};

writeFileSync(new URL('../js/seed.json', import.meta.url), JSON.stringify(seed));
console.log(`seed.json: ${books.length} книг, ${tracker.length} записей трекера, ${genres.length} жанров`);
console.log('Статусы:', books.reduce((a, b) => ((a[b.status] = (a[b.status] || 0) + 1), a), {}));

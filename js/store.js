// Доступ к данным + доменная логика. Поверх db.js.
import { dbGetAll, dbGet, dbPut, dbDelete, dbBulkPut, dbClear } from './db.js';
import { todayISO } from './ui.js';

const DEFAULT_SETTINGS = { yearGoalBooks: 30, dailyGoalPages: 10, ratingMax: 10, genres: [] };

// --- первичное наполнение из seed.json ---
export async function ensureSeeded() {
  const flag = await dbGet('meta', 'seeded');
  if (flag?.value) return;
  try {
    const res = await fetch(new URL('./seed.json', import.meta.url));
    const seed = await res.json();
    await dbBulkPut('books', seed.books || []);
    await dbBulkPut('tracker', seed.tracker || []);
    await dbPut('meta', { key: 'settings', value: { ...DEFAULT_SETTINGS, ...(seed.settings || {}), genres: seed.genres || [] } });
  } catch (e) {
    console.warn('Сид не загружен, старт с пустой базой', e);
    await dbPut('meta', { key: 'settings', value: DEFAULT_SETTINGS });
  }
  await dbPut('meta', { key: 'seeded', value: true });
}

// --- книги ---
export const getBooks = () => dbGetAll('books');
export const getBook = (id) => dbGet('books', Number(id));
export async function saveBook(book) {
  if (!book.id) delete book.id; // автоинкремент
  const id = await dbPut('books', book);
  return id;
}
export const deleteBook = (id) => dbDelete('books', Number(id));

// --- трекер (страниц в день) ---
export const getTracker = () => dbGetAll('tracker');
export async function addPages(dateISO, pages) {
  if (!pages) return;
  const existing = await dbGet('tracker', dateISO);
  const total = (existing?.pages || 0) + pages;
  await dbPut('tracker', { date: dateISO, pages: Math.max(0, total) });
}

// Задать точное число страниц за день (правка истории в трекере).
export async function setDayPages(dateISO, pages) {
  if (pages > 0) await dbPut('tracker', { date: dateISO, pages: Math.round(pages) });
  else await dbDelete('tracker', dateISO);
}

// Отметить прогресс книги «прочитал до страницы N» и записать дельту в трекер за сегодня.
export async function setBookProgress(book, newCurrent) {
  newCurrent = Math.max(0, Math.min(newCurrent, book.total || newCurrent));
  const delta = newCurrent - (book.current || 0);
  book.current = newCurrent;
  if (book.status === 'Хочу прочитать' && newCurrent > 0) book.status = 'Читаю';
  if (book.total && newCurrent >= book.total) {
    book.status = 'Прочитано';
    if (!book.dateEnd) book.dateEnd = new Date().toISOString();
  }
  if (!book.dateStart) book.dateStart = new Date().toISOString();
  await saveBook(book);
  if (delta > 0) await addPages(todayISO(), delta);
  return book;
}

// --- настройки ---
export async function getSettings() {
  const m = await dbGet('meta', 'settings');
  return { ...DEFAULT_SETTINGS, ...(m?.value || {}) };
}
export async function setSettings(patch) {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await dbPut('meta', { key: 'settings', value: next });
  return next;
}

// --- бэкап / восстановление ---
export async function exportAll() {
  const [books, tracker, settings] = await Promise.all([getBooks(), getTracker(), getSettings()]);
  return { version: 1, exportedAt: new Date().toISOString(), books, tracker, settings };
}
export async function importAll(data, { replace = true } = {}) {
  if (replace) { await dbClear('books'); await dbClear('tracker'); }
  await dbBulkPut('books', data.books || []);
  await dbBulkPut('tracker', data.tracker || []);
  if (data.settings) await dbPut('meta', { key: 'settings', value: data.settings });
  await dbPut('meta', { key: 'seeded', value: true });
}

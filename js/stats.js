// Движок статистики. Чистые функции над books[] и tracker[].
import { monthNom, monthShort } from './ui.js';

const DAY = 86400000;
const ymd = (iso) => new Date(iso);
const yearOf = (iso) => (iso ? new Date(iso).getFullYear() : null);
const monthKey = (dateStr) => dateStr.slice(0, 7); // 'YYYY-MM'

// JS getDay: 0=вс..6=сб. Нам нужен порядок пн..вс.
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WD_LABEL = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WD_FULL = ['понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];

export function computeStats(books, tracker, settings = {}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const finished = books.filter((b) => b.status === 'Прочитано');
  const trackerSorted = [...tracker].filter((t) => t.pages > 0).sort((a, b) => a.date.localeCompare(b.date));

  // --- суммы по страницам ---
  const allTimePages = trackerSorted.reduce((s, t) => s + t.pages, 0);
  const thisYearPages = trackerSorted.filter((t) => t.date.startsWith(String(year))).reduce((s, t) => s + t.pages, 0);
  const thisMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthPages = trackerSorted.filter((t) => t.date.startsWith(thisMonthKey)).reduce((s, t) => s + t.pages, 0);
  // среднее за месяц: делим на число месяцев с начала чтения до текущего (включая «пустые»)
  const firstDate = trackerSorted[0]?.date;
  let monthsSpan = 1;
  if (firstDate) {
    const [fy, fm] = firstDate.slice(0, 7).split('-').map(Number);
    monthsSpan = Math.max(1, (year - fy) * 12 + ((month + 1) - fm) + 1);
  }
  const avgPerMonth = allTimePages / monthsSpan;

  // --- книги ---
  const thisYearBooks = finished.filter((b) => yearOf(b.dateEnd) === year).length;
  const totalFinished = finished.length;

  // --- серия дней ---
  const dateSet = new Set(trackerSorted.map((t) => t.date));
  const { current: streak, record: streakRecord } = computeStreak(dateSet);

  // --- по дням недели (средние страницы) ---
  const wdSum = Array(7).fill(0), wdCnt = Array(7).fill(0);
  for (const t of trackerSorted) {
    const d = ymd(t.date).getDay();
    wdSum[d] += t.pages; wdCnt[d] += 1;
  }
  const weekday = WD_ORDER.map((d, i) => ({ label: WD_LABEL[i], full: WD_FULL[i], avg: wdCnt[d] ? wdSum[d] / wdCnt[d] : 0 }));
  const peakWd = weekday.reduce((a, b) => (b.avg > a.avg ? b : a), weekday[0]);

  // --- жанры (по прочитанным) ---
  const genreMap = {};
  finished.forEach((b) => { genreMap[b.genre] = (genreMap[b.genre] || 0) + 1; });
  const genres = Object.entries(genreMap).map(([name, count]) => ({ name, count, pct: count / Math.max(1, totalFinished) }))
    .sort((a, b) => b.count - a.count);
  const favGenre = genres[0]?.name || '—';

  // лучший жанр по средней оценке (мин. 2 книги)
  const ratedByGenre = {};
  finished.filter((b) => b.rating).forEach((b) => {
    (ratedByGenre[b.genre] ||= []).push(b.rating);
  });
  const bestRatedGenre = Object.entries(ratedByGenre).filter(([, a]) => a.length >= 2)
    .map(([name, a]) => ({ name, avg: a.reduce((s, x) => s + x, 0) / a.length }))
    .sort((a, b) => b.avg - a.avg)[0];

  // --- оценки ---
  const rated = books.filter((b) => b.rating);
  const avgRating = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;
  const ratingDist = Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: rated.filter((b) => b.rating === i + 1).length }));

  // --- топ авторов ---
  const authorMap = {};
  finished.forEach((b) => { if (b.author) authorMap[b.author] = (authorMap[b.author] || 0) + 1; });
  const topAuthors = Object.entries(authorMap).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 3);

  // --- рекордный месяц ---
  const monthAgg = {};
  trackerSorted.forEach((t) => { monthAgg[monthKey(t.date)] = (monthAgg[monthKey(t.date)] || 0) + t.pages; });
  const recordMonthEntry = Object.entries(monthAgg).sort((a, b) => b[1] - a[1])[0];
  const recordMonth = recordMonthEntry ? {
    label: monthNom(Number(recordMonthEntry[0].slice(5)) - 1),
    year: Number(recordMonthEntry[0].slice(0, 4)),
    pages: recordMonthEntry[1],
  } : null;

  // --- рекорды книг ---
  const longestBook = finished.filter((b) => b.total).sort((a, b) => b.total - a.total)[0] || null;
  const withSpeed = finished.filter((b) => b.total > 50 && b.dateStart && b.dateEnd).map((b) => {
    const days = Math.max(1, Math.round((ymd(b.dateEnd) - ymd(b.dateStart)) / DAY));
    return { book: b, ppd: b.total / days, days };
  });
  const fastestBook = withSpeed.sort((a, b) => b.ppd - a.ppd)[0] || null;
  const dropped = books.filter((b) => b.status === 'Брошено').length;

  // лучшая книга (максимальная оценка, среди прочитанных в этом году → иначе всех)
  const bestBook = [...finished].filter((b) => b.rating).sort((a, b) => b.rating - a.rating ||
    (yearOf(b.dateEnd) === year) - (yearOf(a.dateEnd) === year))[0] || null;

  // --- цель года + прогноз ---
  const goal = settings.yearGoalBooks || 30;
  const dayOfYear = Math.floor((now - new Date(year, 0, 0)) / DAY);
  const expectedByNow = goal * (dayOfYear / 365);
  const goalDiff = thisYearBooks - expectedByNow; // >0 опережение
  const projectedYear = dayOfYear > 0 ? Math.round(thisYearBooks / (dayOfYear / 365)) : 0;

  // --- ряды для графиков ---
  const years = [...new Set(trackerSorted.map((t) => t.date.slice(0, 4)))].map(Number).sort();
  const monthlyPages = (y) => {
    const arr = Array(12).fill(0);
    trackerSorted.forEach((t) => { if (t.date.startsWith(String(y))) arr[Number(t.date.slice(5, 7)) - 1] += t.pages; });
    return arr;
  };
  const monthlyBooks = (y) => {
    const arr = Array(12).fill(0);
    finished.forEach((b) => { if (yearOf(b.dateEnd) === y) arr[ymd(b.dateEnd).getMonth()] += 1; });
    return arr;
  };
  const yearlyPages = years.map((y) => ({ year: y, pages: monthlyPages(y).reduce((s, x) => s + x, 0) }));
  const yearlyBooks = years.map((y) => ({ year: y, books: finished.filter((b) => yearOf(b.dateEnd) === y).length }));

  // --- авто-инсайты ---
  const insights = buildInsights({ peakWd, recordMonth, favGenre, bestRatedGenre, longestBook, topAuthors, avgRating, fastestBook, allTimePages });

  return {
    year, month,
    allTimePages, thisYearPages, thisMonthPages, avgPerMonth,
    totalFinished, thisYearBooks,
    streak, streakRecord,
    weekday, peakWd,
    genres, favGenre, bestRatedGenre,
    avgRating, ratingDist, ratedCount: rated.length,
    topAuthors,
    recordMonth, longestBook, fastestBook, dropped, bestBook,
    goal, goalDiff, projectedYear,
    years, monthlyPages, monthlyBooks, yearlyPages, yearlyBooks,
    insights,
  };
}

function computeStreak(dateSet) {
  // текущая серия: считаем назад от сегодня (или вчера, если сегодня ещё не читали)
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let cur = 0;
  const d = new Date();
  if (!dateSet.has(toISO(d))) d.setDate(d.getDate() - 1);
  while (dateSet.has(toISO(d))) { cur++; d.setDate(d.getDate() - 1); }

  // рекорд: самая длинная цепочка подряд идущих дат
  const dates = [...dateSet].sort();
  let record = dates.length ? 1 : 0, run = dates.length ? 1 : 0;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]), now = new Date(dates[i]);
    run = Math.round((now - prev) / DAY) === 1 ? run + 1 : 1;
    if (run > record) record = run;
  }
  return { current: cur, record };
}

function buildInsights(d) {
  const out = [];
  if (d.peakWd && d.peakWd.avg > 0) out.push({ icon: 'ti-calendar-heart', html: `Чаще всего читаешь <b>по ${d.peakWd.full}</b> — в среднем ${Math.round(d.peakWd.avg)} стр.` });
  if (d.recordMonth) out.push({ icon: 'ti-trophy', html: `Рекордный месяц — <b>${d.recordMonth.label} ${d.recordMonth.year}</b>, ${d.recordMonth.pages.toLocaleString('ru-RU')} страниц.` });
  if (d.favGenre && d.favGenre !== '—') {
    const extra = d.bestRatedGenre && d.bestRatedGenre.name !== d.favGenre ? `, но выше всего оцениваешь <b>${d.bestRatedGenre.name.toLowerCase()}</b>` : '';
    out.push({ icon: 'ti-mood-smile', html: `Любимый жанр — <b>${d.favGenre.toLowerCase()}</b>${extra}.` });
  }
  if (d.topAuthors[0]) out.push({ icon: 'ti-user-star', html: `Чаще всех читаешь <b>${d.topAuthors[0].name}</b> — ${d.topAuthors[0].count} ${plural(d.topAuthors[0].count, 'книга', 'книги', 'книг')}.` });
  if (d.longestBook) out.push({ icon: 'ti-book-2', html: `Самая длинная прочитанная — <b>«${d.longestBook.title}»</b>, ${d.longestBook.total} стр.` });
  if (d.avgRating) out.push({ icon: 'ti-star', html: `Средняя оценка твоих книг — <b>${d.avgRating.toFixed(1)}</b> из 10.` });
  return out;
}

export function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

// прогноз дочитывания книги по её собственному темпу
export function predictFinish(book) {
  if (!book.total || !book.current || book.current >= book.total || !book.dateStart) return null;
  const days = Math.max(1, (Date.now() - new Date(book.dateStart)) / DAY);
  const ppd = book.current / days;
  if (ppd <= 0) return null;
  const remaining = book.total - book.current;
  const daysLeft = Math.ceil(remaining / ppd);
  return { ppd: Math.round(ppd), daysLeft, remaining };
}

export { monthShort };

// Авто-поиск книг и обложек по нескольким базам сразу (Open Library + Google Books),
// результаты объединяются и чистятся от дублей. Оба источника бесплатны и без ключа.
// Офлайн поиск недоступен (нет сети) — возвращаем пусто, форма заполняется вручную.

// если источник не ответил за timeout — не ждём его (чтобы поиск был быстрым)
const timed = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res([]), ms))]);

export async function searchBooks(query) {
  if (!query || query.trim().length < 2) return [];
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];
  const [ol, gb] = await Promise.all([
    timed(searchOpenLibrary(query).catch(() => []), 5000),  // основной источник
    timed(searchGoogle(query).catch(() => []), 3000),       // доп. источник — не ждём долго
  ]);
  return dedupe([...ol, ...gb]).slice(0, 12);
}

const norm = (s) => (s || '').toLowerCase().replace(/[«»"'.,!?:;()\[\]\-–—]/g, '').replace(/\s+/g, ' ').trim();

// объединяем результаты разных баз: дубли по «название|автор», предпочитаем с обложкой
function dedupe(items) {
  const map = new Map();
  for (const it of items) {
    if (!it.title) continue;
    const key = norm(it.title) + '|' + norm(it.author);
    const ex = map.get(key);
    if (!ex) { map.set(key, { ...it }); continue; }
    if (!ex.thumbnail && it.thumbnail) { ex.thumbnail = it.thumbnail; ex.coverLarge = it.coverLarge; }
    if (!ex.pageCount && it.pageCount) ex.pageCount = it.pageCount;
    if (!ex.year && it.year) ex.year = it.year;
    if (!ex.isbn && it.isbn) ex.isbn = it.isbn;
    if (!ex.publisher && it.publisher) ex.publisher = it.publisher;
  }
  return [...map.values()].sort((a, b) => (b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0));
}

async function searchOpenLibrary(query) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn,publisher`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).map((d) => ({
      title: d.title || '',
      author: (d.author_name || [])[0] || '',
      pageCount: d.number_of_pages_median || 0,
      thumbnail: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
      coverLarge: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
      year: d.first_publish_year ? String(d.first_publish_year) : '',
      publisher: (d.publisher || [])[0] || '',
      isbn: (d.isbn || [])[0] || '',
    })).filter((b) => b.title);
  } catch (e) { console.warn('Open Library недоступен', e); return []; }
}

async function searchGoogle(query) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((it) => {
      const v = it.volumeInfo || {};
      const isbn = (v.industryIdentifiers || []).find((x) => x.type === 'ISBN_13' || x.type === 'ISBN_10');
      let thumb = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:').replace('&edge=curl', '');
      return {
        title: v.title || '',
        author: (v.authors || []).join(', '),
        pageCount: v.pageCount || 0,
        thumbnail: thumb,
        coverLarge: thumb,
        year: (v.publishedDate || '').slice(0, 4),
        publisher: v.publisher || '',
        isbn: isbn?.identifier || '',
      };
    }).filter((b) => b.title);
  } catch (e) { console.warn('Google Books недоступен', e); return []; }
}

// Пытаемся сохранить обложку как data-URL (чтобы работала офлайн).
// Если CORS не позволяет — возвращаем исходный URL (закэшируется service worker'ом).
export async function resolveCover(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await blobToDataURL(blob);
  } catch {
    return url;
  }
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

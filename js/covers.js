// Авто-поиск книг и обложек. Основной источник — Open Library (хорошо знает
// русские книги), запасной — Google Books. Оба бесплатны и без ключа.

export async function searchBooks(query) {
  if (!query || query.trim().length < 2) return [];
  const ol = await searchOpenLibrary(query);
  if (ol.length) return ol;
  return searchGoogle(query);
}

async function searchOpenLibrary(query) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&fields=title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn,publisher`;
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
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&printType=books`);
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

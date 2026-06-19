// Тонкая обёртка над IndexedDB. Хранилища: books, tracker, meta.
const DB_NAME = 'reading-diary';
const DB_VERSION = 1;

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('tracker')) {
        // ключ — дата 'YYYY-MM-DD' (одна запись на день)
        db.createObjectStore('tracker', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}
const done = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const dbGetAll = (store) => tx(store).then((s) => done(s.getAll()));
export const dbGet = (store, key) => tx(store).then((s) => done(s.get(key)));
export const dbPut = (store, value) => tx(store, 'readwrite').then((s) => done(s.put(value)));
export const dbDelete = (store, key) => tx(store, 'readwrite').then((s) => done(s.delete(key)));
export const dbClear = (store) => tx(store, 'readwrite').then((s) => done(s.clear()));

export function dbBulkPut(store, values) {
  return openDB().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    const os = t.objectStore(store);
    values.forEach((v) => os.put(v));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  }));
}

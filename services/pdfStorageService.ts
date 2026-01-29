/**
 * IndexedDB-backed PDF storage.
 *
 * Rationale: mobile/tablet localStorage quotas are small, so base64 `data:` URLs
 * frequently fail to persist. IndexedDB is local-first and suited for blobs.
 */
const DB_NAME = 'scidigest_pdf_store_v1';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

type StoredPdfRecord = {
  id: string;
  blob: Blob;
  name?: string;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise<T = unknown>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const pdfStorageService = {
  async putPdf(opts: { id: string; blob: Blob; name?: string }): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredPdfRecord = {
        id: opts.id,
        blob: opts.blob,
        name: opts.name,
        createdAt: new Date().toISOString()
      };
      await requestToPromise(store.put(record));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },

  async getPdfBlob(id: string): Promise<Blob | null> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const rec = await requestToPromise<StoredPdfRecord | undefined>(store.get(id));
      return rec?.blob || null;
    } finally {
      db.close();
    }
  }
};


const DB_NAME = "avto-talim-cache";
const DB_VERSION = 1;
const TICKETS_STORE = "tickets";
const QUESTIONS_STORE = "questions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TICKETS_STORE)) {
        db.createObjectStore(TICKETS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
        const qs = db.createObjectStore(QUESTIONS_STORE, { keyPath: "id" });
        qs.createIndex("ticket_id", "ticket_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedTickets() {
  const db = await openDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(TICKETS_STORE, "readonly");
    const store = tx.objectStore(TICKETS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheTickets(tickets: any[]) {
  const db = await openDB();
  const tx = db.transaction(TICKETS_STORE, "readwrite");
  const store = tx.objectStore(TICKETS_STORE);
  store.clear();
  tickets.forEach((t) => store.put(t));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedQuestions(ticketId: string) {
  const db = await openDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(QUESTIONS_STORE, "readonly");
    const store = tx.objectStore(QUESTIONS_STORE);
    const idx = store.index("ticket_id");
    const req = idx.getAll(ticketId);
    req.onsuccess = () => {
      const sorted = req.result.sort((a: any, b: any) => a.order_num - b.order_num);
      resolve(sorted);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheQuestions(questions: any[]) {
  const db = await openDB();
  const tx = db.transaction(QUESTIONS_STORE, "readwrite");
  const store = tx.objectStore(QUESTIONS_STORE);
  questions.forEach((q) => store.put(q));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllCachedQuestions() {
  const db = await openDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(QUESTIONS_STORE, "readonly");
    const store = tx.objectStore(QUESTIONS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

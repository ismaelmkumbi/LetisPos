/**
 * Tiny IndexedDB wrapper for the offline POS sync queue.
 *
 * One database `smartpos-offline`, one object store `pending` with key `id`
 * (auto-generated). Each row holds the captured CreateSaleBody plus a stable
 * `clientOpId` we use as the idempotency key when uploading.
 *
 * Kept dependency-free on purpose — Modernize already pulls in plenty of weight,
 * and the queue logic is small enough that an `idb`-style helper isn't needed.
 */
import type { CreateSaleBody } from 'src/api/smartpos/sales';

const DB_NAME    = 'smartpos-offline';
const DB_VERSION = 1;
const STORE      = 'pending';

export interface PendingSale {
  id?: number;          // auto-incremented IDB key
  clientOpId: string;   // server-side idempotency key
  terminalId: string;   // pinned at queue time so flushes route back to the same till
  sale: CreateSaleBody;
  capturedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('terminal', 'terminalId', { unique: false });
        store.createIndex('opId', 'clientOpId', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Promise wrapper for an IDBRequest. */
function awaitReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function addPending(row: Omit<PendingSale, 'id'>): Promise<number> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const id = (await awaitReq(tx.objectStore(STORE).add(row))) as IDBValidKey;
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
    return Number(id);
  } finally {
    db.close();
  }
}

export async function listPending(terminalId?: string): Promise<PendingSale[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const all = (await awaitReq(tx.objectStore(STORE).getAll())) as PendingSale[];
    return terminalId ? all.filter((r) => r.terminalId === terminalId) : all;
  } finally {
    db.close();
  }
}

export async function deletePending(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function countPending(terminalId?: string): Promise<number> {
  const rows = await listPending(terminalId);
  return rows.length;
}

/** Generate a reasonably-unique client op id without pulling in `uuid`. */
export function newClientOpId(): string {
  // Prefer crypto.randomUUID where available; fall back to time + random.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

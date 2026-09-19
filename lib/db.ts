/**
 * Minimal IndexedDB-lager. Inga beroenden.
 *
 * Två stores:
 *   - `kv`     : hela HubState som ett objekt under nyckeln 'state'
 *   - `images` : kvittobilder som Blob, nyckel = imageKey
 *
 * Varför IndexedDB och inte localStorage: bilderna. localStorage tar ~5 MB
 * totalt och lagrar bara strängar — tre kvittofoton och det är fullt.
 *
 * Detta är avsiktligt en tunn fasad. När det är dags för Postgres/Supabase
 * byts implementationen bakom `loadState`/`saveState`/`putImage`/`getImage`
 * utan att någon vy behöver röras.
 */

import { EMPTY_STATE, type HubState, SCHEMA_VERSION } from './types';

const DB_NAME = 'jarvis-hub';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const IMAGE_STORE = 'images';
const STATE_KEY = 'state';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB saknas i den här miljön'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = fn(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

/** Läser hela state. Returnerar tomt state om inget finns eller om IDB är blockerat. */
export async function loadState(): Promise<HubState> {
  try {
    const raw = await tx<HubState | undefined>(KV_STORE, 'readonly', (s) => s.get(STATE_KEY));
    if (!raw) return { ...EMPTY_STATE };
    return migrate(raw);
  } catch {
    // Privat fönster, blockerad lagring, SSR — appen ska fortfarande rendera.
    return { ...EMPTY_STATE };
  }
}

export async function saveState(state: HubState): Promise<void> {
  try {
    await tx(KV_STORE, 'readwrite', (s) => s.put(state, STATE_KEY));
  } catch {
    /* tyst — bättre att tappa en skrivning än att krascha vyn */
  }
}

export async function putImage(key: string, blob: Blob): Promise<void> {
  try {
    await tx(IMAGE_STORE, 'readwrite', (s) => s.put(blob, key));
  } catch {
    /* tyst */
  }
}

export async function getImage(key: string): Promise<Blob | undefined> {
  try {
    return await tx<Blob | undefined>(IMAGE_STORE, 'readonly', (s) => s.get(key));
  } catch {
    return undefined;
  }
}

export async function deleteImage(key: string): Promise<void> {
  try {
    await tx(IMAGE_STORE, 'readwrite', (s) => s.delete(key));
  } catch {
    /* tyst */
  }
}

/** Framtida schemaändringar hakas på här. */
function migrate(state: HubState): HubState {
  if (state.version === SCHEMA_VERSION) return state;
  // v0 → v1 fanns aldrig i produktion; slå ihop mot tomt state för säkerhets skull.
  return { ...EMPTY_STATE, ...state, version: SCHEMA_VERSION };
}

/** Full export — för backup innan man byter till riktig databas. */
export async function exportAll(): Promise<HubState> {
  return loadState();
}

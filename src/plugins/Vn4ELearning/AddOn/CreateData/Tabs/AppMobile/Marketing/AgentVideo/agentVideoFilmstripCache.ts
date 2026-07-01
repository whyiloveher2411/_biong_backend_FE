import {
    AGENT_VIDEO_FILMSTRIP_CAPTURE_VERSION,
    AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC,
} from './agentVideoFilmstripConstants';

const DB_NAME = 'biong_agent_video';
const DB_VERSION = 1;
const STORE_NAME = 'filmstrip';

export type FilmstripCacheRecord = {
    key: string;
    shortVideoId: number;
    renderedAt: string;
    durationSec: number;
    intervalSec: number;
    captureVersion: number;
    thumbnails: string[];
    savedAt: number;
};

export type FilmstripCacheLookup = {
    shortVideoId: number;
    renderedAt: string;
    durationSec: number;
};

function buildFilmstripCacheKey(input: FilmstripCacheLookup): string {
    const renderedAt = String(input.renderedAt || '').trim() || 'unknown';
    return `${input.shortVideoId}:${renderedAt}:${AGENT_VIDEO_FILMSTRIP_CAPTURE_VERSION}`;
}

function openFilmstripDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
}

function runStoreRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
}

function isSameFilmstripDuration(stored: number, current: number): boolean {
    return Math.abs(stored - current) < 0.5;
}

export async function readFilmstripCache(
    input: FilmstripCacheLookup,
): Promise<string[] | null> {
    if (!input.shortVideoId || input.durationSec <= 0) {
        return null;
    }

    try {
        const db = await openFilmstripDb();
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const key = buildFilmstripCacheKey(input);
            const record = await runStoreRequest<FilmstripCacheRecord | undefined>(
                store.get(key) as IDBRequest<FilmstripCacheRecord | undefined>,
            );
            if (!record?.thumbnails?.length) {
                return null;
            }
            if (record.durationSec !== input.durationSec && !isSameFilmstripDuration(record.durationSec, input.durationSec)) {
                return null;
            }
            if (record.captureVersion !== AGENT_VIDEO_FILMSTRIP_CAPTURE_VERSION) {
                return null;
            }
            return [...record.thumbnails];
        } finally {
            db.close();
        }
    } catch {
        return null;
    }
}

export async function writeFilmstripCache(
    input: FilmstripCacheLookup,
    thumbnails: string[],
): Promise<void> {
    if (!input.shortVideoId || input.durationSec <= 0 || thumbnails.length === 0) {
        return;
    }

    try {
        const db = await openFilmstripDb();
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const record: FilmstripCacheRecord = {
                key: buildFilmstripCacheKey(input),
                shortVideoId: input.shortVideoId,
                renderedAt: String(input.renderedAt || '').trim() || 'unknown',
                durationSec: input.durationSec,
                intervalSec: AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC,
                captureVersion: AGENT_VIDEO_FILMSTRIP_CAPTURE_VERSION,
                thumbnails: [...thumbnails],
                savedAt: Date.now(),
            };
            store.put(record);
            await waitForTransaction(tx);
        } finally {
            db.close();
        }
    } catch {
        // cache write is best-effort
    }
}

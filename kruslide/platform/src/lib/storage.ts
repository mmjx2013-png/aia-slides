import type { Env } from '../env';
import { HttpError } from './http';

/**
 * Where deck files live. Production: the private R2 bucket (binding DECKS). The demo (no R2 on that account):
 * Workers Static Assets (binding ASSETS) with `run_worker_first = true`, so the files are never served directly:
 * every request reaches the Worker first, and only the access-checked routes below read a file.
 * Keys are the same in both: units/<id>/index.html, units/<id>/<asset>, shared/fonts/<file>, shared/quiz/<file>.
 */
export interface StoredFile { body: ReadableStream | null; etag?: string; }

export interface DeckStorage {
  readonly kind: 'r2' | 'assets' | 'kv';
  get(key: string): Promise<StoredFile | null>;
  put(key: string, text: string, contentType: string, meta?: Record<string, string>): Promise<void>;
  delete(keys: string | string[]): Promise<void>;
}

/** Only the key shapes the app uses; nothing with "..", "//", a backslash or a scheme. */
export const SAFE_KEY = /^(units\/[1-9]\d{0,9}|shared\/(fonts|quiz))\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}(\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}){0,3}$/;
export function safeKey(key: string): boolean {
  return SAFE_KEY.test(key) && !key.includes('..');
}

export function r2Storage(bucket: R2Bucket): DeckStorage {
  return {
    kind: 'r2',
    async get(key) {
      if (!safeKey(key)) return null;
      const obj = await bucket.get(key);
      return obj ? { body: obj.body, etag: obj.httpEtag } : null;
    },
    async put(key, text, contentType, meta) {
      if (!safeKey(key)) throw new HttpError(400, 'ชื่อไฟล์ไม่ถูกต้อง');
      await bucket.put(key, text, { httpMetadata: { contentType }, customMetadata: meta });
    },
    async delete(keys) {
      const list = (Array.isArray(keys) ? keys : [keys]).filter(safeKey);
      if (list.length) await bucket.delete(list);
    },
  };
}

/** Read-only: the files are part of the deployed Worker (demo). */
export function assetStorage(assets: Fetcher): DeckStorage {
  return {
    kind: 'assets',
    async get(key) {
      if (!safeKey(key)) return null;
      const res = await assets.fetch(new Request(`https://assets.invalid/${key}`));
      if (res.status !== 200) { await res.body?.cancel(); return null; }
      return { body: res.body, etag: res.headers.get('ETag') ?? undefined };
    },
    async put() {
      throw new HttpError(409, 'เว็บทดลองแก้ไฟล์สไลด์ไม่ได้ (ไฟล์ตัวอย่างติดมากับเว็บ) ใช้หน่วยที่มีอยู่ได้เลย');
    },
    async delete() { /* the files ship with the Worker; deleting the unit row is enough */ },
  };
}

/** Read-only demo store in Workers KV: the deploy script uploads the sample files; only the access-checked routes read them. */
export function kvStorage(ns: KVNamespace): DeckStorage {
  return {
    kind: 'kv',
    async get(key) {
      if (!safeKey(key)) return null;
      const body = await ns.get(key, 'stream');
      return body ? { body } : null;
    },
    async put() {
      throw new HttpError(409, 'เว็บทดลองแก้ไฟล์สไลด์ไม่ได้ (ไฟล์ตัวอย่างติดมากับเว็บ) ใช้หน่วยที่มีอยู่ได้เลย');
    },
    async delete() { /* the sample files stay; deleting the unit row is enough */ },
  };
}

export function storage(env: Env): DeckStorage {
  if (env.DECKS) return r2Storage(env.DECKS);
  if (env.DEMO_FILES) return kvStorage(env.DEMO_FILES);
  if (env.ASSETS) return assetStorage(env.ASSETS);
  throw new HttpError(500, 'ยังไม่ได้ตั้งค่าที่เก็บไฟล์สไลด์ (DECKS, DEMO_FILES หรือ ASSETS)');
}

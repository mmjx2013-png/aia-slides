import { HttpError } from './http';

/** Input validation helpers. Every value from a form passes through one of these. */

/** Trim, normalise Unicode, remove control characters and collapse whitespace. */
export function cleanText(v: unknown, { max, min = 0, field }: { max: number; min?: number; field: string }): string {
  const s = typeof v === 'string' ? v : '';
  const out = s.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (out.length < min) throw new HttpError(400, `กรุณากรอก${field}`, field);
  if (out.length > max) throw new HttpError(400, `${field}ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร)`, field);
  return out;
}

export function int(v: unknown, { min, max, field }: { min: number; max: number; field: string }): number {
  const s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
  if (!/^-?\d{1,9}$/.test(s)) throw new HttpError(400, `${field} ต้องเป็นตัวเลข`, field);
  const n = Number(s);
  if (n < min || n > max) throw new HttpError(400, `${field} ต้องอยู่ระหว่าง ${min} ถึง ${max}`, field);
  return n;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
  throw new HttpError(400, `${field} ไม่ถูกต้อง`, field);
}

/** A numeric id from the URL. */
export function idParam(v: string | undefined): number {
  if (!v || !/^[1-9]\d{0,9}$/.test(v)) throw new HttpError(404, 'ไม่พบหน้านี้');
  return Number(v);
}

export const LINE_USER_ID = /^U[0-9a-f]{32}$/;

/** Read a form body (urlencoded or multipart) with a size cap. JSON and other types are refused. */
export async function readForm(req: Request, maxBytes = 64 * 1024): Promise<FormData> {
  const type = (req.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('application/x-www-form-urlencoded') && !type.startsWith('multipart/form-data')) {
    throw new HttpError(415, 'รูปแบบข้อมูลไม่ถูกต้อง');
  }
  const tooBig = () => new HttpError(413, 'ไฟล์หรือข้อมูลใหญ่เกินไป');
  const declared = req.headers.get('Content-Length');
  if (declared !== null && !(Number(declared) <= maxBytes)) throw tooBig();
  let source: Request = req;
  if (declared === null && req.body) {
    // No length given (chunked upload): read at most maxBytes, so a huge body cannot exhaust the Worker's memory.
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel().catch(() => {}); throw tooBig(); }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { body.set(c, at); at += c.byteLength; }
    source = new Request(req.url, { method: 'POST', headers: { 'Content-Type': req.headers.get('Content-Type')! }, body });
  }
  try {
    return await source.formData();
  } catch {
    throw new HttpError(400, 'อ่านข้อมูลฟอร์มไม่ได้');
  }
}

export function str(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
}

/** Small WebCrypto helpers: random tokens, base64url, SHA-256 and HMAC with constant-time comparison. */
const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('bad base64url');
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(data: string | Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data);
}

export async function sha256url(data: string): Promise<string> {
  return b64url(await sha256(data));
}

export async function sha256hex(data: string | Uint8Array): Promise<string> {
  return [...new Uint8Array(await sha256(data))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const keyCache = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string): Promise<CryptoKey> {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    keyCache.set(secret, k);
  }
  return k;
}

export async function hmac(secret: string, data: string): Promise<string> {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data)));
}

/** Constant-time string comparison (lengths are not secret here: both sides are fixed-length encodings). */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function hmacVerify(secret: string, data: string, sig: string): Promise<boolean> {
  return safeEqual(await hmac(secret, data), sig);
}

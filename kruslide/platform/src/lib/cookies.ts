export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const piece of header.split(';')) {
    const i = piece.indexOf('=');
    if (i < 1) continue;
    const name = piece.slice(0, i).trim();
    const value = piece.slice(i + 1).trim();
    if (name && !(name in out)) out[name] = value;
  }
  return out;
}

export interface CookieOptions { maxAge?: number; path?: string; sameSite?: 'Lax' | 'Strict'; }

/** Every cookie we set is HttpOnly and Secure. Names start with __Host- so they are bound to this host and path=/. */
export function setCookie(name: string, value: string, o: CookieOptions = {}): string {
  const bits = [`${name}=${value}`, `Path=${o.path ?? '/'}`, 'HttpOnly', 'Secure', `SameSite=${o.sameSite ?? 'Lax'}`];
  if (o.maxAge !== undefined) bits.push(`Max-Age=${Math.max(0, Math.floor(o.maxAge))}`);
  return bits.join('; ');
}

export function clearCookie(name: string): string {
  return setCookie(name, '', { maxAge: 0 });
}

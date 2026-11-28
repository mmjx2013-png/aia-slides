/**
 * HTML output with escaping by default. Every value put into an html`` template is escaped unless it is
 * already Safe (the result of another html`` template or of raw() on trusted, constant markup).
 */
export class Safe {
  constructor(readonly value: string) {}
  toString(): string { return this.value; }
}

const MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;' };

export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"'`=]/g, (c) => MAP[c]);
}

function part(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Safe) return v.value;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Safe {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new Safe(out);
}

/** Mark constant, trusted markup as safe. Never pass user input. */
export function raw(markup: string): Safe { return new Safe(markup); }

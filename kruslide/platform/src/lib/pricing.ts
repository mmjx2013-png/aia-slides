/**
 * Prices (owner-approved, 28 Nov 2026): lesson slides cost 3–5 baht per slide per month.
 * monthly_price = slide_count × rate_baht_per_slide. Several months are simply months × monthly price (no discount yet).
 */
export const RATE_MIN = 3;
export const RATE_MAX = 5;
export const MONTH_OPTIONS = [1, 3, 6, 12] as const;

export function monthlyPrice(slideCount: number, rate: number): number {
  if (!Number.isInteger(slideCount) || slideCount < 1) throw new RangeError('slide_count must be a whole number of 1 or more');
  if (!Number.isInteger(rate) || rate < RATE_MIN || rate > RATE_MAX) throw new RangeError(`rate must be a whole number from ${RATE_MIN} to ${RATE_MAX} baht`);
  return slideCount * rate;
}

export function totalPrice(monthly: number, months: number): number {
  if (!(MONTH_OPTIONS as readonly number[]).includes(months)) throw new RangeError('months must be 1, 3, 6 or 12');
  if (!Number.isInteger(monthly) || monthly < 1) throw new RangeError('monthly price must be a positive whole number');
  return monthly * months;
}

/** About how much a day: used in the UI ("≈ 10 บาท/วัน"). */
export function perDay(monthly: number): number {
  return Math.max(1, Math.round(monthly / 30));
}

/** Add calendar months to a Unix time (UTC). 31 Jan + 1 month = 28/29 Feb. */
export function addMonths(t: number, months: number): number {
  const d = new Date(t * 1000);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return Math.floor(d.getTime() / 1000);
}

export function baht(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

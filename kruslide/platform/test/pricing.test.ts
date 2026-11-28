import { describe, it, expect } from 'vitest';
import { addMonths, monthlyPrice, perDay, totalPrice } from '../src/lib/pricing';
import { call, makeBook, makeUnit, newMember } from './helpers';

describe('price calculation: slide_count × rate (3–5 baht per slide per month)', () => {
  it('matches the owner\'s example: a 67-slide unit costs 201–335 baht a month', () => {
    expect(monthlyPrice(67, 3)).toBe(201);
    expect(monthlyPrice(67, 4)).toBe(268);
    expect(monthlyPrice(67, 5)).toBe(335);
    expect(monthlyPrice(1, 3)).toBe(3);
  });

  it('refuses rates outside 3–5, fractions, and empty books', () => {
    for (const rate of [0, 2, 6, 3.5, -3, NaN]) expect(() => monthlyPrice(67, rate)).toThrow(RangeError);
    for (const slides of [0, -1, 2.5, NaN]) expect(() => monthlyPrice(slides, 3)).toThrow(RangeError);
  });

  it('several months are months × the monthly price, only 1, 3, 6 or 12', () => {
    expect(totalPrice(201, 1)).toBe(201);
    expect(totalPrice(201, 3)).toBe(603);
    expect(totalPrice(335, 12)).toBe(4020);
    for (const m of [0, 2, 13, 1.5]) expect(() => totalPrice(201, m)).toThrow(RangeError);
  });

  it('per-day figure for the UI (300 baht a month ≈ 10 baht a day)', () => {
    expect(perDay(300)).toBe(10);
    expect(perDay(201)).toBe(7);
    expect(perDay(3)).toBe(1);
  });

  it('adds calendar months, clamping to the end of shorter months', () => {
    const t = (s: string) => Date.parse(s) / 1000;
    expect(addMonths(t('2026-01-15T05:00:00Z'), 1)).toBe(t('2026-02-15T05:00:00Z'));
    expect(addMonths(t('2026-01-31T00:00:00Z'), 1)).toBe(t('2026-02-28T00:00:00Z'));
    expect(addMonths(t('2028-01-31T00:00:00Z'), 1)).toBe(t('2028-02-29T00:00:00Z'));
    expect(addMonths(t('2026-11-28T00:00:00Z'), 12)).toBe(t('2027-11-28T00:00:00Z'));
  });

  it('the member pages show the computed price', async () => {
    const book = await makeBook({ rate: 3 });
    await makeUnit(book, { slides: 67 });
    const who = await newMember();
    const page = await (await call(`/app/books/${book}`, { cookie: who.cookie })).text();
    expect(page).toContain('201 <small>บาท/เดือน</small>');
    expect(page).toContain('67 สไลด์ × 3 บาท');
    expect(page).toContain('3 เดือน · 603 บาท');
  });
});

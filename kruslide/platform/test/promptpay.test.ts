import { describe, it, expect } from 'vitest';
import { promptPayPayload, promptPayTarget, promptPaySvg, maskTarget } from '../src/lib/promptpay';

// Reference payloads produced by the widely used `promptpay-qr` library (npm), for the same inputs.
const VECTORS: [string, number, string][] = [
  ['0812345678', 201, '00020101021229370016A000000677010111011300668123456785802TH53037645406201.0063044D96'],
  ['0812345678', 603.5, '00020101021229370016A000000677010111011300668123456785802TH53037645406603.5063042C04'],
  ['1234567890123', 335, '00020101021229370016A000000677010111021312345678901235802TH53037645406335.006304001C'],
  ['123456789012345', 12.34, '00020101021229390016A00000067701011103151234567890123455802TH5303764540512.346304E593'],
];

describe('PromptPay QR payload', () => {
  for (const [id, amount, expected] of VECTORS) {
    it(`matches the reference for ${id.length} digits, ${amount} baht`, () => {
      expect(promptPayPayload(id, amount)).toBe(expected);
    });
  }
  it('accepts formatted numbers and refuses bad IDs', () => {
    expect(promptPayTarget('081-234-5678')).toBe('0812345678');
    expect(promptPayTarget('12345')).toBeNull();
    expect(promptPayTarget(undefined)).toBeNull();
    expect(() => promptPayPayload('12345', 10)).toThrow();
    expect(() => promptPayPayload('0812345678', 0)).toThrow();
  });
  it('renders an SVG and masks the number', () => {
    expect(promptPaySvg('test')).toMatch(/^<svg role="img" aria-label="PromptPay QR" class="qr" /);
    expect(maskTarget('0812345678')).toBe('••••••5678');
  });
});

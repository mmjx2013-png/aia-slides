import { renderSVG } from 'uqr';

/**
 * Thai PromptPay QR (EMVCo merchant-presented payload, tag 29 = PromptPay credit transfer).
 * Target: mobile number (10 digits, 0XXXXXXXXX), national / tax ID (13 digits) or e-wallet ID (15 digits).
 */
function f(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function promptPayTarget(id: string | undefined): string | null {
  const digits = (id || '').replace(/[^0-9]/g, '');
  if (/^0\d{9}$/.test(digits) || /^\d{13}$/.test(digits) || /^\d{15}$/.test(digits)) return digits;
  return null;
}

export function promptPayPayload(target: string, amountBaht: number): string {
  const digits = promptPayTarget(target);
  if (!digits) throw new RangeError('PromptPay ID must be a mobile number, a 13-digit ID or a 15-digit e-wallet ID');
  if (!(amountBaht > 0) || amountBaht > 9_999_999) throw new RangeError('amount out of range');
  const type = digits.length >= 15 ? '03' : digits.length >= 13 ? '02' : '01';
  const formatted = digits.length >= 13 ? digits : ('0000000000000' + digits.replace(/^0/, '66')).slice(-13);
  const body = [
    f('00', '01'),
    f('01', '12'),                                   // dynamic: the amount is in the code
    f('29', f('00', 'A000000677010111') + f(type, formatted)),
    f('58', 'TH'),
    f('53', '764'),
    f('54', amountBaht.toFixed(2)),
  ].join('') + '6304';
  return body + crc16(body);
}

/** The QR as inline SVG (fill attributes only, so it works under a strict CSP with no inline styles). */
export function promptPaySvg(payload: string): string {
  return renderSVG(payload, { ecc: 'M', border: 2, pixelSize: 8 })
    .replace('<svg ', '<svg role="img" aria-label="PromptPay QR" class="qr" ');
}

/** Show only the last digits of the PromptPay target on the page. */
export function maskTarget(digits: string): string {
  return digits.replace(/\d(?=\d{4})/g, '•');
}

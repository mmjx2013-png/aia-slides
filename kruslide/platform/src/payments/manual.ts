import type { PaymentProvider } from './index';
import { maskTarget, promptPayPayload, promptPaySvg, promptPayTarget } from '../lib/promptpay';

/** Manual PromptPay: the member scans a QR with the exact amount; the owner confirms on /app/admin/. */
export const manualPromptPay: PaymentProvider = {
  id: 'manual',
  async start(env, payment) {
    const amountBaht = payment.amount_satang / 100;
    const target = promptPayTarget(env.PROMPTPAY_ID);
    if (!target) return { kind: 'instructions', amountBaht, qrSvg: null, targetMasked: null, configured: false };
    return { kind: 'instructions', amountBaht, qrSvg: promptPaySvg(promptPayPayload(target, amountBaht)), targetMasked: maskTarget(target), configured: true };
  },
};

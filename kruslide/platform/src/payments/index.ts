import type { Env, Payment } from '../env';
import { manualPromptPay } from './manual';
import { stripeProvider } from './stripe';

/**
 * The payment seam. A provider turns a pending payment into what the member sees next:
 *  - 'instructions': show a PromptPay QR and wait for the owner to confirm in admin (manual, now);
 *  - 'redirect': send the member to a hosted checkout page (Stripe Thailand, later).
 * Whatever the provider, a payment is activated only by confirmPayment() in src/db.ts: from the admin page for
 * manual payments, and from a verified webhook for Stripe.
 */
export type PaymentStart =
  | { kind: 'instructions'; amountBaht: number; qrSvg: string | null; targetMasked: string | null; configured: boolean }
  | { kind: 'redirect'; url: string };

export interface PaymentProvider {
  readonly id: Payment['provider'];
  start(env: Env, payment: Payment, origin: string): Promise<PaymentStart>;
}

export function paymentProvider(env: Env): PaymentProvider {
  return env.PAYMENT_PROVIDER === 'stripe' ? stripeProvider : manualPromptPay;
}

export function providerFor(payment: Payment): PaymentProvider {
  return payment.provider === 'stripe' ? stripeProvider : manualPromptPay;
}

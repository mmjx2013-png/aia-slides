import type { PaymentProvider } from './index';
import { HttpError } from '../lib/http';

/**
 * Stripe Thailand: NOT ENABLED YET. This is the seam to fill in later, without touching the rest of the app:
 *
 *  1. Secrets: `wrangler secret put STRIPE_SECRET_KEY` and `wrangler secret put STRIPE_WEBHOOK_SECRET`.
 *  2. start(): create a Checkout Session with fetch('https://api.stripe.com/v1/checkout/sessions', …):
 *       mode=payment, currency=thb, unit_amount = payment.amount_satang, payment_method_types[]=card&promptpay,
 *       client_reference_id = payment.id, success_url/cancel_url = origin + '/app/payments/' + payment.id.
 *     Save the session's payment_intent id into payments.ref, then return { kind: 'redirect', url: session.url }.
 *  3. Webhook POST /app/webhooks/stripe (see src/routes/webhooks.ts): verify the Stripe-Signature header with
 *     HMAC-SHA256 over "<t>.<raw body>" using STRIPE_WEBHOOK_SECRET, reject old timestamps, then on
 *     checkout.session.completed call confirmPayment(env, client_reference_id, 'stripe', now). It is idempotent.
 *  4. Set PAYMENT_PROVIDER = "stripe" in wrangler.toml.
 * The CSP form-action must then also allow https://checkout.stripe.com (a redirect after POST counts).
 */
export const stripeProvider: PaymentProvider = {
  id: 'stripe',
  async start() {
    throw new HttpError(503, 'การชำระเงินด้วยบัตรยังไม่เปิดใช้ กรุณาใช้ PromptPay');
  },
};

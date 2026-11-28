import { textResponse } from '../lib/http';

/**
 * POST /app/webhooks/stripe: reserved for Stripe Thailand (see src/payments/stripe.ts for the steps).
 * Until it is implemented it refuses everything, so nothing can activate a subscription through it.
 */
export function stripeWebhook(): Response {
  return textResponse('Stripe is not enabled', 501);
}

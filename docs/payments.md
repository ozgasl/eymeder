# Ödemeler (Payments)

Provider-agnostic groundwork. No gateway is contracted yet; only `bank_transfer` is enabled.
`iyzico` and `payment_link` are registered as disabled stubs ("henüz etkin değil").

## Layout

- `src/lib/payments/types.ts` - `PaymentProvider` interface.
- `src/lib/payments/registry.ts` - `getProvider(id)`, `listEnabledProviders()`.
- `src/lib/payments/bankTransfer.ts` - manual provider (bank info from `BANK_*` env, with defaults).
- `src/lib/payments/callbackLogic.ts` - pure functions: order update plan, event row, duplicate detection.
- `src/pages/api/payments/[provider]/initialize.ts` and `callback.ts` - server routes (service-role client).
- `src/services/paymentService.ts` - client helpers (`initializePayment`, `listPaymentMethods`, `getBankInfo`, payment links).

## Adding a provider adapter

1. Create `src/lib/payments/<name>.ts` exporting a `PaymentProvider`. Read credentials from server-only env vars (no `NEXT_PUBLIC_`), using plain `fetch` or the provider SDK.
2. `initialize({ order, buyer, returnUrl })` returns `{status:'redirect', url}` (hosted page), `{status:'manual', ...}` or `{status:'error', message}`. Use `order.amount` as given; it comes from the DB.
3. `handleCallback(req)` must verify the provider's signature/token (or re-query the provider) and throw on anything invalid. Return `{ providerEventId, orderId, outcome, reference, raw }`. `providerEventId` must be stable per delivery (the provider's event/transaction id) so retries collide.
4. Replace the stub in `registry.ts` and make `enabled()` return true only when the env vars are set.
5. Add the id to the `orders.payment_method` CHECK constraint if it is not `bank_transfer` / `iyzico` / `payment_link` (new migration).
6. Add env placeholders to `.env.example` and tests for the adapter's mapping.
7. Register `POST /api/payments/<name>/callback` as the webhook URL at the provider. If the provider returns the buyer with a GET, handle that on a page that reads the order status; the webhook stays the source of truth.

## Callback idempotency

`payment_events` has `UNIQUE (provider, provider_event_id)`. The callback route inserts the event first:

- unique violation -> already handled, respond `200 {duplicate:true}` without touching the order;
- otherwise apply `planOrderUpdate`, guarded by `.eq('payment_status', <value read>)` so concurrent deliveries cannot overwrite each other;
- if the order update fails, the event row is deleted so the provider's retry is processed.

`planOrderUpdate` never regresses state (a late `failed` after `paid` is ignored; `refunded` only follows `paid`). `paid` on a `pending` order also sets `status='confirmed'`; the DB trigger adjusts stock.

## Security rules

- The amount always comes from `orders.total_amount` in the DB. The client sends only `orderId`.
- `initialize` requires a signed-in user and an order that belongs to them with `payment_status='pending'`.
- Secrets are server-only env vars. Never prefix them with `NEXT_PUBLIC_`; never import adapters from React components.
- `payment_events` is written only with the service role (RLS has no insert policy); staff can read it.
- Unknown provider -> 404, disabled provider -> 501, non-POST -> 405, all JSON in Turkish.

## Note

`.gitignore` contains `.env*`, so `.env.example` is currently ignored by git; add `!.env.example` to track it.

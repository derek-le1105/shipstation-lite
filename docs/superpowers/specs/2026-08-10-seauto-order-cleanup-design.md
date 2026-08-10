# SEAuto Order Cleanup — Design

## Problem

When a multi-package (and possibly single-package) shipping label is created through
`createShippingLabelAction` (`lib/actions/shipping.ts`), the call to ShipStation's V2
`createShipment` API (`POST /v2/labels`) does not create a real ShipStation "order" —
it only creates a shipment. Because no `shipment_number` is supplied and no sales order
is explicitly created (`create_sales_order` is never set), ShipStation auto-generates a
placeholder order number prefixed `SEAuto-` for the shipment/packages and surfaces it as
a normal order in ShipStation's own dashboard (ship.shipstation.com). These accumulate as
clutter in ShipStation's UI — they are not visible anywhere in this app's own UI or
Supabase tables.

Preventing their creation would require restructuring how shipments are created against
the V2 API (e.g. supplying `shipment_number`/using a real sales-order flow), which is out
of scope. Instead, this design cancels the auto-created orders immediately after each
label creation, via ShipStation's legacy V1 API (the only API surface that exposes an
order-status field for this).

## Goals

- After every successful `createShippingLabelAction` call, any `SEAuto-` prefixed orders
  sitting in `awaiting_shipment` status in the connected ShipStation account are moved to
  `cancelled` status, removing them from ShipStation's active order views.
- Cleanup never blocks or fails label creation. The label/shipment/tracking data already
  saved to Supabase is the source of truth for this app; ShipStation dashboard tidiness is
  a best-effort side effect.

## Non-goals

- Preventing `SEAuto` order creation at the source (would require reworking the V2
  shipment-creation payload/flow).
- Per-shipment precise matching (e.g. by tracking number or a shipment-specific token).
  Matching is intentionally by `orderNumber` prefix + status only (see Risks).
- Any change to Supabase schema or to the `shipping_labels` table — this is a pure
  ShipStation-side side effect.
- A scheduled/background sweep. Only the immediate, post-creation cleanup is in scope.

## Design

### 1. New V1 client module — `lib/shipstation/v1-client.ts`

A new module, parallel to the existing `lib/shipstation/client.ts` (which only talks to
V2), for the legacy V1 API (`https://ssapi.shipstation.com`).

- **Auth**: HTTP Basic Auth using two new env vars, `SHIPSTATION_V1_API_KEY` and
  `SHIPSTATION_V1_API_SECRET`. Config resolution follows the same pattern as
  `getConfig()` in `client.ts` — throw a clear error if either var is missing.
- **`cancelSeAutoOrders(): Promise<{ cancelled: number; orderNumbers: string[] }>`**
  1. `GET /orders?orderNumber=SEAuto&orderStatus=awaiting_shipment&pageSize=500` — the
     `orderNumber` filter on this endpoint performs a "starts with" match, so this
     returns exactly the auto-generated, still-open orders.
  2. If `pages > 1` in the response, page through with `&page=N` until all matches are
     collected (unlikely in practice, but the endpoint caps at 500/page).
  3. For each matched order object returned by the list call, mutate only
     `orderStatus` to `"cancelled"` (leaving every other field as returned — the V1
     update endpoint requires the full object, not a partial patch) and
     `POST /orders/createorder` with that object.
  4. Each cancel call is awaited individually inside a `Promise.allSettled` (not
     `Promise.all`) so one failing order doesn't prevent others from being cancelled.
  5. Return a summary (`cancelled` count and the list of `orderNumber`s actually
     cancelled) for logging by the caller. Orders that failed to cancel are logged
     inside this function and excluded from the returned list, not thrown.

### 2. Wiring into `createShippingLabelAction`

In `lib/actions/shipping.ts`, immediately after `labelResponse` is successfully obtained
from `createShipment` (after the try/catch around line ~365-390, before or alongside the
Supabase insert loop):

```ts
try {
  const { cancelled, orderNumbers } = await cancelSeAutoOrders();
  if (cancelled > 0) {
    console.log("Cancelled SEAuto orders:", orderNumbers);
  }
} catch (cleanupErr) {
  console.log("cancelSeAutoOrders failed:", cleanupErr);
}
```

- This call is fire-and-forget with respect to the action's return value: its
  success/failure never changes `CreateShippingLabelState.status` or `message`.
- Runs on every call (single- or multi-package), since a no-match result is cheap and
  harmless.
- Placement after label creation succeeds but does not need to wait for the Supabase
  insert loop to finish — it can run independently since it has no data dependency on
  the saved `ShippingLabelRecord`s.

### 3. Env / config

Add two new required env vars, documented alongside the existing
`SHIPSTATION_V2_API_KEY`:

- `SHIPSTATION_V1_API_KEY`
- `SHIPSTATION_V1_API_SECRET`

Placeholders will be added to the project's `.env` file (not real values — the user will
supply and manage the actual secret values themselves, per the earlier interview: V1
credentials are available and will be generated by the user before this ships).

## Data flow

```
createShippingLabelAction
  -> createShipment (V2)                 // existing, unchanged
  -> insertShippingLabel loop (Supabase)  // existing, unchanged
  -> cancelSeAutoOrders() (V1, new)       // new, best-effort, non-blocking
       -> GET /orders?orderNumber=SEAuto&orderStatus=awaiting_shipment
       -> POST /orders/createorder (orderStatus: cancelled)  [per match]
```

## Error handling

- V1 credential misconfiguration (missing env vars): thrown inside `v1-client.ts`,
  caught by the wrapping try/catch in `createShippingLabelAction`, logged, swallowed.
- V1 API errors (4xx/5xx) on the list call: caught, logged, treated as zero matches —
  no orders cancelled this pass, no user-facing error.
- V1 API errors on an individual cancel POST: caught per-order via
  `Promise.allSettled`, logged with the offending `orderNumber`, does not affect
  other orders in the same batch.

## Risks (accepted, not mitigated further)

- **Prefix-only matching, no per-shipment token.** `orderNumber` starts-with `SEAuto`
  plus `orderStatus=awaiting_shipment` is the only filter — there is no way to scope
  the match to *this specific* shipment's auto-created order(s). Under concurrent use
  (two users creating shipments against the same ShipStation account within moments of
  each other), a single cleanup pass could cancel a `SEAuto` order that originated from
  a different, still-in-flight request rather than the one that triggered this cleanup
  call. Since `SEAuto` orders are placeholder records with no real fulfillment meaning
  and every request also triggers its own cleanup pass, the practical effect is
  negligible — the other request's order gets cancelled slightly early by this pass
  instead of by its own. This was discussed and explicitly accepted in favor of
  simplicity over exact-match complexity (e.g. cross-referencing tracking numbers).
- **No sandbox for validation.** ShipStation platform users (V1/V2) have no sandbox
  environment, so this can only be validated against production with a real shipment.

## Testing

- Manual validation: create a real multi-package label through the app, confirm in
  ShipStation's dashboard that any `SEAuto-` orders it produced move to `cancelled`
  status shortly after.
- Unit-level: `cancelSeAutoOrders` can be tested by mocking the V1 `fetch` calls (list
  response with N matches, verify N `createorder` POSTs are issued with
  `orderStatus: "cancelled"` and all other fields unchanged from the list response).
- Verify a missing/invalid `SHIPSTATION_V1_API_KEY`/`SECRET` does not throw out of
  `createShippingLabelAction` (label creation still returns `status: "success"`).

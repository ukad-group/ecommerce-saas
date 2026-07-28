# Payment webhook hardening — progress

Idempotent-consumer webhook pipeline, failure-event handling, a provider-agnostic contract verified
against seven gateways, and the Nets consumer-prefill fix.

Full rationale, the cross-gateway comparison and the verification script live in the approved plan;
this file tracks execution. Each step is built + tested and confirmed before the next one starts.

## Status

| # | Step | State |
| --- | --- | --- |
| 1 | Data layer — dedup table, `Order.PaymentWebhookSecret` / `PaymentError`, indexed lookup | ✅ |
| 2 | Generic webhook contract + Nets conformance + pipeline (verify → dedup → rank → apply) | ✅ |
| 3 | `OrderStatusService` — shared status transition so webhook-paid orders decrement stock | ✅ |
| 4 | Nets consumer prefill — complete address, phone, `consumerType`, sanitising, diagnostics | ✅ |
| 5 | Docs — `docs/PAYMENT-PROVIDERS.md` | ✅ |

Ordering differs from the plan's narrative order so every step compiles and can be tested on its
own: the data layer lands before the pipeline that uses it, and `OrderStatusService` lands after the
pipeline (which keeps the existing direct status write until then).

## Notes as we go

### Step 1 — data layer ✅

- `PaymentWebhookEvent` entity + `DbSet`. `Id = "{provider}:{idempotency key}"`, so the primary key
  itself does the deduplication — `DataStore.TryRecordWebhookEvent` inserts and treats a
  `DbUpdateException` as "already processed". No read-then-write race.
- `Order.PaymentWebhookSecret` and `Order.PaymentError` (both nullable TEXT).
- `SchemaUpgrader.EnsurePaymentWebhookSchema` — additive `ALTER TABLE` + `CREATE TABLE IF NOT
  EXISTS` + `CREATE INDEX IF NOT EXISTS`, called from `Program.cs` after `EnsureCreated()`.
  The existing column-adding logic was factored into shared `WithConnection` / `AddColumns` /
  `Execute` helpers rather than copied.
- `DataStore.GetOrderByPaymentReference` + an index on `Orders.PaymentReference`, replacing the
  `GetAllOrders().FirstOrDefault(...)` cross-tenant full scan the webhook currently does.
- Tests (`PaymentWebhookStoreTests.cs`): a pre-existing Orders table upgrades in place with its rows
  intact and the upgrade is repeatable; recording the same event twice returns true then false.

Build green, 35/35 tests pass.

_Not yet verified against the real `ecomm.db`_ — deferred to the end-to-end run so the API is only
started once. The change is additive-only, and `.bak` copies already exist.

### Step 2 — contract, Nets conformance, pipeline ✅

**Generic layer** (`EComm.Payment`, no gateway names anywhere in it):
- `PaymentState` enum (`Initialized → Authorized → Captured → Cancelled → Failed → Refunded`).
  Declaration order *is* the rank; `PaymentStates.Advances` is the only place out-of-order delivery
  is reasoned about. Persisted on `Order.PaymentStatus` by name, so existing rows keep working and
  an unparseable legacy value never blocks an update.
- `WebhookResult` → `{ PaymentReference, IdempotencyKey, EventName, NewState?, Error? }`, returned
  as an `IReadOnlyList` (gateways that batch), with `PaymentError { Code, Message }`.
- `WebhookContext { Request, Func<string, WebhookSettings?> ResolveSettings }` — the lazy resolver
  is what lets a provider fetch credentials it can only find *via* the body, and is what makes a
  Mollie-style "body has no status, go ask the API" provider implementable at all.
- `IPaymentProvider.VerifyWebhookAsync(context)` is default-implemented, so verification is opt-in
  and the pipeline only enforces it for payments where the provider issued a `WebhookSecret`.
- `PaymentCreationContext.WebhookUrl` in, dead `ApiKey` out; `PaymentCreationResult.WebhookSecret`
  in. `PaymentSettings.Read<T>` is now the single settings deserializer both contexts call.

**Nets provider**: `IHttpContextAccessor` and the hardcoded ngrok URL are gone (so `Program.cs` no
longer registers the accessor and the 8 test constructor edits are reverted). The per-payment
`authorization` is a 32-char `Guid("N")` — the old value was the order number, which Nets rejects
outright for not being 8–64 alphanumeric. All ten handled events are now registered instead of just
`payment.checkout.completed`, the array serialises as `webHooks` per the API reference, failure
events carry `error{code,message,source}`, and `VerifyWebhookAsync` constant-time compares the
`Authorization` header.

**Pipeline** (`PaymentsController`): `EnableBuffering` → verify (401, deliberately *not* acked) →
per result: resolve order → `TryRecordWebhookEvent` → apply only if the state advances. Failures
record `Order.PaymentError` and leave `Order.Status` alone. Everything else still acks 200 so the
gateway stops retrying. Order lookup is memoised per request. Create-payment is now `[Authorize]`
(JWT or `X-API-Key` — the Umbraco plugin already sends the latter) and the webhook `[AllowAnonymous]`.
`Payments:PublicBaseUrl` added to `appsettings.json`, blank by default, falling back to the request
host; `api/EComm.Api/Helpers/` deleted.

Build green, 64/64 tests pass. New coverage: event→state map incl. every failure event, error
extraction, unparseable body, header verification (right/wrong/absent/no-stored-secret), redelivery
applied once, out-of-order not downgrading, batched multi-payment POST, and body-hash dedup for
gateways with no event id.

**Deferred to step 3**: a successful webhook still writes `order.Status` directly, so it does not yet
decrement stock.

### Step 3 — shared order-status transition ✅

`api/EComm.Api/Services/OrderStatusService.cs` (static — it has no state beyond `DataStore.Instance`,
so no DI wiring). Holds the whole transition: stock validation → status write → tracking number →
stock reserve/release. It mutates the order and writes stock; the caller persists the order, so each
caller still does exactly one order write.

- `OrdersController.UpdateOrderStatus` shrank from ~95 lines to 3 and behaves identically.
- The webhook now calls it too. If stock validation fails there the payment is already taken, so it
  logs at Error, records the payment state and leaves `Order.Status` alone rather than pretending
  the transition happened.
- **Behaviour fix**: "settled" now means `"paid"` *or* the market's `OrderStatusAfterPayment`,
  instead of a hardcoded `"paid"` string comparison. A market whose paid state is called
  `"processing"` previously never decremented stock — from either the webhook or the HTTP endpoint.

`OrderStatusServiceTests.cs` pins the HTTP path (which had no coverage at all before this refactor):
decrement + tracking on paid, no double decrement, refusal on insufficient stock with nothing
mutated, restore on paid→cancelled, and the custom-status case. Plus a webhook-path test that a
successful payment decrements stock, parameterised over default and custom status.

71/71 tests pass.

**Third caller, fixed on request.** `AdminOrdersController.UpdateOrderStatus`
(`PUT /api/v1/admin/orders/{id}/status`, the React admin dashboard) also wrote `order.Status`
directly with no stock handling, so an admin marking an order paid never reserved stock and
cancelling never released it. It now routes through `OrderStatusService` too. **Visible change**:
that endpoint can now return `400` when there isn't enough stock to mark an order paid, where it
previously always succeeded.

### Step 4 — Nets consumer prefill ✅

Every one of these is a documented Nets rule the previous mapping broke. Nets discards the *whole*
consumer block when part of it is invalid, which is exactly why the page came up blank rather than
half-filled:

- **All-or-nothing address.** Was: emit `shippingAddress` if *street or city* was set, with
  `country: null` when unmappable. Nets requires addressLine1 + postalCode + city + alpha-3 country.
  Now the address is only sent when all four resolve; email and name still go through otherwise.
- **Phone is mapped at all** (`CustomerInfo.Phone` was simply ignored). Split into Nets'
  `prefix` (`^[+]\d{1,3}$`) + digits-only number, via a calling-code table derived from the same
  country list `Alpha2To3` already uses. Handles `+46…`, `0046…` and local `070-…` (code taken from
  the shipping country). Unknown code or unknown country ⇒ omitted, never guessed — the calling
  code's length can't be inferred from the number, and a malformed phone fails the entire call.
- **`consumerType` + `countryCode` added.** `consumerType` governs which consumer fields the page
  renders — without it there is nothing for the prefill to land in. `countryCode` is alpha-3 and
  mandatory for Klarna.
- **Character sanitising.** `< > ' " & \` are unsupported in most Nets fields and 128 chars is the
  cap, so `Sean O'Brien` previously failed the whole create-payment request.
- **New market setting `merchantHandlesConsumerData`** (off by default): off = Nets renders the
  fields prefilled and editable; on = our checkout owns the data and Nets asks only for payment
  details. Both admin UIs render it automatically — they build the form from the provider descriptor
  and already handle `Bool` fields.
- **Diagnostics** in `NetsEasyClient`, which already had the logger: the outbound JSON at Debug
  always, and included in the existing error log on failure. No secrets — the key travels in the
  Authorization header, not the body.

82/82 tests pass. New coverage: incomplete address omitted while email/name survive, seven phone
formats incl. the 3-digit `+358` and both unknown-code cases, apostrophe stripped, consumerType +
countryCode present, and consumerType omitted in merchant-handles mode.

**Still unresolved, and only a live call can settle it**: nothing in this repo calls
`CreatePaymentAsync` — the live caller is Westbay — so the order may simply be arriving with an
empty `Customer`/`ShippingAddress` (`OrdersController.cs:90-92` copies them verbatim from the
create-order request). The Debug log of the outbound JSON answers it in one request: consumer
populated ⇒ the fix above was the problem; consumer empty ⇒ Westbay isn't sending customer data.

### Step 5 — docs ✅

`docs/PAYMENT-PROVIDERS.md`: new provider contract (`WebhookContext`, `WebhookResult`,
`PaymentState`, `VerifyWebhookAsync`, the per-payment `WebhookSecret` round-trip), a "webhook
delivery guarantees" section covering verify → dedupe → forward-only → shared status transition, a
**host configuration** section for `Payments:PublicBaseUrl`, rewritten Nets specifics (prefill rules,
subscriptions, verification, the full event map, diagnostics), and the cross-gateway comparison table
under "Implementing a new provider" so the next integrator can identify their gateway's shape before
writing code. The "webhook signature verification is not yet implemented" security note is replaced
with what actually holds now, including that verification is opt-in per provider.

`api/AGENTS.md`: the two stale claims corrected (the webhook description, and the "known gap" note).

Also added **"Upgrade notes — webhook hardening"** to `docs/PAYMENT-PROVIDERS.md` (linked from the
intro) for sites already integrated: no storefront code changes, but portal-level webhook config must
be removed (it can't carry the per-payment token, so it now 401s and trips the gateway's circuit
breaker), `Payments:PublicBaseUrl` must be set, the API key is now mandatory on create-payment, and
the status endpoints can now return 400 on insufficient stock.

Build green, 82/82 tests pass.

---

## Remaining: live verification

Everything above is verified by unit tests only. Still to do against the real system, in one session:

1. Start the API and confirm the existing `ecomm.db` upgrades in place — `PaymentWebhookEvents`
   exists and `PRAGMA table_info(Orders)` shows `PaymentWebhookSecret` + `PaymentError`, with no
   data loss. (Additive-only, and `.bak` copies exist.)
2. Set `Payments:PublicBaseUrl` to the ngrok URL in `appsettings.Development.json`.
3. Create an order **with customer + shipping address populated**, `POST /orders/{id}/payment` with
   `X-API-Key`, and read the Debug log of the outbound JSON: webhook URLs point at the tunnel,
   `authorization` is 32 alphanumeric chars, `checkout.consumer` is fully populated.
4. Open the redirect URL — are the fields prefilled? If not, the logged JSON says whether the cause
   is ours or Westbay's.
5. Pay in the Nets test environment: `payment.checkout.completed` → `Authorized`, then
   `payment.charge.created.v2` → `Captured`, order status = `OrderStatusAfterPayment`, **stock
   decremented**.
6. Replay the same webhook body twice with the correct `Authorization` header → second call `200`,
   no second stock decrement, one row in `PaymentWebhookEvents`. Wrong header → `401`.
7. Force a decline → `PaymentStatus = Failed`, `PaymentError` holds the Nets code + message,
   `Order.Status` unchanged.

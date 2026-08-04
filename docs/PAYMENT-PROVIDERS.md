# Payment Providers

The platform supports **pluggable payment providers**. A provider is a payment gateway
integration (Nets Easy ships as the first one); each market picks which provider handles its
checkout. Adding a new gateway is a matter of implementing one interface and registering it —
the generic pipeline knows nothing about any specific gateway.

> **Already integrated against an earlier version?** Read
> [Upgrade notes — webhook hardening](#upgrade-notes--webhook-hardening) first. No storefront code
> changes are needed, but portal-level webhook configuration now has to be removed and
> `Payments:PublicBaseUrl` has to be set, or webhooks will fail in ways that are hard to diagnose.

## Architecture

```
Storefront (Umbraco plugin consumer, e.g. Westbay)
   │  ICommerceApiClient.CreatePaymentAsync(orderId)     ← no URLs: they're market configuration
   ▼
EComm.Api  POST /api/v1/orders/{id}/payment
   │  IPaymentProviderResolver.ResolveForMarket(market)   ← market.Settings.PaymentProvider
   ▼
IPaymentProvider  (e.g. NetsEasyPaymentProvider)          → { paymentId, redirectUrl }
   │  gateway REST call
   ▼
Payment gateway hosted checkout  → customer pays → the configured Continue URL
   │  gateway webhook
   ▼
EComm.Api  POST /api/v1/payments/webhook/{provider?}
   │  IPaymentProvider.VerifyWebhookAsync(context)        → 401 if it isn't really the gateway
   │  IPaymentProvider.HandleWebhookAsync(context)        → WebhookResult[]
   │  DataStore.TryRecordWebhookEvent(...)                → drop redeliveries
   ▼
order.PaymentStatus (only ever forward) + OrderStatusService.ApplyStatus on success
```

Payments live in their **own project**, `api/EComm.Payment/` (a class library referenced by
`EComm.Api`), so the abstraction is reusable and the API stays thin.

- **Generic layer** — `api/EComm.Payment/`: `IPaymentProvider`, `IPaymentProviderResolver` /
  `PaymentProviderResolver`, the `PaymentCreationContext` / `PaymentCreationResult` / `WebhookResult`
  models, and `PaymentProviderExtensions.AddPaymentProviders()`. Contains **no** gateway-specific code.
- **Providers** — `api/EComm.Payment/Providers/<Name>/`: one self-contained folder per gateway
  that registers its own dependencies. Nets Easy lives in `Providers/NetsEasy/`.
- **Plugin** — the Umbraco plugin (`EComm.Umbraco.Commerce`) is provider-neutral: it only calls
  `ICommerceApiClient.CreatePaymentAsync(...)` and redirects to the returned URL. It never names a gateway.

## The provider contract

```csharp
public interface IPaymentProvider
{
    string Alias { get; }                                              // e.g. "nets-easy"
    PaymentProviderDescriptor Descriptor { get; }
    Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context);

    Task<bool> VerifyWebhookAsync(WebhookContext context) => Task.FromResult(true);  // opt-in
    Task<IReadOnlyList<WebhookResult>> HandleWebhookAsync(WebhookContext context);
}
```

- `CreatePaymentAsync` receives a `PaymentCreationContext` — the order, market, the validated
  `Common` settings (customer-facing URLs + language, see "Common settings" below), the absolute
  `WebhookUrl` your gateway should call back on, and the provider's own settings. Read those as your
  **own typed model** via `context.GetSettings<TSettings>()` (see below). It
  returns the redirect URL + provider payment id (and optionally a `WebhookSecret`, below), or
  **`null`** when the provider isn't configured for the market or the gateway rejected the request.
- `HandleWebhookAsync` parses the request into zero or more `WebhookResult`s. A **list**, because
  some gateways batch events for several payments into one POST.
- `VerifyWebhookAsync` is default-implemented, so verification is opt-in; the pipeline only calls it
  for payments where you returned a `WebhookSecret`.

### WebhookResult

```csharp
public class WebhookResult
{
    public string PaymentReference { get; init; }   // matched against Order.PaymentReference
    public string IdempotencyKey   { get; init; }   // "" ⇒ pipeline hashes the raw body
    public string EventName        { get; init; }   // logging/audit only
    public PaymentState? NewState  { get; init; }   // null ⇒ this event changes no state
    public PaymentError? Error     { get; init; }   // { Code, Message } on any failure event
}

public enum PaymentState { Initialized = 1, Authorized = 2, Captured = 3, Cancelled = 4, Failed = 5, Refunded = 6 }
```

`PaymentState` is a **shared vocabulary, deliberately ordered**: gateways deliver out of order, and
the pipeline only applies a state that is `>=` the one already stored (`PaymentStates.Advances`), so
a replayed "authorized" can never undo a "captured". Map your gateway's event names onto it —
inventing your own status strings would defeat the ranking. It is persisted on `Order.PaymentStatus`
by name.

There is no separate "succeeded" flag: `Authorized`/`Captured` *is* success, and that's what
advances the order status.

### WebhookContext and credentials

```csharp
public class WebhookContext
{
    public HttpRequest Request { get; init; }
    public Func<string, WebhookSettings?> ResolveSettings { get; init; }
}

public class WebhookSettings          // what ResolveSettings hands back for one payment
{
    public JsonElement? ProviderSettingsJson { get; init; }   // read via GetSettings<T>()
    public string? PaymentWebhookSecret { get; init; }        // what CreatePayment returned, if any
}
```

Settings are resolved **lazily by payment reference**, because the market is only discoverable *from*
the request body. Parse a reference out of the body, then ask for that payment's configuration. This
is what lets a provider whose webhook carries no state (Mollie posts nothing but `id=tr_…`) call its
own API to find out what happened, and what gives an HMAC provider its merchant signing key.

The request body is buffered before your code runs, so it is safe to read more than once — rewind
with `request.Body.Position = 0` first.

### Per-payment webhook secrets

`PaymentCreationResult.WebhookSecret` is stored on the order and handed back as
`WebhookSettings.PaymentWebhookSecret`. It is **opaque to the generic layer** — Nets registers a
random token per payment and gets it back in the `Authorization` header; another gateway might not
use one at all, in which case return `null` and verification is skipped for that payment. Payments
created before a provider issued a secret keep working for the same reason.

## Provider selection

`IPaymentProviderResolver` picks the provider, in this order:

1. `market.Settings.PaymentProvider` (the market's chosen alias).
2. `Payments:DefaultProvider` from configuration (`appsettings.json`).
3. If exactly one provider is registered, that one.
4. Otherwise → no provider (create-payment returns `400`).

The webhook route accepts an **optional** `{provider}` segment. When omitted it uses the same
default/sole logic, so a gateway callback URL registered as `/api/v1/payments/webhook` keeps working.

## Endpoints

| Method & route | Purpose |
| --- | --- |
| `POST /api/v1/orders/{id}/payment` | Start a payment. **Authenticated** (JWT or `X-API-Key`) — it spends against the market's live gateway credentials. **No body**: where the customer goes next is the provider's own market configuration. Returns `{ paymentId, redirectUrl }`. `400` if no provider is configured for the market, or its common settings don't validate (missing/relative Continue or Terms URL); `502` if the provider couldn't create the payment. Both failures also return the configured `errorUrl`, so a storefront knows where to send the customer. |
| `POST /api/v1/payments/webhook/{provider?}` | Gateway status webhook, anonymous by necessity — authenticity comes from `VerifyWebhookAsync`, not from a caller identity. `200` for anything parseable (including unknown providers and unknown payments, so the gateway stops retrying); `401` only when verification fails. |

### Webhook delivery guarantees

Gateways deliver **at-least-once and out of order**, so the endpoint is an idempotent consumer:

1. **Verify** — `VerifyWebhookAsync`. A failure returns `401` and is deliberately *not* acked.
2. **Deduplicate** — every event is recorded in `PaymentWebhookEvents` keyed
   `"{provider}:{IdempotencyKey}"` *before* it is applied. Insert-first-wins on the primary key, so
   two concurrent redeliveries can't both proceed. A blank `IdempotencyKey` falls back to a hash of
   the raw body (normal for gateways that send no event id).
3. **Apply forward only** — `PaymentState` is applied only if it ranks `>=` the stored one.
4. **On success** — `OrderStatusService.ApplyStatus` advances the order to the market's
   `OrderStatusAfterPayment`, which is also what reserves stock and issues a tracking number. The
   webhook, `PUT /orders/{id}/status` and `PUT /admin/orders/{id}/status` all share that one path.

Return **200** for anything you could parse. A non-200 just makes the gateway retry, and Nets in
particular treats any other 2xx as a failure and opens a circuit breaker after repeated failures.

## Managing providers in the UI

Both admin surfaces let you add / edit / delete a market's providers and pick the active one, with
each provider's form rendered from its schema (so new gateways appear automatically):

- **React admin** (`localhost:5173`): *Markets → edit a market → Payment providers* panel.
- **Umbraco plugin**: the *Commerce* section → *Options → Payment Providers* (scoped to the store selected in the dashboard's store switcher).

Both call the endpoints below; secrets show masked and are only overwritten when you type a new value.
Both also render a **Surcharge fee** sub-section below each provider's own settings form (see
"Payment surcharge fee" below) — a fixed, generic sub-form, not part of the provider's schema.

## Host configuration

Two keys in `appsettings.json`, both gateway-agnostic:

```jsonc
"Payments": {
  "PublicBaseUrl": "",        // where gateways call back, e.g. "https://api.example.com"
  "DefaultProvider": ""       // optional: provider used when a market names none
}
```

`PublicBaseUrl` is the public origin of **this API**, used to build each provider's
`PaymentCreationContext.WebhookUrl` (`{PublicBaseUrl}/api/v1/payments/webhook/{alias}`). Blank falls
back to the incoming request's scheme+host, which is only right when the API is already publicly
reachable. For local development set it to your tunnel in `appsettings.Development.json` or
user-secrets — **never commit a personal tunnel URL**. A provider that self-registers webhooks should
register none when `WebhookUrl` is empty, rather than send the gateway an unreachable address.

## Configuring a market

Provider selection and credentials live on `MarketSettings`
(`api/EComm.Data/ValueObjects/Tenant/MarketSettings.cs`), managed via `MarketsController` or the
admin surfaces above. There are exactly **two** payment fields no matter how many providers exist:
`paymentProvider` (the chosen alias) and `paymentProviders` (a bag of per-provider settings keyed by
alias):

```jsonc
"settings": {
  "paymentProvider": "nets-easy",           // which provider handles this market
  "orderStatusAfterPayment": "paid",        // generic — applies no matter which provider is active
  "paymentProviders": {
    "nets-easy": {
      "testSecretKey": "…", "liveSecretKey": "…", "testMode": true, "merchantNumber": "…",
      // the common settings every provider gets — see below
      "continueUrl": "https://shop.example.com/continue/",
      "cancelUrl": "https://shop.example.com/cancel/",
      "errorUrl": "https://shop.example.com/error/",
      "language": "sv-SE",
      "termsUrl": "https://shop.example.com/terms/",
      "merchantTermsUrl": "https://shop.example.com/privacy/"
    }
    // "acme": { "apiKey": "…", "webhookSecret": "…" }   ← another provider, no schema change
  }
}
```

`orderStatusAfterPayment` lives directly on `MarketSettings` (not inside a provider's settings)
because it's a business decision, not a gateway credential — it applies the same way no matter
which provider is active, so `PaymentsController` reads it straight off the market on a successful
webhook, defaulting to `"paid"` when unset. Both admin surfaces render it as a dropdown sourced from
the tenant's own order statuses (`GET /api/v1/order-statuses/active`), next to the payment providers
list rather than nested in a provider's edit form.

Each provider alias in `paymentProviders` still maps to an **opaque JSON object**. The generic layer
never interprets it — the provider deserializes its own entry into a **strongly-typed settings
model** via `context.GetSettings<T>()` (case-insensitive). For example the Nets provider defines
`NetsEasySettings { LiveSecretKey, TestSecretKey, LiveCheckoutKey, TestCheckoutKey,
MerchantNumber, TestMode, MerchantHandlesConsumerData }` — `TestMode` selects the
live-vs-test key pair *and* the API host (`test.api.dibspayment.eu` vs `api.dibspayment.eu`),
`MerchantNumber` maps to the real Nets Easy API's request-level `merchantNumber` field (only needed
for Nets partners using partner keys), and `MerchantHandlesConsumerData` decides whether Nets renders
the consumer fields (prefilled from the order) or only asks for payment details. Secrets stay
server-side and are never exposed to the browser.

### Common settings (every provider gets these)

Six settings every gateway needs live in `PaymentCommonSettings`
(`api/EComm.Payment/PaymentCommonSettings.cs`), which declares both the typed model **and** its
schema fields. `PaymentProviderDescriptor.Fields` appends them to each provider's own
`ProviderFields`, so a provider never re-declares them and every UI, `Mask` and `Merge` treats them
exactly like a provider's own field:

| Key | Required | Meaning |
| --- | --- | --- |
| `continueUrl` | ✔ | Where the customer continues to after the provider is done processing. |
| `cancelUrl` | | Where the customer returns if they cancel the payment. |
| `errorUrl` | | Where the customer returns if the attempt errors — returned on the `400`/`502` create-payment responses, since no gateway takes an error URL of its own. |
| `language` | | Language of the payment window, as a locale code (`sv-SE`, `da-DK`, `en-GB`). Blank ⇒ the gateway's default. |
| `termsUrl` | ✔ | The webshop's terms and conditions. |
| `merchantTermsUrl` | | The webshop's privacy and cookie settings. |

**URLs must be absolute** (`https://shop.example.com/continue/`). Gateways redirect a browser to
them, so a relative path would fail at the gateway; `PaymentCommonSettings.Validate()` catches that
first and `POST /orders/{id}/payment` answers `400`. Required-ness is enforced there, at payment
time — not on save, so a half-configured provider can still be stored mid-edit.

A provider reads them off `context.Common` and maps them to its own gateway's vocabulary; nothing is
sent automatically. Nets maps `ContinueUrl`/`CancelUrl`/`TermsUrl`/`MerchantTermsUrl` onto
`checkout.returnUrl`/`cancelUrl`/`termsUrl`/`merchantTermsUrl`, and `Language` onto a `language`
query parameter appended to the hosted-page URL it returns (that is how Nets takes it — there is no
language field in the create-payment body).

The two checkout keys are the one exception to "every declared field is read": they're consumed only
by Nets' browser-side Checkout JS, which the hosted payment page
(`IntegrationType = "HostedPaymentPage"`) doesn't use. They're declared ahead of an embedded-checkout
integration type, and their help text says so in the admin form.

Deliberately **not** declared: capability flags like `allowCapturingPayments` /
`allowRefundingPayments`. Capture, refund and cancel operations don't exist in this codebase yet, and
a flag that gates nothing is config for a value that never changes — declare them alongside the
operations, not before. `PaymentSettings.Merge` drops stored keys the descriptor no longer declares,
so removing a field cleans it out of every market on the next save.

### Reading a stored secret back

Secrets are write-only everywhere else: `PaymentSettings.Mask` replaces them with `********` on read,
and a blank or still-masked value on save keeps what's stored. To let an admin check *which* key is
actually configured, `GET /api/v1/admin/markets/{id}/payment-providers/{alias}/secrets/{key}` returns
one unmasked value — one field per request, by name, `404` unless the descriptor declares that key as
`Secret`. Both admin surfaces put an eye button next to each secret field that calls it on demand.

## Payment surcharge fee

A market can charge an optional flat fee when a specific provider is its active one (e.g. a
"card fee"). Like `orderStatusAfterPayment`, this is generic and lives **alongside** — not inside —
each provider's opaque settings, in a parallel dictionary keyed by the same alias:

```jsonc
"settings": {
  "paymentProvider": "nets-easy",
  "paymentSurcharges": {
    "nets-easy": { "taxClassId": "tc-1", "amount": 5.00 }
  },
  "taxClasses": [
    { "id": "tc-1", "name": "Standard", "defaultRate": 0.20, "countryRates": [{ "countryCode": "SE", "rate": 0.25 }] }
  ]
}
```

- `taxClassId` references one of the market's `taxClasses` (see [docs/TAX-CLASSES.md](TAX-CLASSES.md));
  the fee's tax is resolved from that class using the order's shipping country (exact match →
  the class's `defaultRate` → `0` if no tax class is set).
- The fee is resolved from the market's **already-active** provider — there's no separate
  "chosen provider" step at checkout, since a market has exactly one active provider at a time.
  `OrdersController.CreateOrder` looks it up the same way it already looks up `ShippingCost` from
  `ShippingMethodId`, and snapshots the result onto `Order.PaymentFee`/`Order.PaymentFeeTax` at
  creation time — `Order.Total = Subtotal + Tax + ShippingCost + PaymentFee + PaymentFeeTax`.
  Nothing downstream re-reads `MarketSettings` for the amount.
- Managed via `PUT /api/v1/admin/markets/{id}/payment-providers/{alias}/surcharge` (and `DELETE`
  to remove it) — a zero/blank amount in the UI is treated as "not configured" and deletes it.

## Nets Easy specifics

- **Consumer prefill** — the create-payment request includes `checkout.consumer` built from the
  order's customer + shipping address. Nets validates this block strictly and discards **all** of it
  when part is invalid, which surfaces as a completely empty checkout rather than a partly filled
  one, so the mapping is all-or-nothing per sub-object:
  - `shippingAddress` needs addressLine1 + postalCode + city + alpha-3 country — all four or the
    address is omitted (email and name still go).
  - `phoneNumber` needs `prefix` matching `^[+]\d{1,3}$` and a digits-only number. `+46…`, `0046…`
    and local `070-…` (code taken from the shipping country) all map; an unrecognised calling code
    or country is omitted rather than guessed, since the code's length can't be inferred.
  - `privatePerson` needs both names, and is mutually exclusive with `company`.
  - `< > ' " & \` are unsupported and most strings cap at 128 characters, so consumer strings are
    stripped and truncated — otherwise one apostrophe in a surname fails the whole request.
  - `checkout.consumerType` is sent (defaulting to B2C) because it governs which consumer fields the
    page renders; without it there is nothing for the prefill to land in. `checkout.countryCode`
    (alpha-3) is sent when derivable and is mandatory for Klarna.
- **`merchantHandlesConsumerData`** (market setting, off by default) — off: Nets renders the customer
  fields, prefilled and still editable. On: your own checkout owns that data and Nets asks only for
  payment details (`consumerType` is then omitted, as Nets ignores it).
- **Webhook subscriptions** — every event the provider maps is registered per payment in
  `notifications.webHooks` (Nets allows 32). The `.v2` variants are registered rather than their v1
  twins, to avoid two deliveries of the same logical event. Nets rejects unknown event names, so only
  documented ones are listed.
- **Webhook verification** — each subscription carries a per-payment `authorization` token, a 32-char
  `Guid("N")`; Nets requires **8–64 alphanumeric** characters, so an order number is not a legal
  value. Nets echoes it in the `Authorization` header and `VerifyWebhookAsync` constant-time compares.
- **Event map** — `payment.created`→`Initialized`; `payment.checkout.completed` /
  `payment.reservation.created(.v2)`→`Authorized`; `payment.charge.created(.v2)`→`Captured`;
  `payment.reservation.failed` / `payment.charge.failed(.v2)`→`Failed`; `payment.cancel.created` /
  `payment.checkout.cancelled`→`Cancelled`; `payment.refund.completed`→`Refunded`.
  `payment.refund.failed` and `payment.cancel.failed` change no payment state — the payment itself is
  fine, so only their `error { code, message, source }` is recorded on `Order.PaymentError`.
- **On success** the webhook advances `Order.Status` to the market's **`orderStatusAfterPayment`**
  (default `paid`) through `OrderStatusService`, so stock is reserved and a tracking number issued.
- **Surcharge fee line items** — since Nets requires `order.amount == sum(item.grossTotalAmount)`,
  a non-zero `Order.PaymentFee`/`PaymentFeeTax` is sent as two extra flat lines (references
  `"payment-fee"` / `"payment-fee-tax"`), the same technique already used for `"tax"`/`"shipping"`.
- **Diagnostics** — `NetsEasyClient` logs the outbound create-payment JSON at `Debug`, and includes
  it in the error log on failure. That is how you tell "Nets ignored our prefill" apart from "the
  order had no customer data to send".

> **The webhook URL must be reachable from the internet.** It is built from
> `Payments:PublicBaseUrl` (see below); when that is blank the incoming request's own scheme+host is
> used, which is only correct if the API is already public. Locally, tunnel it (ngrok) and set the
> config — otherwise no webhooks are registered at all and a test order stays in its pre-payment
> status.

## Implementing a new provider

Nets Easy is the reference implementation — copy its shape from
`api/EComm.Payment/Providers/NetsEasy/`.

### Know which shape your gateway is first

Webhook designs differ more than you'd expect. The contract above was shaped against these; find
yours before writing code, because the differences decide what you implement:

| | Nets | Stripe | Adyen | Klarna | Vipps MobilePay | Mollie | PayPal |
|---|---|---|---|---|---|---|---|
| Body | 1 JSON event | 1 JSON event | **array** of `notificationItems` | 1 JSON event | 1 JSON event | **form-urlencoded**, one param | 1 JSON event |
| Unique event id | `id` | `id` | **none** | `metadata.event_id` | `idempotencyKey` (**optional**) | **none** | `id` |
| Outcome | in event name | in `type` | `success` bool + `eventCode` | `payload.status` | `success` + `name` | **not in body** | in `event_type` |
| Verify | shared secret in `Authorization` | HMAC-SHA256 over `t.body` | HMAC over a **colon-joined field string**, not the body | HMAC-SHA512 over body | HMAC over body | **none — you re-fetch instead** | CRC32+cert, or an API call |
| Ack | `200` only | 2xx | body must be `[accepted]` | 200 | 200 | 200 | 2xx |

Practical consequences:

- **No event id?** Compose an `IdempotencyKey` from whatever is stable (Adyen:
  `pspReference:eventCode:success`), or leave it blank and let the pipeline hash the body.
- **No state in the body?** Parse the reference, call `context.ResolveSettings(reference)` for your
  API credentials, and fetch the payment. That's the whole reason the resolver exists.
- **Batched events?** Just return more than one `WebhookResult`; the pipeline dedups and applies each.
- **A different ack body** (Adyen's `[accepted]`) is *not* supported yet — the pipeline always
  returns a bare `200`. Whoever adds Adyen needs to make the ack provider-driven.

1. **Create the provider folder** `api/EComm.Payment/Providers/<Name>/` and implement
   `IPaymentProvider` (unique `Alias`). Map `PaymentCreationContext.Order` to the gateway's create
   request and return a `PaymentCreationResult`. Parse your webhook body in `HandleWebhookAsync`.
2. **Define a settings model** (a plain POCO, e.g. `AcmeSettings`) and read it with
   `context.GetSettings<AcmeSettings>()` — the market's `paymentProviders["acme"]` JSON is deserialized
   into it. Declare only your own fields, in `Descriptor.ProviderFields`: the
   [common settings](#common-settings-every-provider-gets-these) are appended for you, so map them
   from `context.Common` to your gateway's own vocabulary rather than re-declaring them. No new
   fields on `MarketSettings`, no changes to the generic layer.
3. **Self-register** with an extension method, e.g.:
   ```csharp
   public static IServiceCollection AddAcmePaymentProvider(this IServiceCollection services)
   {
       services.AddHttpClient<IAcmeClient, AcmeClient>();       // typed client — no magic string
       services.AddScoped<IPaymentProvider, AcmePaymentProvider>();
       return services;
   }
   ```
4. **Enable it** in `api/EComm.Api/Program.cs`:
   ```csharp
   builder.Services.AddPaymentProviders();
   builder.Services.AddNetsEasyPaymentProvider();
   builder.Services.AddAcmePaymentProvider();   // ← new
   ```
5. **Point a market at it**: set `market.Settings.PaymentProvider = "acme"` and put its credentials in
   `market.Settings.PaymentProviders["acme"]`. Register the gateway's webhook URL as
   `/api/v1/payments/webhook/acme`.

No changes to the generic layer, the controller, or the Umbraco plugin are needed.

> **Note:** providers are registered in the **API host** (`EComm.Api`), because gateway secrets and
> webhooks must stay server-side. A project that only consumes the Umbraco plugin against a shared
> API adds its provider to that API. If you need a gateway integrated entirely in the CMS layer
> without touching the API, implement it storefront-side and call
> `ICommerceApiClient.UpdateOrderStatusAsync(orderId, "paid", …)` after your own gateway flow — see
> the consumer example below.

## Using payments from a consuming project

A project embedding the Umbraco plugin (e.g. **Westbay**) initiates payment through the neutral
plugin client and redirects the customer — it does not know or care which gateway runs:

```csharp
// In a checkout/surface controller:
var payment = await _commerceApi.CreatePaymentAsync(orderId);
if (!string.IsNullOrEmpty(payment?.RedirectUrl))
    return Redirect(payment.RedirectUrl);        // hosted checkout for the market's provider

// No redirect (provider not configured / dev): complete the order directly.
await _commerceApi.UpdateOrderStatusAsync(orderId, "paid", "Marked paid (no provider configured)");
return Redirect(successUrl);
```

The customer-facing URLs are **not** passed here — they're the provider's market configuration
(Continue / Cancel / Error / Terms URL, see [Common settings](#common-settings-every-provider-gets-these)),
so configure them per market in either admin and point them at the storefront's own success, cancel
and error pages. The final paid/authorized state is confirmed server-side by the gateway webhook,
independent of the customer returning to the site.

> **Upgrading:** `CreatePaymentAsync` used to take `(orderId, returnUrl, cancelUrl, termsUrl)`. Drop
> the three URL arguments and configure them on the provider instead — until Continue URL and Terms
> URL are set for a market, `POST /orders/{id}/payment` answers `400` naming the missing field.

## Upgrade notes — webhook hardening

For sites already integrated before the webhook pipeline gained verification, idempotency and the
shared order-status transition. **No storefront code changes are required**; everything below is
configuration, data, or behaviour to be aware of. The `IPaymentProvider` contract did change, but
that only affects anyone who wrote their own provider.

### 1. Remove portal-level webhook configuration (most likely to bite)

Webhook subscriptions are now registered **per payment**, each carrying a per-payment `authorization`
token. A webhook still configured in the gateway's merchant portal won't carry that token, so
`VerifyWebhookAsync` rejects it with `401` — and the gateway retries it, then trips its circuit
breaker (Nets: >20% failures to an endpoint in 30s).

Symptom: a stream of `401`s and "Rejected a … webhook that failed verification" warnings, and orders
that never advance. Duplicate deliveries of the *same* event are harmless (same event id ⇒ deduped);
unverifiable ones are not. Delete the portal-level subscriptions for the events listed under
[Nets Easy specifics](#nets-easy-specifics).

### 2. Set `Payments:PublicBaseUrl`

See [Host configuration](#host-configuration). If it's blank and the API isn't already publicly
reachable, **no webhooks are registered at all** — deliberately, rather than handing the gateway an
unreachable URL — and orders stay in their pre-payment status with nothing in the logs to suggest a
failure. Set it to the tunnel URL locally.

### 3. The API key is now mandatory for `POST /orders/{id}/payment`

That endpoint used to be anonymous and is now authenticated. The Umbraco plugin already sends
`X-API-Key` on every request (`CommerceApiClient.CreateClientAsync`), so no code change — **but**
`CommerceSettings.IsValid` only checks `ApiBaseUrl` and `TenantId`, not `ApiKey`. A site that was
running without an API key configured got away with it here and will now get `401`. Configure the
key in the plugin's Commerce settings.

### 4. Send customer and shipping data if you want the checkout prefilled

`CreateOrderAsync` passes `Customer` and `ShippingAddress` straight through to the API, so the
plugin supports this already — but the storefront has to populate them. Gateways validate the
consumer block strictly: Nets needs **street + postal code + city + country, all four**, or it drops
the entire block and the hosted page opens completely blank rather than partly filled. See
[Nets Easy specifics](#nets-easy-specifics) for the per-field rules.

To find out which side is at fault, set `EComm.Payment` logging to `Debug` and read the outbound
create-payment JSON: a populated `checkout.consumer` means the gateway rejected our mapping, an empty
one means the order never carried the data.

### 5. Behaviour changes to check your error handling against

- `PUT /orders/{id}/status` and `PUT /admin/orders/{id}/status` can now return **`400`** when there
  isn't enough stock to mark an order paid. Both previously succeeded unconditionally. The documented
  "no provider configured → mark the order paid directly" fallback goes through this path, so code
  that ignores the response will silently stop marking orders paid.
- Marking an order paid from the **backoffice** now reserves stock, and cancelling a paid order
  releases it. Previously neither happened from that endpoint.
- A market whose `orderStatusAfterPayment` is a custom status (e.g. `processing`) now reserves stock
  too. It never did before — the check was a hardcoded comparison against `"paid"`.
- `Order.PaymentStatus` can now be `Failed`, `Cancelled` or `Refunded`, not just
  `Initialized`/`Authorized`/`Captured`. Anything switching on it needs those cases.
- `Order.PaymentError` is a new field carrying the gateway's last failure as `"code: message"`.

### 6. Database

Additive only — two nullable columns on `Orders` (`PaymentWebhookSecret`, `PaymentError`) and the new
`PaymentWebhookEvents` table, applied at startup by `SchemaUpgrader.EnsurePaymentWebhookSchema`.
No reset, no reseed, no data migration.

## Security & licensing

- Gateway credentials are stored per-market on the server (`MarketSettings`) and never sent to the client.
- **Webhook verification is implemented per provider** via `VerifyWebhookAsync`; a failure returns
  `401` and is not acked. It is *opt-in* — a provider that returns no `WebhookSecret` and doesn't
  override the member accepts unverified webhooks, so implement it before you take real money.
  Payments created before a provider issued a secret also skip verification, by design, so an
  upgrade doesn't strand in-flight payments.
- `POST /api/v1/orders/{id}/payment` requires authentication (JWT or `X-API-Key`); the webhook is
  necessarily anonymous and relies on verification instead.
- The Nets provider calls the Nets REST API directly over `HttpClient` — no third-party SDK, no
  copyleft dependencies. New providers should prefer permissively licensed (MIT/Apache-2.0/BSD) SDKs.

## API surface

- `GET /api/v1/payments/providers` — catalog of registered providers + settings schema.
- `GET /api/v1/admin/markets/{id}/payment-providers` — configured providers (secrets masked) + active alias.
- `PUT /api/v1/admin/markets/{id}/payment-providers/{alias}` — add/update a provider's settings (write-only secrets).
- `DELETE /api/v1/admin/markets/{id}/payment-providers/{alias}` — remove a provider (clears active if it was active).
- `PUT /api/v1/admin/markets/{id}/active-payment-provider` — set/clear the active provider.
- `PUT /api/v1/admin/markets/{id}/order-status-after-payment` — set/clear the order status applied on a successful payment (`{ code }`), regardless of the active provider.
- `GET /api/v1/admin/markets/{id}/payment-providers/{alias}/secrets/{key}` — one Secret field's unmasked value (`404` unless the descriptor declares it as `Secret`).
- `PUT /api/v1/admin/markets/{id}/payment-providers/{alias}/surcharge` — set a provider's surcharge fee (`{ taxClassId, amount }`).
- `DELETE /api/v1/admin/markets/{id}/payment-providers/{alias}/surcharge` — remove a provider's surcharge fee.

The Umbraco plugin proxies these through its management API (`/umbraco/management/api/ecomm-commerce/payment-providers…`).

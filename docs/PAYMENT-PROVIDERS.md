# Payment Providers

The platform supports **pluggable payment providers**. A provider is a payment gateway
integration (Nets Easy ships as the first one); each market picks which provider handles its
checkout. Adding a new gateway is a matter of implementing one interface and registering it —
the generic pipeline knows nothing about any specific gateway.

## Architecture

```
Storefront (Umbraco plugin consumer, e.g. Westbay)
   │  ICommerceApiClient.CreatePaymentAsync(orderId, returnUrl, cancelUrl, termsUrl)
   ▼
EComm.Api  POST /api/v1/orders/{id}/payment
   │  IPaymentProviderResolver.ResolveForMarket(market)   ← market.Settings.PaymentProvider
   ▼
IPaymentProvider  (e.g. NetsEasyPaymentProvider)          → { paymentId, redirectUrl }
   │  gateway REST call
   ▼
Payment gateway hosted checkout  → customer pays → returnUrl
   │  gateway webhook
   ▼
EComm.Api  POST /api/v1/payments/webhook/{provider?}      → order.PaymentStatus
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
    Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context);
    Task<WebhookResult?> HandleWebhookAsync(HttpRequest request);
}
```

- `CreatePaymentAsync` receives a `PaymentCreationContext` — the order, market, return/cancel/terms
  URLs, and the provider's settings. Read the settings as your **own typed model** via
  `context.GetSettings<TSettings>()` (see below). It returns the redirect URL + provider payment id,
  or **`null`** when the provider isn't configured for the market or the gateway rejected the request.
- `HandleWebhookAsync` parses the provider's own webhook body and returns `{ PaymentReference, NewStatus }`
  (a `null` `NewStatus` means "no order change for this event").

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
| `POST /api/v1/orders/{id}/payment` | Start a payment. Body: `{ returnUrl, cancelUrl, termsUrl }`. Returns `{ paymentId, redirectUrl }`. `400` if no provider is configured for the market; `502` if the provider couldn't create the payment. |
| `POST /api/v1/payments/webhook/{provider?}` | Gateway status webhook. Always `200` (acks even for unknown payments so the gateway stops retrying). |

## Managing providers in the UI

Both admin surfaces let you add / edit / delete a market's providers and pick the active one, with
each provider's form rendered from its schema (so new gateways appear automatically):

- **React admin** (`localhost:5173`): *Markets → edit a market → Payment providers* panel.
- **Umbraco plugin**: the *Commerce* section → *Options → Payment Providers* (scoped to the store selected in the dashboard's store switcher).

Both call the endpoints below; secrets show masked and are only overwritten when you type a new value.
Both also render a **Surcharge fee** sub-section below each provider's own settings form (see
"Payment surcharge fee" below) — a fixed, generic sub-form, not part of the provider's schema.

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
    "nets-easy": { "testSecretKey": "…", "liveSecretKey": "…", "testMode": true, "allowCapturingPayments": true }
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
`NetsEasySettings { LiveSecretKey, LiveCheckoutKey, TestSecretKey, TestCheckoutKey,
MerchantTermsUrl, MerchantNumber, TestMode, AllowFetchingPaymentStatus, AllowCancellingPayments,
AllowCapturingPayments, AllowRefundingPayments }` — `TestMode` selects the live-vs-test key pair,
`MerchantTermsUrl`/`MerchantNumber` map directly to the real Nets Easy API's
`checkout.merchantTermsUrl` and request-level `merchantNumber` fields (the latter only needed for
Nets partners using partner keys), and the four `Allow*` flags mirror the payment method's
capability flags in the Nets merchant portal. Secrets stay server-side and are never exposed to
the browser.

## Payment surcharge fee

A market can charge an optional flat fee when a specific provider is its active one (e.g. a
"card fee"). Like `orderStatusAfterPayment`, this is generic and lives **alongside** — not inside —
each provider's opaque settings, in a parallel dictionary keyed by the same alias:

```jsonc
"settings": {
  "paymentProvider": "nets-easy",
  "paymentSurcharges": {
    "nets-easy": { "sku": "CARD-FEE", "taxClassId": "tc-1", "amount": 5.00 }
  },
  "taxClasses": [
    { "id": "tc-1", "name": "Standard", "defaultRate": 0.20, "countryRates": [{ "countryCode": "SE", "rate": 0.25 }] }
  ]
}
```

- `sku` is an admin-facing label only — it is **not** sent to the payment gateway.
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

- **Consumer prefill** — the create-payment request includes a `checkout.consumer` built from the
  order's customer + shipping address (email, first/last name split from `FullName`, address with the
  country mapped to ISO alpha-3). It only *prefills* the hosted page (still editable); anything that
  can't be safely mapped (e.g. an unknown country) is omitted so Nets doesn't reject the request.
- **Order status on success** — the webhook maps `payment.checkout.completed`→`Authorized` and
  `payment.charge.created.v2`→`Captured` on `Order.PaymentStatus`, and on success advances
  `Order.Status` to the market's **`orderStatusAfterPayment`** setting (default `paid`).
- **Surcharge fee line items** — since Nets requires `order.amount == sum(item.grossTotalAmount)`,
  a non-zero `Order.PaymentFee`/`PaymentFeeTax` is sent as two extra flat lines (references
  `"payment-fee"` / `"payment-fee-tax"`), the same technique already used for `"tax"`/`"shipping"`.
  > The order status only changes when Nets calls the webhook (`POST /api/v1/payments/webhook`), so
  > that URL must be reachable by Nets — configure it in the Nets portal, and tunnel it (e.g. ngrok)
  > for local testing, otherwise a locally-placed test order stays in its pre-payment status.

## Implementing a new provider

Nets Easy is the reference implementation — copy its shape from
`api/EComm.Payment/Providers/NetsEasy/`.

1. **Create the provider folder** `api/EComm.Payment/Providers/<Name>/` and implement
   `IPaymentProvider` (unique `Alias`). Map `PaymentCreationContext.Order` to the gateway's create
   request and return a `PaymentCreationResult`. Parse your webhook body in `HandleWebhookAsync`.
2. **Define a settings model** (a plain POCO, e.g. `AcmeSettings`) and read it with
   `context.GetSettings<AcmeSettings>()` — the market's `paymentProviders["acme"]` JSON is deserialized
   into it. No new fields on `MarketSettings`, no changes to the generic layer.
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
var payment = await _commerceApi.CreatePaymentAsync(orderId, successUrl, cancelUrl, termsUrl);
if (!string.IsNullOrEmpty(payment?.RedirectUrl))
    return Redirect(payment.RedirectUrl);        // hosted checkout for the market's provider

// No redirect (provider not configured / dev): complete the order directly.
await _commerceApi.UpdateOrderStatusAsync(orderId, "paid", "Marked paid (no provider configured)");
return Redirect(successUrl);
```

Wire the storefront's success and cancel pages to the `returnUrl` / `cancelUrl` you pass in. The
final paid/authorized state is confirmed server-side by the gateway webhook, independent of the
customer returning to the site.

## Security & licensing

- Gateway credentials are stored per-market on the server (`MarketSettings`) and never sent to the client.
- **Webhook signature verification is not yet implemented** (see the `ponytail:` note in
  `NetsEasyPaymentProvider.HandleWebhookAsync`). Add HMAC/shared-secret verification per provider
  before handling real money in production.
- The Nets provider calls the Nets REST API directly over `HttpClient` — no third-party SDK, no
  copyleft dependencies. New providers should prefer permissively licensed (MIT/Apache-2.0/BSD) SDKs.

## API surface

- `GET /api/v1/payments/providers` — catalog of registered providers + settings schema.
- `GET /api/v1/admin/markets/{id}/payment-providers` — configured providers (secrets masked) + active alias.
- `PUT /api/v1/admin/markets/{id}/payment-providers/{alias}` — add/update a provider's settings (write-only secrets).
- `DELETE /api/v1/admin/markets/{id}/payment-providers/{alias}` — remove a provider (clears active if it was active).
- `PUT /api/v1/admin/markets/{id}/active-payment-provider` — set/clear the active provider.
- `PUT /api/v1/admin/markets/{id}/order-status-after-payment` — set/clear the order status applied on a successful payment (`{ code }`), regardless of the active provider.
- `PUT /api/v1/admin/markets/{id}/payment-providers/{alias}/surcharge` — set a provider's surcharge fee (`{ sku, taxClassId, amount }`).
- `DELETE /api/v1/admin/markets/{id}/payment-providers/{alias}/surcharge` — remove a provider's surcharge fee.

The Umbraco plugin proxies these through its management API (`/umbraco/management/api/ecomm-commerce/payment-providers…`).

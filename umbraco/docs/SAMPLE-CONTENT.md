# Sample Content Structure (sample-site)

Mirrors the **market-1** catalog (`tenant-a` / Downtown Store) as an Umbraco content tree, so the
plugin's routing, pickers and workspace view all have real data to sit on.

Built against Umbraco **17.6.2**. Source of truth is the eCommerce API, not this file — if the seed
catalog changes, re-derive from `GET /api/v1/categories` + `GET /api/v1/products`.

> **The schema below is not in source control.** Document types, data types, template records and
> all content live in `sample-site/EComm.Commerce.Demo/umbraco/Data/Umbraco.sqlite.db`, which is
> gitignored (`.gitignore:82`). What *is* committed is the C# and the Razor: `StoreRootController`,
> `storeRoot.cshtml`, `StoreContext`, the checkout views. On a fresh clone those are inert until the
> `storeRoot` document type, its Store Picker data type and its template are recreated in the
> backoffice — this file is the recipe for doing that.

## Document types used

| Alias | Properties | Allowed children | At root |
|-------|-----------|------------------|---------|
| `storeRoot` | `storeId` (Store Picker) | `categoryPage` | yes |
| `categoryPage` | `categoryName` (TextBox), `categoryId` (Category Picker) | `categoryPage`, `productPage` | no |
| `productPage` | `productId` (Product Picker) | — | no |

`storeRoot`, its Store Picker data type and its template do not exist yet — they are created as
part of this work. The Store Picker element ships with the plugin
(`EComm.PropertyEditorUi.StorePicker`) and lists markets from
`/umbraco/management/api/ecomm-commerce/markets`.

## The store node

The **root node is the store selector**, not a category. It carries `storeId` (Store Picker), and
every descendant resolves its market by walking up to it — `CategoryPickerApiController
.GetValueWithAncestorFallback` does exactly this, and its own comment names the shop root as the
intended place to set it. That is what tells the system *which store a product came from* and
*which store an order is saved to*.

One Umbraco site can therefore serve several markets by giving each branch its own store node —
the global `EComm.Commerce.MarketId` key-value is a legacy fallback, not the model.

## Target tree

```
Downtown Store            [storeRoot]  storeId = market-1   ← site root, store selector
├── Electronics                    [cat-1]
│   ├── Small Electronics          [cat-1-1]
│   │   ├── Watches                [cat-1-1-1]
│   │   │   └── Smart Watch Pro                    → prod-2
│   │   └── Headphones             [cat-1-1-2]
│   │       └── Wireless Bluetooth Headphones      → prod-1
│   └── Computer Accessories       [cat-1-2]
│       └── 4K Webcam                              → prod-3
├── Clothing                       [cat-2]
│   ├── Classic Cotton T-Shirt                     → prod-4
│   ├── Denim Jeans - Slim Fit                     → prod-5
│   ├── Winter Jacket                              → prod-6
│   ├── Men's Clothing             [cat-2-1]
│   └── Women's Clothing           [cat-2-2]
├── Home & Garden                  [cat-3]
│   ├── LED Desk Lamp                              → prod-7
│   └── Garden Tool Set                            → prod-8
├── Sports & Outdoors              [cat-4]
│   ├── Yoga Mat Premium                           → prod-9
│   └── Camping Tent 4-Person                      → prod-10
└── Books                          [cat-5]
    ├── Programming Guide 2024                     → prod-11
    └── Cookbook Collection                        → prod-12
```

**1 store node + 11 category nodes + 12 product nodes.** The store node must stay the *only* root
node, otherwise Umbraco prefixes its name onto every URL and `/electronics/` becomes
`/downtown-store/electronics/`.

## Deliberately excluded

Two market-1 products get no node, because neither resolves to a category in this tree:

| Product | Reason |
|---------|--------|
| `prod-3d7198e1` "GoodVariants" | no `categoryId` set |
| `prod-6806a436` "Provider Photo Test Product" | `categoryId` is `cat-wb-f17204ea9f84`, which is not a market-1 category |

Both are still reachable through the Commerce section — they just have no content node.

## Pre-existing nodes

Four `categoryPage` nodes (Biltransportsläp, Tippvagnar, Skåpsläp, Personalvagnar) came from a
different dataset and pointed at `cat-wb-*` categories absent from market-1, so their category
listings were always empty. Moved to the Recycle Bin; recoverable from there.

## Steps

**Phase A — schema (new)**
- [x] A1. Create the Store Picker data type (`EComm.PropertyEditorUi.StorePicker`)
- [x] A2. Create the `Store Root` template + `Views/StoreRoot.cshtml`
- [x] A3. Create the `storeRoot` document type — `storeId` property, allow at root, allows `categoryPage`
- [x] A4. Turn OFF allow-at-root on `categoryPage` so the store node is the only root

**Phase B — restructure content**
- [x] B1. Create the store node, set `storeId` = market-1 (Downtown Store), publish
- [x] B2. Move the 5 top-level categories under the store node
- [x] B3. Bin the old `Root` node (takes the 4 stale nodes with it)
- [x] B4. Verify `/electronics/`, `/clothing/`, `/books/` still resolve — the store node must be the only root

**Phase C — finish the catalog**
- [x] C1. 11 category nodes created and verified
- [~] C2. 12 product nodes — **6 of 12 done**, see table below

**Phase D — make the storefront honour the store**
- [x] D1. `Services/StoreContext.cs` — ancestor walk for `storeId`, remembered in an `ecomm_store` cookie
- [x] D2. `CategoryPageController` passes the resolved market to the market-aware reads
- [x] D3. `StoreCartService` sends the remembered store as `X-Market-ID` (cart + order writes)

Verified end-to-end: the same product added with `ecomm_store=market-1` creates a cart in market-1,
and with `ecomm_store=market-2` creates one in **market-2** — the global setting is market-1, so the
store cookie is demonstrably what routes it.

### Follow-up: market scoping for by-id reads (not done)

`GetCategoryAsync` / `GetProductAsync` still resolve outside the store, and adding a `marketId`
parameter to them alone would achieve nothing, because the **API endpoints take no market either**:

```csharp
[HttpGet("{id}")] public ActionResult<Category> GetCategory(string id) => _store.GetCategory(id);
[HttpGet("{id}")] public ActionResult<Product>  GetProduct(string id)  => …FirstOrDefault(p => p.Id == id);
```

Compare the list endpoints beside them, which accept `marketId` *and* `X-Market-ID` and filter on
`c.MarketId == effectiveMarketId`. Making by-id reads store-scoped is a two-repo change:

1. `EComm.Api` — accept and honour a market on both by-id endpoints
2. `CommerceApiClient` — add `string? marketId = null` (source-compatible; nothing implements
   `ICommerceApiClient` by hand, Westbay's tests use `Substitute.For<>`)
3. **Cache keys must include the market.** They are `EComm_Category_{id}` / `EComm_Product_{id}`
   today. Adding market scoping without re-keying the cache would serve one store's category or
   product to another — a silent cross-store leak that only appears under multi-store, which is
   exactly what the feature is for. `CountriesCacheKey(marketId)` in the same file is the pattern.

Exposure while this is outstanding: ids are unique across markets in this data, so a by-id read
returns the right record — it just isn't *enforced* to the store.

Today the storefront ignores `storeId` entirely: `StoreCartService.CreateClientAsync` sends the
global `settings.MarketId`, so **every order lands in the globally-configured market** no matter
which store branch the shopper browsed. `CommerceApiClient` already takes an optional `marketId` on
every read method, so the plumbing exists — the storefront just never passes it.

### Remaining product nodes

| Product | Parent category | API id |
|---------|-----------------|--------|
| Garden Tool Set | Home & Garden | `prod-8` |
| LED Desk Lamp | Home & Garden | `prod-7` |
| Camping Tent 4-Person | Sports & Outdoors | `prod-10` |
| Yoga Mat Premium | Sports & Outdoors | `prod-9` |
| Cookbook Collection | Books | `prod-12` |
| Programming Guide 2024 | Books | `prod-11` |

## How to add a product node (the flow that works)

The Product Picker resolves its list from the **saved** node's parent, so a brand-new node cannot
show products yet — on the create form it always errors with *"Failed to load products. Please check
Commerce Settings."* even though the settings are fine. It takes two passes:

1. Create the node under the category, enter the name only, **Save and publish**.
2. The picker now lists that category's products — pick one, **Save and publish** again.

Deep-linking to `.../document/create/parent/document/{parentId}/{docTypeId}/invariant` on a cold
backoffice boot renders a blank screen; open `/umbraco/section/content` first, then navigate.

---

## Payments

Checkout now attempts a **real payment** first: `CheckoutController.PlaceOrder` creates the order,
remembers it in an `ecomm_pending_order` cookie, then calls `POST /api/v1/orders/{id}/payment` and
redirects the shopper to the provider's hosted page.

The API resolves the provider from **`order.MarketId`**, so payment automatically follows whichever
store the order was placed in — no market header needed on the payment call.

### Return routes

The provider's Continue/Cancel/Error URLs are static per-market settings and carry no order id, so
the pending-order cookie is what identifies the order on return.

| Setting | Point it at | Behaviour |
|---------|-------------|-----------|
| `continueUrl` | `{site}/checkout/complete` | Re-reads the order. Paid → confirmation. Not yet paid → **Processing** page |
| `cancelUrl` | `{site}/checkout/cancelled` | "Nothing charged", basket intact |
| `errorUrl` | `{site}/checkout/failed` | "Payment failed", try again |

`/checkout/complete` deliberately does **not** treat the shopper's return as proof of payment — the
webhook decides that. An order that hasn't been confirmed yet shows as processing rather than as a
completed sale.

### `Checkout:DemoAutoPay`

```jsonc
"Checkout": { "DemoAutoPay": true }
```

Only decides what happens when a real payment **can't be started**: `true` marks the order paid so
the demo still completes — exactly the pre-existing demo behaviour, with no extra notice on the
receipt, since the checkout page already declares Demo Mode — and `false` shows the error.

The fallback always logs a warning naming the real reason, so a provider that *should* work but
doesn't is still diagnosable from the log:

```
[WRN] Falling back to demo auto-pay for order {id} - real payment could not start: {error}
```

**Set it to `false` once a provider is configured for real** — otherwise a broken provider config
silently produces "paid" orders that were never paid.

Note the failure mode is not just "no provider". Nets Easy is the only registered provider, so the
resolver picks it by default even on an unconfigured market, which then fails on its own settings:

```json
{"message":"Continue URL is required for this payment provider","errorUrl":""}
```

That is what an out-of-the-box checkout hits today, and what the fallback covers.

### Still needed for real payments

1. Provider credentials on **market-1** (Nets Easy test secret + checkout key, merchant number,
   `testMode`) plus the six common settings — all **absolute URLs**, validated before any gateway call
2. `Checkout:DemoAutoPay` → `false`
3. A reachable webhook: `Payments:PublicBaseUrl` is set to an ngrok URL in `api/EComm.Api/appsettings.json`,
   and that tunnel must actually be running against port 5180 — otherwise payments succeed at the
   gateway and the order sits unpaid forever

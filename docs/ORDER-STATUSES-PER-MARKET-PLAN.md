# Order statuses per market (store) — plan

**Why**: `OrderStatus` is tenant-scoped, but both admin UIs present statuses per store. So deleting
"Submitted" in Westbay Trailers removed it from Westbay Accessories too, and deleting "Paid" in
Trailers is refused because an *Accessories* order uses the code. Each store must own its own set.

**Shape after this change**: `OrderStatus` gains `MarketId`. Every store has its own rows (seeded
with the same 8 defaults), and every read/write is scoped by `X-Market-ID` alongside `X-Tenant-ID` —
the same scoping products, categories and orders already use. No shims, no dual-mode reads.

## Steps

- [x] **1. Entity + schema.** `OrderStatus.MarketId`; `SchemaUpgrader.EnsureOrderStatusMarketColumn()`
      (additive `ALTER TABLE ... ADD COLUMN`, so no `ecomm.db` reset); index on `(TenantId, MarketId)`.
- [x] **2. Migrate existing rows in place.** A `DatabaseSeeder` step: for each tenant-level row, write
      one copy per market of that tenant (`status-{marketId}-{code}`, custom statuses included), then
      drop the tenant-level rows. Idempotent — a row that already has a `MarketId` is left alone.
      `SeedMissingOrderStatuses` becomes per-market: any market with no statuses gets the 8 defaults.
- [x] **3. API.** `OrderStatusController`: every endpoint takes `X-Market-ID` and filters by it.
      The delete guards become market-scoped — orders *of that market*, and only *that market's*
      `OrderStatusAfterPayment`/`CartOrderStatus`. Duplicate-code check scoped per market.
      `reset-defaults` restores the calling market's set.
- [x] **4. Umbraco plugin.** `GetOrderStatusDefinitionsAsync(marketId)` + create/update/delete pass
      the store's id (`X-Market-ID`); `CommerceAdminApiController` takes `?marketId=`; the dashboard
      sends the selected store on every call, and `statusDefs` reloads per store (it colors the order
      pills, which are already per store). `payment-providers-dashboard.js` passes its market too.
- [x] **5. React admin.** `/admin/order-statuses` is already market-scoped by `client.ts` sending
      `X-Market-ID`; verify the list/mutations key off the selected market and invalidate on switch.
- [x] **6. Docs.** `ctx-orders.md`, `ctx-umbraco.md`, `api/AGENTS.md`, root `AGENTS.md`,
      `docs/STATUS.md` — statuses are market-scoped, not tenant-scoped.

## Notes

- Existing orders reference a status *code*, not an id, and every market is seeded with the same
  codes, so no order needs rewriting.
- `Submitted` is currently deleted tenant-wide in the live db (from testing). Step 2 copies whatever
  each tenant has now; run "reset defaults" per store afterwards to get `submitted` back.
- `MarketSettings.CartOrderStatus` defaults to `"new"` in C#, so every market names `new` even when
  its stored JSON doesn't — `new` stays undeletable until that setting is changed for the store.

## Status

**Done — all six steps.** Plugin packed as **1.6.6** into `Westbay.V9/local-nuget`, and the three
`PackageReference`s bumped to it.

Verified on a *copy* of the live `ecomm.db`, never the original: 32 tenant-level rows became 72
per-market rows (9 markets × 8 defaults), no orphans, the old `(TenantId, Code)` unique index replaced
by `(TenantId, MarketId, Code)`, and a second startup changed nothing (idempotent). Live on that copy:
deleting `on-hold` in Westbay Trailers left the Accessories copy standing; `paid` in Trailers still
refused, now because *Trailers'* own orders use it (630 in that snapshot); the same new code created in
both stores, 409 only within a store; no `X-Market-ID` ⇒ 400. API suite 144 pass, frontend
type-checks/builds/tests, both dashboard scripts parse.

**Deploy order matters**: the API first (the migration runs at startup), then the plugin. A new API with
an old plugin answers 400 on this screen, since the old plugin sends no market.

## Not verified

The Umbraco backoffice UI itself — the store-switching behaviour of this screen wasn't driven in a
browser here. Restart the API, restart Westbay on :8642, hard-refresh, then check: Trailers and
Accessories show independent lists, a delete in one leaves the other alone, and Options → Payment
Providers offers the selected store's statuses under "status after payment".

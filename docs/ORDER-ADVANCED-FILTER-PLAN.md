# Orders advanced filter + Payment Providers header — plan

**Why**: three complaints from the Umbraco **Commerce** backoffice.

1. Options → Payment Providers: the `+ Create Payment Method` label wraps onto three lines, because
   the header carries a control no other view has — a `Choose a provider…` `<select>` — which squeezes
   the button in the flex row.
2. That same button does nothing until a provider is picked in the select, and stays enabled even when
   every catalogue provider is already configured.
3. Orders can only be filtered by status plus one free-text box. Umbraco Commerce ships an *Advanced
   Filter* drawer (customer / order / order-line criteria); without it, finding an order by email,
   order number, date range or SKU means paging by hand.

**Shape after this change**: the Payment Providers header reads like every other list view (title ·
`Refresh` · `+ Create X`, where the create button *is* the provider picker), and Orders gains an
Advanced filter drawer that narrows **server-side**, so it filters the whole result set rather than
the 20 rows on screen.

**Decisions** (agreed with the user before implementation):

- A right-side **drawer**, not a centred modal — matches the Umbraco Commerce reference.
- **First Name / Last Name** both match `Customer.FullName` (the data has no split), ANDed together.
- The Order Line section carries **SKUs only**: `OrderItem` has no property bag, so the reference's
  order-line *Properties* field would have nothing to match.
- No tags, gift-card codes or discount-code fields (explicitly not wanted).

**Deliberately out of scope**: the React admin at `/admin/orders` keeps its own filters. The Orders
list's Payment Status filter also stays as it is — client-side over the current page, and *deriving*
payment status from `order.status` instead of reading `order.paymentStatus`. Both flagged, neither
touched here.

**Confirmed while testing the combinations** (2026-08-13, westbay-trailers): Order Status ANDs with the
advanced filter correctly server-side — `skus=LED_free_upgrade` + *Completed* = 219, the same SKU +
*New* = 0. Payment Status does **not**: with `skus=LED_free_upgrade` + *Paid* the table shows
"No orders found" while the pager still offers 11 pages and the footer still reads "219 orders",
because that filter runs over the 20 fetched rows while the count and pager come from the server. It is
also filtering invented data — every westbay-trailers order has `PaymentStatus` NULL, so
`derivePaymentStatus(status)` labels all 671 of them *Initialized*. Fixing it means deciding what a
payment status should mean for an order that never had a payment; see the follow-up options at the
bottom of this file.

## Steps

- [x] **1. Design kit + Payment Providers header.** *Verified in Westbay.V9 (plugin 1.6.15): header on
      one line, flyout lists only unconfigured providers and opens the schema form, greys out on a store
      where every provider is configured, outside click closes it, Currencies' flyout still works,
      console free of errors. Also gave the provider settings inputs a `label` — Umbraco was warning
      "UUI-INPUT needs a label" 11× on that form (pre-existing); ships with step 3.* `shared/commerce-ui.js`: header buttons never wrap
      (`.view-actions uui-button { white-space: nowrap; flex-shrink: 0 }`); `createFlyout()` lifted out
      of `commerce-admin-dashboard.js` (`_createFlyout`, already used by Currencies/Countries) so two
      surfaces share one implementation; `modalShell` gains `size: 'drawer'` (right-anchored,
      full-height, reduced-motion guarded) and an optional sticky `footer` slot for a drawer with three
      actions. `payment-providers-dashboard.js`: drop the header select and `addAlias`, make
      `+ Create Payment Method` the flyout trigger (disabled once every provider is configured),
      `startAdd(alias)` takes its alias, outside-click closes the flyout.
- [x] **2. API — filter the order list server-side.** *Done: 10 semantics tests in
      `OrderFilterTests.cs` plus one endpoint test in `OrdersControllerTests.cs`
      (`GetOrders_AdvancedFilterNarrowsTheWholeResultSetNotJustThePage`, asserting `totalCount`, not just
      the page). Full suite 156/156. Not curl-verified: API keys are stored hashed, and a token would
      mean authenticating with a seeded password, so the endpoint is asserted through the controller
      instead.* New
      `EComm.Api/DTOs/Requests/Orders/OrderFilterRequest.cs` (firstName, lastName, email, orderNumber,
      placedAfter, placedBefore, properties, skus) with an `Apply(IEnumerable<Order>)` method;
      `OrdersController.GetOrders` binds it `[FromQuery]` and applies it after the existing
      status/search clauses. Semantics: fields AND together, text is case-insensitive `Contains`,
      `placedBefore` with no time component covers the whole day, `properties` matches
      `Order.CustomProperties` pairs (`Name` equals alias, `Value` contains value; bare alias = must
      exist), `skus` ORs case-insensitive equality against `OrderItem.Sku`. Logic lives in the DTO so
      `AdminOrdersController` can adopt it later without a second copy. Check:
      `EComm.Api.Tests/OrderFilterTests.cs` over a plain `List<Order>` — no DataStore fixture.
- [x] **3. Plugin: forward the filter + the Advanced filter drawer.** *Verified in Westbay.V9
      (plugin 1.6.16) against the live westbay-trailers data, every count cross-checked against the
      database independently: unfiltered 671 · `skus=LED_free_upgrade` 219 · `+ properties=trailerComment`
      39 · `placedBefore=2026-08-11` 671 (the 2:13 PM order that a naive comparison would drop) ·
      `+ placedAfter=2026-01-01` 42 · `email=gmail` 7. Paging keeps the filter, Apply resets to page 1,
      Enter applies, Reset blanks only the draft, Close discards it, `✕ Reset filters` clears everything.* `Models/OrderModels.cs` gains
      `OrderFilter` (eight `string?` fields — only the API parses dates);
      `ICommerceApiClient`/`CommerceApiClient.GetOrdersAsync` take it as an additive optional argument
      and append the non-empty ones to the query string; `CommerceAdminApiController.GetOrders` binds
      and forwards it. `commerce-admin-dashboard.js`: `advFilter` (applied) / `advDraft` (being edited)
      / `showAdvFilter` state, an `Advanced filter: N fields` trigger in the Orders filters bar via the
      existing `_filterBtn`, the drawer itself (Customer · Order · Order line sections, native
      `<input type="date">`, help text as `formRow` hints, `Close · Reset · Apply` footer), and the
      existing `✕ Reset filters` chip extended to clear it.
- [x] **4. Docs.** `umbraco/docs/DESIGN-SYSTEM.md` (header buttons don't wrap, `createFlyout`, drawer
      size + `footer` slot + the draft rule, `--payment-*` mirrors `PaymentState`, rollout table),
      `.claude/commands/ctx-orders.md` (the `GET /api/v1/orders` parameter table + match semantics),
      `.claude/commands/ctx-umbraco.md` (Orders tab filters/drawer, Payment Providers header),
      `api/AGENTS.md`, root `AGENTS.md` (feature + the server-side-filtering principle),
      `docs/STATUS.md` (the client-side Payment Status known-issue is gone; replaced with what
      "No payment" means).

## Verification per step

- **API**: `cd api && ~/.dotnet/dotnet test EComm.Api.Tests`, then run the API and check `totalCount`
  actually shrinks:
  `curl -s 'http://localhost:5180/api/v1/orders?firstName=…&placedBefore=…' -H 'X-API-Key: …'
  -H 'X-Tenant-ID: tenant-a' -H 'X-Market-ID: market-1'`.
- **Plugin build**: `cd umbraco && ~/.dotnet/dotnet build EComm.Umbraco.sln`.
- **Backoffice**: via **Westbay.V9** (http://localhost:8640), *not* the sample site — bump
  `<Version>` in the plugin csproj, `dotnet pack -c Release -o <westbay>/Westbay.V9/local-nuget`, bump
  the `PackageReference` in all three csprojs (`Westbay.Core`, `Westbay.Web`, `Westbay.Core.Tests`),
  rebuild `Westbay.Web`, restart and hard-refresh. Confirm the *served* asset carries the change before
  trusting the restart — the site is often still running an older build.
- **Walk the UI**: Payment Providers (header on one line, flyout lists only unconfigured providers,
  disabled when none remain, outside click closes it, create still works). Orders (each field narrows,
  the trigger count is right, paging keeps the filter, Reset clears the draft, `✕ Reset filters` clears
  everything). Console clean.

## Notes

- `Customer.FullName` is the only name the data has, so First/Last are two contains-matches against the
  same field. Fine for `"Felix" + "Andersson"` → `"Felix Andersson"`; it cannot distinguish which token
  is which, and nothing in the UI claims it can.
- `OrderItem` carries `itemType`/`itemSubType` but no property bag — worth revisiting if order-line
  property filtering is ever actually needed.

## Payment Status: fixed (step 3b)

Chosen: **filter the real column**. `derivePaymentStatus` is gone — the column, the detail badge and
the filter all read `Order.PaymentStatus`, and the filter is sent to the API like every other one.

- `OrderFilterRequest.PaymentStatus` matches the stored `PaymentState` exactly
  (`Initialized`/`Authorized`/`Captured`/`Cancelled`/`Failed`/`Refunded`), case-insensitively; the
  literal `none` selects orders with no payment record, which equality cannot express and which is the
  majority of the real data.
- The dropdown lists those states plus **No payment**; the invented `Paid` option is gone (`Captured`
  and `Failed` are the real ones). Kit gains `pill--payment-captured` / `--failed` / `--none`,
  loses `--paid`.
- `filteredOrders` deleted, the filter resets to page 1 and refetches, so count, pager and rows can no
  longer disagree.

Verified in Westbay.V9 (plugin 1.6.17), every number cross-checked against the database:

| Filter | Result |
|---|---|
| trailers, *No payment* | 671 (all — none of them ever had a payment) |
| trailers, *Captured* | 0, **pager gone and count blank** (previously: empty table beside "219 orders" and 11 pages) |
| accessories, *No payment* / *Initialized* / *Authorized* | 176 / 27 / 9 |
| accessories, Order Status *Paid* + *Initialized* | 1 |
| … + advanced `orderNumber=1628` (an *Authorized* order) | 0 |

The *Authorized* rows show order status **Paid** next to payment **Authorized** — funds reserved, not
captured. The old derived logic printed "Paid" in both columns and hid that distinction.

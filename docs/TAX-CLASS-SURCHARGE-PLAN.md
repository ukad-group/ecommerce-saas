# Payment-method surcharge fee + market Tax Classes — shipped

This feature is complete. Full reference documentation lives in
[TAX-CLASSES.md](TAX-CLASSES.md) and [PAYMENT-PROVIDERS.md](PAYMENT-PROVIDERS.md#payment-surcharge-fee) —
this file is now just a changelog/pickup note.

## What shipped

- **Tax Classes**: market-scoped named tax rates (default + per-country overrides), stored as a
  JSON list on `MarketSettings` (`TaxClass`/`CountryTaxRate`), managed via
  `GET/PUT /api/v1/admin/markets/{id}/tax-classes`. React admin page at
  `/admin/markets/{marketId}/tax-classes`; Umbraco plugin's Commerce → Options → Tax Classes tab.
- **Payment surcharge fee**: an optional flat fee per payment-provider alias
  (`MarketSettings.PaymentSurcharges`), taxed via a Tax Class, resolved from the market's active
  provider at order-creation time, snapshotted onto `Order.PaymentFee`/`Order.PaymentFeeTax`, and
  folded into `Order.Total` + the Nets Easy request as two extra flat line items. Managed via
  `PUT/DELETE /api/v1/admin/markets/{id}/payment-providers/{alias}/surcharge`. Surfaced as a
  "Surcharge fee" sub-section below each provider's own settings form in both admin UIs.
- **Schema-safety fix**: added `SchemaUpgrader.EnsureOrderPaymentFeeColumns()` — this repo has no
  EF Core Migrations project, and `EnsureCreated()` is a no-op once `ecomm.db` exists, so additive
  `Order` columns now self-heal on every existing `ecomm.db` at startup instead of relying on
  undocumented manual `ALTER TABLE`s (a pre-existing trap, confirmed via direct inspection of the
  live db before this fix).
- **Test-suite fix (bonus find)**: `OrdersControllerTests`/`PaymentsControllerWebhookTests` now
  share an xunit `[Collection("DataStore")]` — they both touch the process-wide `DataStore`
  singleton, and xunit's default cross-class parallelism was intermittently corrupting both
  (including a pre-existing test unrelated to this feature). Fixed, verified stable across 3 runs.

## Known follow-up

- **Umbraco live UI verification wasn't completed.** The plugin was packed as `v1.4.7` into
  Westbay.V9's local NuGet feed (`Westbay.V9/local-nuget/EComm.Umbraco.Commerce.1.4.7.nupkg`,
  `Westbay.Web.csproj` already points at it) and a test instance builds and runs cleanly on
  `http://localhost:8650` (port 8640 was occupied by an unidentified process). Backoffice login
  credentials weren't available in this session, so the Tax Classes tab and surcharge sub-form
  were verified by code review + compile/syntax checks only (they mirror the already
  browser-verified React admin implementation and the existing Product Attributes section
  line-for-line). **To finish**: log into `localhost:8650/umbraco` (or your regular instance,
  restarting the app if needed) → Commerce → a store → Options → **Tax Classes** / **Payment
  Providers**, and confirm both behave like their React equivalents.

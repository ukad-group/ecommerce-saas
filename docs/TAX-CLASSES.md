# Tax Classes

A **Tax Class** is a named tax rate, scoped to a market: a default rate plus optional per-country
overrides. Today it feeds exactly one thing — the [payment surcharge fee](PAYMENT-PROVIDERS.md#payment-surcharge-fee)'s
tax calculation. It does **not** touch the general product/cart/order tax flow, which still uses
the market's flat `MarketSettings.TaxRate` exactly as before. Don't assume this is a general-purpose
tax engine — it isn't (yet).

## Storage

Tax Classes are a JSON list directly on `MarketSettings` (`api/EComm.Data/ValueObjects/Tenant/MarketSettings.cs`),
the same idiom as `ShippingMethods`/`LeasingPeriods` — no separate database table, no migration:

```jsonc
"settings": {
  "taxClasses": [
    {
      "id": "tc-1",
      "name": "Standard",
      "defaultRate": 0.20,
      "countryRates": [
        { "countryCode": "SE", "rate": 0.25 }
      ]
    }
  ]
}
```

`defaultRate`/`rate` are fractions (e.g. `0.25` = 25%), matching `MarketSettings.TaxRate`'s
convention. `countryCode` is ISO 3166-1 alpha-2 (e.g. `"SE"`).

## Resolution

`TaxClass.ResolveRate(classes, taxClassId, countryCode)` (`api/EComm.Data/ValueObjects/Tenant/TaxClass.cs`):

1. No `taxClassId` → `0`.
2. Unknown `taxClassId` → `0`.
3. `countryCode` exactly matches (case-insensitive) one of the class's `countryRates` → that rate.
4. Otherwise → the class's `defaultRate`.

## Endpoints

- `GET /api/v1/admin/markets/{id}/tax-classes` → `{ taxClasses }`.
- `PUT /api/v1/admin/markets/{id}/tax-classes` — whole-list replace, body `{ taxClasses }`.

No per-item CRUD — same bulk-replace pattern as shipping methods.

## Managing Tax Classes in the UI

- **React admin** (`localhost:5173`): `/admin/markets/{marketId}/tax-classes` — a single page,
  list + inline edit + nested country-override rows, in the same style as *Products → Product
  Attributes*. Reached via a "Manage Tax Classes" link from the payment-surcharge sub-form in
  *Markets → edit a market → Payment providers*.
- **Umbraco plugin**: the *Commerce* section → *Options → Tax Classes* tab, same list/edit shape.

Both call `GET /api/v1/countries` (unfiltered — a tax-rate override is a country/tax-law concept,
independent of which countries the market ships to) to populate the country picker.

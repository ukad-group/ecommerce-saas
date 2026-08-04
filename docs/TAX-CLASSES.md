# Tax Classes

A **Tax Class** is a named tax rate, scoped to a market: a default rate plus optional per-country
overrides.

**Which class applies is decided by the active payment provider.** The class named by
`PaymentSurcharges[activeAlias].TaxClassId` drives two things:

1. **Goods tax** on carts and orders (`Order.Tax`, `Cart.Tax`).
2. That provider's own [surcharge fee](PAYMENT-PROVIDERS.md#payment-surcharge-fee) tax
   (`Order.PaymentFeeTax`).

When no usable class is named — no active provider, no surcharge, a blank `taxClassId`, or one
pointing at a since-deleted class — goods fall back to the market's flat `MarketSettings.TaxRate`.

> **This couples goods tax to payment configuration.** Switching the active provider, or clearing its
> surcharge, changes what the whole catalogue is taxed at. That is deliberate (one screen configures
> tax), but if it ever bites, give `MarketSettings` its own `DefaultTaxClassId` and read that for
> goods instead.

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

`TaxClass.ResolveRate(classes, taxClassId, countryCode)` (`api/EComm.Data/ValueObjects/Tenant/TaxClass.cs`)
resolves one class:

1. No `taxClassId` → `0`.
2. Unknown `taxClassId` → `0`.
3. `countryCode` exactly matches (case-insensitive) one of the class's `countryRates` → that rate.
4. Otherwise → the class's `defaultRate`.

`MarketSettings.ResolveGoodsTaxRate(countryCode)` owns the goods lookup and its fallback — it finds
the active provider's class and, when there isn't a usable one, answers `TaxRate` rather than the `0`
that `ResolveRate` alone would give (a dangling reference must not silently ship untaxed orders).
Both the cart and the order call this one method so they can't drift apart.

**Country rates and the cart.** A cart has no address, so it uses the class `defaultRate`. Order
creation re-resolves with the shipping country, so a per-country rate applies from then on — an order
total can legitimately differ from the cart estimate it came from. Both round to 2 decimal places.

**Payment gateways see the resolved rate too.** A gateway with per-line tax fields (Nets Easy's
`taxRate`/`taxAmount`) is handed this same rate, resolved for the order's shipping country, instead of
being sent tax as a fake product line — see
[PAYMENT-PROVIDERS.md](PAYMENT-PROVIDERS.md#nets-easy-specifics).

## Endpoints

- `GET /api/v1/admin/markets/{id}/tax-classes` → `{ taxClasses, taxRate }`.
- `PUT /api/v1/admin/markets/{id}/tax-classes` — whole-list replace, body `{ taxClasses, taxRate }`.
  Omitting `taxRate` (or sending `null`) leaves the stored fallback rate alone, so a caller editing
  only classes can't blank it by omission.

No per-item CRUD — same bulk-replace pattern as shipping methods.

## Managing Tax Classes in the UI

- **React admin** (`localhost:5173`): `/admin/markets/{marketId}/tax-classes` — a single page,
  list + inline edit + nested country-override rows, in the same style as *Products → Product
  Attributes*. Reached via a "Manage Tax Classes" link from the payment-surcharge sub-form in
  *Markets → edit a market → Payment providers*.
- **Umbraco plugin**: the *Commerce* section → *Options → Tax Classes* tab, same list/edit shape.

Both screens also carry the **Store Tax Rate (fallback)** field, entered as a percentage. It lives
here rather than in the market form because it's the last resort of the same lookup, so all tax
settings sit on one screen.

Both call `GET /api/v1/countries` (unfiltered — a tax-rate override is a country/tax-law concept,
independent of which countries the market ships to) to populate the country picker.

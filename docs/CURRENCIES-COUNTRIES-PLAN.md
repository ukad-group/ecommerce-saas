# Currencies & Countries settings — implementation plan

Per-store Currencies and Countries screens in the Umbraco plugin's Commerce section, matching the
reference backoffice design. **Scope: settings screens + storage only** — `Market.Currency` stays the
store's active currency, no checkout/pricing changes, no Regions tab.

Status legend: ☐ pending · ▶ in progress · ✅ done

---

## ✅ Step 1 — Backend: collections, endpoints, presets

- `api/EComm.Data/ValueObjects/Tenant/Currency.cs` — `Id, Name, Code, Culture, FormatTemplate,
  CountryCodes` (null/empty = all countries, same idiom as `ShippingMethod.CountryCodes`).
- `api/EComm.Data/ValueObjects/Tenant/MarketCountry.cs` — `Id, Name, Code, DefaultCurrencyId,
  DefaultShippingMethodId, DefaultPaymentProviderAlias`. Named `MarketCountry` because
  `Common.Country` is the static ISO 3166 reference pair these are created from.
- `MarketSettings`: added `Currencies` + `Countries`; **removed `ShippingZones`** and its 7
  `DatabaseSeeder` assignments — it was seeded with US *state* codes, so the country filter it fed
  matched no ISO country and returned an empty list. JSON column ⇒ no EF migration, no DB reset.
- `MarketsController`: `GET|PUT /api/v1/admin/markets/{id}/currencies` and `.../countries`,
  whole-list PUT mirroring the tax-classes pair. Write normalises blank ids → GUID, ISO code →
  upper-case, empty `CountryCodes` → null.
- `CountriesController.GetCountries(marketId)`: returns exactly the market's configured countries,
  sorted by name — **empty when the market has none** (see step 6). Omitting `marketId` gives the full
  ISO reference list.
- New `CurrenciesController`: `GET /api/v1/currencies/presets` → `{ currencies:
  [{code,name,defaultCulture}], cultures: [{name,displayName}] }`, generated once from
  `CultureInfo.GetCultures` + `RegionInfo` (no hardcoded table).

**Verified**: `dotnet build api/EComm.sln` clean; `api/EComm.Api.Tests/CurrenciesCountriesTests.cs`
(7 new tests) green; full suite 126/126.

## ✅ Step 2 — Plugin proxy

- Plugin `Models/`: `Currency`, `MarketCountry`, `CurrencyPresets` (`Models/Country.cs` stays the ISO
  reference pair).
- `ICommerceApiClient` / `CommerceApiClient`: `GetCurrenciesAsync`, `UpdateCurrenciesAsync`,
  `GetMarketCountriesAsync`, `UpdateMarketCountriesAsync`, `GetCurrencyPresetsAsync` — copies of the
  tax-classes pair with the path segment swapped; presets cached like `GetCountriesAsync`.
- `CommerceAdminApiController`: `GET|PUT currencies`, `GET|PUT market-countries`,
  `GET currency-presets`.

Also fixed while here: `CommerceApiClient.GetCountriesAsync` no longer defaults to the settings market —
it sent `?marketId=` on every call, which after the `CountriesController` change would have filtered the
ISO reference list the country presets and tax-rate picker are built from.

**Verified**: plugin builds clean.

## ✅ Step 3 — Dashboard UI

Inline in `commerce-admin-dashboard.js` (reuses `_viewHeader`, `_errorBanner`, `_stateCenter`,
`_renderPager`, `.data-table` / `.form-panel--modal` / `.filters-bar` and the store switcher).

- `OPTIONS_SUBITEMS`: `currencies`, `countries`; `_loadView` cases.
- `_renderCurrenciesView()` — `Name | ISO Code` table + search; modal with ISO Code, Culture
  (preset `<select>`), Custom Format Template, *Available in Countries* (All toggle + per-country).
- `_renderCountriesView()` — `Name | ISO Code` table + search; modal with ISO Code, Default
  Currency, Default Shipping Method, Default Payment Method.
- Create flyout on both: *New blank* · *New from ISO preset* · *All from ISO presets* (one PUT).
- `formatCurrency()` uses the configured `Currency.culture` instead of the hardcoded locale map.

**Verified in the Westbay backoffice** (container on `localhost:8640`, rebuilt with 1.6.0):
Options shows Currencies + Countries; the Create flyout offers all three modes; a country created from
an ISO preset filled name + code and saved; the bulk "all presets" added 198 without duplicating
Sweden and re-running it showed the "already in the list" guard; search, pagination (20 pages), delete,
and the store-currency badge all behaved; the currency editor's **All** toggle revealed the store's own
countries and round-tripped as `countryCodes: ["SE"]`; the country's Default Currency dropdown listed
the new currency and its selection persisted across navigation. Empty Shipping/Payment dropdowns were
confirmed genuine (`{"methods":[]}`, `"providers":[]` for that market). No console errors.

With 1 country configured the ISO preset picker still offered all 198 — the check that the
`GetCountriesAsync` fix in step 2 actually works (otherwise: can't add countries because the picker is
already filtered).

**Changed after seeing it live — the preset no longer guesses a culture.** The first attempt took the
first culture ICU lists for the currency's region, which gave SEK a default of `en-SE` ("English
(Sweden)"). Preferring "the culture that is its own language's default" fixed SEK (`sv-SE`) and USD
(`en-US`) but then produced **`cy-GB` (Welsh) for GBP** and **`ast-ES` (Asturian) for EUR**, because
`en` belongs to `en-US` so `en-GB` never qualifies while single-region minority languages always do.
.NET exposes no "primary language of a region" (ICU likely-subtags isn't reachable — `und-GB` stays
`und-GB`, and `CreateSpecificCulture("SE")` answers `se-NO`, Northern Sami), and the only remaining
options were a hardcoded table or another wrong guess. So `CurrencyPreset` is now just `{code, name}`
(`CurrencyEnglishName` is culture-independent, so first-wins is safe there) and the admin picks the
culture from the sorted dropdown — one click, never absurd, less code than either heuristic.

That also means no plugin rebuild is strictly required for this change: the old JS read
`p.defaultCulture`, which is now simply absent, leaving the culture unset exactly as the new JS does.
The plugin was still repacked as **1.6.1** (1.6.0 had already been consumed) to keep the source clean.

**Second thing the live run exposed**: after bulk-adding the ISO presets, the currency editor's
"Available in Countries" block rendered ~200 toggles in one modal. `_renderCurrencyCountryToggles` now
adds a filter box plus a "N selected" count past 12 countries and caps the list height; filtering only
changes what is rendered, so a selected country scrolled out of view stays selected, and the filter is
reset whenever the editor opens. **Verified** on the rebuilt 1.6.1 container: the filter appears with a
"N selected" count, `nor` narrows to North Korea / North Macedonia / Norway while Sweden stays selected
off-screen, toggling Norway under the filter reached "2 selected", and clearing the filter showed both
still on. Saved as `countryCodes: ["SE","NO"]`.

Also verified on 1.6.1: switching the culture to Swedish (Sweden) persisted as `sv-SE`, the second
store (Westbay Accessories) has its own empty lists with no leakage from Trailers, and the Orders list
formats money as `129 900,00 kr` — i.e. `formatCurrency` is using the configured culture. No console
errors anywhere in the run.

## ✅ Step 5 — Prune currency availability when a country is removed

Found while cleaning up the bulk-test countries: a currency's `CountryCodes` could keep a code for a
country the store no longer sells to. The editor only lists the store's own countries, so that code was
**invisible yet still counted** — the list would read "2 countries" with one of them unselectable and
unremovable. `MarketsController.UpdateMarketCountries` now prunes each currency's `CountryCodes` to the
countries being saved, and a list emptied that way becomes `null` ("all") rather than an empty list
("nowhere"). Covered by `RemovingACountry_PrunesItFromCurrencyAvailability`; API-side only, so no plugin
rebuild.

## ✅ Step 6 — A market with 0 countries returns 0 countries

The first cut fell back to the full ISO list when a market had none configured, on the reasoning that an
empty picker is worse than an unrestricted one. Replaced with strict semantics on request: asking for a
market asks *where that market sells*, and answering "everywhere" would let a storefront offer countries
the store never configured. Unknown market ids answer empty too, rather than the whole world.

Safe with no regressions because **no caller passes `marketId` today** — the React tax-classes picker
calls `getCountries()` and the plugin proxy calls `GetCountriesAsync()`, both deliberately unfiltered
(and the step-2 client fix is what keeps the country presets working). Any future caller that wants the
reference list must omit `marketId`. Covered by `GetCountries_MarketWithNoConfiguredCountries_IsEmpty`
and `GetCountries_UnknownMarket_IsEmptyRatherThanTheWholeWorld`; 128/128 pass.

## ✅ Step 7 — The plugin cached an empty country list (and never invalidated it)

Reported from the Westbay storefront: after Sweden was saved in the backoffice the checkout still had no
country field, and a container restart fixed it. `GetCountriesAsync` cached per market for 5 minutes
with no invalidation hook, and cached **whatever it got, including an empty list** — while the checkout
view renders its country `<select>` only `@if (Model.Countries?.Any() == true)`, so a cached empty list
removes the field outright. Three fixes in `CommerceApiClient`:

1. **Never cache an empty list.** Empty is either "nothing configured yet" — which flips the moment an
   admin saves and is cheap to re-ask — or a masked failure (null body, shape change). It logs at Debug
   instead, because the previous silence is what made this undiagnosable.
2. **Evict on write.** `UpdateMarketCountriesAsync` now removes the market's key on success, the
   convention the category create and product writes already follow. The ISO reference key is left
   alone: it is static.
3. **Unambiguous keys** — `EComm_Countries_iso` vs `EComm_Countries_market_{id}`, via one
   `CountriesCacheKey` helper, so a market whose id was the old `"all"` sentinel can't collide with the
   reference list.

### The bigger consequence, needing a product decision

`Westbay.Core/Features/CheckoutPage/CheckoutPageController.cs:103` fetches
`GetCountriesAsync(settings.MarketId)`, and the stored setting is `EComm.Commerce.MarketId =
westbay-accessories` (read from `umbracoKeyValue`) — a market with **0 countries configured**. So with
step 6's strict semantics the checkout has no country field until someone configures countries for that
market. Before step 6 the API's ISO fallback hid this. Either configure the accessories market's
countries (the model working as intended: a market declares where it sells), or make the storefront ask
for the reference list explicitly when the market list is empty. That controller's comment ("or the full
ISO list when it has none") is stale either way.

`GetCategoriesAsync` has the identical cache-empty shape (`CommerceApiClient.cs:109`) — left untouched,
since a market with no categories is a broken setup rather than a normal state, but it is one guard away
from the same 5-minute stranding.

## Environment note (cost several detours)

`localhost:8640` is the Docker container `local/westbay:v17`, **not** a host `dotnet run` — plugin
changes only appear there after that image is rebuilt (its Dockerfile restores from
`Westbay.V9/local-nuget`, so a fresh `.nupkg` + bumped `PackageReference` is enough). `localhost:8642`
is an older pre-17 site with no EComm plugin at all (its `App_Plugins` asset 404s). A host instance can
be run on a spare port against the same SQL Server (`--urls http://localhost:8643`,
`ASPNETCORE_ENVIRONMENT=Local`), but each origin needs its own backoffice login.

## ✅ Step 4 — Docs & version

Plugin bumped `1.5.0` → `1.6.0`, packed to `_pack/`, copied into
`westbay-web/Westbay.V9/local-nuget/`, and the three `PackageReference`s there bumped to 1.6.0;
`Westbay.Web` builds and runs. Docs updated: `.claude/commands/ctx-umbraco.md`, `umbraco/AGENTS.md`,
`api/AGENTS.md` (endpoints, market-settings list, controller count, `ShippingZones` removal),
`docs/STATUS.md`.

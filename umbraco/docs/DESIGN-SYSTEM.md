# Commerce Backoffice Design System

One look for every Commerce surface in the Umbraco backoffice. Read this before adding or changing
UI in `umbraco/plugin/EComm.Umbraco.Commerce/wwwroot/components/` — the kit already has the piece
you need, and a local variant is what made the section look like five different products.

**The kit**: [`components/shared/commerce-ui.js`](../plugin/EComm.Umbraco.Commerce/wwwroot/components/shared/commerce-ui.js)
— one stylesheet (`commerceStyles`) plus template helpers. Every element renders in its own shadow
root, so a shared stylesheet is the only thing that can keep them consistent.

**The two references it was built from**: the Order Statuses tab (page shell, table, pills, trash
action) and Umbraco's own confirm dialog (`umb-confirm-modal` — the modal card and button order).

## Using it

```js
import {
  commerceStyles, viewHeader, viewFooter, errorBanner, loadingState, emptyState,
  pager, searchBar, formRow, checkRow, iconButton, modalShell, modalActions, confirmDelete,
} from '../shared/commerce-ui.js';

class MyView extends UmbElementMixin(LitElement) {
  // kit first, local chrome second — local rules win where they overlap
  static styles = [commerceStyles, css`
    :host { display: block; height: 100%; }
  `];
}
```

`commerceStyles` deliberately contains **no `:host` layout** (no `display`, `height`, `padding`).
A property editor embedded in a content form must not inherit a dashboard's full-height shell, so
each element declares its own `:host`.

## Tokens

Never hardcode a colour or radius in a component. The values live on `:host` in `commerceTokens`.

| Token | Value | Use |
|---|---|---|
| `--ec-bg` | `#f4f4f4` | page background behind a view |
| `--ec-surface` | `#fff` | tables, panels, cards, modals |
| `--ec-surface-alt` | `#fafafa` | row hover |
| `--ec-surface-sunken` | `#f9f9fb` | expanded detail panel |
| `--ec-border` / `--ec-border-soft` / `--ec-border-strong` | `#e5e5e5` / `#f0f0f0` / `#d4d4d4` | panel & header / row / input borders |
| `--ec-text` / `--ec-text-alt` / `--ec-text-muted` / `--ec-text-faint` | `#1a1a1a` / `#555` / `#888` / `#aaa` | primary / label / secondary / empty-state text |
| `--ec-navy` | `#1b264f` | store icon, active page button (Umbraco's default button colour) |
| `--ec-accent` / `--ec-accent-bg` | `#c0392b` / `#fde8e8` | active nav item |
| `--ec-danger` / `--ec-danger-bg` / `--ec-danger-border` | `#d42054` / `#fdeaef` / `#f4c6d2` | destructive hover |
| `--ec-error-*` | `#dc2626` / `#fef2f2` / `#fca5a5` | error banner |
| `--ec-focus` / `--ec-selected-bg` | `#3b82f6` / `#eff6ff` | focus ring, selected row |
| `--ec-radius` / `--ec-radius-md` / `--ec-radius-lg` | `4px` / `6px` / `8px` | inputs & buttons / panels & modals / cards |

## Anatomy of a view

```
┌─ .view-container ─────────────────────────────────────────────┐
│ viewHeader('Order Statuses', Refresh + Create)                │  title left, actions right
│ errorBanner(this.xError, clear)                               │  only when set
│ searchBar({...}) / .filters-bar                               │  filters left, search right
│ ┌ .table-scroll ────────────────────────────────────────────┐ │
│ │ table.data-table — row click = edit, trailing trash cell  │ │  or loadingState()/emptyState()
│ └───────────────────────────────────────────────────────────┘ │
│ pager(total, page, size, goTo)                                │  hidden at one page
│ viewFooter('Store / Options / Order Statuses', '4 statuses')   │
└───────────────────────────────────────────────────────────────┘
```

## Components

**Header** — every list view: title, then `Refresh` (`look="outline"`), then the primary create
button labelled `+ Create <Thing>`.

```js
viewHeader('Order Statuses', html`
  <uui-button look="outline" label="Refresh" @click=${this.loadOrderStatuses}>
    <uui-icon name="icon-refresh" style="margin-right:6px"></uui-icon>Refresh
  </uui-button>
  <uui-button look="primary" @click=${() => { this.editingOrderStatus = {...}; }}>
    + Create Order Status
  </uui-button>`)
```

**Table** — `.data-table` inside `.table-scroll`. Sticky header, one row per record.

```js
html`<div class="table-scroll">
  <table class="data-table">
    <thead><tr><th>Status</th><th class="col-r" style="width:90px">Sort</th><th class="col-actions"></th></tr></thead>
    <tbody>${rows.map(r => html`
      <tr class="data-row" title="Edit ${r.name}" @click=${() => { this.editingX = { ...r }; }}>
        <td><div class="name-cell">
          <uui-icon class="row-icon" name="icon-tag"></uui-icon>
          <span><span class="name-primary">${r.name}</span><span class="name-sub"><code>${r.code}</code></span></span>
        </div></td>
        <td class="col-r muted">${r.sortOrder}</td>
        <td class="col-actions">${iconButton({ title: `Delete ${r.name}`, onClick: () => this.deleteX(r) })}</td>
      </tr>`)}
    </tbody>
  </table>
</div>`
```

Cell classes: `.col-check` (40px checkbox), `.col-date`, `.col-r` (right-aligned), `.col-actions`
(64px, right). Name cells: `.name-cell` + `.name-primary` / `.name-sub`, `.doc-icon` for a boxed
glyph, `.row-icon` for a bare one. `.data-row--static` for a row that isn't clickable.

**Pills** — status and state, never `uui-badge` or `uui-tag`:
`pill('Active', 'active')`, or `.pill--inactive`, `--system`, `--single`, `--group`, `--info`,
`--warning`, `--danger`, `--current`, `--neutral`, `--order-*`, `--payment-*`. An order status pill
uses the status's own colour inline (`style="background:${def.color}"`).

**States** — `loadingState('Loading…')`, `emptyState('icon-tag', 'No attributes yet', optionalNote)`,
or `stateCenter(anything)`.

**Errors** — `errorBanner(this.xError, () => { this.xError = null; })` directly under the header.
API refusals are shown verbatim; never swallow the server's message.

**Notices** — a result the editor reads but needn't dismiss (a save succeeded, a save failed, a
warning inside a form): `.notice` + `.notice--success` / `--error` / `--warning`. Not `uui-badge`.

**Forms** — `.form-panel` (inline editor above a table) or a modal body. Rows come from helpers:

```js
formRow('Name', html`<input class="form-input" .value=${x.name} @input=${...}>`)
formRow('Code', html`<code>${x.code}</code>`, 'Fixed — existing orders reference this code.')
checkRow('Active', x.isActive !== false, e => {...}, 'Inactive statuses drop out of the pickers.')
```

A row is a **two-column grid**: a fixed label column (`--ec-label-col`, 180px by default) and the
control column. Controls therefore line up down the whole form, and a label too long for its column
wraps onto a second line instead of pushing its control right. A surface whose labels are all long
widens the column for itself — the Payment Providers editor sets `--ec-label-col: 210px` on `:host`.
Inside a `.form-panel` the *cell* is capped at 520px (not the control), so a bare input and an
input-plus-button end at the same x; modal bodies use the full card width.

Widths: `.form-input--xs` (100px), `--sm` (110px), `--color` (a swatch). Repeating value rows:
`.form-list` > `.form-list-row` + `.remove-btn`, with `.add-row-btn` at the end. Chips:
`.chip` / `.chip--on`. Hints: `.form-hint`. Native `uui-input`/`uui-select` still work — the kit
sizes them to match `.form-input` — but prefer `.form-input` in new markup.

Booleans use `checkRow` (native checkbox + `for`/`id` label), not a `uui-toggle` carrying its own
text — a toggle that repeats the row label prints the field name twice. `uui-toggle` is still right
where the switch text *is* the label, e.g. the per-country list in the Currency editor.

**Modal** — `modalShell` + `modalActions`. One pattern, matching the confirm dialog:

```js
${this.editingX ? modalShell({
  headline: isNew ? 'New Tax Class' : 'Edit Tax Class',
  size: 'md',                                   // sm 460 · md 720 · lg 920
  onClose: () => { this.editingX = null; },      // backdrop click + Escape
  body: html`${formRow('Name', ...)}`,
  actions: modalActions({
    onCancel: () => { this.editingX = null; },
    onConfirm: () => this.saveX(),
    confirmLabel: 'Save',                        // 'Delete', 'Move orders & delete', …
    color: 'positive',                           // 'danger' for destructive
    disabled: !valid,
  }),
}) : ''}
```

Rules: **Cancel first, primary second, both right-aligned** (`slot="actions"` — `modalActions`
handles it). Headline is a sentence, not a shout. No `.form-actions` inside a modal body — the
dialog owns the action row. The shell renders in place rather than through
`UMB_MODAL_MANAGER_CONTEXT`, so a view keeps its plain `editingX` state.

**Confirm before destroying** — `await confirmDelete(this, name)` in the delete *method* (not on the
button), so every caller is covered:

```js
async deleteTaxClass(id) {
  if (!await confirmDelete(this, this.taxClasses.find(x => x.id === id)?.name)) return;
  …
}
```

**Search & filters** — `searchBar({ value, placeholder, onInput })` for a plain search bar, or build
`.filters-bar` > `.filters-left` / `.filters-right` with `.filter-btn` + `.dropdown` and
`searchBox(...)` when a view also filters. `.filter-reset` for the reset chip.

**Pagination** — `pager(total, page, pageSize, goTo)`. Works for server-side lists (`goTo`
refetches) and client-side ones (`goTo` sets the page). Renders nothing at one page.

**Detail views** — `.detail-breadcrumb` + `.back-btn` header, `.detail-body` with
`.detail-grid--wide` / `.detail-section-block` / `.detail-label`, line items in `.items-table`.

**Cards** — `.stat-cards` > `.stat-card` (`.stat-value` + `.stat-label`) for figures.

## Rules

1. A row click opens the editor. The trailing cell holds one quiet trash `iconButton` — no
   "Edit"/"Del" text buttons in a table.
2. Deleting always goes through `confirmDelete`. No delete-on-single-click anywhere.
3. Primary buttons read `+ Create <Thing>`; `Refresh` sits next to it as `look="outline"`.
4. One modal pattern (`modalShell`). Never hand-roll a backdrop.
5. Modal vs inline panel: an editor that is the *whole* task (a status, a currency, a country, a
   tax class, an attribute) is a modal. An editor kept open alongside its list (Discounts, Property
   Templates, Attribute Presets, Payment Providers) stays an inline `.form-panel`. Pick one per
   surface and don't mix within a view.
6. Every list view ends in a `viewFooter` — breadcrumb left, record count right.
7. No inline `style=` for anything the kit names. Column widths and a status's own colour are the
   allowed exceptions.
8. New colour? Add a token. Don't paste a hex.
9. **Never name a method or reactive property after a DOM API member** — `remove`, `click`, `focus`,
   `append`, `before`, `after`, `closest`, `title`, `hidden`, `id`, `slot`, `children`. These are
   custom elements, so a method called `remove(x)` shadows `Element.prototype.remove()`, and
   lit-html's part cleanup (`ChildPart._$clear` → `node.remove()`) calls it when the element is
   detached: the element then stays on screen and runs your delete instead. Name it
   `deleteProvider` / `removeValue` / `dismiss`. A wrapper `<div>` around the element hides the
   collision by accident — don't rely on one.

## Adding a Commerce tab

1. `import { commerceStyles, … } from '../shared/commerce-ui.js'` and add `commerceStyles` to
   `static styles`.
2. `.view-container` > `viewHeader` → `errorBanner` → modal (if any) → `searchBar` → table /
   `loadingState` / `emptyState` → `pager` → `viewFooter`.
3. Register the view in the dashboard's `_renderCurrentView()` switch and the sidebar nav, and load
   its data from `_loadView(key)` — nothing is primed at startup.
4. Delete method calls `confirmDelete` first; errors land in the view's `xError` banner.
5. Walk the checks in [ctx-umbraco](../../.claude/commands/ctx-umbraco.md): every tab, every modal,
   console clean.

## Outside a view: the workspace editor

`products-workspace-view.js` renders inside Umbraco's document editor, not in the Commerce section,
so it has no `.view-container`. It wraps its content in `.workspace-panel` — a surface card that
takes the same `.view-header`, tables, pills, states, notices and modals as everything else. Its
form controls stay `uui-input`/`uui-label`/`uui-toggle` (the kit sizes them to match `.form-input`);
its split-panel/variant-table/image-gallery layout is local CSS.

## Rollout status

| Surface | State |
|---|---|
| `commerce-admin-dashboard.js` | ✅ kit styles + `modalShell` (order status, reassign, attribute, tax class, currency, country), one row-action/header/footer/search pattern across all 14 views |
| `payment-providers-dashboard.js` | ✅ kit shell, `.data-table`, pills, settings `.form-panel`; delete now goes through `confirmDelete` |
| `category-picker.js`, `product-picker.js` create popups | ✅ `modalShell({ size: 'sm' })` |
| `products-workspace-view.js` | ✅ `.workspace-panel` + kit states/pills/notices, photo browser via `modalShell`, product & variant deletes via `confirmDelete`; ~420 lines of dead old-table renderers removed |
| `settings-dashboard.js` | ➖ out of scope — native `uui-box`, lives in Umbraco's Settings section |

Known gap, pre-existing and unrelated to the kit: `product-picker.js` logs a
`TypeError: … reading 'unique'` when its `UMB_DOCUMENT_WORKSPACE_CONTEXT` callback fires with
`undefined` during teardown (reproduced on the pristine 1.6.9 file).

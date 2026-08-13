import { html, css } from '@umbraco-cms/backoffice/external/lit';
import { umbFocus } from '@umbraco-cms/backoffice/lit-element';
import { umbConfirmModal } from '@umbraco-cms/backoffice/modal';

/**
 * The Commerce backoffice design kit — one look for every Commerce surface.
 *
 * Every element in this plugin renders in its own shadow root, so a shared *stylesheet* is the only
 * way they can look alike. Import `commerceStyles` into `static styles` and use the classes/helpers
 * below instead of inventing a local variant.
 *
 * The spec (what each piece is for, and the rules that go with it):
 * umbraco/docs/DESIGN-SYSTEM.md
 */

/**
 * Palette. These are the exact values the Commerce section shipped with — kept as tokens so a
 * re-theme is one block, not a grep across five files.
 */
export const commerceTokens = css`
  :host {
    --ec-bg: #f4f4f4;
    --ec-surface: #ffffff;
    --ec-surface-alt: #fafafa;
    --ec-surface-sunken: #f9f9fb;
    --ec-border: #e5e5e5;
    --ec-border-soft: #f0f0f0;
    --ec-border-strong: #d4d4d4;
    --ec-text: #1a1a1a;
    --ec-text-alt: #555555;
    --ec-text-muted: #888888;
    --ec-text-faint: #aaaaaa;
    --ec-navy: #1b264f;
    --ec-accent: #c0392b;
    --ec-accent-bg: #fde8e8;
    --ec-danger: #d42054;
    --ec-danger-bg: #fdeaef;
    --ec-danger-border: #f4c6d2;
    --ec-error-text: #dc2626;
    --ec-error-bg: #fef2f2;
    --ec-error-border: #fca5a5;
    --ec-focus: #3b82f6;
    --ec-selected-bg: #eff6ff;
    /* Every form row is a two-column grid; a surface with long labels widens this, it never
       lets a long label push the controls out of alignment. */
    --ec-label-col: 180px;
    --ec-radius: 4px;
    --ec-radius-md: 6px;
    --ec-radius-lg: 8px;
  }
`;

/**
 * The kit itself. Deliberately holds no `:host` layout (display/height/padding) — a property editor
 * embedded in a content form must not inherit the dashboard's full-height shell.
 */
const kit = css`
  /* ── View shell ───────────────────────────────────────────────────────────── */
  .view-container {
    display: flex; flex-direction: column; height: 100%;
    background: var(--ec-bg); overflow-y: auto;
    font-family: var(--uui-font-family, sans-serif); font-size: 0.875rem;
  }

  .view-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 24px 0; background: var(--ec-bg);
  }
  .view-title { margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--ec-text); }
  .view-actions { display: flex; align-items: center; gap: 8px; }
  .view-actions uui-button uui-icon { margin-right: 6px; }

  .view-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 9px 24px; border-top: 1px solid var(--ec-border); background: var(--ec-surface);
  }
  .breadcrumb { font-size: 0.78rem; color: var(--ec-text-faint); }

  /* ── Error banner ─────────────────────────────────────────────────────────── */
  .error-banner {
    display: flex; align-items: center; gap: 8px;
    margin: 10px 24px 0; padding: 9px 14px;
    background: var(--ec-error-bg); border: 1px solid var(--ec-error-border);
    border-radius: var(--ec-radius-md); color: var(--ec-error-text); font-size: 0.84rem;
  }
  .error-close {
    margin-left: auto; background: none; border: none; cursor: pointer;
    font-size: 1.1rem; color: var(--ec-error-text);
  }

  /* ── Filters bar ──────────────────────────────────────────────────────────── */
  .filters-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 24px; gap: 12px;
  }
  .filters-left { display: flex; gap: 4px; }
  .filters-right { display: flex; align-items: center; gap: 8px; }

  .filter-wrap { position: relative; }

  .filter-btn {
    display: flex; align-items: center; gap: 3px;
    padding: 5px 10px; background: var(--ec-surface);
    border: 1px solid var(--ec-border-strong); border-radius: var(--ec-radius);
    cursor: pointer; font-size: 0.8rem; color: #333333; white-space: nowrap;
  }
  .filter-btn:hover { background: #f5f5f5; }
  .filter-reset { color: #ef4444; border-color: var(--ec-error-border); background: #fff5f5; }
  .filter-reset:hover { background: #fee2e2; }
  .caret { font-size: 0.65em; opacity: 0.5; margin-left: 2px; }

  .dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; z-index: 200;
    background: var(--ec-surface); border: 1px solid var(--ec-border-strong);
    border-radius: var(--ec-radius-md); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    min-width: 160px; overflow: hidden;
  }
  .dd-item {
    display: block; width: 100%; text-align: left; padding: 7px 14px;
    background: none; border: none; cursor: pointer; font-size: 0.8rem; color: #333333;
  }
  .dd-item:hover { background: #f5f5f5; }
  .dd-item.active { background: var(--ec-selected-bg); font-weight: 600; }
  /* Right-aligned flyout, for a trigger that sits at the right edge of a view header. */
  .dropdown--right { left: auto; right: 0; white-space: nowrap; }

  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: 8px; font-size: 0.875rem; color: var(--ec-text-faint); pointer-events: none; }
  .search-input {
    padding: 5px 10px 5px 28px; border: 1px solid var(--ec-border-strong);
    border-radius: var(--ec-radius); background: var(--ec-surface);
    font-size: 0.8rem; width: 200px; outline: none; color: #333333;
  }
  .search-input:focus { border-color: var(--ec-focus); }
  .search-input::placeholder { color: #bbbbbb; }

  /* ── Table ────────────────────────────────────────────────────────────────── */
  .table-scroll { flex: 1; overflow: auto; background: var(--ec-surface); }

  .data-table { width: 100%; border-collapse: collapse; }
  .data-table thead { position: sticky; top: 0; z-index: 1; background: var(--ec-surface); }
  .data-table th {
    text-align: left; padding: 10px 16px; border-bottom: 1px solid var(--ec-border);
    font-size: 0.78rem; font-weight: 600; color: #777777; white-space: nowrap;
  }
  .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--ec-border-soft); vertical-align: middle; }

  .data-row { cursor: pointer; }
  .data-row:hover { background: var(--ec-surface-alt); }
  .data-row.expanded { background: #f5f7ff; }
  .data-row.selected > td { background: var(--ec-selected-bg); }
  /* A row with no click behaviour shouldn't pretend otherwise. */
  .data-row--static { cursor: default; }

  .col-check { width: 40px; }
  .col-date { min-width: 190px; color: #666666; font-size: 0.84rem; }
  .col-r { text-align: right; }
  .col-actions { width: 64px; text-align: right; }

  input[type='checkbox'] { cursor: pointer; accent-color: var(--ec-focus); }

  .name-cell { display: flex; align-items: center; gap: 10px; }
  .doc-icon {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; background: #f0f0f0;
    border: 1px solid #e0e0e0; border-radius: var(--ec-radius); color: var(--ec-text-muted); flex-shrink: 0;
  }
  /* The small leading glyph on a name cell (tax class, attribute, currency, country, provider). */
  .row-icon { opacity: 0.5; flex-shrink: 0; }
  .name-primary { display: block; font-weight: 600; color: var(--ec-text); }
  .name-sub { display: block; font-size: 0.75rem; color: var(--ec-text-muted); }

  .pay-amount { display: block; font-weight: 700; color: var(--ec-text); }
  .pay-method { display: block; font-size: 0.75rem; color: var(--ec-text-muted); }

  .muted { color: var(--ec-text-muted); }

  /* Session ids are GUIDs — keep them from stretching the Carts table. */
  .session-id { font-size: 0.78rem; color: #666666; word-break: break-all; }

  .row-actions { display: flex; gap: 4px; justify-content: flex-end; white-space: nowrap; }

  /* Row action that shouldn't shout: grey until you reach for it, red once you do. */
  .icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border: 1px solid transparent; border-radius: var(--ec-radius);
    background: none; color: #9a9a9a; cursor: pointer;
  }
  .icon-btn:hover { color: var(--ec-danger); background: var(--ec-danger-bg); border-color: var(--ec-danger-border); }
  .icon-btn:focus-visible { outline: 2px solid var(--ec-focus); outline-offset: 1px; }

  /* ── Pills ────────────────────────────────────────────────────────────────── */
  .pill {
    display: inline-block; padding: 3px 10px;
    border-radius: 20px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;
  }
  .pill + .pill { margin-left: 6px; }
  .pill--order-new        { background: #0ea5e9; color: #fff; }
  .pill--order-pending    { background: #0ea5e9; color: #fff; }
  .pill--order-submitted  { background: #8b5cf6; color: #fff; }
  .pill--order-processing { background: #f59e0b; color: #fff; }
  .pill--order-paid       { background: #10b981; color: #fff; }
  .pill--order-shipped    { background: #6366f1; color: #fff; }
  .pill--order-completed  { background: #059669; color: #fff; }
  .pill--order-cancelled  { background: #ef4444; color: #fff; }
  .pill--order-on-hold    { background: #94a3b8; color: #fff; }
  .pill--order-refunded   { background: #f43f5e; color: #fff; }
  /* fallback for any unknown status */
  .pill[class*='pill--order-'] { background: #6b7280; color: #fff; }

  .pill--payment-initialized { background: #e5e7eb; color: #374151; }
  .pill--payment-authorized  { background: #dbeafe; color: #1d4ed8; }
  .pill--payment-paid        { background: #d1fae5; color: #065f46; }
  .pill--payment-cancelled   { background: #fee2e2; color: #991b1b; }
  .pill--payment-refunded    { background: #fce7f3; color: #9d174d; }

  .pill--active   { background: #d1fae5; color: #065f46; }
  .pill--inactive { background: #f3f4f6; color: #6b7280; }
  .pill--system   { background: #dbeafe; color: #1d4ed8; }
  .pill--single   { background: #f3f4f6; color: #374151; }
  .pill--group    { background: #ede9fe; color: #5b21b6; }
  .pill--info     { background: #dbeafe; color: #1d4ed8; }
  .pill--warning  { background: #fef3c7; color: #92400e; }
  .pill--danger   { background: #fee2e2; color: #991b1b; }
  .pill--current  { background: #16a34a; color: #fff; }
  .pill--neutral  { background: #f3f4f6; color: #374151; }

  /* An order status IS its colour on every order pill, so the swatch is the row's icon rather
     than a column of its own. */
  .color-swatch {
    width: 28px; height: 28px; flex-shrink: 0;
    border-radius: 5px; border: 1px solid rgba(0, 0, 0, 0.12);
  }
  .color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; }

  /* ── States ───────────────────────────────────────────────────────────────── */
  .state-center {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; color: var(--ec-text-faint); padding: 60px;
    text-align: center;
  }
  .state-icon { font-size: 3rem; opacity: 0.25; }
  .state-note { color: #bbbbbb; font-size: 0.8rem; }

  /* ── Pagination ───────────────────────────────────────────────────────────── */
  .pagination-bar {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    padding: 10px 24px; border-top: 1px solid var(--ec-border); background: var(--ec-surface);
  }
  .page-btn {
    min-width: 30px; height: 30px; padding: 0 8px;
    background: var(--ec-surface); border: 1px solid var(--ec-border-strong);
    border-radius: var(--ec-radius); cursor: pointer; font-size: 0.82rem; color: #333333; line-height: 1;
  }
  .page-btn:hover:not(:disabled) { background: #f5f5f5; }
  .page-btn:disabled { color: #bbbbbb; cursor: default; }
  .page-btn--active { background: var(--ec-navy); color: var(--ec-surface); border-color: var(--ec-navy); font-weight: 600; }
  .page-ellipsis { font-size: 0.82rem; color: var(--ec-text-muted); padding: 0 4px; line-height: 30px; }

  /* ── Forms ────────────────────────────────────────────────────────────────── */
  .form-panel {
    margin: 10px 24px; padding: 16px 20px;
    background: var(--ec-surface); border: 1px solid var(--ec-border); border-radius: var(--ec-radius-lg);
  }
  .form-panel h3 { margin: 0 0 14px; font-size: 0.95rem; color: var(--ec-text); }
  .form-panel h4 { margin: 18px 0 10px; font-size: 0.88rem; color: var(--ec-text); }

  /* Label column fixed, control column takes the rest: controls line up down the whole form and a
     label too long for its column wraps instead of shoving its control to the right. */
  .form-row {
    display: grid; grid-template-columns: var(--ec-label-col) minmax(0, 1fr);
    align-items: center; gap: 12px; margin-bottom: 10px;
  }
  .form-row > label:first-child {
    font-size: 0.82rem; color: var(--ec-text-alt); line-height: 1.35;
  }
  .form-row--top { align-items: start; }
  /* A wrapped label should start level with the first line of its control, not the box top. */
  .form-row--top > label:first-child { padding-top: 7px; }
  /* The column a control shares with its hint / sub-list. */
  .form-col { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
  .form-inline { display: flex; align-items: center; gap: 8px; }

  .form-input {
    width: 100%; box-sizing: border-box;
    padding: 6px 10px; border: 1px solid var(--ec-border-strong); border-radius: var(--ec-radius);
    font-size: 0.82rem; color: #333333; background: var(--ec-surface); outline: none;
  }
  .form-input:focus { border-color: var(--ec-focus); }
  /* A panel spans the view, but a text field 1600px wide reads as a mistake. Capping the cell
     rather than the control keeps a bare input and an input+button the same total width.
     Modal bodies are already card-width, so they keep the full row. */
  .form-panel .form-row > :last-child:not(label) { max-width: 520px; }
  .form-input--xs { flex: 0 0 auto; width: 100px; }
  .form-input--sm { flex: 0 0 auto; width: 110px; }
  .form-input--color { flex: 0 0 auto; width: 48px; height: 32px; padding: 0; border: 1px solid #d8d7d9; cursor: pointer; }

  .form-hint { color: #999999; font-size: 0.8rem; }
  .form-col > input[type='checkbox'] { justify-self: start; width: 16px; height: 16px; margin: 0; }
  .form-actions { display: flex; gap: 10px; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--ec-border-soft); }

  /* Repeatable value rows (attribute values, country rates, alias lists). */
  .form-list { display: flex; flex-direction: column; gap: 6px; }
  .form-list-row { display: flex; gap: 6px; align-items: center; }
  .form-list-row .form-input { flex: 1; }
  .remove-btn {
    background: none; border: none; cursor: pointer;
    color: #999999; font-size: 1rem; line-height: 1; padding: 2px 4px;
  }
  .remove-btn:hover { color: var(--ec-danger); }
  .add-row-btn {
    background: none; border: 1px dashed #cccccc; border-radius: var(--ec-radius);
    padding: 6px; font-size: 0.85rem; color: #999999; cursor: pointer; width: 100%;
  }
  .add-row-btn:hover { border-color: var(--ec-focus); color: var(--ec-focus); }

  /* A long option list inside a form (a store's countries can run to ~200 rows). */
  .scroll-list { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }

  /* Toggle-chips (attributes in a preset). */
  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    border-radius: 999px; padding: 4px 12px; font-size: 0.8rem; cursor: pointer;
    border: 1px solid #d1d5db; background: var(--ec-surface); color: #374151;
  }
  .chip--on { border-color: #4a6ba8; background: #4a6ba8; color: #ffffff; }

  .sub-options-grid { display: flex; flex-direction: column; gap: 6px; }
  .sub-option-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: var(--ec-radius-md);
    font-size: 0.85rem; cursor: pointer;
  }
  .sub-option-item--checked { border-color: var(--uui-color-interactive, #4a6ba8); background: var(--ec-selected-bg); }
  .sub-option-item input { margin: 0; }

  /* Native Umbraco controls keep working inside kit forms — this only lines them up with
     .form-input so a panel doesn't mix two control sizes. */
  uui-input, uui-select, uui-textarea { --uui-input-height: 32px; width: 100%; font-size: 0.82rem; }
  .form-row uui-input, .form-row uui-select, .form-row uui-textarea { flex: 1; }
  select:not(.form-input) {
    padding: 6px 10px; border: 1px solid var(--ec-border-strong); border-radius: var(--ec-radius);
    font-size: 0.82rem; color: #333333; background: var(--ec-surface);
  }

  /* ── Modal ────────────────────────────────────────────────────────────────── */
  /* Same card as Umbraco's own confirm dialog: centred surface, headline, actions right-aligned
     with Cancel first. uui-dialog-layout brings the padding and the actions row; the backdrop and
     the surface are ours because we render in place rather than through the modal manager. */
  .ec-modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0, 0, 0, 0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 4vh 16px; overflow-y: auto;
  }
  .ec-modal {
    background: var(--ec-surface); border-radius: var(--ec-radius-md);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.28);
    width: min(720px, 100%); max-height: 92vh; overflow-y: auto;
    outline: none;
  }
  .ec-modal--sm { width: min(460px, 100%); }
  .ec-modal--md { width: min(720px, 100%); }
  .ec-modal--lg { width: min(920px, 100%); }
  /* An inline failure inside a dialog (a create that the API refused). */
  .modal-error { color: var(--ec-error-text); font-size: 0.84rem; margin: 4px 0 0; }

  /* A form inside the dialog is already in a padded card — no second frame, no second margin.
     Modal bodies are bare .form-rows; this only catches a panel reused as-is from a view. */
  .ec-modal .form-panel { margin: 0; padding: 0; border: none; background: none; }

  /* ── Inline notices ───────────────────────────────────────────────────────── */
  /* A result the editor should read but not have to dismiss (saved / failed / warning). */
  .notice {
    display: block; margin: 0 0 12px; padding: 8px 12px;
    border: 1px solid transparent; border-radius: var(--ec-radius-md);
    font-size: 0.84rem; line-height: 1.4;
  }
  .notice--success { background: #d1fae5; border-color: #6ee7b7; color: #065f46; }
  .notice--error   { background: var(--ec-error-bg); border-color: var(--ec-error-border); color: var(--ec-error-text); }
  .notice--warning { background: #fef3c7; border-color: #fcd34d; color: #92400e; }

  /* ── Detail views ─────────────────────────────────────────────────────────── */
  .detail-row td { padding: 0; cursor: default; }
  .detail-panel {
    padding: 20px 24px 20px 54px;
    background: var(--ec-surface-sunken);
    border-bottom: 2px solid #e0e0e0;
  }
  .detail-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 20px; margin-bottom: 14px;
  }
  .detail-label {
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #999999; margin-bottom: 5px;
  }
  .detail-section p { margin: 2px 0; font-size: 0.84rem; color: #333333; }
  .total-line { margin-top: 4px; }

  .detail-breadcrumb { display: flex; align-items: center; gap: 8px; }
  .back-btn {
    background: none; border: none; cursor: pointer;
    font-size: 0.88rem; color: var(--ec-focus); padding: 4px 0;
  }
  .back-btn:hover { text-decoration: underline; }
  .breadcrumb-sep { color: #cccccc; }
  .detail-order-num { font-size: 0.9rem; color: #444444; font-weight: 600; }
  .detail-status-badge { margin-left: auto; }

  .detail-body {
    flex: 1; overflow-y: auto; padding: 20px 24px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .detail-grid--wide {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px; background: var(--ec-surface); border: 1px solid var(--ec-border);
    border-radius: var(--ec-radius-lg); padding: 20px;
  }
  .detail-section-block {
    background: var(--ec-surface); border: 1px solid var(--ec-border);
    border-radius: var(--ec-radius-lg); padding: 16px 20px;
  }
  .detail-section-block .detail-label { margin-bottom: 10px; }

  .items-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin: 8px 0 14px; }
  .items-table th { text-align: left; padding: 5px 10px; border-bottom: 1px solid #dddddd; font-size: 0.75rem; color: #999999; }
  .items-table td { padding: 7px 10px; border-bottom: 1px solid #eeeeee; color: #333333; }
  .item-name-cell { display: flex; align-items: center; gap: 8px; }
  .item-thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 3px; }

  .status-actions {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding-top: 10px; border-top: 1px solid var(--ec-border);
  }

  /* ── Stat cards ───────────────────────────────────────────────────────────── */
  .stat-cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
  .stat-card {
    background: var(--ec-surface); border: 1px solid var(--ec-border); border-radius: var(--ec-radius-lg);
    padding: 16px 20px; min-width: 130px; flex: 1;
  }
  .stat-card--highlight { border-color: #10b981; }
  .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--ec-text); }
  .stat-label { font-size: 0.75rem; color: var(--ec-text-muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
`;

/** Drop into `static styles` — `static styles = [commerceStyles, css\`…local…\`]`. */
export const commerceStyles = [commerceTokens, kit];

// ── Template helpers ─────────────────────────────────────────────────────────
// Plain functions, not mixin methods: a property editor and a dashboard have nothing else in
// common, and a function can be called from either.

/** Title row. Actions go in their own box so a second button sits next to the first. */
export const viewHeader = (title, actions) => html`
  <div class="view-header">
    <h2 class="view-title">${title}</h2>
    <div class="view-actions">${actions || ''}</div>
  </div>`;

/** The two buttons a list view's header carries, so every view spells them the same way. */
export const refreshButton = (onClick) => html`
  <uui-button look="outline" label="Refresh" @click=${onClick}>
    <uui-icon name="icon-refresh"></uui-icon>Refresh
  </uui-button>`;

export const createButton = (label, onClick) => html`
  <uui-button look="primary" label="Create ${label}" @click=${onClick}>+ Create ${label}</uui-button>`;

/** Breadcrumb left, count right. */
export const viewFooter = (breadcrumb, right) => html`
  <div class="view-footer">
    <span class="breadcrumb">${breadcrumb}</span>
    ${right ? html`<span class="breadcrumb">${right}</span>` : ''}
  </div>`;

export const errorBanner = (msg, onClose) => msg ? html`
  <div class="error-banner">
    <uui-icon name="icon-alert"></uui-icon>
    <span>${msg}</span>
    <button class="error-close" @click=${onClose}>×</button>
  </div>` : '';

export const stateCenter = (content) => html`<div class="state-center">${content}</div>`;

export const loadingState = (text = 'Loading…') =>
  stateCenter(html`<uui-loader></uui-loader><p>${text}</p>`);

export const emptyState = (icon, text, note) => stateCenter(html`
  <uui-icon name=${icon} class="state-icon"></uui-icon>
  <p>${text}</p>
  ${note ? html`<p class="state-note">${note}</p>` : ''}`);

/** One pager for every list, server-side (`goTo` refetches) and client-side (`goTo` moves the page). */
export const pager = (total, page, pageSize, goTo) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return '';
  // Windowed: first, last, and current ±2, with … gaps — never render every page (could be 100s).
  const wanted = new Set([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) wanted.add(p);
  const sorted = [...wanted].sort((a, b) => a - b);
  const items = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push(null);
    items.push(sorted[i]);
  }
  return html`
    <div class="pagination-bar">
      <button class="page-btn" ?disabled=${page <= 1} @click=${() => goTo(page - 1)}>←</button>
      ${items.map(p => p === null
        ? html`<span class="page-ellipsis">…</span>`
        : html`<button class="page-btn ${page === p ? 'page-btn--active' : ''}" @click=${() => goTo(p)}>${p}</button>`)}
      <button class="page-btn" ?disabled=${page >= totalPages} @click=${() => goTo(page + 1)}>→</button>
    </div>`;
};

export const searchBox = ({ value, placeholder = 'Type to search…', onInput }) => html`
  <div class="search-wrap">
    <uui-icon name="icon-search" class="search-icon"></uui-icon>
    <input class="search-input" type="search" placeholder=${placeholder}
      .value=${value || ''} @input=${onInput}>
  </div>`;

/** The filters bar most list views need: nothing on the left, a search box on the right. */
export const searchBar = (opts) => html`
  <div class="filters-bar">
    <div class="filters-left"></div>
    <div class="filters-right">${searchBox(opts)}</div>
  </div>`;

/**
 * Checkbox row. Same two-column grid as every other row (label left, control right) — the label is
 * associated with `for`/`id` so clicking the text still toggles the box.
 */
export const checkRow = (label, checked, onChange, hint) => {
  const id = `chk-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return html`
    <div class="form-row ${hint ? 'form-row--top' : ''}">
      <label for=${id}>${label}</label>
      <div class="form-col">
        <input id=${id} type="checkbox" .checked=${checked} @change=${onChange}>
        ${hint ? html`<span class="form-hint">${hint}</span>` : ''}
      </div>
    </div>`;
};

export const formRow = (label, control, hint) => html`
  <div class="form-row ${hint ? 'form-row--top' : ''}">
    <label>${label}</label>
    ${hint
      ? html`<div class="form-col">${control}<span class="form-hint">${hint}</span></div>`
      : control}
  </div>`;

/** Row action: quiet until hovered, then red. Delete is the only one we have. */
export const iconButton = ({ icon = 'icon-trash', title, onClick }) => html`
  <button class="icon-btn" title=${title} aria-label=${title}
    @click=${(e) => { e.stopPropagation(); onClick(e); }}>
    <uui-icon name=${icon}></uui-icon>
  </button>`;

export const pill = (text, variant) => html`<span class="pill ${variant ? `pill--${variant}` : ''}">${text}</span>`;

/**
 * The one modal in this plugin. Same card as `umb-confirm-modal`: centred surface, headline,
 * actions right-aligned. Rendered in place (not through the modal manager) so the caller keeps
 * its plain `editingX` state — clicking the backdrop or pressing Escape calls `onClose`.
 *
 * `actions` templates must carry `slot="actions"`; use `modalActions()` unless the modal needs
 * something other than Cancel + confirm.
 */
export const modalShell = ({ headline, body, actions, onClose, size = 'md' }) => html`
  <div class="ec-modal-backdrop"
    @click=${(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
    <div class="ec-modal ec-modal--${size}" role="dialog" aria-modal="true" aria-label=${headline ?? ''}
      tabindex="-1" ${umbFocus()}
      @keydown=${(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } }}>
      <uui-dialog-layout class="uui-text" .headline=${headline ?? null}>
        ${body}
        ${actions}
      </uui-dialog-layout>
    </div>
  </div>`;

/** Cancel then confirm, left to right — the order every Umbraco dialog uses. */
export const modalActions = ({ onCancel, onConfirm, confirmLabel = 'Save', cancelLabel = 'Cancel', color, disabled = false }) => html`
  <uui-button slot="actions" label=${cancelLabel} @click=${onCancel}>${cancelLabel}</uui-button>
  <uui-button slot="actions" look="primary" color=${color ?? 'positive'} label=${confirmLabel}
    ?disabled=${disabled} @click=${onConfirm}>${confirmLabel}</uui-button>`;

/**
 * Umbraco's own confirm dialog, so nothing in the Commerce UI deletes on a single click. Belongs in
 * the delete method rather than on the button — every caller is then covered. `umbConfirmModal`
 * rejects when dismissed, which is the "keep it" answer.
 */
export const confirmDelete = async (host, name) => {
  try {
    await umbConfirmModal(host, {
      headline: 'Delete',
      content: `Are you sure you want to delete "${name || 'this item'}"?`,
      color: 'danger',
      confirmLabel: 'Delete',
    });
    return true;
  } catch {
    return false;
  }
};

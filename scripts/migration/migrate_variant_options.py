#!/usr/bin/env python3
"""Convert ProductVariant.Options from a name→value dict to an alias-keyed selection list.

Old shape (per variant):   "Options": { "Size": "3000x1600", "Brakes": "yes" }
New shape (per variant):   "Options": [
    { "AttributeId": "fb..", "Alias": "size", "Name": "Size",
      "ValueAlias": "3000x1600", "ValueName": "3000x1600" }, ... ]

Each old entry is resolved against the SAME product's VariantOptions axes (match axis by Name →
Alias/AttributeId; match value by Name → value Alias). In-place SQLite JSON edit (PascalCase, as
System.Text.Json writes it), all product versions. Idempotent (variants already in list shape are
skipped). Dry-run by default; --apply backs up first.

    python3 migrate_variant_options.py [--db PATH] [--apply]
"""
import argparse, json, os, re, shutil, sqlite3
from datetime import datetime

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "..", "api", "EComm.Api", "ecomm.db")


def slugify(s: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", (s or "").strip().lower()))


def axis_index(variant_options):
    """name(lower) -> { alias, attributeId, values: {valueName: valueAlias} }."""
    idx = {}
    for ax in variant_options or []:
        name = (ax.get("Name") or "").strip()
        if not name:
            continue
        values = {}
        for v in ax.get("Values") or []:
            vn = (v.get("Name") or "").strip()
            if vn:
                values[vn] = v.get("Alias") or slugify(vn)
        idx[name.lower()] = {
            "alias": ax.get("Alias") or slugify(name),
            "attributeId": ax.get("AttributeId"),
            "name": name,
            "values": values,
        }
    return idx


def convert_variant_options(options, axes):
    """Old dict -> new list. Returns (new_list, changed?)."""
    if isinstance(options, list):
        return options, False            # already migrated
    if not isinstance(options, dict):
        return [], bool(options)
    out = []
    for attr_name, value_name in options.items():
        ax = axes.get((attr_name or "").strip().lower())
        value_name = str(value_name)
        if ax:
            out.append({
                "AttributeId": ax["attributeId"],
                "Alias": ax["alias"],
                "Name": ax["name"],
                "ValueAlias": ax["values"].get(value_name) or slugify(value_name),
                "ValueName": value_name,
            })
        else:  # axis not found on the product — best-effort self-describing entry
            out.append({
                "AttributeId": None,
                "Alias": slugify(attr_name),
                "Name": attr_name,
                "ValueAlias": slugify(value_name),
                "ValueName": value_name,
            })
    return out, True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    args = ap.parse_args()
    db = os.path.abspath(args.db)
    print(f"DB: {db}\nMode: {'APPLY' if args.apply else 'DRY-RUN'}\n")

    if args.apply:
        bak = f"{db}.{datetime.now():%Y%m%d-%H%M%S}.bak"
        shutil.copy2(db, bak)
        print(f"Backup -> {bak}\n")

    con = sqlite3.connect(db)
    cur = con.cursor()
    rows = cur.execute(
        "SELECT Id, Version, Variants, VariantOptions FROM Products WHERE Variants IS NOT NULL AND Variants != '' AND Variants != '[]'"
    ).fetchall()

    rows_changed = variants_changed = 0
    sample_shown = False
    for pid, ver, variants_json, vo_json in rows:
        variants = json.loads(variants_json) if variants_json else []
        axes = axis_index(json.loads(vo_json) if vo_json else [])
        dirty = False
        for v in variants:
            new_opts, changed = convert_variant_options(v.get("Options"), axes)
            if changed:
                if not sample_shown and new_opts:
                    print("Sample conversion:")
                    print("  ", json.dumps(new_opts, ensure_ascii=False)[:400])
                    sample_shown = True
                v["Options"] = new_opts
                variants_changed += 1
                dirty = True
        if dirty:
            rows_changed += 1
            if args.apply:
                cur.execute("UPDATE Products SET Variants=? WHERE Id=? AND Version=?",
                            (json.dumps(variants), pid, ver))

    print(f"\nProduct rows with converted variants: {rows_changed}")
    print(f"Variants converted: {variants_changed}")
    if args.apply:
        con.commit()
        print("\nAPPLIED.")
    else:
        print("\nDRY-RUN — nothing written. Re-run with --apply to commit.")
    con.close()


if __name__ == "__main__":
    main()

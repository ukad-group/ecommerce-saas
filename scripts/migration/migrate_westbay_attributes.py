#!/usr/bin/env python3
"""Promote a market's LOCAL variant axes into GLOBAL store attributes.

For the target market it:
  1. scans current-version products for their variant axes (VariantOptions),
  2. builds/merges a per-store attribute library (Markets.Settings.Attributes) with the
     UNIQUE union of values per axis, and
  3. links every product version's VariantOptions[].AttributeId to the matching attribute.

In-place SQLite JSON edit (DB JSON is PascalCase, System.Text.Json default). Never resets the db.
Idempotent. Dry-run by default; pass --apply to write (auto-backs up first).

    python3 migrate_westbay_attributes.py [--db PATH] [--market westbay-trailers] [--apply]
"""
import argparse, json, os, re, shutil, sqlite3, uuid
from datetime import datetime

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "..", "api", "EComm.Api", "ecomm.db")
IGNORE_ATTR_NAMES = {"test"}  # pre-existing junk attribute in westbay-trailers


def slugify(s: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", (s or "").strip().lower()))


def collect_axes(cur, market):
    """Ordered {axis_name: [ {Name,Alias}, ... unique ]} from current-version products."""
    axes = {}  # name -> {"order":int, "values": {valname: {Name,Alias}}}
    rows = cur.execute(
        "SELECT VariantOptions FROM Products WHERE MarketId=? AND IsCurrentVersion=1", (market,)
    ).fetchall()
    for (vo_json,) in rows:
        for opt in json.loads(vo_json) if vo_json else []:
            name = (opt.get("Name") or "").strip()
            if not name:
                continue
            slot = axes.setdefault(name, {"order": len(axes), "values": {}})
            for v in opt.get("Values") or []:
                vn = (v.get("Name") or "").strip()
                if vn and vn not in slot["values"]:
                    slot["values"][vn] = {"Name": vn, "Alias": (v.get("Alias") or slugify(vn))}
    return dict(sorted(axes.items(), key=lambda kv: kv[1]["order"]))


def upsert_attributes(existing, axes):
    """Merge axes into the existing attribute list (by name). Returns (list, name->id)."""
    by_name = {a["Name"].strip().lower(): a for a in existing}
    name_to_id = {}
    for axis_name, slot in axes.items():
        key = axis_name.lower()
        attr = by_name.get(key)
        if attr is None:
            attr = {"Id": str(uuid.uuid4()), "Name": axis_name,
                    "Alias": slugify(axis_name), "Values": []}
            existing.append(attr)
            by_name[key] = attr
        have = {v["Name"].strip() for v in attr["Values"]}
        for vn, v in slot["values"].items():          # union, unique by name, keep order
            if vn not in have:
                attr["Values"].append(v)
                have.add(vn)
        name_to_id[axis_name] = attr["Id"]
    return existing, name_to_id


def relink_products(cur, market, name_to_id, apply):
    """Set VariantOptions[].AttributeId on EVERY version row. Returns rows changed."""
    changed = 0
    for pid, ver, vo_json in cur.execute(
        "SELECT Id, Version, VariantOptions FROM Products WHERE MarketId=?", (market,)
    ).fetchall():
        opts = json.loads(vo_json) if vo_json else []
        if not opts:
            continue
        dirty = False
        for opt in opts:
            aid = name_to_id.get((opt.get("Name") or "").strip())
            if aid and opt.get("AttributeId") != aid:
                opt["AttributeId"] = aid
                if not opt.get("Alias"):
                    opt["Alias"] = slugify(opt.get("Name") or "")
                dirty = True
        if dirty:
            changed += 1
            if apply:
                cur.execute("UPDATE Products SET VariantOptions=? WHERE Id=? AND Version=?",
                            (json.dumps(opts), pid, ver))
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--market", default="westbay-trailers")
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    args = ap.parse_args()
    apply = args.apply
    db = os.path.abspath(args.db)
    print(f"DB: {db}\nMarket: {args.market}\nMode: {'APPLY' if apply else 'DRY-RUN'}\n")

    if apply:
        bak = f"{db}.{datetime.now():%Y%m%d-%H%M%S}.bak"
        shutil.copy2(db, bak)
        print(f"Backup -> {bak}\n")

    con = sqlite3.connect(db)
    cur = con.cursor()
    row = cur.execute("SELECT Settings FROM Markets WHERE Id=?", (args.market,)).fetchone()
    if row is None:
        raise SystemExit(f"Market {args.market!r} not found")
    settings = json.loads(row[0]) if row[0] else {}
    existing = [a for a in (settings.get("Attributes") or [])
                if a.get("Name", "").strip().lower() not in IGNORE_ATTR_NAMES]

    axes = collect_axes(cur, args.market)
    print("Attribute library (unique values per axis):")
    for name, slot in axes.items():
        print(f"  {name:<18} {len(slot['values']):>3} values")

    attrs, name_to_id = upsert_attributes(existing, axes)
    # keep ignored attrs untouched in the stored list
    ignored = [a for a in (settings.get("Attributes") or [])
               if a.get("Name", "").strip().lower() in IGNORE_ATTR_NAMES]
    settings["Attributes"] = attrs + ignored

    changed = relink_products(cur, args.market, name_to_id, apply)
    print(f"\nProducts relinked (rows across all versions): {changed}")
    print(f"Attributes in library after merge: {len(attrs)} (+{len(ignored)} ignored kept)")

    if apply:
        cur.execute("UPDATE Markets SET Settings=? WHERE Id=?",
                    (json.dumps(settings), args.market))
        con.commit()
        print("\nAPPLIED.")
    else:
        print("\nDRY-RUN — nothing written. Re-run with --apply to commit.")
    con.close()


if __name__ == "__main__":
    main()

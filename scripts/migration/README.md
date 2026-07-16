# Westbay migration

`migrate_westbay_products.py` transforms a Westbay Umbraco SQL export
(`nodes.raw` / `media.raw` / `options.raw`, produced by `extract_westbay.sh`) and loads it into the
eCommerce API under tenant `westbay`.

> **Status:** only the compiled `__pycache__/migrate_westbay_products.cpython-313.pyc` is present in
> this repo — the `.py` source and the `.raw` export dumps are **not** checked in. Recover both
> before running.

## TODO — populate image metadata (focal point / crops / alt)

Product images now use the rich `ProductImage` shape
(`{ url, altText, focalPoint, crops, mediaKey }` — see
[`../../umbraco/docs/PRODUCT-IMAGES.md`](../../umbraco/docs/PRODUCT-IMAGES.md)). The migrator
currently flattens each Umbraco media item to a **bare URL string** and discards the rest:

- `build_media_map()` reads only `json.loads(umbracoFile).get('src')`.

To carry the metadata across, when building the media map / product images, also read from the
`umbracoFile` Image Cropper blob and any alt property, and emit objects instead of strings:

```python
uf = json.loads(row['umbracoFile'])          # { src, focalPoint, crops }
image = {
    "url":        src,
    "focalPoint": uf.get("focalPoint"),        # { "left": .., "top": .. } or None
    "crops":      uf.get("crops") or None,      # [{ alias, width, height, coordinates }]
    "altText":    props_by_alias(media_node).get("altText")   # or 'alt' / 'alternativeText', else media name
    # (mediaKey isn't meaningful once images are re-hosted outside this Umbraco install)
}
```

The API accepts either bare strings or these objects (backward compatible), so this change is
additive and can be verified with a `--dry-run` diff of `products.json`.

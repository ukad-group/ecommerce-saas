# Product Images (focal point, crops, alt text)

How product images work in the Umbraco plugin, how editors manage them, and **what you must do
on your storefront templates to render them** — including focal‑point‑aware cropping.

---

## 1. What changed

Product images used to be a flat list of URL strings. They are now **rich objects** carrying
metadata captured from the Umbraco media library:

```jsonc
// product.images[]
{
  "url":       "/media/abc123/chair.jpg",        // required — the display/base URL
  "altText":   "Red office chair, front view",    // optional — accessibility text
  "focalPoint": { "left": 0.42, "top": 0.31 },     // optional — 0..1 fractions
  "crops":     [ { "alias": "wide", "width": 1200, "height": 400,
                   "coordinates": { "x1": 0.1, "y1": 0.0, "x2": 0.1, "y2": 0.0 } } ],
  "mediaKey":  "3fa85f64-5717-4562-b3fc-2c963f66afa6"  // source Umbraco media GUID (if picked from library)
}
```

**Backward compatible:** a bare `"url"` string is still accepted everywhere (API, storefront,
plugin) — legacy data and older clients keep working, and there is **no database reset**. Bare
strings are read as `{ url }` with no metadata.

---

## 2. How editors manage images (backoffice)

On a **product page** node, the **eCommerce** tab shows the product image editor, which embeds
Umbraco's **native media picker** (`<umb-input-rich-media>`):

- **Pick from the media library** or **drag‑and‑drop upload** new images.
- **Drag to reorder** (the first image is the primary/thumbnail).
- **Click an image** to open Umbraco's **native focal‑point + crop editor**.
- **External images** (photos from the configured storage provider, or a pasted URL) are added in
  a secondary "External images" list, each with its own alt‑text field.

**Alt text** is captured automatically from the media item (property alias `altText` / `alt` /
`alternativeText`, falling back to the media item's name). Set per‑image alt on external images
inline; for library images, edit alt on the media item itself.

### Configure the editor — Settings → Commerce Settings → **Images**

| Setting | Effect |
|---|---|
| **Enable Focal Point** | Shows/hides the focal‑point picker in the native crop editor. |
| **Image Crop** | A **single** crop (`width` × `height`, px) applied to **every** product image. Leave either dimension at 0 for no crop (focal point only). |

These are global (one config for all product images on the site). The crop is applied **at render
time** (see §3), so changing it updates every product image immediately — **no re‑save required**.
The focal‑point toggle and the crop are also fed to the native picker (`focalPointEnabled`,
`preselectedCrops`) so editors preview the crop while setting each image's focal point.

---

## 3. Rendering images on your storefront ⭐

Your storefront templates receive products from the eCommerce API (via the plugin's `Product`
model, `product.Images` = `List<ProductImage>`). To render them:

### Rule of thumb
- **`src`** → use `image.Url` (never the object itself).
- **`alt`** → use `image.AltText` (fall back to the product name).
- **Cover‑cropped boxes** (cards, thumbnails: `object-fit: cover`) → apply `object-position` from
  `image.FocalPoint` so the subject stays in frame at any box size.
- **Contain displays** (full image shown, `object-fit: contain`) → focal point does **not** apply;
  just use `Url` + `AltText`.

### Razor example (inject the helper, then render)

Inject the plugin's `IProductImageUrlHelper` and call `CropUrl(image)` for the `src`. It returns the
image URL with the **current** global crop + the image's focal point applied (for library images);
for images with no crop configured or external URLs it returns the plain URL. Because it reads the
crop setting live, changing the setting updates every image with no re‑save.

```cshtml
@inject EComm.Umbraco.Commerce.Services.IProductImageUrlHelper ProductImages
@{
    var images = product.Images ?? new List<EComm.Umbraco.Commerce.Models.ProductImage>();
    var first  = images.FirstOrDefault();
}

@* Card / list thumbnail *@
@if (first != null)
{
    <img src="@ProductImages.CropUrl(first)"
         alt="@(first.AltText ?? product.Name)"
         style="height:200px; object-fit:cover;" />
}

@* Detail gallery *@
<img id="mainImage" src="@ProductImages.CropUrl(first)" alt="@(first?.AltText ?? product.Name)"
     style="max-height:500px; object-fit:contain;" />

<div class="thumbs">
  @foreach (var image in images)
  {
      var url = ProductImages.CropUrl(image);
      <img src="@url" alt="@(image.AltText ?? product.Name)"
           style="width:80px; height:80px; object-fit:cover;"
           onclick="document.getElementById('mainImage').src='@url'" />
  }
</div>
```

> **No crop configured?** `CropUrl` returns the plain base URL. In that case, keep applying
> `object-position` from `image.FocalPoint` on `object-fit: cover` boxes so cover‑cropping stays
> subject‑aware — e.g. `style="…object-fit:cover; object-position:@(fp.Left*100)% @(fp.Top*100)%;"`.
> When a crop *is* configured the URL is already focal‑point positioned, so `object-position` is
> redundant (harmless).

> The plugin's sample site is a working reference:
> [`sample-site/EComm.Commerce.Demo/Views/ProductPage.cshtml`](../sample-site/EComm.Commerce.Demo/Views/ProductPage.cshtml)
> and [`CategoryPage.cshtml`](../sample-site/EComm.Commerce.Demo/Views/CategoryPage.cshtml).

### Responsive sizes (optional)

Library images are served by Umbraco's ImageSharp middleware, so you can request any size **with
the focal point baked in** by appending query params to `image.Url`:

```
@image.Url?width=300&height=300&rxy=@focal.Left,@focal.Top
```

`rmode` defaults to `crop`, so `width`+`height`+`rxy` yields a focal‑point crop at that size. This
only works for Umbraco‑served media URLs (not external provider/blob URLs).

### Crops

The single configured crop is applied to library images **at render time** by
`IProductImageUrlHelper.CropUrl()` (§3 example) — it appends
`?width=…&height=…&rmode=crop&rxy=…` (focal‑point positioned) to the stored **clean** URL. Storage
stays a plain `image.Url`; the crop is computed on read.

Notes:
- The crop applies to **Umbraco library images** (identified by `mediaKey`, served by ImageSharp).
  External provider/pasted URLs are returned unchanged (ImageSharp can't process them).
- Because the crop is applied on read, **changing the crop setting updates every product image
  immediately — no re‑save**.
- `image.Crops` metadata is only populated if an editor manually adjusts a crop in the native tool;
  the default rendering above uses the global crop setting + focal point, not per‑image crop
  coordinates.

### Non‑C# / headless consumers

If you render from your own DTO or a JS front end, mirror the rule: read `url`, `altText`,
`focalPoint`, and treat a bare string as `{ url }`. `object-position` becomes
`` `${focalPoint.left*100}% ${focalPoint.top*100}%` ``.

---

## 4. Quick start checklist

1. **Configure** (once): Settings → Commerce Settings → **Images** → enable focal point, add crop
   presets if you want them.
2. **Author**: on a product node's **eCommerce** tab, pick/upload images, click an image to set
   its focal point/crop, save.
3. **Render**: in your product/category templates, use `image.Url` + `image.AltText`, and add
   `object-position` from `image.FocalPoint` on any `object-fit: cover` box (see §3).

---

## 5. Where this lives (reference)

| Concern | File |
|---|---|
| Image model (plugin) | `plugin/EComm.Umbraco.Commerce/Models/ProductImage.cs` |
| Image editor (backoffice) | `plugin/EComm.Umbraco.Commerce/wwwroot/components/workspaceViews/products-workspace-view.js` |
| Settings (focal toggle + crop) | `Models/CommerceSettings.cs`, `components/settings/settings-dashboard.js` (Images tab) |
| Storefront crop URL helper | `plugin/EComm.Umbraco.Commerce/Services/ProductImageUrlHelper.cs` (`IProductImageUrlHelper.CropUrl`) |
| Storefront reference | `sample-site/EComm.Commerce.Demo/Views/ProductPage.cshtml`, `CategoryPage.cshtml` |
| API model | `api/EComm.Data/ValueObjects/Product/ProductImage.cs` |

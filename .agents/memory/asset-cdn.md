---
name: Asset CDN URLs (Lovable assets)
description: Lovable /__l5e/ asset URLs are auth-gated and don't work outside Lovable platform; replacement strategy for Replit.
---

Lovable stores project images in a private R2 bucket and serves them via `/__l5e/assets-v1/{asset_id}/{filename}` — a proxy that only works on Lovable's own hosting.

**Asset JSON files** (`src/assets/*.asset.json`) contain a `url` field that points to these proxy paths. On Replit, these 404.

**Fix applied:** Updated `url` fields in both asset JSON files to `/pre-reveal.jpg` (a public static file in `public/`). All three images (logo, cover, pre-reveal) now use the same pre-reveal placeholder.

**How to apply:** When the collection is revealed or real assets are uploaded to a public CDN, update the `url` fields in `src/assets/african-x1-logo.asset.json` and `src/assets/african-x1-cover.png.asset.json` to the new absolute CDN URLs.

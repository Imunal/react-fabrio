---
title: "Assets and fonts"
description: "Durable image uploads, SVG imports and font resources."
---

To connect and verify uploads, follow [Connect durable uploads](guides/uploads.md).

The host provides resource URLs and an optional durable upload service. Catalog artwork consists of vector geometry; an uploaded image is a separate asset reference with MIME type and source pixel dimensions.

## Uploads and persistence

Configure `upload.maxFiles` (positive integer, default 10), `upload.maxBytes` and `upload.mimeTypes` for merchant limits. Browser file pickers are convenience filters; inspect file content and enforce limits again in the host upload service. Print image workflows can use raster images supported by the browser. Engraving areas prohibit raster content.

`uploadAsset` receives the file and an `AbortSignal`, and returns a durable `AssetReference`. Give each asset a stable ID, actual MIME type, URL and source dimensions for effective DPI checks. Set `durable: true` only when the URL remains usable after the session. Session-local object URLs support editing but must not be treated as saved resources.

Allow anonymous or correctly authenticated image/font requests from the embedding origin. Canvas export requires suitable CORS headers; a visually displayed resource can still taint a canvas and prevent output. The host must retain resources while saved documents refer to them. Failed loads and uploads must surface errors and preserve the design for retry.

## SVG

Imported SVG must pass the Fabric package's restricted geometry parser. The parser does not sanitize arbitrary SVG: scripts, event handlers, external URLs, CSS, embedded raster images and live text are unsuitable for engraving. Convert accepted simple geometry into document vector paths. Exact accepted syntax and export boundaries are in [production](production.md).

## Fonts

Configure fonts with stable `id`, CSS `family`, downloadable `url` and optional numeric `weight`. Use font files covering every supported language; the Polish example requires characters such as `ą`, `ć`, `ę`, `ł`, `ń`, `ó`, `ś`, `ź` and `ż`. A browser fallback can display text even when the configured font cannot be outlined.

The host must have rights to load, embed and outline each font. Provide CORS-enabled URLs for browser rendering and font-byte retrieval. Wait for fonts before measuring text or confirming production output. Missing files and unsupported glyphs must block a production workflow that requires that font. Print and engraving export outline fonts using Fontkit; see [production](production.md) for output boundaries.

The example configurations use `/fonts/FabrioSans.ttf`, served by the playground with its [font license](../../playground/public/fonts/LICENSE). Your application must serve that file or replace the URL with a licensed font you control. Package imports do not automatically install playground public assets.

## Gallery and capacity

The file limit counts every raster asset in the whole document gallery, including unused files and files on other areas. Reusing a file in several elements does not consume more capacity. Add photos accepts multiple files and always creates new files, regardless of selection. In freeform mode a gallery thumbnail adds another element; replacement has its own action. Guided thumbnails update the selected editable image slot.

### Upload reservations and replacement

The session reserves capacity before sending a batch; a batch larger than remaining capacity is rejected without uploading. Each completed or failed file releases one reservation. A full gallery permits atomic file replacement when the old file is used only by that element; a shared file requires spare capacity. Asset IDs identify immutable files: upload services must return a new ID for a changed file.

### Removal and history

Users can remove unused files explicitly; deleting a placed element retains its file. Photo insertion and replacement each use one history entry, so undo/redo restores both the asset catalog and elements. Confirmation rejects an over-limit legacy gallery with `asset-limit-exceeded`, while opening preserves it for correction.

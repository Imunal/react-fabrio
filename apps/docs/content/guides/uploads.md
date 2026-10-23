---
title: "Connect durable uploads"
description: "Replace session-local image URLs with resources that survive saving and reopening."
---

Customer images need durable storage to survive a browser session or enter production output. Without an upload callback, the editor can display raster files through local object URLs, but those files block confirmation.

## 1. Implement the upload callback

Supply `uploadAsset(file, signal)` to `ProductEditor`. It must resolve to an `AssetReference` describing the stored file:

```ts
import type { AssetReference } from "@react-fabrio/core";

type StoreImage = (file: File, signal: AbortSignal) => Promise<AssetReference>;
```

Your service must return a stable `id`, durable `url`, actual `mimeType`, source pixel `width` and `height`, and `durable: true`. Respect the abort signal. A changed file needs a new asset ID; IDs identify immutable files.

Enforce file type, content, size and access rules in the upload service. The browser picker and product limits do not replace server validation. See [assets and fonts](../assets-and-fonts.md) for CORS, retention, SVG restrictions and licensing.

## 2. Connect it to the editor

Pass your callback as `uploadAsset={storeImage}`. Configure `product.upload.maxBytes`, `mimeTypes` and `maxFiles` for the merchant's limits. The document-wide raster gallery defaults to ten files, including unused files and files from other areas.

The editor reserves capacity before sending a batch. An oversized batch is rejected before upload. Reusing a gallery image in more elements does not consume more capacity. Deleting an element retains its file; remove unused files explicitly to free capacity. Replacement at full capacity is possible when the old file is used only by the replaced element.

## 3. Handle cancellation and errors

Report upload failures through `onError` without discarding the current design. Pending work is cancelled on unmount or session changes. A completed result for an area that is no longer active is ignored. Your callback must stop its network requests when cancelled.

## 4. Verify persistence and output

Upload an image, save the design, then reopen it in a new session. Confirm that its URL still loads from the embedding origin and that production export succeeds. A displayed image can still fail export when CORS is incorrect.

For a custom interface, use `useAssetUploads` inside `EditorProvider`; it checks capacity, handles cancellation and inserts or replaces each image atomically. Its contract is in the [React reference](../packages/react.md).

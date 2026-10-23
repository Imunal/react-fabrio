---
title: "React API"
description: "Providers, canvas mounting, subscriptions and upload lifecycle."
---

Import from `@react-fabrio/react`.

## Providers and canvas

`EditorProvider` accepts `product`, `initialDesign?`, `onChange?` and required `children`. `EditorCanvas` accepts `className?`, `zoom?`, `onError?`, `ariaLabel?` and `onSelectionBoundsChange?`. Both canvas and custom UI belong inside the provider.

`useEditor()` returns `editor`, `product`, `document`, `areaId`, `area`, `selectedId`, `selected`, `layers`, `canUndo`, and `canRedo`. Calling it outside a provider throws.

## Upload errors

`AssetUploadError` identifies expected upload failures by a stable `code`: `invalid-replacement`, `gallery-capacity`, `unsupported-type`, `file-too-large`, `invalid-image`, `invalid-svg` or `engraving-vector-required`. Image and SVG parse failures in the browser preserve their technical `cause`. The UI translates these codes and validation issue codes, while `onError` receives the original error. Unknown resource/export/host exceptions display a localized retry message.

## useAssetUploads

`useAssetUploads({ uploadAsset?, onError? })` uses the provider session and returns `upload(files, options?)`, `pendingUploads` and `cancelAll`. It validates files, imports SVG, reserves gallery capacity and manages cancellation and local URLs. See [integration](../integration.md).

`EditorCanvas.zoom` is relative to workspace fit. At higher zoom, the surface expands so users can scroll to magnified content.

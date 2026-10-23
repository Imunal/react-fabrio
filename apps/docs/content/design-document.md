---
title: "Saved design document"
description: "Persist and reopen versioned physical design documents."
---

`DesignDocument` stores the customer's editable content. It contains no viewport dimensions or Fabric serialization. [ADR 0001](adr/0001-renderer-independent-document.md) records this boundary. For storage and reopening steps, use [Save and reopen designs](guides/save-design.md).

```ts
import { createDesignDocument, validateDesignDocument } from "@react-fabrio/core";
import { mugProduct } from "@react-fabrio/core/examples";

const document = createDesignDocument(mugProduct);
const json = JSON.stringify(document);
const reopened: unknown = JSON.parse(json);
const issues = validateDesignDocument(reopened, mugProduct);
```

## Format

| Field                   | Meaning                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `schemaVersion`         | Literal `1`; other versions are rejected                                               |
| `productId`, `revision` | Exact product/configuration reference                                                  |
| `areas`                 | Record of area IDs to ordered element arrays; later elements appear above earlier ones |
| `assets`                | Record of asset IDs to durable or session-local asset references                       |

### Elements and physical coordinates

Every element has `id`, `type`, `x`, `y`, `width`, `height`, `rotation`, optional `locked`, `permissions` and `slotId`. Coordinates are millimeters from the area top-left, x rightward and y downward. Rotation uses degrees. Renderers convert physical units into viewport pixels; saving at a different zoom does not change the document.

Text adds `text`, `fontId`, `fontSize`, `color`, optional `align` (`left`, `center`, `right`, `justify`; default `left`), `lineHeight`, `letterSpacing`. Font size and letter spacing are physical measures; line height is a multiplier. Images reference `assetId` and optional normalized `crop`, `flipX`, `flipY`. A crop uses source fractions `x`, `y`, `width`, `height` from 0 to 1. Vectors contain `path` and `color`.

### Asset references

An asset reference contains `id`, `url`, `mimeType`, optional source pixel `width`, `height`, and `durable`. A browser object URL is suitable for local editing but cannot survive a new session. Confirmation requires durable references; see [upload lifecycle](integration.md).

## Operations and history

Core commands return new documents. `addElement`, `updateElement`, `removeElement`, `reorderElement` and `applyTemplate` enforce their command-level rules; validation checks the resulting complete document. IDs and permissions cannot be rewritten through `updateElement`.

`createHistory`, `commitHistory`, `undoHistory` and `redoHistory` manage immutable snapshots. A commit clears redo history and ignores equivalent documents. Integrations should commit once per completed gesture or text-edit action. The session keeps view state such as zoom and active area outside the saved artwork.

## Compatibility

Validate parsed JSON before using it. Reject unknown schema versions and product/configuration mismatches explicitly; there is no automatic migration guarantee. To migrate a saved design, the host must retain the old configuration, transform the document intentionally, assign the target revision and validate against that configuration. Test asset references, element order, crop, physical geometry, slots and all areas in save/reopen round trips.

Users can correct safety overflow and over-limit galleries after opening a design; these issues do not require migration. Opening preserves their geometry and unused files. `outside-safe-area` blocks confirmation only when the area's `constrainToSafeArea` is true; `asset-limit-exceeded` always blocks. Gallery capacity is document-wide, counts raster asset entries and defaults to ten files. Asset references and content added together or replaced by session photo commands share one undo/redo snapshot.

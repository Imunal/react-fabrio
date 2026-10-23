---
title: "Core API"
description: "Documents, validation, commands, sessions, history and physical geometry."
---

Import from `@react-fabrio/core`. It runs without React or the DOM.

## Session

`createEditorSession(product, initialDesign?)` creates a subscribable session that also works outside React. Its methods are `subscribe`, `getSnapshot`, `getArea`, `getSelected`, `setArea`, `select`, `update`, `add`, `addAsset`, `remove`, `duplicate`, `moveElement`, `reorder`, `applyTemplate`, `undo`, `redo`, `beginAction`, `endAction`, and `setReadOnly`. `beginAction`/`endAction` group several document updates into one history entry. `setReadOnly` suspends mutations during asynchronous work. Session methods enforce area mode and permissions; no-op actions do not create history. `getSnapshot` supplies a stable snapshot until a state change.

## Public types

Public contracts include `ProductConfig`, `DecorationArea`, `DesignDocument`, `DesignElement`, `TextElement`, `ImageElement`, `VectorElement`, `ElementPermissions`, `Template`, `TemplateSlot`, `AssetReference`, `FontConfig`, `Artwork`, `MockupConfig`, `MugConfig`, `ValidationIssue`, `ProductionArtifact`, `PreviewArtifact` and `DesignResult`. `TextElement.align` accepts `left`, `center`, `right` and `justify` (optional, default `left`) in schema version 1. See [production](../production.md) for wrapping and paragraph-ending behavior.

## Functions and schemas

| Function/export                                                | Contract                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `createDesignDocument(product)`                                | Initializes all areas; guided areas use their first template                     |
| `getArea(product, areaId)`                                     | Finds an area, or returns `undefined`                                            |
| `canEditElement(element, action)`                              | Checks lock and operation permission                                             |
| `addElement(document, areaId, element, product)`               | Returns `CommandResult`; rejects prohibited elements and duplicate IDs           |
| `updateElement(document, areaId, elementId, request, product)` | Returns `CommandResult`; atomically checks typed changes and permissions         |
| `removeElement(document, areaId, elementId, product)`          | Checks delete permission                                                         |
| `reorderElement(document, areaId, elementId, index, product)`  | Moves to a final document index; rejects invalid indices and protected crossings |
| `applyTemplate(document, areaId, templateId, product)`         | Replaces area content with cloned template elements                              |
| `createHistory`, `commitHistory`, `undoHistory`, `redoHistory` | Generic immutable snapshot history                                               |
| `effectiveImageDpi(source, placed, crop?)`                     | Source pixels per placed inch, accounting for normalized crop                    |
| `printPixelDimensions(width, height, dpi = 300, bleed = 0)`    | Upward-rounded pixel dimensions, including bleed on both sides                   |
| `validateProductConfig(value)`                                 | Configuration shape and domain issues                                            |
| `validateDesignDocument(value, product)`                       | Saved format, compatibility, area/element identity and crop issues               |
| `getDesignIssues(document, product)`                           | Complete configured content checks and effective-DPI warnings                    |
| `productConfigSchema`, `designDocumentSchema`                  | Zod schemas for parsing configuration and document structure                     |
| `productConfigJsonSchema`, `designDocumentJsonSchema`          | JSON Schema objects generated from the Zod schemas                               |
| `mugProduct`, `shirtProduct`, `tshirtProduct`, `tagProduct`    | Available from `@react-fabrio/core/examples`; shirt names alias the same fixture |

The schema module also exports reusable Zod definitions for elements, permissions, assets, fonts, artwork, templates, areas and preview configuration. Public JSON contracts are inferred from these schemas. Schema parsing validates structure; use the validation functions for product-dependent rules and stable issue codes.

## Validation issues

Validation returns `ValidationIssue[]`. Each issue has stable machine `code`, `severity: 'error' \| 'warning'`, technical English `message`, and optional `areaId`/`elementId` and `params: Record<string, string | number | boolean>`. Use these codes to identify issues; avoid parsing messages. Current codes include `invalid-configuration`, `duplicate-side`, `duplicate-area`, `prohibited-element`, `invalid-boundary`, `duplicate-element`, `invalid-slot`, `invalid-mug`, `unsupported-schema`, `invalid-document`, `configuration-mismatch`, `area-mismatch`, `invalid-crop`, `missing-font`, `prohibited-color`, `missing-asset`, `non-durable-asset`, `low-image-dpi` and `required-field`.

## DesignResult

`DesignResult` contains `document`, `previews: { areaId, blob }[]`, `files: { areaId, filename, mimeType, blob }[]`, and warning issues. Store blob bytes separately from the saved JSON document.

## Safety geometry and gallery session operations

Core exports `isInsideSafeArea(area, element)`, `permitsSafeAreaTransform(area, before, after)`, `placeInSafeArea(area, element)`, `areaGuidePaths(area)` and `SAFE_AREA_TOLERANCE` (0.01 mm). They operate in physical coordinates and preserve nonzero contour holes. `ProductConfig.upload.maxFiles` defaults to 10; `DecorationArea.constrainToSafeArea` defaults to false. These defaults do not rewrite the supplied configuration.

The editor session exposes `reserveUploads(count, targetId?)` (token or null), `releaseUpload(token, count?)`, `addAsset(asset, token?)`, `addImage(asset, element, token?)`, `replaceImage(targetId, asset, token?)` and `removeAsset(id)`. Document mutations return `CommandResult<DesignDocument>`, enforce capacity/permissions in the session and preserve undo/redo. Multiple successful files can consume one batch token; release one reservation for each failed file. Reservations are transient and never saved. `removeAsset` only removes unused files. A changed file must have a new asset ID.

`outside-safe-area` is a warning for free areas and a confirmation-blocking error for constrained ones. `asset-limit-exceeded` blocks confirmation. Sessions allow opening documents with these correctable issues, while still rejecting incompatible products, revisions and schemas.

### Element stacking

`editor.moveElement(elementId, targetIndex): CommandResult<DesignDocument>` moves one element in the active decoration area to its final zero-based index in the document array. Later indices render above earlier ones. It returns `changed` only when the document changes. Missing IDs, noninteger/out-of-range indices, unchanged positions and read-only sessions return `rejected` or `unchanged` without history or `onChange`. Selection is preserved. `reorder(delta)` applies the same rules to the selected element, clamping relative requests at the array boundaries.

Core `canReorderElement(elements, elementId, index)` checks the same constraints so controls can disable unavailable moves. `reorderElement` returns `rejected` for invalid or prohibited moves and `unchanged` with the original document for an allowed unchanged position. Locked elements and elements with `permissions.reorder: false` cannot move or be crossed by another element: their absolute indices remain fixed. Guided and freeform areas share these rules. One accepted drop creates one undo entry and one `onChange`; dragging and cancellation do not modify the document. The saved format remains `schemaVersion: 1`.

## Command results and changes

Document mutations return `{ status: "changed" | "unchanged", value: DesignDocument }` or `{ status: "rejected", issues: ValidationIssue[] }`. Expected domain rejections do not throw. An unchanged result retains document identity. Rejections leave document, selection and history untouched. History retains at most 100 completed actions, clears redo after a new change and groups gestures with `beginAction`/`endAction`.

`updateElement` and session updates use `{ kind: "geometry" | "text" | "image" | "vector", changes }`, with `GeometryPatch`, `TextPatch`, `ImagePatch` and `VectorPatch` respectively. Identity, type, locking, permissions and slots cannot be patched. Asset replacement uses `replaceImage`. Unknown fields, invalid values and incompatible kinds reject the entire operation. Required text and local assets may remain incomplete while editing; confirmation validates production readiness.

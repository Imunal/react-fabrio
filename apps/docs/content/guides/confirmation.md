---
title: "Handle confirmation"
description: "Persist generated production files and handle failures without losing customer work."
---

Use `ProductEditor.onConfirm` to submit a completed design as an order or pass it to another host workflow. You need durable assets and downloadable fonts before production can succeed.

## 1. Store the result

`onConfirm(result)` receives a `DesignResult` after validation and export. It may return a promise; the editor waits for it before displaying success.

| Result field | Store or use it for                                               |
| ------------ | ----------------------------------------------------------------- |
| `document`   | Reopening the editable design with its product revision           |
| `files`      | Production artifacts: `areaId`, `filename`, `mimeType` and `blob` |
| `previews`   | PNG preview blobs identified by area ID                           |
| `warnings`   | Nonblocking quality issues such as low effective image DPI        |

Upload the blobs and persist the design in your host callback. Store the file bytes separately; JSON serialization does not preserve blobs. Pricing, checkout, output retention and routing to production belong to the host.

## 2. Let the editor manage the operation

Confirmation is unavailable while uploads are pending. After the uploads finish, the customer can confirm. The editor then snapshots the design, checks validation issues and exports every decoration area. Editing is suspended while file generation and your callback are pending. You do not need a second export call inside `onConfirm`.

Blocking issues prevent confirmation. Warnings permit it. Resource failures and export failures do not return a partial production result. See [production output](../production.md) for exact PNG/SVG contracts.

## 3. Make failures retryable

Reject the host callback when storage or order submission fails. The editor reports runtime failures through `onError`, displays a retry status and retains the design. Correct the failing service or resource and confirm again. The host should ensure retrying does not create duplicate orders.

Wrap mounting in an error boundary as well: invalid initial configuration or incompatible documents can throw before confirmation.

## 4. Export from a custom interface

Call `exportDesign(product, document, { signal? })` from `@react-fabrio/fabric`. Suspend editing through the session's `setReadOnly`, await export and your host callback, then release the lock in `finally`. Cancellation is checked between export stages and before completion; synchronous canvas work is not interrupted.

Before accepting production orders, check output dimensions, metadata, clipping and font outlines against the actual product. Previews are not calibrated manufacturing proofs.

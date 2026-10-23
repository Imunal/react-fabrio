---
title: "Product scope"
description: "Personalization workflows, current capabilities and host responsibilities."
---

Merchants use React Fabrio to offer personalized mugs, apparel and engraved items. Developers embed the editor in a React 19 application. The host handles storage, authentication, pricing, product variants, checkout and persistence.

## Customer journeys

A guided area starts from a template. The customer edits labeled text or image slots while fixed artwork and property permissions protect the layout. In a freeform area, customers can use the configured text, image, vector artwork and template actions. Each side can contain several independently measured decoration areas.

The customer selects an element, adjusts its properties, changes areas without losing work and checks the preview. Confirmation validates required content, resolves assets and creates production artifacts. Low effective image DPI is a warning; missing resources, incompatible documents and prohibited content block confirmation. A failed upload or export must preserve the document for retry.

## Capability status

See [release acceptance](release.md) for outstanding release checks.

| Capability                                                                   | Status and reference                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Physical document, configuration, validation, immutable commands and history | Implemented in core; [saved document](design-document.md), [API](api.md)             |
| Multi-area editing, guided/freeform modes and permissions                    | Core contracts available; default UI behavior described in [editor UX](editor-ux.md) |
| Durable upload callback and confirmation                                     | [Integration](integration.md) defines the actual component contract                  |
| Print PNG, engraving SVG and quality checks                                  | See exact implementation boundaries in [production](production.md)                   |
| Photography mockups and mug visualization                                    | See [preview availability](previews.md)                                              |
| Publication                                                                  | Packages are being prepared locally; no registry publication is implied              |

## Release boundary

The packages are available for local evaluation and have not been published as a stable release. Full accessibility/localization auditing and production calibration remain open. [Release acceptance](release.md) records those checks, target criteria and deferred features.

The host also manages resource retention and production routing. Fabrio handles editing and generates artwork for each area. Verify manufacturing accuracy against the physical product; preview appearance alone cannot establish it.

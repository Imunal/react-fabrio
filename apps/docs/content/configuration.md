---
title: "Product configuration"
description: "ProductConfig fields, defaults, template permissions and validation rules."
---

`ProductConfig` describes one product revision and is maintained by the merchant. Import the type and `validateProductConfig` from `@react-fabrio/core`. For a step-by-step setup, use [Configure a product](guides/configure-product.md). The [example fixtures](examples.md) are ready to run.

## Product fields

| Field                    | Meaning                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `id`, `name`, `revision` | Product identity, display label and configuration revision; all strings                    |
| `sides`                  | Ordered `{ id, name, areas, mockups? }` entries                                            |
| `fonts`, `artwork`       | Shared font and vector artwork catalogs                                                    |
| `printDpi`               | Default print resolution; omitted means 300; values below 300 are rejected                 |
| `upload`                 | Optional `maxBytes`, `mimeTypes` and positive integer `maxFiles` (default 10) restrictions |
| `mug`                    | Optional straight-sided mug preview description; [preview reference](previews.md)          |

Side IDs must be unique and area IDs must be unique across the whole product, since document content is indexed by area ID. Changing the product ID or revision starts a new editor session. Preserve the original configuration alongside persisted designs; changing dimensions or permissions without changing revision makes old designs ambiguous.

## Decoration areas

| Field                        | Meaning/default                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`, `name`                 | Unique key and customer-facing label                                                               |
| `width`, `height`            | Positive millimeters                                                                               |
| `production`                 | `print` or `engraving`                                                                             |
| `mode`                       | `guided` or `freeform`                                                                             |
| `allowedElements`            | Explicit subset of `text`, `image`, `vector`; engraving excludes images                            |
| `boundary`                   | Optional `{ type: 'rectangle' \| 'ellipse' \| 'path', path? }`; omitted is rectangular             |
| `constrainToSafeArea`        | Optional boolean, default `false`; constrain the entire rotated element rectangle to the safe area |
| `bleed`, `safeMargin`        | Optional nonnegative millimeters; omitted means zero                                               |
| `templates`                  | Named template arrangements and editable slots                                                     |
| `fonts`, `artwork`, `colors` | Area catalogs and allowed colors                                                                   |
| `printDpi`                   | Area override of product DPI, still at least 300                                                   |

### Coordinates and clipping

Geometry is always in millimeters and rotation in degrees. Vector path boundary coordinates use the area's physical coordinate system. Elements may extend beyond the area so production clipping can crop them.

### Safe-area behavior

With `constrainToSafeArea` omitted or `false`, a safe margin is a guide and overflow produces a nonblocking `outside-safe-area` warning. The document keeps the full geometry; production clips it to the boundary plus bleed. Set `constrainToSafeArea: true` to require the whole rotated rectangle of every element inside the inset boundary.

Validation, session commands and gestures share cached Clipper2 offset/intersection geometry, with nonzero SVG contours (including holes) and a conservative 0.01 mm tolerance for curved and SVG boundaries (rectangular offsets are exact).

New elements fit proportionally. Opening an existing document preserves its positions and sizes. Already invalid elements remain editable until corrected, then obey the constraint. Locked invalid elements require a merchant configuration correction. Invalid content blocks confirmation. Guides never enter production.

```json
{ "safeMargin": 3, "bleed": 2, "constrainToSafeArea": false }
```

The playground uses these values for demonstration. Obtain production values from the merchant's product specification. SVG boundary coordinates are in millimeters and use the nonzero fill rule.

## Templates and permissions

A `Template` has `id`, `name`, `elements`, and optional `slots`. Each slot has `id`, `label`, `elementId`, optional `required` and optional `permissions`. Element IDs identify editable content; `slotId` associates an element with its field. Guided documents initialize from the first area template. Applying a template replaces the area's elements.

`locked: true` prevents editing. `permissions` controls `move`, `resize`, `rotate`, `edit`, `delete` and `reorder`; an omitted permission is allowed. Template slot permissions are applied to their element. Configure fixed artwork as locked elements. Required text slots must contain text before confirmation; required image slots must resolve to durable image assets.

### Resource catalogs

A font has `id`, `family`, `url`, optional numeric `weight`. Artwork has `id`, `name`, SVG geometry `path`, and optional `color`. See [assets and fonts](assets-and-fonts.md) for resource and licensing responsibilities.

## Validation and schema

`validateProductConfig(value)` returns `ValidationIssue[]`; an empty array means valid. `productConfigSchema` and `designDocumentSchema` are Zod schemas with `parse` and `safeParse`. Their TypeScript contracts use `z.infer`. For external JSON Schema tooling, use `productConfigJsonSchema` and `designDocumentJsonSchema`, generated from the Zod definitions through [`z.toJSONSchema`](https://zod.dev/json-schema). Runtime validation also enforces domain constraints such as revision matching and engraving restrictions; checking the schema shape does not verify asset loading or glyph availability.

See [design document](design-document.md) for saved-content validation and [production](production.md) for output defaults. See [previews](previews.md) for preview mappings.

---
title: "Executable examples"
description: "Runnable product fixtures and supported personalization workflows."
---

Example configurations are exported from `@react-fabrio/core/examples` and maintained in [fixtures.ts](../../../packages/core/src/fixtures.ts). The [playground](../../playground/src/app.tsx) imports these fixtures. The documentation examples import the same configurations, so there is no second copy to maintain.

```ts
import { validateProductConfig } from "@react-fabrio/core";
import { mugProduct, shirtProduct, tagProduct } from "@react-fabrio/core/examples";

for (const product of [mugProduct, shirtProduct, tagProduct]) {
  const errors = validateProductConfig(product);
  if (errors.length) throw new Error(errors.map((issue) => issue.message).join("; "));
}
```

## Mug

`mugProduct` defines a 200 × 80 mm freeform print wrap with text, images and vectors. Its mug configuration describes a 40 mm radius, 95 mm height and a 286-degree wrap. Use the physical wrap for production; use `@react-fabrio/three` for optional visualization through the [preview integration](previews.md).

## Front/back T-shirt

`shirtProduct` (also exported as `tshirtProduct`) has front and back sides, each with a 250 × 300 mm freeform print area. Area IDs are unique and remain independent in the saved document. Confirming produces separate front and back production artifacts. The host controls garment variants, prices, material colors and checkout; product photos/mappings must come from the merchant.

## Engraved tag

`tagProduct` defines a 50 × 25 mm guided engraving area and a name template with a required text slot. It permits text and vector elements, excludes raster images and requires a configured font with the customer's glyph coverage. Empty required text prevents confirmation. The physical SVG output contract and current clipping boundary are in [production](production.md).

## Integration and resource replacement

The [integration example](integration.md) shows the same mug fixture with persistence/upload callbacks and Polish actions. Replace fixture resource URLs with URLs controlled by the host, retain the font license and test glyph coverage. Changing a fixture in the repository updates the playground and these imported examples together. Test fixtures with runtime validation and JSON Schema tooling, and typecheck consuming React examples against public exports.

The examples reference `/fonts/FabrioSans.ttf`. The package does not ship that font: serve a licensed font at that URL or replace `product.fonts` with your own font IDs, families and URLs.

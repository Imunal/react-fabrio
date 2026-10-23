---
title: "Configure a product"
description: "Create and validate physical decoration areas for your product."
---

To define your own product, you need its physical decoration dimensions and intended production process.

## 1. Define a product revision

This print configuration has one freeform area that accepts images and vector artwork:

```ts
import { validateProductConfig, type ProductConfig } from "@react-fabrio/core";

const product: ProductConfig = {
  id: "card",
  name: "Personalized card",
  revision: "1",
  sides: [
    {
      id: "front",
      name: "Front",
      areas: [
        {
          id: "front-artwork",
          name: "Front artwork",
          width: 100,
          height: 150,
          production: "print",
          mode: "freeform",
          allowedElements: ["image", "vector"],
        },
      ],
    },
  ],
};

const issues = validateProductConfig(product);
if (issues.length) throw new Error(issues.map((issue) => issue.message).join("; "));
```

Widths and heights are millimeters. Use unique side IDs and product-wide unique area IDs. Pass the validated configuration as `ProductEditor.product`. The [configuration reference](../configuration.md) lists every field and default.

## 2. Choose editing rules

For unrestricted composition, keep `mode: "freeform"` and list the permitted element types. To enable text, add `"text"` to `allowedElements` and configure downloadable fonts with stable IDs, families and licensed URLs.

For a guided workflow, set `mode: "guided"` and supply templates with labeled slots. The first template initializes the area. Set `required: true` on slots that must be completed. Use element locks and operation permissions to protect fixed artwork. The exported [tag fixture](../examples.md) has a required text slot.

Engraving areas use `production: "engraving"` and exclude raster images. Their SVG output requires configured fonts that can be outlined.

## 3. Set physical boundaries and resources

Obtain bleed and safe-margin values from the product's production specification. A safe margin displays a guide by default; use `constrainToSafeArea: true` when the whole rotated element rectangle must remain inside it. Existing invalid documents open intact for correction and cannot be confirmed until blocking issues are resolved.

Configure [assets and fonts](../assets-and-fonts.md), and add [photographic or mug previews](../previews.md) when needed. Preview mappings do not change the production dimensions.

## 4. Preserve revisions

Keep the product configuration alongside saved designs. Change the revision when changing dimensions or editing rules, and migrate older documents explicitly when needed. A document's product ID and revision must match the configuration used to reopen it.

Validate the configuration, edit every area, then save and reopen the result. Use [production output](../production.md) to check the physical dimensions of generated files.

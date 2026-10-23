import { expect, test } from "vitest";
import { productConfigSchema, designDocumentSchema } from "../packages/core/src/schemas.js";
import { createDesignDocument } from "../packages/core/src/index.js";
import { mugProduct } from "../packages/core/src/examples.js";

test("product schema parses an executable product with Zod", () => {
  // given
  const product = structuredClone(mugProduct);

  // when
  const result = productConfigSchema.safeParse(product);

  // then
  expect(result.success).toBe(true);
  expect(result.data).toEqual(product);
});

test("product schema rejects print DPI below 300", () => {
  // given
  const product = { ...mugProduct, printDpi: 72 };

  // when
  const result = productConfigSchema.safeParse(product);

  // then
  expect(result.success).toBe(false);
});

test("document schema rejects text without font configuration", () => {
  // given
  const document = {
    ...createDesignDocument(mugProduct),
    areas: {
      wrap: [
        { id: "text", type: "text", text: "Hello", x: 0, y: 0, width: 20, height: 10, rotation: 0 },
      ],
    },
  };

  // when
  const result = designDocumentSchema.safeParse(document);

  // then
  expect(result.success).toBe(false);
});

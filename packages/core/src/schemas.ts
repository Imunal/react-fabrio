import { z } from "zod";

const nonemptyString = z.string().min(1);
const positiveNumber = z.number().positive();
const nonnegativeNumber = z.number().nonnegative();

export const elementTypeSchema = z.enum(["text", "image", "vector"]);
export const elementPermissionsSchema = z.object({
  move: z.boolean().optional(),
  resize: z.boolean().optional(),
  rotate: z.boolean().optional(),
  edit: z.boolean().optional(),
  delete: z.boolean().optional(),
  reorder: z.boolean().optional(),
});
export const elementBaseSchema = z.object({
  id: nonemptyString,
  x: z.number(),
  y: z.number(),
  width: positiveNumber,
  height: positiveNumber,
  rotation: z.number(),
  locked: z.boolean().optional(),
  permissions: elementPermissionsSchema.optional(),
  slotId: nonemptyString.optional(),
});
export const cropSchema = z.object({
  x: nonnegativeNumber,
  y: nonnegativeNumber,
  width: positiveNumber,
  height: positiveNumber,
});
export const textElementSchema = elementBaseSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontId: nonemptyString,
  fontSize: positiveNumber,
  color: nonemptyString,
  align: z.enum(["left", "center", "right", "justify"]).optional(),
  lineHeight: positiveNumber.optional(),
  letterSpacing: z.number().optional(),
});
export const imageElementSchema = elementBaseSchema.extend({
  type: z.literal("image"),
  assetId: nonemptyString,
  crop: cropSchema.optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
});
export const vectorElementSchema = elementBaseSchema.extend({
  type: z.literal("vector"),
  path: nonemptyString,
  color: nonemptyString,
});
export const designElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  imageElementSchema,
  vectorElementSchema,
]);
export const assetReferenceSchema = z.object({
  id: nonemptyString,
  url: nonemptyString,
  mimeType: nonemptyString,
  width: positiveNumber.optional(),
  height: positiveNumber.optional(),
  durable: z.boolean().optional(),
});
export const fontConfigSchema = z.object({
  id: nonemptyString,
  family: nonemptyString,
  url: nonemptyString,
  weight: positiveNumber.optional(),
});
export const artworkSchema = z.object({
  id: nonemptyString,
  name: nonemptyString,
  path: nonemptyString,
  color: nonemptyString.optional(),
});
export const templateSlotSchema = z.object({
  id: nonemptyString,
  label: nonemptyString,
  elementId: nonemptyString,
  required: z.boolean().optional(),
  permissions: elementPermissionsSchema.optional(),
});
export const templateSchema = z.object({
  id: nonemptyString,
  name: nonemptyString,
  elements: z.array(designElementSchema),
  slots: z.array(templateSlotSchema).optional(),
});
export const mockupConfigSchema = z.object({
  url: nonemptyString,
  areaId: nonemptyString,
  x: z.number(),
  y: z.number(),
  width: positiveNumber,
  height: positiveNumber,
  rotation: z.number().optional(),
  maskUrl: nonemptyString.optional(),
  shadingUrl: nonemptyString.optional(),
});
export const mugConfigSchema = z.object({
  radius: positiveNumber,
  height: positiveNumber,
  areaId: nonemptyString,
  color: nonemptyString.optional(),
  handleColor: nonemptyString.optional(),
  wrapStart: z.number().optional(),
  wrapAngle: positiveNumber.optional(),
});
export const decorationAreaSchema = z.object({
  id: nonemptyString,
  name: nonemptyString,
  width: positiveNumber,
  height: positiveNumber,
  production: z.enum(["print", "engraving"]),
  mode: z.enum(["guided", "freeform"]),
  allowedElements: z
    .array(elementTypeSchema)
    .refine(
      (elements) => new Set(elements).size === elements.length,
      "Element capabilities must be unique.",
    )
    .meta({ uniqueItems: true }),
  boundary: z
    .object({ type: z.enum(["rectangle", "ellipse", "path"]), path: nonemptyString.optional() })
    .optional(),
  bleed: nonnegativeNumber.optional(),
  safeMargin: nonnegativeNumber.optional(),
  constrainToSafeArea: z.boolean().optional(),
  templates: z.array(templateSchema).optional(),
  fonts: z.array(fontConfigSchema).optional(),
  artwork: z.array(artworkSchema).optional(),
  colors: z.array(nonemptyString).optional(),
  printDpi: z.number().min(300).optional(),
});
export const productConfigSchema = z.object({
  id: nonemptyString,
  name: nonemptyString,
  revision: nonemptyString,
  sides: z
    .array(
      z.object({
        id: nonemptyString,
        name: nonemptyString,
        areas: z.array(decorationAreaSchema).min(1),
        mockups: z.array(mockupConfigSchema).optional(),
      }),
    )
    .min(1),
  fonts: z.array(fontConfigSchema).optional(),
  artwork: z.array(artworkSchema).optional(),
  printDpi: z.number().min(300).optional(),
  upload: z
    .object({
      maxBytes: positiveNumber.optional(),
      mimeTypes: z.array(nonemptyString).optional(),
      maxFiles: z.number().int().positive().optional(),
    })
    .optional(),
  mug: mugConfigSchema.optional(),
});
export const designDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  productId: nonemptyString,
  revision: nonemptyString,
  areas: z.record(z.string(), z.array(designElementSchema)),
  assets: z.record(z.string(), assetReferenceSchema),
});

export const productConfigJsonSchema = {
  ...z.toJSONSchema(productConfigSchema, { io: "input" }),
  $id: "https://react-fabrio.dev/schemas/product-config.v1.json",
  title: "ProductConfig",
};
export const designDocumentJsonSchema = {
  ...z.toJSONSchema(designDocumentSchema, { io: "input" }),
  $id: "https://react-fabrio.dev/schemas/design-document.v1.json",
  title: "DesignDocument",
};

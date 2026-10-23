import { propertyPermission } from "./permissions.js";
import type {
  DesignDocument,
  ProductConfig,
  ValidationIssue,
  DecorationArea,
  DesignElement,
} from "./contracts.js";
import { isInsideSafeArea } from "./safe-area.js";
import { effectiveImageDpi } from "./geometry.js";
import { productConfigSchema, designDocumentSchema } from "./schemas.js";
const issue = (
  code: string,
  message: string,
  areaId?: string,
  elementId?: string,
  severity: "error" | "warning" = "error",
): ValidationIssue => ({
  code,
  message,
  severity,
  ...(areaId ? { areaId } : {}),
  ...(elementId ? { elementId } : {}),
});
const activeTemplate = (area: DecorationArea, elements: DesignElement[]) => {
  return (
    area.templates?.find((template) =>
      template.elements.some((original) => elements.some((element) => element.id === original.id)),
    ) ?? (area.mode === "guided" ? area.templates?.[0] : undefined)
  );
};
const safeVectorPath = (path: string): boolean => {
  return /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]*$/.test(path.trim()) && /[0-9]/.test(path);
};
const templateIssues = (area: DecorationArea, elements: DesignElement[]): ValidationIssue[] => {
  const template = activeTemplate(area, elements);
  if (!template) return [];
  const issues: ValidationIssue[] = [];
  if (
    area.mode === "guided" &&
    elements.some((element) => !template.elements.some((original) => original.id === element.id))
  )
    issues.push(
      issue("guided-element", "Guided areas only support configured template elements.", area.id),
    );
  for (const original of template.elements) {
    const slot = template.slots?.find((item) => item.elementId === original.id);
    const permissions = { ...original.permissions, ...slot?.permissions };
    const saved = elements.find((item) => item.id === original.id);
    if (!saved) {
      if (original.locked || permissions.delete === false)
        issues.push(
          issue(
            "template-permission",
            "Protected template element is missing.",
            area.id,
            original.id,
          ),
        );
      continue;
    }
    const changed = Array.from(new Set([...Object.keys(original), ...Object.keys(saved)]))
      .filter((key) => !["permissions", "slotId"].includes(key))
      .filter(
        (key) =>
          JSON.stringify(original[key as keyof DesignElement]) !==
          JSON.stringify(saved[key as keyof DesignElement]),
      );
    const prohibited = changed.some(
      (key) => original.locked || permissions[propertyPermission(key)] === false,
    );
    if (
      prohibited ||
      saved.locked !== original.locked ||
      saved.slotId !== (slot?.id ?? original.slotId) ||
      (["move", "resize", "rotate", "edit", "delete", "reorder"] as const).some(
        (key) => saved.permissions?.[key] !== permissions[key],
      ) ||
      ((original.locked || permissions.reorder === false) &&
        elements.indexOf(saved) !== template.elements.indexOf(original))
    )
      issues.push(
        issue(
          "template-permission",
          "Saved document changes protected template content or permissions.",
          area.id,
          original.id,
        ),
      );
  }
  return issues;
};
/**
 * Validates an unknown value as a product configuration and checks domain rules.
 *
 * @param value - Configuration supplied by a merchant or parsed from external data.
 * @returns Issues with stable codes; an empty array means the configuration is valid.
 */
export const validateProductConfig = (value: unknown): ValidationIssue[] => {
  const result = productConfigSchema.safeParse(value);
  if (!result.success)
    return [issue("invalid-configuration", "Product configuration does not match the schema.")];
  const product = result.data;
  const issues: ValidationIssue[] = [];
  for (const artwork of product.artwork ?? [])
    if (!safeVectorPath(artwork.path))
      issues.push(issue("unsafe-vector", "Artwork must contain restricted SVG path geometry."));
  const ids = new Set<string>();
  const sideIds = new Set<string>();
  for (const side of product.sides) {
    if (sideIds.has(side.id)) issues.push(issue("duplicate-side", "Side IDs must be unique."));
    sideIds.add(side.id);
    for (const area of side.areas) {
      if (ids.has(area.id))
        issues.push(issue("duplicate-area", "Area IDs must be unique.", area.id));
      ids.add(area.id);
      if (area.production === "engraving" && area.allowedElements.includes("image"))
        issues.push(issue("prohibited-element", "Engraving cannot permit raster images.", area.id));
      if (area.boundary?.type === "path" && !area.boundary.path)
        issues.push(issue("invalid-boundary", "Path boundaries require geometry.", area.id));
      for (const artwork of area.artwork ?? [])
        if (!safeVectorPath(artwork.path))
          issues.push(
            issue("unsafe-vector", "Artwork must contain restricted SVG path geometry.", area.id),
          );
      for (const template of area.templates ?? []) {
        for (const element of template.elements)
          if (element.type === "vector" && !safeVectorPath(element.path))
            issues.push(
              issue(
                "unsafe-vector",
                "Template artwork must contain restricted SVG path geometry.",
                area.id,
                element.id,
              ),
            );
        const elementIds = new Set(template.elements.map((element) => element.id));
        if (elementIds.size !== template.elements.length)
          issues.push(issue("duplicate-element", "Template element IDs must be unique.", area.id));
        for (const slot of template.slots ?? [])
          if (!elementIds.has(slot.elementId))
            issues.push(issue("invalid-slot", "Slot references an unknown element.", area.id));
      }
    }
  }
  if (
    product.mug &&
    (!ids.has(product.mug.areaId) || product.mug.radius <= 0 || product.mug.height <= 0)
  )
    issues.push(issue("invalid-mug", "Mug dimensions and area must be valid."));
  return issues;
};
/**
 * Checks saved document structure and compatibility with a product configuration.
 *
 * @param value - Unknown saved content, such as parsed JSON.
 * @param product - Product configuration used to check identity, areas and template rules.
 * @returns Structural and domain issues, including safe-area and gallery-limit violations.
 *
 * @remarks
 * Use `getDesignIssues` for complete confirmation checks, including required content,
 * resource references and image quality.
 */
export const validateDesignDocument = (
  value: unknown,
  product: ProductConfig,
): ValidationIssue[] => {
  if (value && typeof value === "object" && "schemaVersion" in value && value.schemaVersion !== 1)
    return [issue("unsupported-schema", "Unsupported design document schema version.")];
  const result = designDocumentSchema.safeParse(value);
  if (!result.success)
    return [issue("invalid-document", "Design document does not match the schema.")];
  const productIssues = validateProductConfig(product);
  if (productIssues.length) return productIssues;
  const document = result.data;
  const issues: ValidationIssue[] = [];
  if (document.productId !== product.id || document.revision !== product.revision)
    issues.push(
      issue(
        "configuration-mismatch",
        "Document belongs to a different product or configuration revision.",
      ),
    );
  const areaIds = product.sides.flatMap((side) => side.areas.map((area) => area.id));
  if (
    Object.keys(document.areas).some((id) => !areaIds.includes(id)) ||
    areaIds.some((id) => !document.areas[id])
  )
    issues.push(issue("area-mismatch", "Document areas do not match the configuration."));
  if (
    Object.values(document.assets).filter(
      (asset) => asset.mimeType.startsWith("image/") && asset.mimeType !== "image/svg+xml",
    ).length > (product.upload?.maxFiles ?? 10)
  )
    issues.push(
      issue("asset-limit-exceeded", "Remove unused photos: the gallery exceeds the file limit."),
    );
  const seen = new Set<string>();
  for (const [areaId, elements] of Object.entries(document.areas))
    for (const element of elements) {
      if (seen.has(element.id))
        issues.push(issue("duplicate-element", "Element IDs must be unique.", areaId, element.id));
      seen.add(element.id);
      if (
        element.type === "image" &&
        element.crop &&
        (element.crop.x + element.crop.width > 1 || element.crop.y + element.crop.height > 1)
      )
        issues.push(
          issue(
            "invalid-crop",
            "Crop must fit within normalized image coordinates.",
            areaId,
            element.id,
          ),
        );
    }
  for (const side of product.sides)
    for (const area of side.areas) {
      issues.push(...templateIssues(area, document.areas[area.id] ?? []));
      for (const element of document.areas[area.id] ?? [])
        if (!isInsideSafeArea(area, element))
          issues.push(
            issue(
              "outside-safe-area",
              element.locked
                ? "Locked content is outside the safe area. The product configuration must be corrected."
                : "Content outside the safe area may be cropped. Move or resize it to protect important content.",
              area.id,
              element.id,
              area.constrainToSafeArea ? "error" : "warning",
            ),
          );
    }
  return issues;
};
/**
 * Collects confirmation-blocking errors and nonblocking production warnings.
 *
 * @param document - Design to validate, including its asset references.
 * @param product - Configuration defining permitted content and production requirements.
 * @returns Structural, permission and content issues, including required fields,
 * non-durable assets, unavailable fonts and low effective image DPI.
 */
export const getDesignIssues = (
  document: DesignDocument,
  product: ProductConfig,
): ValidationIssue[] => {
  const issues = [...validateProductConfig(product), ...validateDesignDocument(document, product)];
  if (
    issues.some(
      (item) =>
        ![
          "template-permission",
          "guided-element",
          "outside-safe-area",
          "asset-limit-exceeded",
        ].includes(item.code),
    )
  )
    return issues;
  for (const side of product.sides)
    for (const area of side.areas) {
      const elements = document.areas[area.id] ?? [];
      for (const element of elements) {
        if (
          !area.allowedElements.includes(element.type) ||
          (area.production === "engraving" && element.type === "image")
        )
          issues.push(
            issue(
              "prohibited-element",
              "This element type is prohibited in this area.",
              area.id,
              element.id,
            ),
          );
        if (element.type === "vector" && !safeVectorPath(element.path))
          issues.push(
            issue(
              "unsafe-vector",
              "Vector content must be restricted SVG path geometry.",
              area.id,
              element.id,
            ),
          );
        if (
          (element.type === "text" || element.type === "vector") &&
          area.colors &&
          !area.colors.includes(element.color)
        )
          issues.push(
            issue("prohibited-color", "Element color is not permitted.", area.id, element.id),
          );
        if (element.type === "text") {
          if (
            ![...(area.fonts ?? []), ...(product.fonts ?? [])].some(
              (font) => font.id === element.fontId,
            )
          )
            issues.push(
              issue("missing-font", "Configured font is unavailable.", area.id, element.id),
            );
        }
        if (element.type === "image") {
          const asset = document.assets[element.assetId];
          if (!asset)
            issues.push(issue("missing-asset", "Image asset is missing.", area.id, element.id));
          else {
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(asset.mimeType) ||
              (product.upload?.mimeTypes && !product.upload.mimeTypes.includes(asset.mimeType))
            )
              issues.push(
                issue(
                  "prohibited-asset",
                  "Asset MIME type is not permitted for raster images.",
                  area.id,
                  element.id,
                ),
              );
            if (!asset.durable || asset.url.startsWith("blob:") || asset.url.startsWith("data:"))
              issues.push(
                issue(
                  "non-durable-asset",
                  "Upload this asset to durable storage before confirmation.",
                  area.id,
                  element.id,
                ),
              );
            if (
              asset.width &&
              asset.height &&
              effectiveImageDpi(
                { width: asset.width, height: asset.height },
                element,
                element.crop,
              ) < 300
            )
              issues.push(
                issue(
                  "low-image-dpi",
                  "Image resolution is below 300 effective DPI.",
                  area.id,
                  element.id,
                  "warning",
                ),
              );
          }
        }
      }
      for (const slot of activeTemplate(area, elements)?.slots ?? []) {
        if (!slot.required) continue;
        const element = elements.find(
          (item) => item.slotId === slot.id || item.id === slot.elementId,
        );
        if (
          !element ||
          (element.type === "text" && !element.text.trim()) ||
          (element.type === "image" &&
            (!document.assets[element.assetId] || !document.assets[element.assetId]?.durable))
        )
          issues.push({
            ...issue("required-field", `${slot.label} is required.`, area.id, slot.elementId),
            params: { label: slot.label },
          });
      }
    }
  return issues;
};

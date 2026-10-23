import type { ProductConfig, DesignDocument, DesignElement, Template } from "./contracts.js";
/**
 * Finds a decoration area across all product sides.
 *
 * @param product - Configuration containing the area's physical dimensions and rules.
 * @param areaId - Product-wide decoration area ID.
 * @returns The configured area, or `undefined` if the ID is unknown.
 */
export const getArea = (product: ProductConfig, areaId: string) => {
  return product.sides.flatMap((side) => side.areas).find((area) => area.id === areaId);
};
/**
 * Creates a schema-version-1 design for every configured decoration area.
 *
 * @remarks
 * Guided areas start with cloned elements from their first template, including slot
 * permissions. Freeform areas and the asset gallery start empty.
 *
 * @param product - Product identity, revision and decoration area configuration.
 * @returns A new document with its own copies of template elements.
 */
export const createDesignDocument = (product: ProductConfig): DesignDocument => {
  return {
    schemaVersion: 1,
    productId: product.id,
    revision: product.revision,
    assets: {},
    areas: Object.fromEntries(
      product.sides
        .flatMap((side) => side.areas)
        .map((area) => [
          area.id,
          area.mode === "guided" && area.templates?.[0] ? templateElements(area.templates[0]) : [],
        ]),
    ),
  };
};
export const templateElements = (template: Template): DesignElement[] => {
  return structuredClone(template.elements).map((element) => {
    const slot = template.slots?.find((item) => item.elementId === element.id);
    return {
      ...element,
      ...(slot
        ? { slotId: slot.id, permissions: { ...element.permissions, ...slot.permissions } }
        : {}),
    };
  });
};

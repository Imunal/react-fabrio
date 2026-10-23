import type {
  CommandResult,
  DesignDocument,
  DesignElement,
  ElementUpdate,
  ProductConfig,
} from "./contracts.js";
import { getArea, templateElements } from "./document.js";
import { canEditElement, canReorderElement, propertyPermission } from "./permissions.js";
import { cropSchema, designElementSchema } from "./schemas.js";
import { isInsideSafeArea, permitsSafeAreaTransform, placeInSafeArea } from "./safe-area.js";
import { getDesignIssues } from "./validation.js";

export const rejected = <T = DesignDocument>(code: string, message: string): CommandResult<T> => ({
  status: "rejected",
  issues: [{ code, message, severity: "error" }],
});
export const unchanged = <T>(value: T): CommandResult<T> => ({ status: "unchanged", value });
export const equalValues = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const a = Object.entries(left).filter(([, v]) => v !== undefined);
  const b = Object.entries(right).filter(([, v]) => v !== undefined);
  return (
    a.length === b.length &&
    a.every(
      ([key, value]) =>
        Object.hasOwn(right, key) && equalValues(value, (right as Record<string, unknown>)[key]),
    )
  );
};
const replace = (
  document: DesignDocument,
  areaId: string,
  elements: DesignElement[],
): DesignDocument => ({ ...document, areas: { ...document.areas, [areaId]: elements } });
/** During editing, content may be incomplete for production and existing overflow may be corrected. */
export const validateCommand = (
  before: DesignDocument,
  next: DesignDocument,
  product: ProductConfig,
): CommandResult<DesignDocument> => {
  if (equalValues(before, next)) return unchanged(before);
  const existing = getDesignIssues(before, product);
  const issues = getDesignIssues(next, product).filter(
    (issue) =>
      issue.severity === "error" &&
      ![
        "required-field",
        "non-durable-asset",
        "missing-asset",
        "outside-safe-area",
        "asset-limit-exceeded",
      ].includes(issue.code) &&
      !existing.some((old) => equalValues(old, issue)),
  );
  return issues.length ? { status: "rejected", issues } : { status: "changed", value: next };
};
/**
 * Adds an element to a freeform decoration area.
 *
 * @param document - Current design. The command leaves it unchanged.
 * @param areaId - Target decoration area ID.
 * @param element - New element with a document-wide unique ID.
 * @param product - Product rules to enforce.
 * @returns A new document, or issues explaining why the content or placement was rejected.
 *
 * @remarks
 * Constrained areas fit new elements proportionally through `placeInSafeArea`.
 */
export const addElement = (
  document: DesignDocument,
  areaId: string,
  element: DesignElement,
  product: ProductConfig,
): CommandResult<DesignDocument> => {
  const area = getArea(product, areaId);
  if (!area || !document.areas[areaId]) return rejected("unknown-area", "Unknown decoration area.");
  if (area.mode === "guided")
    return rejected("guided-element", "Guided areas only support configured template elements.");
  const parsed = designElementSchema.safeParse(element);
  if (!parsed.success) return rejected("invalid-element", "Element does not match the schema.");
  if (
    !area.allowedElements.includes(element.type) ||
    (area.production === "engraving" && element.type === "image")
  )
    return rejected("prohibited-element", "Element type is prohibited.");
  if (
    Object.values(document.areas)
      .flat()
      .some((item) => item.id === element.id)
  )
    return rejected("duplicate-element", "Element IDs must be unique.");
  const placed = placeInSafeArea(area, parsed.data);
  if (!placed) return rejected("outside-safe-area", "Element cannot fit in the safe area.");
  return validateCommand(
    document,
    replace(document, areaId, [...document.areas[areaId], placed]),
    product,
  );
};
const keys = {
  geometry: ["x", "y", "width", "height", "rotation"],
  text: ["text", "fontId", "fontSize", "color", "align", "lineHeight", "letterSpacing"],
  image: ["crop", "flipX", "flipY"],
  vector: ["path", "color"],
};
/**
 * Atomically applies editable fields to one element.
 *
 * @param document - Current design. The command leaves it unchanged.
 * @param areaId - Target decoration area ID.
 * @param elementId - ID of the element in the target area.
 * @param update - Discriminated geometry, text, image or vector changes.
 * @param product - Product rules to enforce.
 * @returns The original document for an allowed no-op, a new document, or rejection issues.
 *
 * @remarks
 * Unknown fields, invalid values, incompatible kinds and any denied permission reject
 * all requested changes. Image asset replacement is a session operation.
 */
export const updateElement = (
  document: DesignDocument,
  areaId: string,
  elementId: string,
  update: ElementUpdate,
  product: ProductConfig,
): CommandResult<DesignDocument> => {
  const area = getArea(product, areaId);
  const elements = document.areas[areaId];
  if (!area || !elements) return rejected("unknown-area", "Unknown decoration area.");
  const element = elements.find((item) => item.id === elementId);
  if (!element) return rejected("missing-element", "Element is missing.");
  if (
    !update ||
    typeof update !== "object" ||
    Object.keys(update).some((key) => !["kind", "changes"].includes(key)) ||
    !Object.hasOwn(keys, update.kind) ||
    !update.changes ||
    typeof update.changes !== "object" ||
    Array.isArray(update.changes)
  )
    return rejected("invalid-patch", "Invalid element update.");
  if (update.kind !== "geometry" && update.kind !== element.type)
    return rejected("patch-kind-mismatch", "Update kind does not match the element.");
  if (Object.keys(update.changes).some((key) => !keys[update.kind].includes(key)))
    return rejected("invalid-patch", "Update contains non-editable fields.");
  if (
    element.locked ||
    Object.keys(update.changes).some((key) => !canEditElement(element, propertyPermission(key)))
  )
    return rejected("element-permission", "Element does not permit this change.");
  if (
    update.kind === "image" &&
    update.changes.crop !== undefined &&
    !cropSchema.strict().safeParse(update.changes.crop).success
  )
    return rejected("invalid-patch", "Crop contains invalid or unknown fields.");
  const parsed = designElementSchema.safeParse({ ...element, ...update.changes });
  if (!parsed.success) return rejected("invalid-patch", "Update contains invalid values.");
  const next = parsed.data;
  if (!permitsSafeAreaTransform(area, element, next))
    return rejected("outside-safe-area", "Transform leaves the safe area.");
  return validateCommand(
    document,
    replace(
      document,
      areaId,
      elements.map((item) => (item.id === elementId ? next : item)),
    ),
    product,
  );
};
/**
 * Removes an element when deletion preserves template and stacking rules.
 *
 * @param document - Current design. The command leaves it unchanged.
 * @param areaId - Target decoration area ID.
 * @param elementId - ID of the element to delete.
 * @param product - Product rules to enforce.
 * @returns A new document, or rejection issues for guided content or protected positions.
 */
export const removeElement = (
  document: DesignDocument,
  areaId: string,
  elementId: string,
  product: ProductConfig,
): CommandResult<DesignDocument> => {
  const area = getArea(product, areaId);
  const elements = document.areas[areaId];
  if (!area || !elements) return rejected("unknown-area", "Unknown decoration area.");
  if (area.mode === "guided")
    return rejected("guided-element", "Guided elements cannot be removed.");
  const element = elements.find((item) => item.id === elementId);
  if (!element || !canEditElement(element, "delete"))
    return rejected("element-permission", "Element cannot be removed.");
  if (
    elements.slice(elements.indexOf(element) + 1).some((item) => !canEditElement(item, "reorder"))
  )
    return rejected("protected-position", "Removal shifts a protected position.");
  return validateCommand(
    document,
    replace(
      document,
      areaId,
      elements.filter((item) => item.id !== elementId),
    ),
    product,
  );
};
/**
 * Moves an element to its final index in the decoration area stacking order.
 *
 * @param document - Current design. The command leaves it unchanged.
 * @param areaId - Target decoration area ID.
 * @param elementId - ID of the element to move.
 * @param index - Final zero-based index; later indices render above earlier ones.
 * @param product - Product rules to enforce.
 * @returns The original document for an allowed unchanged position, a new document,
 * or rejection issues for invalid moves or crossing protected positions.
 */
export const reorderElement = (
  document: DesignDocument,
  areaId: string,
  elementId: string,
  index: number,
  product: ProductConfig,
): CommandResult<DesignDocument> => {
  const elements = document.areas[areaId];
  if (!getArea(product, areaId) || !elements)
    return rejected("unknown-area", "Unknown decoration area.");
  if (!canReorderElement(elements, elementId, index))
    return rejected("protected-position", "Move is invalid or crosses a protected position.");
  const current = elements.findIndex((item) => item.id === elementId);
  if (current === index) return unchanged(document);
  const next = [...elements];
  const [element] = next.splice(current, 1);
  next.splice(index, 0, element!);
  return validateCommand(document, replace(document, areaId, next), product);
};
/**
 * Replaces an area's content with cloned template elements.
 *
 * @param document - Current design. The command leaves it unchanged.
 * @param areaId - Target decoration area ID.
 * @param templateId - ID of a template configured for the target area.
 * @param product - Product rules to enforce.
 * @returns The original document for equivalent content, a new document, or rejection
 * issues for an unknown template, duplicate IDs or invalid safe-area placement.
 */
export const applyTemplate = (
  document: DesignDocument,
  areaId: string,
  templateId: string,
  product: ProductConfig,
): CommandResult<DesignDocument> => {
  const area = getArea(product, areaId);
  const template = area?.templates?.find((item) => item.id === templateId);
  if (!area || !template || !document.areas[areaId])
    return rejected("unknown-template", "Unknown template.");
  const elements = templateElements(template);
  if (area.constrainToSafeArea && elements.some((item) => !isInsideSafeArea(area, item)))
    return rejected("outside-safe-area", "Template leaves the safe area.");
  return validateCommand(document, replace(document, areaId, elements), product);
};

import type { DesignElement, ElementPermissions } from "./contracts.js";
export const propertyPermission = (property: string): keyof ElementPermissions =>
  ["x", "y"].includes(property)
    ? "move"
    : ["width", "height"].includes(property)
      ? "resize"
      : property === "rotation"
        ? "rotate"
        : "edit";
/**
 * Checks whether an element is unlocked and permits an operation.
 *
 * @param element - Element to check for locks and permissions.
 * @param action - Operation to check; omitted permission flags allow the operation.
 * @returns Whether the operation is permitted.
 */
export const canEditElement = (
  element: DesignElement,
  action: keyof ElementPermissions,
): boolean => {
  return !element.locked && element.permissions?.[action] !== false;
};
/**
 * Checks whether a move leaves every protected element at its current stacking index.
 *
 * @param elements - Elements in document order, from bottom to top.
 * @param elementId - ID of the element to move.
 * @param index - Final zero-based index in the same array.
 * @returns `false` for invalid indices, unknown IDs, or locked/reorder-protected
 * content anywhere between the current and target positions.
 */
export const canReorderElement = (
  elements: readonly DesignElement[],
  elementId: string,
  index: number,
): boolean => {
  const current = elements.findIndex((item) => item.id === elementId);
  if (!Number.isInteger(index) || index < 0 || index >= elements.length || current < 0)
    return false;
  return elements
    .slice(Math.min(current, index), Math.max(current, index) + 1)
    .every((element) => canEditElement(element, "reorder"));
};

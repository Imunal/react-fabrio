import { createHistory, commitHistory, undoHistory, redoHistory } from "./history.js";
import type {
  AssetReference,
  DesignDocument,
  DesignElement,
  ProductConfig,
  ImageElement,
  ElementUpdate,
  CommandResult,
} from "./contracts.js";
import { createDesignDocument } from "./document.js";
import { validateProductConfig, validateDesignDocument } from "./validation.js";
import { canEditElement } from "./permissions.js";
import {
  addElement,
  updateElement,
  removeElement,
  reorderElement,
  applyTemplate,
  equalValues,
  rejected,
  unchanged,
  validateCommand,
} from "./commands.js";
import { isInsideSafeArea } from "./safe-area.js";
import { assetReferenceSchema } from "./schemas.js";
export interface SessionSnapshot {
  document: DesignDocument;
  areaId: string;
  selectedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
}
/**
 * Creates a subscribable editor session with document, selection and undo/redo state.
 *
 * @param product - Configuration retained by the session; keep it stable during editing.
 * @param initialDesign - Saved design to clone, or omit to initialize from the product.
 * @returns A session that returns atomic `CommandResult` values for document edits.
 * @throws Error - If the configuration or initial document is incompatible or invalid.
 *
 * @remarks
 * Designs with correctable safe-area and gallery-limit violations can open unchanged.
 * Required content and local assets are allowed while editing and checked on confirmation.
 * Subscriptions run synchronously; treat returned snapshots and documents as read-only.
 */
export const createEditorSession = (product: ProductConfig, initialDesign?: DesignDocument) => {
  const issues = validateProductConfig(product);
  if (issues.some((issue) => issue.severity === "error"))
    throw new Error(issues.map((issue) => issue.message).join("; "));
  if (initialDesign) {
    const errors = validateDesignDocument(initialDesign, product).filter(
      (issue) =>
        issue.severity === "error" &&
        !["outside-safe-area", "asset-limit-exceeded"].includes(issue.code),
    );
    if (errors.length) throw new Error(errors.map((issue) => issue.message).join("; "));
  }
  let snapshot: SessionSnapshot = {
    document: structuredClone(initialDesign ?? createDesignDocument(product)),
    areaId: product.sides[0]!.areas[0]!.id,
    selectedId: null,
    canUndo: false,
    canRedo: false,
  };
  let history = createHistory(snapshot.document);
  let actionStart: DesignDocument | undefined;
  let readOnly = false;
  const reservations = new Map<string, { count: number; targetId?: string }>();
  const raster = (asset: AssetReference) =>
    asset.mimeType.startsWith("image/") && asset.mimeType !== "image/svg+xml";
  const assetCount = (assets = snapshot.document.assets) =>
    Object.values(assets).filter(raster).length;
  const uses = (id: string) =>
    Object.values(snapshot.document.areas)
      .flat()
      .filter((e) => e.type === "image" && e.assetId === id);
  const reservedCount = (except?: string) =>
    [...reservations].reduce((sum, [id, value]) => sum + (id === except ? 0 : value.count), 0);
  const capacity = (assets: DesignDocument["assets"], token?: string) =>
    assetCount(assets) +
      reservedCount(token) +
      (token ? Math.max(0, (reservations.get(token)?.count ?? 0) - 1) : 0) <=
    (product.upload?.maxFiles ?? 10);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const area = () =>
    product.sides.flatMap((side) => side.areas).find((item) => item.id === snapshot.areaId)!;
  const selected = () =>
    snapshot.document.areas[snapshot.areaId]?.find((item) => item.id === snapshot.selectedId);
  const commit = (
    result: CommandResult<DesignDocument>,
    selectedId = snapshot.selectedId,
  ): CommandResult<DesignDocument> => {
    if (readOnly) return rejected("read-only", "Session is read only.");
    if (result.status !== "changed") return result;
    if (!actionStart) history = commitHistory(history, result.value, true);
    snapshot = { ...snapshot, document: result.value, selectedId, canUndo: true, canRedo: false };
    emit();
    return result;
  };
  const assetIssue = (asset: AssetReference): CommandResult<DesignDocument> | undefined => {
    if (!assetReferenceSchema.safeParse(asset).success)
      return rejected("invalid-asset", "Invalid asset reference.");
    if (
      snapshot.document.assets[asset.id] &&
      !equalValues(snapshot.document.assets[asset.id], asset)
    )
      return rejected("immutable-asset", "Asset references are immutable.");
    return undefined;
  };
  const unavailable = () => rejected("element-permission", "Operation is unavailable.");
  const canEdit = (element: DesignElement, _property: string) => canEditElement(element, "edit");
  return {
    product,
    /**
     * Suspends document edits, selection changes, area changes and upload reservations.
     *
     * @param value - Whether to keep the session read-only during asynchronous work.
     */
    setReadOnly(value: boolean) {
      readOnly = value;
    },
    /**
     * Starts a group of document edits that will become one undo entry.
     *
     * @remarks
     * Repeated calls keep the original start. Call `endAction` when the interaction ends.
     */
    beginAction() {
      actionStart ??= snapshot.document;
    },
    /**
     * Ends the current action group and records it if the final content differs from the start.
     *
     * @remarks
     * An empty group or a group returning to its starting document adds no undo entry.
     */
    endAction() {
      if (!actionStart) return;
      const changed = !equalValues(actionStart, snapshot.document);
      if (changed) history = commitHistory(history, snapshot.document, true);
      actionStart = undefined;
      const canUndo = history.past.length > 0;
      const canRedo = history.future.length > 0;
      if (snapshot.canUndo !== canUndo || snapshot.canRedo !== canRedo) {
        snapshot = { ...snapshot, canUndo, canRedo };
        emit();
      }
    },
    /**
     * Registers a synchronous listener for document or view-state changes.
     *
     * @param listener - Callback that can read the latest snapshot.
     * @returns A function that removes this listener.
     */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Returns the current document and view state.
     *
     * @returns A stable snapshot reference until the session changes; treat it as read-only.
     */
    getSnapshot: () => snapshot,
    /**
     * Returns the configuration of the active decoration area.
     */
    getArea: area,
    /**
     * Returns the selected element in the active area, or `undefined` when none is selected.
     */
    getSelected: selected,
    /**
     * Activates a configured decoration area and clears selection without editing the document.
     *
     * @param id - Area ID; unknown IDs and read-only sessions are ignored.
     */
    setArea(id: string) {
      if (readOnly) return;
      if (!product.sides.some((side) => side.areas.some((item) => item.id === id))) return;
      snapshot = { ...snapshot, areaId: id, selectedId: null };
      emit();
    },
    /**
     * Changes selection without adding history or changing the document.
     *
     * @param id - Element ID in the active area, or `null` to clear selection.
     * @remarks
     * Unknown IDs, repeated selections and read-only sessions are ignored.
     */
    select(id: string | null) {
      if (readOnly) return;
      if (
        snapshot.selectedId === id ||
        (id !== null && !snapshot.document.areas[snapshot.areaId]?.some((e) => e.id === id))
      )
        return;
      snapshot = { ...snapshot, selectedId: id };
      emit();
    },
    /**
     * Atomically applies typed changes to the selected element.
     *
     * @param update - Geometry or type-specific editable fields.
     * @returns A changed or unchanged document, or rejection issues that leave state unchanged.
     */
    update(update: ElementUpdate): CommandResult<DesignDocument> {
      if (readOnly) return rejected("read-only", "Session is read only.");
      if (!snapshot.selectedId) return rejected("missing-element", "No selected element.");
      return commit(
        updateElement(snapshot.document, snapshot.areaId, snapshot.selectedId, update, product),
      );
    },
    /**
     * Adds and selects a new element in the active freeform area.
     *
     * @param element - New element with a unique ID and physical geometry.
     * @returns The committed document, or rejection issues without changing selection or history.
     */
    add(element: DesignElement): CommandResult<DesignDocument> {
      return commit(addElement(snapshot.document, snapshot.areaId, element, product), element.id);
    },
    /**
     * Reserves gallery capacity for concurrent raster uploads.
     *
     * @param count - Positive integer number of files to reserve.
     * @param targetId - Optional image replacement target. An asset used only by that image
     * may free capacity for its replacement.
     * @returns An opaque token, or `null` if capacity, permissions or another reservation prevent it.
     */
    reserveUploads(count: number, targetId?: string): string | null {
      if (readOnly || !Number.isInteger(count) || count < 1) return null;
      const target = Object.values(snapshot.document.areas)
        .flat()
        .find((e) => e.id === targetId);
      if (
        targetId &&
        (!target ||
          target.type !== "image" ||
          !canEdit(target, "assetId") ||
          [...reservations.values()].some((r) => r.targetId === targetId))
      )
        return null;
      const credit =
        count === 1 && target?.type === "image" && uses(target.assetId).length === 1 ? 1 : 0;
      if (assetCount() + reservedCount() + count - credit > (product.upload?.maxFiles ?? 10))
        return null;
      const token = crypto.randomUUID();
      reservations.set(token, { count: count - credit, targetId });
      return token;
    },
    /**
     * Releases unused capacity from an upload reservation.
     *
     * @param token - Token returned by `reserveUploads`.
     * @param count - Number to release; omit to release the entire reservation.
     * @remarks
     * Unknown tokens are ignored. Successful asset operations consume their own reservation.
     */
    releaseUpload(token: string, count?: number) {
      const reservation = reservations.get(token);
      if (!reservation) return;
      if (count && reservation.count > count) reservation.count -= count;
      else reservations.delete(token);
    },
    /**
     * Adds an immutable asset reference to the gallery without inserting an element.
     *
     * @param asset - Reference to register; an existing ID must contain identical data.
     * @param token - Optional upload reservation to consume on success.
     * @returns A changed or unchanged document, or rejection issues for invalid references or capacity.
     */
    addAsset(asset: AssetReference, token?: string): CommandResult<DesignDocument> {
      if (readOnly || (token && !reservations.has(token))) return unavailable();
      const problem = assetIssue(asset);
      if (problem) return problem;
      const assets = { ...snapshot.document.assets, [asset.id]: structuredClone(asset) };
      if (!capacity(assets, token)) return rejected("asset-limit-exceeded", "Gallery is full.");
      const result = validateCommand(snapshot.document, { ...snapshot.document, assets }, product);
      if (result.status !== "rejected" && token) this.releaseUpload(token, 1);
      return commit(result);
    },
    /**
     * Atomically adds a gallery asset and selects its new image element in one undo action.
     *
     * @param asset - Immutable image reference to register.
     * @param element - New image geometry; its asset ID is replaced with `asset.id`.
     * @param token - Optional upload reservation to consume on success.
     * @returns The committed document, or rejection issues leaving asset, selection and history intact.
     */
    addImage(
      asset: AssetReference,
      element: ImageElement,
      token?: string,
    ): CommandResult<DesignDocument> {
      if (readOnly || (token && !reservations.has(token))) return unavailable();
      const problem = assetIssue(asset);
      if (problem) return problem;
      const assets = { ...snapshot.document.assets, [asset.id]: structuredClone(asset) };
      if (!capacity(assets, token)) return rejected("asset-limit-exceeded", "Gallery is full.");
      const result = addElement(
        { ...snapshot.document, assets },
        snapshot.areaId,
        { ...element, assetId: asset.id },
        product,
      );
      if (result.status !== "rejected" && token) this.releaseUpload(token, 1);
      return commit(result, element.id);
    },
    /**
     * Atomically changes an image's asset while preserving its element geometry.
     *
     * @param targetId - Editable image ID in the active area.
     * @param asset - Replacement reference; changed asset data requires a new asset ID.
     * @param token - Optional reservation for this replacement target.
     * @returns A changed or unchanged document, or rejection issues with no partial asset update.
     *
     * @remarks
     * At capacity, the old asset may be removed when only this image uses it. Undo restores it.
     */
    replaceImage(
      targetId: string,
      asset: AssetReference,
      token?: string,
    ): CommandResult<DesignDocument> {
      if (
        readOnly ||
        (token && (!reservations.has(token) || reservations.get(token)?.targetId !== targetId))
      )
        return unavailable();
      const target = snapshot.document.areas[snapshot.areaId]?.find((e) => e.id === targetId);
      if (!target || target.type !== "image" || !canEditElement(target, "edit"))
        return unavailable();
      const problem = assetIssue(asset);
      if (problem) return problem;
      const assets = { ...snapshot.document.assets, [asset.id]: structuredClone(asset) };
      if (
        !capacity(assets, token) &&
        uses(target.assetId).length === 1 &&
        target.assetId !== asset.id
      )
        delete assets[target.assetId];
      if (!capacity(assets, token)) return rejected("asset-limit-exceeded", "Gallery is full.");
      const result = validateCommand(
        snapshot.document,
        {
          ...snapshot.document,
          assets,
          areas: {
            ...snapshot.document.areas,
            [snapshot.areaId]: snapshot.document.areas[snapshot.areaId]!.map((e) =>
              e.id === targetId ? { ...target, assetId: asset.id } : e,
            ),
          },
        },
        product,
      );
      if (result.status !== "rejected" && token) this.releaseUpload(token, 1);
      return commit(result);
    },
    /**
     * Removes an unused reference from the document gallery.
     *
     * @param id - Asset ID; referenced assets cannot be removed.
     * @returns The updated document, the original document for a missing ID, or rejection issues.
     */
    removeAsset(id: string): CommandResult<DesignDocument> {
      if (readOnly || uses(id).length) return unavailable();
      if (!snapshot.document.assets[id]) return unchanged(snapshot.document);
      const assets = { ...snapshot.document.assets };
      delete assets[id];
      return commit({ status: "changed", value: { ...snapshot.document, assets } });
    },
    /**
     * Deletes the selected element when area rules and protected positions permit it.
     *
     * @returns A committed document with cleared selection, or rejection issues.
     */
    remove(): CommandResult<DesignDocument> {
      if (!snapshot.selectedId) return unavailable();
      return commit(
        removeElement(snapshot.document, snapshot.areaId, snapshot.selectedId, product),
        null,
      );
    },
    /**
     * Duplicates and selects the current element with a new ID and no slot association.
     *
     * @remarks
     * Copies normally move by 2 mm on each axis; constrained areas preserve valid placement.
     * @returns The committed document, or rejection issues for unavailable duplication.
     */
    duplicate(): CommandResult<DesignDocument> {
      if (readOnly) return unavailable();
      const element = selected();
      if (!element || element.locked || area().mode === "guided") return unavailable();
      const offset = { ...element, x: element.x + 2, y: element.y + 2 };
      if (area().constrainToSafeArea && !isInsideSafeArea(area(), element)) return unavailable();
      return this.add({
        ...(area().constrainToSafeArea && !isInsideSafeArea(area(), offset) ? element : offset),
        id: crypto.randomUUID(),
        slotId: undefined,
      });
    },
    /**
     * Moves an element to its final stacking index in the active area.
     *
     * @param elementId - ID of the element to move.
     * @param targetIndex - Zero-based final index; later elements render above earlier ones.
     * @returns A changed or unchanged document, or rejection issues for invalid or protected moves.
     */
    moveElement(elementId: string, targetIndex: number): CommandResult<DesignDocument> {
      return commit(
        reorderElement(snapshot.document, snapshot.areaId, elementId, targetIndex, product),
      );
    },
    /**
     * Moves the selected element by a relative number of stacking positions.
     *
     * @param delta - Integer offset, clamped to the active area's stacking bounds.
     * @returns A changed or unchanged document, or rejection issues when the move is unavailable.
     */
    reorder(delta: number): CommandResult<DesignDocument> {
      const elements = snapshot.document.areas[snapshot.areaId] ?? [];
      const from = elements.findIndex((item) => item.id === snapshot.selectedId);
      if (from < 0 || !Number.isInteger(delta)) return unavailable();
      return this.moveElement(
        elements[from]!.id,
        Math.max(0, Math.min(elements.length - 1, from + delta)),
      );
    },
    /**
     * Replaces the active area's elements with a configured template and clears selection on change.
     *
     * @param id - Template ID configured for the active area.
     * @returns A changed or unchanged document, or rejection issues. Accepted changes form one undo action.
     */
    applyTemplate(id: string): CommandResult<DesignDocument> {
      return commit(applyTemplate(snapshot.document, snapshot.areaId, id, product), null);
    },
    /**
     * Completes any open action, restores the previous document and clears selection.
     *
     * @returns The restored document, an unchanged result for empty history, or rejection when read-only.
     */
    undo(): CommandResult<DesignDocument> {
      if (readOnly) return unavailable();
      this.endAction();
      const next = undoHistory(history);
      if (next === history) return unchanged(snapshot.document);
      history = next;
      snapshot = {
        ...snapshot,
        document: history.present,
        selectedId: null,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
      };
      emit();
      return { status: "changed", value: snapshot.document };
    },
    /**
     * Completes any open action, restores the next undone document and clears selection.
     *
     * @returns The restored document, an unchanged result for empty redo history, or rejection when read-only.
     */
    redo(): CommandResult<DesignDocument> {
      if (readOnly) return unavailable();
      this.endAction();
      const next = redoHistory(history);
      if (next === history) return unchanged(snapshot.document);
      history = next;
      snapshot = {
        ...snapshot,
        document: history.present,
        selectedId: null,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
      };
      emit();
      return { status: "changed", value: snapshot.document };
    },
  };
};
export type EditorSession = ReturnType<typeof createEditorSession>;

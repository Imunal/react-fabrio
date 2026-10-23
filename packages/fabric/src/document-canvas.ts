import { Canvas, FabricImage, Path, FabricObject, Point } from "fabric";
import type {
  DesignDocument,
  DesignElement,
  GeometryPatch,
  ProductConfig,
} from "@react-fabrio/core";
import { permitsSafeAreaTransform, areaGuidePaths } from "@react-fabrio/core";
import { nearestGuide, styleControls } from "./manipulation.js";
import { outlineTextPath } from "./text-geometry.js";

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentCanvasOptions {
  onSelectionBoundsChange?: (bounds: SelectionBounds | null) => void;
  ariaLabel?: string;
  product: ProductConfig;
  document: DesignDocument;
  areaId: string;
  selectedId: string | null;
  /** Reports a user selection change; `null` means selection was cleared. */
  onSelect(id: string | null): void;
  /**
   * Reports changed geometry fields once a gesture completes.
   *
   * @param id - Transformed element ID.
   * @param patch - Changed geometry in millimeters and degrees.
   * @returns `false` to restore committed geometry after a rejected command.
   */
  onTransform(id: string, patch: GeometryPatch): void | boolean;
  /** Reports a resource or rendering failure from the current render. */
  onError(error: Error): void;
}
const SCALE = 10;
const CONTROL_GUTTER = 64;
/**
 * Displays the physical design document on an interactive Fabric canvas.
 *
 * @param host - Browser element containing the canvas and observed for size changes.
 * @param initial - Initial product, document, area, selection and event callbacks.
 * @returns A handle for rendering content, selecting existing objects, zooming and disposal.
 *
 * @remarks
 * Initial rendering starts immediately. Render failures are reported through `onError`.
 * Call `dispose` when the host unmounts. Selection changes do not rebuild document objects.
 */
export const mountDocumentCanvas = (host: HTMLElement, initial: DocumentCanvasOptions) => {
  const element = document.createElement("canvas");
  const surface = document.createElement("div");
  surface.style.position = "absolute";
  surface.style.left = surface.style.top = `${-CONTROL_GUTTER}px`;
  const originalPosition = host.style.position;
  const originalAspectRatio = host.style.aspectRatio;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const guides = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  guides.classList.add("rf-alignment-guides");
  guides.setAttribute("aria-hidden", "true");
  Object.assign(guides.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "hidden",
  });
  surface.append(element);
  host.append(surface);
  host.append(guides);
  const canvas = new Canvas(element, {
    preserveObjectStacking: true,
    selection: false,
    controlsAboveOverlay: true,
  });
  canvas.upperCanvasEl.setAttribute("role", "img");
  canvas.upperCanvasEl.setAttribute(
    "aria-label",
    initial.ariaLabel ??
      "Design canvas. Use the element list and controls to edit with a keyboard.",
  );
  let options = initial;
  let selectedId = initial.selectedId;
  let applyingSelection = false;
  let disposed = false;
  let generation = 0;
  let rendering = false;
  let zoom = 1;
  let renderController = new AbortController();
  const ids = new WeakMap<FabricObject, string>();
  const textObjects = new WeakSet<FabricObject>();
  const clearGuides = () => guides.replaceChildren();
  const showGuide = (axis: "x" | "y", value: number) => {
    const line = document.createElementNS(guides.namespaceURI, "line");
    line.setAttribute("data-axis", axis);
    const transform = canvas.viewportTransform;
    const position =
      value * transform[axis === "x" ? 0 : 3] + transform[axis === "x" ? 4 : 5] - CONTROL_GUTTER;
    line.setAttribute("x1", axis === "x" ? String(position) : "0");
    line.setAttribute("x2", axis === "x" ? String(position) : String(host.clientWidth));
    line.setAttribute("y1", axis === "y" ? String(position) : "0");
    line.setAttribute("y2", axis === "y" ? String(position) : String(host.clientHeight));
    line.setAttribute("stroke", "var(--rf-guide, #257454)");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("stroke-dasharray", "5 3");
    guides.append(line);
  };
  const currentArea = () =>
    options.product.sides.flatMap((side) => side.areas).find((area) => area.id === options.areaId)!;
  const reportBounds = () => {
    if (disposed) return;
    const object = canvas.getActiveObject();
    if (!object) {
      options.onSelectionBoundsChange?.(null);
      return;
    }
    object.setCoords();
    const box = object.getBoundingRect();
    const transform = canvas.viewportTransform;
    options.onSelectionBoundsChange?.({
      x: box.left * transform[0] + transform[4] - CONTROL_GUTTER,
      y: box.top * transform[3] + transform[5] - CONTROL_GUTTER,
      width: box.width * transform[0],
      height: box.height * transform[3],
    });
  };
  const fit = () => {
    if (disposed) return;
    const area = currentArea();
    clearGuides();
    host.style.aspectRatio = `${area.width} / ${area.height}`;
    const width = Math.max(1, host.clientWidth);
    const ratio = (width / (area.width * SCALE)) * zoom;
    const height = (width * area.height) / area.width;
    const outerWidth = width * zoom + CONTROL_GUTTER * 2;
    const outerHeight = height * zoom + CONTROL_GUTTER * 2;
    if (canvas.getWidth() !== outerWidth || canvas.getHeight() !== outerHeight)
      canvas.setDimensions({ width: outerWidth, height: outerHeight });
    canvas.setViewportTransform([ratio, 0, 0, ratio, CONTROL_GUTTER, CONTROL_GUTTER]);
    for (const object of canvas.getObjects()) {
      if (textObjects.has(object))
        object.setControlsVisibility({
          mt: !object.lockScalingY && object.getScaledHeight() * ratio > 44,
          mb: !object.lockScalingY && object.getScaledHeight() * ratio > 44,
        });
      object.setCoords();
    }
    canvas.requestRenderAll();
    reportBounds();
  };
  let resizeFrame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fit);
  });
  observer.observe(host);
  const onSelect = () => {
    clearGuides();
    if (!rendering && !applyingSelection) {
      selectedId = ids.get(canvas.getActiveObject()!) ?? null;
      options.onSelect(selectedId);
      reportBounds();
    }
  };
  canvas.on("selection:created", onSelect);
  canvas.on("selection:updated", onSelect);
  canvas.on("selection:cleared", onSelect);
  const findGuides = (target: FabricObject, distance: number) => {
    const area = currentArea();
    target.setCoords();
    const bounds = target.getBoundingRect();
    const xs = [0, (area.width * SCALE) / 2, area.width * SCALE],
      ys = [0, (area.height * SCALE) / 2, area.height * SCALE];
    for (const other of canvas.getObjects()) {
      if (other === target) continue;
      const box = other.getBoundingRect();
      xs.push(box.left, box.left + box.width / 2, box.left + box.width);
      ys.push(box.top, box.top + box.height / 2, box.top + box.height);
    }
    const threshold = distance / canvas.getZoom();
    const xGuide = nearestGuide(
      [bounds.left, bounds.left + bounds.width / 2, bounds.left + bounds.width],
      xs,
      threshold,
    );
    const yGuide = nearestGuide(
      [bounds.top, bounds.top + bounds.height / 2, bounds.top + bounds.height],
      ys,
      threshold,
    );
    return { xGuide, yGuide };
  };
  const accepted = new WeakMap<
    FabricObject,
    {
      element: DesignElement;
      left: number;
      top: number;
      scaleX: number;
      scaleY: number;
      angle: number;
    }
  >();
  const transformElement = (target: FabricObject, original: DesignElement): DesignElement => {
    const width = target.getScaledWidth() / SCALE,
      height = target.getScaledHeight() / SCALE;
    return {
      ...original,
      x: target.left / SCALE - width / 2,
      y: target.top / SCALE - height / 2,
      width,
      height,
      rotation: target.angle,
    };
  };
  const constrain = (target: FabricObject) => {
    const previous = accepted.get(target);
    if (!previous) return;
    const next = transformElement(target, previous.element);
    if (!permitsSafeAreaTransform(currentArea(), previous.element, next)) {
      target.set({
        left: previous.left,
        top: previous.top,
        scaleX: previous.scaleX,
        scaleY: previous.scaleY,
        angle: previous.angle,
      });
      clearGuides();
    } else
      accepted.set(target, {
        element: next,
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
      });
    target.setCoords();
  };
  canvas.on("object:moving", ({ target }) => {
    if (rendering || disposed) return;
    const { xGuide, yGuide } = findGuides(target, 6);
    target.set({
      left: target.left + (xGuide?.offset ?? 0),
      top: target.top + (yGuide?.offset ?? 0),
    });
    constrain(target);
    target.setCoords();
    clearGuides();
    if (xGuide) showGuide("x", xGuide.value);
    if (yGuide) showGuide("y", yGuide.value);
  });
  canvas.on("object:moving", reportBounds);
  canvas.on("mouse:up", clearGuides);
  canvas.on("object:scaling", ({ target }) => {
    constrain(target);
    const { xGuide, yGuide } = findGuides(target, 1);
    clearGuides();
    if (xGuide) showGuide("x", xGuide.value);
    if (yGuide) showGuide("y", yGuide.value);
    reportBounds();
  });
  canvas.on("object:rotating", ({ target }) => {
    constrain(target);
    clearGuides();
    const center = target.getCenterPoint();
    showGuide("x", center.x);
    showGuide("y", center.y);
    reportBounds();
  });
  canvas.on("object:modified", ({ target }) => {
    clearGuides();
    if (!target || rendering) return;
    const id = ids.get(target);
    if (!id) return;
    constrain(target);
    const width = target.getScaledWidth() / SCALE,
      height = target.getScaledHeight() / SCALE;
    const original = options.document.areas[options.areaId]?.find((element) => element.id === id);
    if (!original) return;
    const next = {
      x: target.left / SCALE - width / 2,
      y: target.top / SCALE - height / 2,
      width,
      height,
      rotation: target.angle,
    };
    const patch: GeometryPatch = {};
    for (const key of ["x", "y", "width", "height", "rotation"] as const)
      if (Math.abs(next[key] - original[key]) > 1e-9) patch[key] = next[key];
    if (Object.keys(patch).length && options.onTransform(id, patch) === false) {
      target.set({
        left: (original.x + original.width / 2) * SCALE,
        top: (original.y + original.height / 2) * SCALE,
        scaleX: (original.width * SCALE) / target.width,
        scaleY: (original.height * SCALE) / target.height,
        angle: original.rotation,
      });
      accepted.set(target, {
        element: original,
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
      });
      target.setCoords();
      canvas.requestRenderAll();
      reportBounds();
    }
  });
  const applySelection = () => {
    applyingSelection = true;
    try {
      const selected = canvas.getObjects().find((object) => ids.get(object) === selectedId);
      if (selected) canvas.setActiveObject(selected);
      else canvas.discardActiveObject();
      canvas.requestRenderAll();
      reportBounds();
    } finally {
      applyingSelection = false;
    }
  };
  const render = async (next: DocumentCanvasOptions) => {
    if (disposed) return;
    selectedId = next.selectedId;
    options = next;
    const version = ++generation;
    rendering = true;
    renderController.abort();
    renderController = new AbortController();
    const signal = renderController.signal;
    const objects: FabricObject[] = [];
    try {
      const area = currentArea();
      for (const item of next.document.areas[next.areaId] ?? []) {
        let object: FabricObject;
        if (item.type === "text") {
          const path = await outlineTextPath(item, area.fonts ?? next.product.fonts ?? []);
          // Keep the saved text rectangle, rather than the glyph ink bounds, as the transform origin.
          // The same already-clipped local-mm outlines are used by production exports.
          const outlined = new Path(path, { fill: item.color, strokeWidth: 0 });
          outlined.set({
            width: item.width,
            height: item.height,
            pathOffset: new Point(item.width / 2, item.height / 2),
            scaleX: SCALE,
            scaleY: SCALE,
          });
          object = outlined;
        } else if (item.type === "image") {
          const asset = next.document.assets[item.assetId];
          if (!asset) continue;
          const image = await FabricImage.fromURL(asset.url, { crossOrigin: "anonymous", signal });
          if (item.crop)
            image.set({
              cropX: item.crop.x * image.width,
              cropY: item.crop.y * image.height,
              width: item.crop.width * image.width,
              height: item.crop.height * image.height,
            });
          object = image;
        } else {
          object = new Path(item.path, { fill: item.color, strokeWidth: 0 });
        }
        object.set({
          left: (item.x + item.width / 2) * SCALE,
          top: (item.y + item.height / 2) * SCALE,
          angle: item.rotation,
          originX: "center",
          originY: "center",
          selectable: !item.locked,
          evented: !item.locked,
          cornerColor: "#257454",
          transparentCorners: false,
          cornerSize: 12,
          touchCornerSize: 28,
          strokeWidth: 0,
        });
        if (item.type !== "text")
          object.set({
            scaleX: (item.width * SCALE) / (object.width || 1),
            scaleY: (item.height * SCALE) / (object.height || 1),
          });
        if (item.type === "image") object.set({ flipX: item.flipX, flipY: item.flipY });
        if (item.permissions)
          object.set({
            lockMovementX: item.permissions.move === false,
            lockMovementY: item.permissions.move === false,
            lockScalingX: item.permissions.resize === false,
            lockScalingY: item.permissions.resize === false,
            lockRotation: item.permissions.rotate === false,
          });
        styleControls(object, item);
        if (item.type === "text") textObjects.add(object);
        accepted.set(object, {
          element: item,
          left: object.left,
          top: object.top,
          scaleX: object.scaleX,
          scaleY: object.scaleY,
          angle: object.angle,
        });
        ids.set(object, item.id);
        objects.push(object);
      }
      if (disposed || version !== generation) {
        objects.forEach((object) => object.dispose());
        return;
      }
      const replaced = canvas.getObjects();
      const previousClip = canvas.clipPath;
      canvas.clear();
      replaced.forEach((object) => object.dispose());
      previousClip?.dispose();
      const clip = new Path(areaGuidePaths(area).bleed, {
        scaleX: SCALE,
        scaleY: SCALE,
        originX: "left",
        originY: "top",
        absolutePositioned: true,
        strokeWidth: 0,
      });
      clip.set({
        left: (clip.pathOffset.x - clip.width / 2) * SCALE,
        top: (clip.pathOffset.y - clip.height / 2) * SCALE,
      });
      canvas.clipPath = clip;
      canvas.add(...objects);
      applySelection();
      fit();
    } catch (error) {
      objects.forEach((object) => object.dispose());
      if (!disposed && version === generation && !signal.aborted)
        options.onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (version === generation) rendering = false;
    }
  };
  void render(initial);
  return {
    /**
     * Rebuilds the active area's objects, loading images and outlined text as needed.
     *
     * @param next - Latest document, configuration, area and callbacks.
     * @remarks
     * Superseded renders release their objects. After loading, the renderer applies
     * the latest selection and reports current failures through `onError`.
     */
    render,
    /** Updates the accessible canvas label without rebuilding document objects. */
    setAriaLabel(label: string) {
      if (!disposed) canvas.upperCanvasEl.setAttribute("aria-label", label);
    },
    /**
     * Selects an existing canvas object without reloading images or outlining text.
     *
     * @param id - Element ID, or `null` to clear selection.
     * @remarks
     * If a content render is pending, it applies the latest selection when it finishes.
     */
    setSelection(id: string | null) {
      if (disposed) return;
      selectedId = id;
      applySelection();
    },
    /**
     * Changes magnification relative to the fitted view and updates selection bounds.
     *
     * @param value - Zoom factor, clamped between 0.25 and 4.
     */
    setZoom(value: number) {
      zoom = Math.max(0.25, Math.min(4, value));
      fit();
    },
    /**
     * Aborts pending rendering, disconnects resize observation and releases the canvas.
     *
     * @returns A promise that resolves when Fabric finishes disposal.
     */
    dispose() {
      disposed = true;
      generation++;
      renderController.abort();
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      surface.remove();
      guides.remove();
      host.style.position = originalPosition;
      host.style.aspectRatio = originalAspectRatio;
      return canvas.dispose();
    },
  };
};

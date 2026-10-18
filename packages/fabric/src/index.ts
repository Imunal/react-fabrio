import type { Product } from "@react-fabrio/core";
import { Canvas, IText } from "fabric";

// Logical design coordinates are independent of the screen and device pixel ratio.
export const DESIGN_UNITS_PER_MM = 10;

export interface TextLayer {
  id: string;
  text: string;
}

export interface EditorSnapshot {
  layers: TextLayer[];
  selected: (TextLayer & { color: string; sizeMm: number }) | null;
}

export interface FabricEditor {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EditorSnapshot;
  addText: () => void;
  select: (id: string) => void;
  updateText: (text: string) => void;
  setColor: (color: string) => void;
  setSize: (sizeMm: number) => void;
  move: (xMm: number, yMm: number) => void;
  remove: () => void;
  exportPng: () => string;
  dispose: () => Promise<void>;
}

export const createFabricEditor = (host: HTMLElement, product: Product): FabricEditor => {
  if (![product.width, product.height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Product dimensions must be positive, finite millimeters.");
  }
  const width = product.width * DESIGN_UNITS_PER_MM;
  const height = product.height * DESIGN_UNITS_PER_MM;
  const surface = document.createElement("div");
  const element = document.createElement("canvas");
  surface.append(element);
  host.append(surface);
  const canvas = new Canvas(element, {
    width,
    height,
    backgroundColor: "#faf7ee",
    selection: false,
    preserveObjectStacking: true,
  });
  canvas.upperCanvasEl.setAttribute("aria-label", `${product.name} design preview`);
  canvas.upperCanvasEl.setAttribute("role", "img");
  const ids = new WeakMap<IText, string>();
  const listeners = new Set<() => void>();
  let snapshot: EditorSnapshot = { layers: [], selected: null };
  let disposed = false;
  const activeText = () => {
    const object = canvas.getActiveObject();
    return object instanceof IText ? object : null;
  };
  const synchronize = () => {
    const selected = activeText();
    snapshot = {
      layers: canvas
        .getObjects()
        .filter((object): object is IText => object instanceof IText)
        .map((object) => ({ id: ids.get(object)!, text: object.text })),
      selected: selected
        ? {
            id: ids.get(selected)!,
            text: selected.text,
            color: String(selected.fill),
            sizeMm: (selected.fontSize * selected.scaleY) / DESIGN_UNITS_PER_MM,
          }
        : null,
    };
    listeners.forEach((listener) => listener());
  };
  const unsubscribers = [
    canvas.on("selection:created", synchronize),
    canvas.on("selection:updated", synchronize),
    canvas.on("selection:cleared", synchronize),
    canvas.on("text:changed", synchronize),
    canvas.on("object:modified", synchronize),
  ];
  let previousWidth = 0;
  let resizeFrame = 0;
  const resize = () => {
    const available = host.clientWidth;
    if (disposed || available <= 0 || available === previousWidth) return;
    previousWidth = available;
    const zoom = available / width;
    canvas.setDimensions({ width: available, height: height * zoom });
    canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  };
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(host);
  resize();
  const change = (apply: (text: IText) => void) => {
    const text = activeText();
    if (!text || disposed) return;
    apply(text);
    text.setCoords();
    canvas.requestRenderAll();
    synchronize();
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    addText() {
      if (disposed) return;
      const text = new IText("Text", {
        left: width / 2,
        top: height / 2 + (canvas.getObjects().length % 3) * height * 0.2,
        originX: "center",
        originY: "center",
        fontFamily: "Georgia",
        fontSize: 4 * DESIGN_UNITS_PER_MM,
        fill: "#263c32",
        cornerColor: "#257454",
        cornerSize: 16,
        touchCornerSize: 28,
        transparentCorners: false,
        padding: 8,
      });
      ids.set(text, crypto.randomUUID());
      canvas.add(text);
      canvas.setActiveObject(text);
      synchronize();
      canvas.requestRenderAll();
    },
    select(id) {
      const text = canvas
        .getObjects()
        .find((object) => object instanceof IText && ids.get(object) === id);
      if (text) {
        canvas.setActiveObject(text);
        canvas.requestRenderAll();
      }
    },
    updateText: (value) =>
      change((text) => {
        text.set("text", value);
      }),
    setColor: (value) =>
      change((text) => {
        text.set("fill", value);
      }),
    setSize: (value) => {
      if (Number.isFinite(value) && value >= 1 && value <= 12) {
        change((text) => {
          text.set("fontSize", (value * DESIGN_UNITS_PER_MM) / text.scaleY);
        });
      }
    },
    move: (xMm, yMm) =>
      change((text) => {
        text.set({
          left: text.left + xMm * DESIGN_UNITS_PER_MM,
          top: text.top + yMm * DESIGN_UNITS_PER_MM,
        });
      }),
    remove() {
      change((text) => {
        canvas.remove(text);
        canvas.discardActiveObject();
      });
    },
    exportPng() {
      // Normalize the viewport so exports are always 10 pixels/mm, including on mobile.
      return canvas.toDataURL({
        format: "png",
        multiplier: width / canvas.getWidth(),
        enableRetinaScaling: false,
      });
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      listeners.clear();
      // Each mount owns its DOM, so Fabric's asynchronous disposal cannot remove a new canvas.
      surface.remove();
      await canvas.dispose();
    },
  };
};

import { afterEach, expect, test, vi } from "vitest";
import { mountDocumentCanvas } from "../packages/fabric/src/document-canvas.js";
import type { DocumentCanvasOptions } from "../packages/fabric/src/document-canvas.js";

const mocks = vi.hoisted(() => {
  class Object {
    width = 10;
    height = 10;
    pathOffset = { x: 5, y: 5 };
    left = 0;
    top = 0;
    controls = {};
    scaleX = 1;
    scaleY = 1;
    getScaledWidth() {
      return this.width * this.scaleX;
    }
    getScaledHeight() {
      return this.height * this.scaleY;
    }
    dispose = vi.fn();
    setCoords() {}
    setControlsVisibility() {}
    set(values: Record<string, unknown>) {
      globalThis.Object.assign(this, values);
      return this;
    }
    getBoundingRect() {
      return { left: 0, top: 0, width: 10, height: 10 };
    }
  }
  class MockCanvas {
    static instance: MockCanvas;
    upperCanvasEl = { setAttribute: vi.fn() };
    viewportTransform = [1, 0, 0, 1, 0, 0];
    objects: Object[] = [];
    active?: Object;
    clipPath?: Object;
    constructor() {
      MockCanvas.instance = this;
    }
    listeners = new Map<string, (event: { target: Object }) => void>();
    on(name: string, callback: (event: { target: Object }) => void) {
      this.listeners.set(name, callback);
    }
    getObjects() {
      return this.objects;
    }
    getActiveObject() {
      return this.active;
    }
    setActiveObject(object: Object) {
      this.active = object;
    }
    discardActiveObject() {
      this.active = undefined;
    }
    requestRenderAll() {}
    getWidth() {
      return 100;
    }
    getHeight() {
      return 100;
    }
    setDimensions() {}
    setViewportTransform(value: number[]) {
      this.viewportTransform = value;
    }
    add(...objects: Object[]) {
      this.objects.push(...objects);
    }
    clear() {
      this.objects = [];
      this.active = undefined;
    }
    dispose() {}
  }
  return {
    Canvas: MockCanvas,
    FabricObject: Object,
    Path: Object,
    Point: class {},
    FabricImage: { fromURL: vi.fn() },
  };
});
vi.mock("../packages/fabric/node_modules/fabric/dist/index.min.mjs", () => mocks);
vi.mock("../packages/fabric/src/manipulation.js", () => ({
  styleControls() {},
  nearestGuide() {},
}));
vi.mock("../packages/fabric/src/text-geometry.js", () => ({ outlineTextPath: vi.fn() }));
const node = () => ({
  style: {},
  classList: { add() {} },
  append() {},
  remove() {},
  setAttribute() {},
  replaceChildren() {},
  clientWidth: 100,
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("selection preserves loaded objects and latest selection survives an async render", async () => {
  vi.stubGlobal("document", { createElement: node, createElementNS: node });
  vi.stubGlobal("getComputedStyle", () => ({ position: "relative" }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const { Path, Canvas, FabricImage } = mocks;
  const options: DocumentCanvasOptions = {
    product: {
      id: "p",
      name: "P",
      revision: "1",
      sides: [
        {
          id: "s",
          name: "S",
          areas: [
            {
              id: "a",
              name: "A",
              width: 50,
              height: 30,
              mode: "freeform",
              production: "print",
              allowedElements: ["image"],
            },
          ],
        },
      ],
    },
    document: {
      schemaVersion: 1,
      productId: "p",
      revision: "1",
      assets: {
        file: {
          id: "file",
          url: "photo.png",
          mimeType: "image/png",
          width: 100,
          height: 100,
          durable: true,
        },
      },
      areas: {
        a: [
          {
            id: "first",
            type: "image",
            assetId: "file",
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            rotation: 0,
          },
          {
            id: "second",
            type: "image",
            assetId: "file",
            x: 10,
            y: 0,
            width: 10,
            height: 10,
            rotation: 0,
          },
        ],
      },
    },
    areaId: "a",
    selectedId: "first",
    onSelect: vi.fn(),
    onTransform: vi.fn(),
    onError: vi.fn(),
  };
  vi.mocked(FabricImage.fromURL).mockImplementation(async () => new Path() as never);
  const handle = mountDocumentCanvas(node() as unknown as HTMLElement, options);
  await vi.waitFor(() => expect(FabricImage.fromURL).toHaveBeenCalledTimes(2));
  await Promise.resolve();
  const canvas = (Canvas as unknown as { instance: { objects: unknown[]; active: unknown } })
    .instance;
  const objects = [...canvas.objects];
  const first = Canvas.instance.objects[0]!;
  first.left += 10;
  Canvas.instance.listeners.get("object:modified")!({ target: first });
  expect(options.onTransform).toHaveBeenCalledWith("first", { x: 1 });
  vi.mocked(options.onTransform).mockReturnValueOnce(false);
  first.left += 10;
  Canvas.instance.listeners.get("object:modified")!({ target: first });
  expect(first.left).toBe(50);

  handle.setAriaLabel("Obszar projektu");
  expect(Canvas.instance.upperCanvasEl.setAttribute).toHaveBeenLastCalledWith(
    "aria-label",
    "Obszar projektu",
  );
  expect(canvas.objects).toEqual(objects);
  expect(FabricImage.fromURL).toHaveBeenCalledTimes(2);

  handle.setSelection("second");
  expect(canvas.active).toBe(objects[1]);
  handle.setSelection(null);
  expect(canvas.active).toBeUndefined();
  expect(FabricImage.fromURL).toHaveBeenCalledTimes(2);
  expect(options.onSelect).not.toHaveBeenCalled();
  let resolve!: (value: never) => void;
  vi.mocked(FabricImage.fromURL).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const render = handle.render(options);
  handle.setSelection("second");
  resolve(new Path() as never);
  await render;
  expect(canvas.active).toBe(canvas.objects[1]);
  expect(objects).not.toEqual(canvas.objects);
  for (const object of objects)
    expect((object as { dispose: () => void }).dispose).toHaveBeenCalledOnce();
  expect(options.onError).not.toHaveBeenCalled();
  handle.dispose();
});

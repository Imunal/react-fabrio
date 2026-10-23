import { afterEach, expect, test, vi } from "vitest";
import { mountMugPreview } from "../packages/three/src/index.js";

const renderer = vi.hoisted(() => ({
  domElement: {
    setAttribute: vi.fn(),
    style: {},
    addEventListener() {},
    removeEventListener() {},
    remove() {},
  },
  setPixelRatio() {},
  setSize() {},
  render: vi.fn(),
  dispose() {},
}));
vi.mock("../packages/three/node_modules/three/build/three.module.js", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  WebGLRenderer: class {
    constructor() {
      return renderer;
    }
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("changes the mug label while retaining the current view", async () => {
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const container = { append() {}, clientWidth: 400, clientHeight: 400 } as unknown as HTMLElement;
  const preview = await mountMugPreview(container, { ariaLabel: "Preview in English" });
  expect(renderer.domElement.setAttribute).toHaveBeenCalledWith("aria-label", "Preview in English");
  preview!.setRotation(1.2);
  const renderCount = renderer.render.mock.calls.length;
  preview!.setAriaLabel("Podgląd kubka");
  expect(renderer.domElement.setAttribute).toHaveBeenLastCalledWith("aria-label", "Podgląd kubka");
  expect(renderer.render).toHaveBeenCalledTimes(renderCount);
  preview!.dispose();
});

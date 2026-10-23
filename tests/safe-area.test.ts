import { mugProduct } from "../packages/core/src/examples.js";
import { expect, test } from "vitest";
import { getDesignIssues, createDesignDocument } from "../packages/core/src/index.js";
import type { DecorationArea, VectorElement } from "../packages/core/src/index.js";
import { createEditorSession } from "../packages/core/src/session.js";
const element: VectorElement = {
  id: "v",
  type: "vector",
  path: "M0 0H1V1H0Z",
  color: "#000",
  x: 5,
  y: 5,
  width: 10,
  height: 10,
  rotation: 0,
};
const productFor = (patch: Partial<DecorationArea> = {}) => {
  const product = structuredClone(mugProduct);
  Object.assign(product.sides[0]!.areas[0]!, { width: 100, height: 100, safeMargin: 3 }, patch);
  return product;
};
test("freeform overflow is preserved and reports a nonblocking safe-area warning", () => {
  const product = productFor();
  const session = createEditorSession(product);
  session.add(element);
  session.update({ kind: "geometry", changes: { x: -20 } });
  expect(session.getSelected()?.x).toBe(-20);
  expect(getDesignIssues(session.getSnapshot().document, product)).toContainEqual(
    expect.objectContaining({ code: "outside-safe-area", severity: "warning" }),
  );
});
test("safe-area constraints reject numeric movement, resize and rotation", () => {
  const session = createEditorSession(productFor({ constrainToSafeArea: true }));
  session.add(element);
  for (const patch of [{ x: -1 }, { width: 100 }, { rotation: 45, x: 3, y: 3 }]) {
    const before = session.getSelected();
    session.update({ kind: "geometry", changes: patch });
    expect(session.getSelected()).toEqual(before);
  }
});
test("legacy overflow opens intact, can be corrected and then cannot leave again", () => {
  const product = productFor({ constrainToSafeArea: true });
  const design = createDesignDocument(product);
  design.areas.wrap = [{ ...element, x: -10 }];
  const session = createEditorSession(product, design);
  expect(session.getSnapshot().document).toEqual(design);
  expect(getDesignIssues(design, product)).toContainEqual(
    expect.objectContaining({ code: "outside-safe-area", severity: "error" }),
  );
  session.select("v");
  session.update({ kind: "geometry", changes: { x: -5 } });
  expect(session.getSelected()?.x).toBe(-5);
  session.update({ kind: "geometry", changes: { x: 5 } });
  session.update({ kind: "geometry", changes: { x: -5 } });
  expect(session.getSelected()?.x).toBe(5);
});
test.each([
  { type: "ellipse" as const },
  { type: "path" as const, path: "M0 0H100V100H60V40H40V100H0Z" },
  { type: "path" as const, path: "M0 0H100V100H0Z M40 40V60H60V40Z" },
])("constraints account for curved boundaries, concavities and holes: $type", (boundary) => {
  const product = productFor({ boundary, constrainToSafeArea: true });
  const design = createDesignDocument(product);
  design.areas.wrap = [{ ...element, x: 35, y: 35, width: 30, height: 30 }];
  if (boundary.type === "ellipse") design.areas.wrap = [{ ...element, x: 3, y: 3 }];
  expect(getDesignIssues(design, product)).toContainEqual(
    expect.objectContaining({ code: "outside-safe-area" }),
  );
});

test("a rectangle enclosing a hole is outside even when all four corners are safe", () => {
  const p = productFor({
    boundary: { type: "path", path: "M0 0H100V100H0Z M45 45V55H55V45Z" },
    constrainToSafeArea: true,
  });
  const d = createDesignDocument(p);
  d.areas.wrap = [{ ...element, x: 30, y: 30, width: 40, height: 40 }];
  expect(getDesignIssues(d, p)).toContainEqual(
    expect.objectContaining({ code: "outside-safe-area" }),
  );
});
test("new content fits proportionally, duplicates stay safe and history restores geometry", () => {
  const p = productFor({ boundary: { type: "ellipse" }, constrainToSafeArea: true });
  const s = createEditorSession(p);
  s.add({ ...element, x: -50, width: 180, height: 90 });
  const placed = s.getSelected()!;
  expect(placed.width / placed.height).toBeCloseTo(2);
  expect(
    getDesignIssues(s.getSnapshot().document, p).filter((i) => i.code === "outside-safe-area"),
  ).toEqual([]);
  s.duplicate();
  expect(s.getSnapshot().document.areas.wrap).toHaveLength(2);
  expect(
    getDesignIssues(s.getSnapshot().document, p).filter((i) => i.code === "outside-safe-area"),
  ).toEqual([]);
  s.undo();
  expect(s.getSnapshot().document.areas.wrap).toEqual([placed]);
});

test("new content fits a small offset SVG region inside a much larger decoration area", () => {
  const p = productFor({
    safeMargin: 0,
    boundary: { type: "path", path: "M1 1H2V2H1Z" },
    constrainToSafeArea: true,
  });
  const s = createEditorSession(p);
  s.add({ ...element, x: 0, y: 0, width: 1, height: 1 });
  expect(s.getSelected()).toBeDefined();
  expect(
    getDesignIssues(s.getSnapshot().document, p).filter((i) => i.code === "outside-safe-area"),
  ).toEqual([]);
});

test("large SVG arcs do not admit rectangles outside the true circle", async () => {
  const { isInsideSafeArea } = await import("../packages/core/src/safe-area.js");
  const p = productFor({
    width: 2000,
    height: 2000,
    safeMargin: 0,
    boundary: {
      type: "path",
      path: "M0 1000 A1000 1000 0 1 1 2000 1000 A1000 1000 0 1 1 0 1000 Z",
    },
  });
  const angle = Math.PI / 8;
  const tiny = {
    ...element,
    x: 1000 + 1000.02 * Math.cos(angle),
    y: 1000 + 1000.02 * Math.sin(angle),
    width: 0.001,
    height: 0.001,
  };
  expect(isInsideSafeArea(p.sides[0]!.areas[0]!, tiny)).toBe(false);
  expect(
    isInsideSafeArea(p.sides[0]!.areas[0]!, {
      ...tiny,
      x: 1000 + 999.98 * Math.cos(angle),
      y: 1000 + 999.98 * Math.sin(angle),
    }),
  ).toBe(true);
});

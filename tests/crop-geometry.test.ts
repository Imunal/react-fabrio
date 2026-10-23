import { expect, test } from "vitest";
import { fitImageCrop, zoomImageCrop, panImageCrop } from "../packages/ui/src/crop-geometry.js";

test("fit covers a fixed frame without distorting the source", () => {
  expect(fitImageCrop(200, 100, 50, 50)).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 });
  expect(fitImageCrop(100, 200, 50, 50)).toEqual({ x: 0, y: 0.25, width: 1, height: 0.5 });
});
test("zoom preserves center and clamps the source bounds", () => {
  const base = fitImageCrop(200, 100, 50, 50);
  expect(zoomImageCrop(base, base, 2)).toEqual({ x: 0.375, y: 0.25, width: 0.25, height: 0.5 });
  const zoomed = { x: 0.75, y: 0.5, width: 0.25, height: 0.5 };
  expect(zoomImageCrop(zoomed, base, 1)).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
});
test("pan maps screen motion through rotation and mirroring", () => {
  const crop = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
  const frame = { width: 100, height: 100, rotation: 0, flipX: false, flipY: false };
  expect(panImageCrop(crop, 20, 0, frame).x).toBeCloseTo(0.15);
  expect(panImageCrop(crop, 20, 0, { ...frame, flipX: true }).x).toBeCloseTo(0.35);
  expect(panImageCrop(crop, 20, 0, { ...frame, rotation: 90 }).y).toBeCloseTo(0.35);
  expect(panImageCrop(crop, 1000, -1000, frame)).toEqual({ x: 0, y: 0.5, width: 0.5, height: 0.5 });
});

import svgpath from "svgpath";
import {
  union,
  difference,
  inflatePaths,
  areaPaths,
  area as polygonArea,
  FillRule,
  JoinType,
  EndType,
} from "clipper2-ts";
import type { Paths64, Point64 } from "clipper2-ts";
import type { DecorationArea, DesignElement } from "./contracts.js";

/** Millimeters. Curves are flattened below this tolerance, then inset conservatively. */
export const SAFE_AREA_TOLERANCE = 0.01;
const SCALE = 10000;
const FLATNESS = SAFE_AREA_TOLERANCE / 4;
const point = (x: number, y: number) => ({ x: Math.round(x * SCALE), y: Math.round(y * SCALE) });
const cache = new WeakMap<
  DecorationArea,
  { key: string; boundary: Paths64; safe: Paths64; bleed: Paths64 }
>();
const flattenCurve = (points: Point64[], output: Point64[], depth = 0) => {
  const a = points[0]!,
    b = points.at(-1)!;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const deviation = Math.max(
    ...points
      .slice(1, -1)
      .map((p) =>
        length
          ? Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length
          : Math.hypot(p.x - a.x, p.y - a.y),
      ),
  );
  // Also bound control-polygon length: collinear curves can double back.
  const polygonLength = points
    .slice(1)
    .reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0);
  if (depth >= 24 || (deviation <= FLATNESS && polygonLength - length <= FLATNESS)) {
    output.push(point(b.x, b.y));
    return;
  }
  const left = [a],
    right = [b];
  let row = points;
  while (row.length > 1) {
    row = row.slice(1).map((p, i) => ({ x: (row[i]!.x + p.x) / 2, y: (row[i]!.y + p.y) / 2 }));
    left.push(row[0]!);
    right.unshift(row.at(-1)!);
  }
  flattenCurve(left, output, depth + 1);
  flattenCurve(right, output, depth + 1);
};
// Sample SVG endpoint arcs directly: cubic arc approximations can exceed 0.01 mm on large products.
const flattenArc = (x: number, y: number, values: number[], output: Point64[]) => {
  let [rx, ry] = values.map(Math.abs) as [number, number];
  const [, , degrees, large, sweep, endX, endY] = values as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  if (x === endX && y === endY) return;
  if (!rx || !ry) {
    output.push(point(endX, endY));
    return;
  }
  const angle = (degrees * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const dx = (x - endX) / 2,
    dy = (y - endY) / 2;
  const px = c * dx + s * dy,
    py = -s * dx + c * dy;
  const factor = Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry));
  if (factor > 1) {
    rx *= factor;
    ry *= factor;
  }
  const numerator = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
  const denominator = rx * rx * py * py + ry * ry * px * px;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator));
  const localX = (k * rx * py) / ry,
    localY = (-k * ry * px) / rx;
  const centerX = c * localX - s * localY + (x + endX) / 2;
  const centerY = s * localX + c * localY + (y + endY) / 2;
  const start = Math.atan2((py - localY) / ry, (px - localX) / rx);
  let delta = Math.atan2((-py - localY) / ry, (-px - localX) / rx) - start;
  if (sweep && delta < 0) delta += Math.PI * 2;
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  const count = Math.max(
    1,
    Math.ceil(Math.abs(delta) / (2 * Math.acos(1 - Math.min(FLATNESS / Math.max(rx, ry), 1)))),
  );
  for (let i = 1; i <= count; i++) {
    const t = start + (delta * i) / count;
    output.push(
      i === count
        ? point(endX, endY)
        : point(
            centerX + c * rx * Math.cos(t) - s * ry * Math.sin(t),
            centerY + s * rx * Math.cos(t) + c * ry * Math.sin(t),
          ),
    );
  }
};
const boundaryPaths = (area: DecorationArea): Paths64 => {
  if (area.boundary?.type === "ellipse") {
    const radius = Math.max(area.width, area.height) / 2;
    const count = Math.max(32, Math.ceil(Math.PI / Math.acos(1 - Math.min(FLATNESS / radius, 1))));
    return [
      Array.from({ length: count }, (_, i) =>
        point(
          (area.width / 2) * (1 + Math.cos((i * 2 * Math.PI) / count)),
          (area.height / 2) * (1 + Math.sin((i * 2 * Math.PI) / count)),
        ),
      ),
    ];
  }
  if (area.boundary?.type !== "path")
    return [
      [point(0, 0), point(area.width, 0), point(area.width, area.height), point(0, area.height)],
    ];
  const paths: Paths64 = [];
  let current: Point64[] = [];
  svgpath(area.boundary.path ?? "")
    .abs()
    .unshort()
    .iterate((segment, _index, x, y) => {
      const command = segment[0];
      if (command === "M") {
        current = [point(segment[1], segment[2])];
        paths.push(current);
      } else if (command === "L") current.push(point(segment[1], segment[2]));
      else if (command === "H") current.push(point(segment[1], y));
      else if (command === "V") current.push(point(x, segment[1]));
      else if (command === "C")
        flattenCurve(
          [
            { x, y },
            { x: segment[1], y: segment[2] },
            { x: segment[3], y: segment[4] },
            { x: segment[5], y: segment[6] },
          ],
          current,
        );
      else if (command === "A") flattenArc(x, y, segment.slice(1) as number[], current);
      else if (command === "Q")
        flattenCurve(
          [
            { x, y },
            { x: segment[1], y: segment[2] },
            { x: segment[3], y: segment[4] },
          ],
          current,
        );
    });
  return union(
    paths.filter((path) => path.length >= 3),
    FillRule.NonZero,
  );
};
const geometry = (area: DecorationArea) => {
  const key = JSON.stringify([area.width, area.height, area.boundary, area.safeMargin, area.bleed]);
  const saved = cache.get(area);
  if (saved?.key === key) return saved;
  const boundary = boundaryPaths(area);
  const offset = (amount: number) =>
    inflatePaths(boundary, amount * SCALE, JoinType.Round, EndType.Polygon, 2, FLATNESS * SCALE);
  const result = {
    key,
    boundary,
    safe: offset(
      -(
        (area.safeMargin ?? 0) +
        (area.boundary?.type && area.boundary.type !== "rectangle" ? SAFE_AREA_TOLERANCE : 0)
      ),
    ),
    bleed: offset(area.bleed ?? 0),
  };
  cache.set(area, result);
  return result;
};
/**
 * Calculates the element's rotated rectangular footprint.
 *
 * @param element - Geometry in millimeters, with rotation in degrees about its center.
 * @returns Four corners in the internal scaled integer coordinate system used by Clipper.
 */
export const elementRectangle = (element: DesignElement): Point64[] => {
  const angle = (element.rotation * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const x = (sx! * element.width) / 2,
      y = (sy! * element.height) / 2;
    return point(
      element.x + element.width / 2 + x * c - y * s,
      element.y + element.height / 2 + x * s + y * c,
    );
  });
};
/**
 * Tests whether the entire rotated element rectangle fits within the safe boundary.
 *
 * @param area - Physical boundary and safe margin; holes use the nonzero fill rule.
 * @param element - Element geometry in millimeters and degrees.
 * @returns Whether the footprint fits; nonfinite or nonpositive geometry returns `false`.
 */
export const isInsideSafeArea = (area: DecorationArea, element: DesignElement): boolean => {
  if (
    ![element.x, element.y, element.width, element.height, element.rotation].every(
      Number.isFinite,
    ) ||
    element.width <= 0 ||
    element.height <= 0
  )
    return false;
  return (
    Math.abs(
      areaPaths(difference([elementRectangle(element)], geometry(area).safe, FillRule.NonZero)),
    ) < 1
  );
};
/**
 * Checks whether an edit respects the area's safe-area constraint.
 *
 * @param area - Area containing the element and its constraint setting.
 * @param before - Geometry before the proposed edit.
 * @param after - Proposed geometry.
 * @returns `true` for unconstrained areas or already-invalid elements; an element
 * that currently fits must remain inside the safe area.
 */
export const permitsSafeAreaTransform = (
  area: DecorationArea,
  before: DesignElement,
  after: DesignElement,
) => !area.constrainToSafeArea || !isInsideSafeArea(area, before) || isInsideSafeArea(area, after);

/**
 * Fits new content into a constrained safe area while preserving its aspect ratio.
 *
 * @param area - Boundary, safe margin and constraint setting for placement.
 * @param element - New element; text sizing scales with its rectangle when necessary.
 * @returns The original element if it already fits or constraints are disabled,
 * a repositioned/resized copy, or `undefined` if no placement is found.
 *
 * @remarks
 * Use only for new elements. Preserve existing geometry when reopening a design.
 */
export const placeInSafeArea = (
  area: DecorationArea,
  element: DesignElement,
): DesignElement | undefined => {
  if (!area.constrainToSafeArea || isInsideSafeArea(area, element)) return element;
  const angle = (element.rotation * Math.PI) / 180;
  const rotatedWidth =
    Math.abs(element.width * Math.cos(angle)) + Math.abs(element.height * Math.sin(angle));
  const rotatedHeight =
    Math.abs(element.width * Math.sin(angle)) + Math.abs(element.height * Math.cos(angle));
  // Search each connected safe region locally, so small offset islands are not missed.
  const regions = geometry(area)
    .safe.filter((path) => polygonArea(path) > 0)
    .map((path) => ({
      left: Math.min(...path.map((p) => p.x)) / SCALE,
      right: Math.max(...path.map((p) => p.x)) / SCALE,
      top: Math.min(...path.map((p) => p.y)) / SCALE,
      bottom: Math.max(...path.map((p) => p.y)) / SCALE,
    }));
  const positions = [10, ...Array.from({ length: 21 }, (_, i) => i).filter((i) => i !== 10)];
  for (const region of regions) {
    const initialScale = Math.min(
      1,
      (region.right - region.left) / rotatedWidth,
      (region.bottom - region.top) / rotatedHeight,
    );
    for (let scale = initialScale; scale >= initialScale * 0.01; scale *= 0.8) {
      const width = element.width * scale,
        height = element.height * scale;
      for (const row of positions)
        for (const col of positions) {
          const centerX =
            region.left +
            (rotatedWidth * scale) / 2 +
            ((region.right - region.left - rotatedWidth * scale) * col) / 20;
          const centerY =
            region.top +
            (rotatedHeight * scale) / 2 +
            ((region.bottom - region.top - rotatedHeight * scale) * row) / 20;
          const candidate = {
            ...element,
            width,
            height,
            x: centerX - width / 2,
            y: centerY - height / 2,
            ...(element.type === "text"
              ? {
                  fontSize: element.fontSize * scale,
                  ...(element.letterSpacing !== undefined
                    ? { letterSpacing: element.letterSpacing * scale }
                    : {}),
                }
              : {}),
          };
          if (isInsideSafeArea(area, candidate)) return candidate;
        }
    }
  }
  return undefined;
};
/**
 * Builds SVG paths for decoration-area guides using the validation geometry.
 *
 * @param area - Physical boundary, safe margin and bleed configuration.
 * @returns Boundary, safe-margin and bleed path data in millimeters.
 */
export const areaGuidePaths = (area: DecorationArea) => {
  const { boundary, safe, bleed } = geometry(area);
  const toPath = (paths: Paths64) =>
    paths
      .map(
        (path) =>
          path.map((p, i) => `${i ? "L" : "M"}${p.x / SCALE} ${p.y / SCALE}`).join(" ") + "Z",
      )
      .join(" ");
  return { boundary: toPath(boundary), safe: toPath(safe), bleed: toPath(bleed) };
};

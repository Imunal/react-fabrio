import type { DecorationArea, DesignElement } from "@react-fabrio/core";
export const escapeXml = (value: string) => {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!,
  );
};
export const validatePath = (path: string) => {
  if (!path.trim() || !/^[MmLlHhVvCcSsQqTtAaZz\d\s.,+eE-]+$/.test(path))
    throw new Error("Invalid vector path.");
  return path;
};
export const boundary = (area: DecorationArea, bleed = 0) => {
  const w = area.width + bleed * 2,
    h = area.height + bleed * 2;
  if (area.boundary?.type === "ellipse")
    return `<ellipse cx="${area.width / 2}" cy="${area.height / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  if (area.boundary?.type === "path") {
    if (bleed)
      throw new Error("Path boundaries with bleed require an explicitly expanded production path.");
    return `<path d="${validatePath(area.boundary.path ?? "")}"/>`;
  }
  return `<rect x="${-bleed}" y="${-bleed}" width="${w}" height="${h}"/>`;
};
export const transform = (element: DesignElement) => {
  return `translate(${element.x} ${element.y}) rotate(${element.rotation ?? 0} ${element.width / 2} ${element.height / 2})`;
};

export const vectorPath = async (element: Extract<DesignElement, { type: "vector" }>) => {
  const [{ Path }, { default: svgpath }] = await Promise.all([import("fabric"), import("svgpath")]);
  const shape = new Path(validatePath(element.path));
  if (!shape.width || !shape.height)
    throw new Error("Vector artwork must have nonzero width and height.");
  const left = shape.pathOffset.x - shape.width / 2,
    top = shape.pathOffset.y - shape.height / 2;
  return svgpath(element.path)
    .translate(-left, -top)
    .scale(element.width / shape.width, element.height / shape.height)
    .toString();
};

export const clipGeometry = async (path: string, boundaryPath: string): Promise<string> => {
  if (!path.trim()) return "";
  const [{ default: svgpath }, geometry] = await Promise.all([
    import("svgpath"),
    import("flo-boolean"),
  ]);
  const {
    boolean: operation,
    getPathsFromStr,
    beziersToSvgPathStr,
    getShapeArea,
    reverseShapeOrientation,
  } = geometry;
  const normalize = (data: string) => {
    let loops = getPathsFromStr(svgpath(data).unshort().unarc().abs().toString()).filter(
      (loop) => loop.length,
    );
    const largest = loops.reduce(
      (best, loop) => (Math.abs(getShapeArea(loop)) > Math.abs(getShapeArea(best)) ? loop : best),
      loops[0] ?? [],
    );
    if (largest.length && getShapeArea(largest) < 0) loops = loops.map(reverseShapeOrientation);
    return loops;
  };
  const shape = operation("OR", normalize(path));
  if (!shape.length) return "";
  // Intersect signed contours separately. A single winding-threshold AND loses
  // disconnected inner contours (for example the counter in an outlined "o").
  // The product of the two contour signs retains holes in either operand.
  const boundaryShape = operation("OR", normalize(boundaryPath));
  const intersections: typeof shape = [];
  for (const contour of shape) {
    const positive = getShapeArea(contour) >= 0;
    for (const edge of boundaryShape) {
      const edgePositive = getShapeArea(edge) >= 0;
      const parts = operation("AND", [
        positive ? contour : reverseShapeOrientation(contour),
        edgePositive ? edge : reverseShapeOrientation(edge),
      ]);
      intersections.push(
        ...(positive === edgePositive ? parts : parts.map(reverseShapeOrientation)),
      );
    }
  }
  const clipped = operation("OR", intersections);
  if (!clipped.length) return "";
  return svgpath(clipped.map(beziersToSvgPathStr).join(" ")).round(9).toString();
};

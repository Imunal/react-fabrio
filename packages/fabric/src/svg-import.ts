import { validatePath } from "./geometry.js";
/**
 * Validates SVG against the supported geometry-only subset.
 *
 * @param source - SVG markup containing supported elements and attributes.
 * @returns The original markup when it passes the restricted syntax checks.
 * @throws Error - If the markup is malformed or contains declarations, entities, external references,
 * unsupported tags or unsupported attributes.
 *
 * @remarks
 * Use `importSvgPath` to resolve transforms and enforce supported filled geometry.
 */
export const parseRestrictedSvg = (source: string): string => {
  if (/[&]|<!|<\?/.test(source)) throw new Error("SVG entities and declarations are prohibited.");
  const tags = new Set([
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "polygon",
    "polyline",
    "line",
  ]);
  const attributes = new Set([
    "xmlns",
    "viewBox",
    "width",
    "height",
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "d",
    "points",
    "transform",
    "fill",
    "stroke",
    "stroke-width",
    "fill-rule",
  ]);
  let consumed = "";
  for (const match of source.matchAll(/<\/?([a-zA-Z][\w:-]*)([^<>]*?)\/?\s*>/g)) {
    if (!tags.has(match[1])) throw new Error(`Unsupported SVG element: ${match[1]}`);
    let rest = match[2];
    for (const attribute of rest.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
      if (
        !attributes.has(attribute[1]) ||
        (/url\s*\(|javascript:|data:|https?:/i.test(attribute[3]) &&
          !(attribute[1] === "xmlns" && attribute[3] === "http://www.w3.org/2000/svg"))
      )
        throw new Error(`Unsupported SVG attribute: ${attribute[1]}`);
      rest = rest.replace(attribute[0], "");
    }
    if (rest.trim()) throw new Error("Malformed SVG attributes.");
    consumed += match[0];
  }
  if (
    source.replace(/<[^<>]*>/g, "").trim() ||
    source.replace(/\s/g, "") !== consumed.replace(/\s/g, "") ||
    !/^\s*<svg\b/.test(source) ||
    !/<\/svg>\s*$/.test(source)
  )
    throw new Error("Malformed geometry SVG.");
  return source;
};

/**
 * Converts supported filled SVG geometry into one path with transforms resolved.
 *
 * @param source - Restricted SVG markup with finite, unitless geometry coordinates.
 * @returns Combined SVG path data in the source coordinate system.
 * @throws Error - If markup is unsafe, malformed or empty, or uses unsupported geometry
 * such as strokes, open lines, nested SVG viewports or even-odd fills.
 */
export const importSvgPath = async (source: string): Promise<string> => {
  parseRestrictedSvg(source);
  const { default: svgpath } = await import("svgpath");
  const stack: { name: string; transform: string; fill: string }[] = [];
  const paths: string[] = [];
  for (const token of source.matchAll(/<(\/?)([\w]+)([^<>]*?)\s*(\/?)>/g)) {
    const [, closing, name, raw, selfClosing] = token;
    if (closing) {
      if (stack.pop()?.name !== name) throw new Error("Unbalanced SVG elements.");
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const attribute of raw.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))
      attrs[attribute[1]] = attribute[3];
    const n = (key: string, fallback = 0) => {
      const value = attrs[key] === undefined ? fallback : Number(attrs[key]);
      if (!Number.isFinite(value))
        throw new Error("SVG geometry must use finite unitless coordinates.");
      return value;
    };
    if (name === "svg" && stack.length)
      throw new Error("Nested SVG viewports are unsupported; flatten artwork first.");
    if (attrs.stroke && attrs.stroke !== "none")
      throw new Error("Convert stroked artwork to filled outlines before importing.");
    if (attrs["fill-rule"] && attrs["fill-rule"] !== "nonzero")
      throw new Error("Convert even-odd fills to nonzero outlined paths before importing.");
    const fill = attrs.fill ?? stack.at(-1)?.fill ?? "black";
    const own = attrs.transform ?? "";
    if (
      own &&
      !/^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([\d\s.,+eE-]+\)\s*)+$/.test(own)
    )
      throw new Error("Invalid SVG transform.");
    // SVG transform lists multiply right-to-left. Ancestors precede descendants.
    const transform = stack.map((parent) => parent.transform).join(" ") + " " + own;
    let path = "";
    if (name === "path") path = validatePath(attrs.d ?? "");
    if (name === "rect") {
      const x = n("x"),
        y = n("y"),
        w = n("width"),
        h = n("height"),
        rx = Math.min(n("rx", n("ry")), w / 2),
        ry = Math.min(n("ry", rx), h / 2);
      path =
        rx || ry
          ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
          : `M${x} ${y}h${w}v${h}h${-w}Z`;
    }
    if (name === "circle" || name === "ellipse") {
      const x = n("cx"),
        y = n("cy"),
        rx = n(name === "circle" ? "r" : "rx"),
        ry = n(name === "circle" ? "r" : "ry");
      path = `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
    }
    if (name === "line") path = `M${n("x1")} ${n("y1")}L${n("x2")} ${n("y2")}`;
    if (name === "polygon" || name === "polyline") {
      if (!attrs.points || !/^[\d\s.,+eE-]+$/.test(attrs.points))
        throw new Error("Invalid SVG points.");
      const numbers = attrs.points
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      if (numbers.length < 4 || numbers.length % 2 || numbers.some((v) => !Number.isFinite(v)))
        throw new Error("Invalid SVG points.");
      path = `M${numbers[0]} ${numbers[1]}`;
      for (let index = 2; index < numbers.length; index += 2)
        path += `L${numbers[index]} ${numbers[index + 1]}`;
      if (name === "polygon") path += "Z";
    }
    if (path) {
      if (name === "line" || name === "polyline")
        throw new Error("Open stroked artwork must be converted to filled outlines.");
      if (fill !== "none" && fill !== "transparent") {
        const parsed = svgpath(path).transform(transform).unshort().unarc().abs();
        if ("err" in parsed && parsed.err) throw new Error(String(parsed.err));
        paths.push(parsed.toString());
      }
    }
    if (!selfClosing) stack.push({ name, transform: own, fill });
  }
  if (stack.length || !paths.length) throw new Error("SVG must contain filled geometry.");
  return paths.join(" ");
};

import { SaxesParser } from "saxes";
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
  readRestrictedSvg(source);
  return source;
};

type SvgToken = { name: string; attributes: Record<string, string>; closing: boolean };

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
const isWhitespace = (char: string | undefined): boolean =>
  char === " " || char === "\t" || char === "\r" || char === "\n";

// Parse once for validation and import. SAX checks the entire XML document,
// including tag balance, attribute quoting/duplicates and the single root.
const readRestrictedSvg = (source: string): SvgToken[] => {
  if (source.includes("&") || source.includes("<!") || source.includes("<?"))
    throw new Error("SVG entities and declarations are prohibited.");
  const tokens: SvgToken[] = [];
  const parser = new SaxesParser({ xmlns: false });
  parser.on("error", (error) => {
    throw new Error(`Unbalanced or malformed SVG: ${error.message}`);
  });
  parser.on("text", (text) => {
    for (const char of text) if (!isWhitespace(char)) throw new Error("SVG must not contain text.");
  });
  parser.on("opentag", (tag) => {
    if (!tags.has(tag.name)) throw new Error(`Unsupported SVG element: ${tag.name}`);
    if (!tokens.length && tag.name !== "svg") throw new Error("SVG requires an svg root.");
    for (const [name, value] of Object.entries(tag.attributes)) {
      if (
        !attributes.has(name) ||
        (name === "xmlns" && value !== "http://www.w3.org/2000/svg") ||
        (/url\s*\(|javascript:|data:|https?:/i.test(value) && name !== "xmlns")
      )
        throw new Error(`Unsupported SVG attribute: ${name}`);
    }
    tokens.push({ name: tag.name, attributes: tag.attributes, closing: false });
  });
  parser.on("closetag", (tag) => {
    tokens.push({ name: tag.name, attributes: {}, closing: true });
  });
  parser.write(source).close();
  return tokens;
};

// A single cursor consumes each transform name, separator and finite SVG number.
// Validate arity before svgpath, whose transform parser otherwise ignores errors.
const parseTransform = (source: string): string => {
  const commands: string[] = [];
  let index = 0;
  const fail = (): never => {
    throw new Error("Invalid SVG transform.");
  };
  const whitespace = () => {
    while (isWhitespace(source[index])) index++;
  };
  const digit = (char: string | undefined) => char !== undefined && char >= "0" && char <= "9";
  whitespace();
  while (index < source.length) {
    const start = index;
    while (source[index] && /[a-zA-Z]/.test(source[index])) index++;
    const name = source.slice(start, index);
    const arities: Record<string, number[]> = {
      matrix: [6],
      translate: [1, 2],
      scale: [1, 2],
      rotate: [1, 3],
      skewX: [1],
      skewY: [1],
    };
    if (!Object.hasOwn(arities, name)) fail();
    whitespace();
    if (source[index++] !== "(") fail();
    whitespace();
    const numbers: number[] = [];
    while (source[index] !== ")") {
      const numberStart = index;
      if (source[index] === "+" || source[index] === "-") index++;
      let digits = 0;
      while (digit(source[index])) {
        index++;
        digits++;
      }
      if (source[index] === ".") {
        index++;
        while (digit(source[index])) {
          index++;
          digits++;
        }
      }
      if (!digits) fail();
      if (source[index] === "e" || source[index] === "E") {
        index++;
        if (source[index] === "+" || source[index] === "-") index++;
        const exponentStart = index;
        while (digit(source[index])) index++;
        if (index === exponentStart) fail();
      }
      const value = Number(source.slice(numberStart, index));
      if (!Number.isFinite(value)) fail();
      numbers.push(value);
      const separatorStart = index;
      whitespace();
      if (source[index] === ")") break;
      if (source[index] === ",") {
        index++;
        whitespace();
      } else if (index === separatorStart) fail();
      if (source[index] === ")") fail();
    }
    if (!arities[name].includes(numbers.length)) fail();
    commands.push(`${name}(${numbers.join(" ")})`);
    index++;
    whitespace();
    if (source[index] === ",") {
      index++;
      whitespace();
      if (index === source.length) fail();
    }
  }
  if (source.length && !commands.length) fail();
  return commands.join(" ");
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
  const tokens = readRestrictedSvg(source);
  const { default: svgpath } = await import("svgpath");
  const stack: { name: string; transform: string; fill: string }[] = [];
  const paths: string[] = [];
  for (const { name, attributes: attrs, closing } of tokens) {
    if (closing) {
      stack.pop();
      continue;
    }
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
    const own = parseTransform(attrs.transform ?? "");
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
        parsed.iterate((segment) => {
          for (const value of segment)
            if (typeof value === "number" && !Number.isFinite(value))
              throw new Error("SVG geometry must use finite coordinates after transforms.");
        });
        paths.push(parsed.toString());
      }
    }
    stack.push({ name, transform: own, fill });
  }
  if (stack.length || !paths.length) throw new Error("SVG must contain filled geometry.");
  return paths.join(" ");
};

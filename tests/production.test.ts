import { printPixelDimensions } from "../packages/core/src/index.js";
import { afterEach, expect, test, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  outlineTextPath,
  addPngResolution,
  exportEngravingArea,
  importSvgPath,
  parseRestrictedSvg,
} from "../packages/fabric/src/index.js";
import type { DecorationArea, TextElement, VectorElement } from "../packages/core/src/index.js";

const area: DecorationArea = {
  id: "tag",
  name: "Tag",
  width: 60,
  height: 35,
  production: "engraving",
  mode: "freeform",
  allowedElements: ["text", "vector"],
};
const vector: VectorElement = {
  id: "star",
  type: "vector",
  x: 2,
  y: 3,
  width: 10,
  height: 10,
  rotation: 30,
  path: "M0 0L10 0L5 10Z",
  color: "#ff0000",
};
const text: TextElement = {
  id: "name",
  type: "text",
  x: 1,
  y: 1,
  width: 58,
  height: 20,
  rotation: 0,
  text: "Zażółć gęślą jaźń",
  fontId: "sans",
  fontSize: 4,
  color: "#000000",
};
const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const fontUrl = new URL("../apps/playground/public/fonts/FabrioSans.ttf", import.meta.url);

afterEach(() => vi.restoreAllMocks());

test.each([
  { dpi: 300, bleed: 0, expected: { width: 300, height: 600 } },
  { dpi: 600, bleed: 2, expected: { width: 695, height: 1295 } },
])(
  "rounds physical pixel dimensions up at $dpi DPI with $bleed mm bleed",
  ({ dpi, bleed, expected }) => {
    // given
    const width = 25.4;
    const height = 50.8;

    // when
    const dimensions = printPixelDimensions(width, height, dpi, bleed);

    // then
    expect(dimensions).toEqual(expected);
  },
);

test.each([
  { width: 60, height: 35, dpi: 299 },
  { width: -1, height: 35, dpi: 300 },
])("rejects invalid print dimensions %#", ({ width, height, dpi }) => {
  // given
  const dimensions = { width, height, dpi };

  // when
  const exportSize = () =>
    printPixelDimensions(dimensions.width, dimensions.height, dimensions.dpi);

  // then
  expect(exportSize).toThrow();
});

test("PNG export metadata records physical pixel density", () => {
  // given
  const dpi = 600;

  // when
  const result = addPngResolution(png, dpi);
  const bytes = Buffer.from(result);
  const position = bytes.indexOf("pHYs");

  // then
  expect(result.length).toBe(png.length + 21);
  expect(position).toBe(37);
  expect(bytes.readUInt32BE(position + 4)).toBe(23622);
  expect(bytes.readUInt32BE(position + 8)).toBe(23622);
  expect(bytes[position + 12]).toBe(1);
  expect(bytes.subarray(position + 17)).toEqual(Buffer.from(png.subarray(33)));
});

test("updating PNG resolution replaces the existing metadata", () => {
  // given
  const original = addPngResolution(png, 600);

  // when
  const updated = addPngResolution(original, 300);
  const bytes = Buffer.from(updated);

  // then
  expect(updated.length).toBe(original.length);
  expect(bytes.readUInt32BE(bytes.indexOf("pHYs") + 4)).toBe(11811);
});

test("rejects an invalid PNG signature", () => {
  // given
  const invalid = new Uint8Array(8);

  // when
  const update = () => addPngResolution(invalid, 300);

  // then
  expect(update).toThrow("signature");
});

test("rejects truncated PNG chunks", () => {
  // given
  const truncated = png.subarray(0, 30);

  // when
  const update = () => addPngResolution(truncated, 300);

  // then
  expect(update).toThrow("Truncated");
});

test("engraving produces physical monochrome vector geometry", async () => {
  // given
  const elements = [vector];

  // when
  const blob = await exportEngravingArea(area, elements);
  const svg = await blob.text();

  // then
  expect(blob.type).toBe("image/svg+xml");
  expect(svg).toContain('width="60mm" height="35mm"');
  expect(svg).toContain('fill="black"');
  expect(svg).toContain("<path");
  expect(svg).not.toMatch(/<text|<image|#ff0000|href|clipPath|transform=/);
});

test("engraving rejects raster images", async () => {
  // given
  const image = { ...vector, type: "image" as const, assetId: "photo" };

  // when
  const output = exportEngravingArea(area, [image]);

  // then
  await expect(output).rejects.toThrow("Raster");
});

test("accepts restricted geometry SVG", () => {
  // given
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>';

  // when
  const parsed = parseRestrictedSvg(svg);

  // then
  expect(parsed).toBe(svg);
});

test.each([
  "<svg><script>alert(1)</script></svg>",
  '<svg><image href="https://example.com/a.png"/></svg>',
  "<svg><text>Hello</text></svg>",
  '<svg><path d="M0 0" onload="alert(1)"/></svg>',
  '<svg><path fill="url(https://example.com/x)" d="M0 0"/></svg>',
  '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
  "<svg><foreignObject/></svg>",
  '<svg><path style="fill:red"/></svg>',
])("rejects unsafe SVG %#", (svg) => {
  // given
  const source = svg;

  // when
  const parse = () => parseRestrictedSvg(source);

  // then
  expect(parse).toThrow();
});

test("SVG imports flatten nested transforms into path data", async () => {
  // given
  const source =
    '<svg viewBox="0 0 20 20"><g transform="translate(2 3)"><path transform="scale(2)" d="M0 0L5 0L0 5Z"/></g></svg>';

  // when
  const path = await importSvgPath(source);

  // then
  expect(path).toBe("M2 3L12 3 2 13Z");
});

test("SVG imports convert rectangles to paths", async () => {
  // given
  const source = '<svg><rect x="2" y="3" width="10" height="5"/></svg>';

  // when
  const path = await importSvgPath(source);

  // then
  expect(path).toContain("M2 3");
});

test("SVG imports reject unbalanced tags", async () => {
  // given
  const source = "<svg><g></svg>";

  // when
  const output = importSvgPath(source);

  // then
  await expect(output).rejects.toThrow("Unbalanced");
});

test("SVG imports require strokes to be outlined", async () => {
  // given
  const source = '<svg><path stroke="black" d="M0 0L1 1"/></svg>';

  // when
  const output = importSvgPath(source);

  // then
  await expect(output).rejects.toThrow("outlines");
});

test("Polish text exports as glyph outlines", async () => {
  // given
  const bytes = await readFile(fontUrl);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bytes));
  const fonts = [{ id: "sans", family: "Fabrio Sans", url: "/font.ttf" }];

  // when
  const output = await exportEngravingArea(area, [text], fonts);
  const svg = await output.text();

  // then
  expect(svg).toContain("<path");
  expect(svg).not.toMatch(/<text|clipPath|transform=|href=/);
  expect(svg).not.toContain("Zażółć");
});

test("engraving clips paths to the production boundary", async () => {
  // given
  const outside = {
    ...vector,
    x: -5,
    y: -5,
    width: 20,
    height: 20,
    rotation: 0,
    path: "M0 0H20V20H0Z",
  };

  // when
  const output = await exportEngravingArea(area, [outside]);
  const svg = await output.text();
  const path = svg.match(/d="([^"]+)"/)![1];
  const coordinates = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);

  // then
  expect(svg).not.toMatch(/clipPath|transform=/);
  expect(Math.min(...coordinates)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...coordinates)).toBeLessThanOrEqual(15);
});

test("font failures block production", async () => {
  // given
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));
  const fonts = [{ id: "sans", family: "Fabrio Sans", url: "/failed-font.ttf" }];

  // when
  const output = exportEngravingArea(area, [text], fonts);

  // then
  await expect(output).rejects.toThrow("Cannot load font");
});

test("font loading can be retried after failure", async () => {
  // given
  const bytes = await readFile(fontUrl);
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValue(new Response(bytes));
  const fonts = [{ id: "sans", family: "Fabrio Sans", url: "/retry-font.ttf" }];
  await expect(exportEngravingArea(area, [text], fonts)).rejects.toThrow("Cannot load font");

  // when
  const output = await exportEngravingArea(area, [text], fonts);
  const svg = await output.text();

  // then
  expect(svg).toContain("<path");
});

test("missing glyphs block production", async () => {
  // given
  const bytes = await readFile(fontUrl);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bytes));
  const fonts = [{ id: "sans", family: "Fabrio Sans", url: "/missing-glyph-font.ttf" }];

  // when
  const output = exportEngravingArea(area, [{ ...text, text: "\u{10ffff}" }], fonts);

  // then
  await expect(output).rejects.toThrow("Unsupported glyph");
});

test("engraving preserves enclosed counters in outlined letters", async () => {
  // given
  const bytes = await readFile(fontUrl);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bytes));
  const fonts = [{ id: "sans", family: "Fabrio Sans", url: "/counter-font.ttf" }];
  // when
  const output = await exportEngravingArea(area, [{ ...text, text: "o", rotation: 0 }], fonts);
  const svg = await output.text();
  const path = svg.match(/d="([^"]+)"/)![1];
  // then
  expect(path.match(/[Mm]/g)).toHaveLength(2);
});

test("justification expands wrapped word gaps but preserves paragraph endings", async () => {
  const bytes = await readFile(fontUrl);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bytes));
  const fonts = [{ id: "sans", family: "Fabrio Sans", url: "/justify-font.ttf" }];
  const element: TextElement = {
    ...text,
    width: 20,
    height: 30,
    text: "one two three four five six",
    fontSize: 4,
    align: "left",
  };
  const left = await outlineTextPath(element, fonts);
  const justified = await outlineTextPath({ ...element, align: "justify" }, fonts);
  expect(justified).not.toBe(left);
  // The final paragraph line and explicit paragraph breaks are never stretched.
  const short = { ...element, text: "one two\nthree", width: 50 };
  expect(await outlineTextPath({ ...short, align: "justify" }, fonts)).toBe(
    await outlineTextPath(short, fonts),
  );
  const singleWords = { ...element, text: "one two", width: 8 };
  expect(await outlineTextPath({ ...singleWords, align: "justify" }, fonts)).toBe(
    await outlineTextPath(singleWords, fonts),
  );
});

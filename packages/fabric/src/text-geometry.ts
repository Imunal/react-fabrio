import { layoutTextLines } from "./text-layout.js";
import { clipGeometry } from "./geometry.js";
import type { Font } from "fontkit";
import type { DesignElement, FontConfig } from "@react-fabrio/core";
const fontLoads = new Map<string, Promise<Font>>();
const loadFont = (config: FontConfig): Promise<Font> => {
  let loading = fontLoads.get(config.url);
  if (!loading) {
    loading = (async () => {
      const response = await fetch(config.url);
      if (!response.ok) throw new Error(`Cannot load font: ${config.id}`);
      const { create } = await import("fontkit");
      const font = create(
        new Uint8Array(await response.arrayBuffer()) as Parameters<typeof create>[0],
      );
      if (!("layout" in font)) throw new Error("Font collections require an individual font file.");
      return font;
    })();
    fontLoads.set(config.url, loading);
    void loading.catch(() => fontLoads.delete(config.url));
  }
  return loading;
};

/**
 * Converts wrapped text into glyph outlines in local millimeter coordinates.
 *
 * @param element - Text content, font, physical rectangle, alignment and spacing.
 * @param fonts - Catalog containing the font identified by `element.fontId`.
 * @returns SVG path data clipped to the element rectangle, preserving glyph baselines.
 * @throws Error - If the font cannot be resolved or loaded, or a glyph is unsupported.
 */
export const outlineTextPath = async (
  element: Extract<DesignElement, { type: "text" }>,
  fonts: FontConfig[],
): Promise<string> => {
  const config = fonts.find((font) => font.id === element.fontId);
  if (!config) throw new Error(`Missing font: ${element.fontId}`);
  const font = await loadFont(config);
  const scale = element.fontSize / font.unitsPerEm;
  const paths: string[] = [];
  const spacing = element.letterSpacing ?? 0;
  const measure = (line: string) => {
    const run = font.layout(line);
    return run.advanceWidth * scale + Math.max(0, run.glyphs.length - 1) * spacing;
  };
  const lines = layoutTextLines(element.text, element.width, measure);
  for (const [lineIndex, line] of lines.entries()) {
    for (const character of line.text)
      if (!font.hasGlyphForCodePoint(character.codePointAt(0)!))
        throw new Error(`Unsupported glyph: ${character}`);
    const run = font.layout(line.text);
    const width = run.advanceWidth * scale + Math.max(0, run.glyphs.length - 1) * spacing;
    // Expand ordinary spaces between words, leaving paragraph endings natural.
    const isSpace = (index: number) => run.glyphs[index].codePoints.every((point) => point === 32);
    const first = run.glyphs.findIndex((_, index) => !isSpace(index));
    const last = run.glyphs.findLastIndex((_, index) => !isSpace(index));
    const gaps = run.glyphs.flatMap((_, index) =>
      index > first && index < last && isSpace(index) ? [index] : [],
    );
    const extra =
      element.align === "justify" && line.justify && gaps.length
        ? Math.max(0, element.width - width) / gaps.length
        : 0;
    let x =
      element.align === "center"
        ? (element.width - width) / 2
        : element.align === "right"
          ? element.width - width
          : 0;
    const baseline =
      font.ascent * scale + lineIndex * element.fontSize * (element.lineHeight ?? 1.2);
    run.glyphs.forEach((glyph, index) => {
      const position = run.positions[index];
      const path = glyph.path.transform(
        scale,
        0,
        0,
        -scale,
        x + position.xOffset * scale,
        baseline - position.yOffset * scale,
      );
      paths.push(path.toSVG());
      x += position.xAdvance * scale + spacing + (gaps.includes(index) ? extra : 0);
    });
  }
  return clipGeometry(paths.join(" "), `M0 0H${element.width}V${element.height}H0Z`);
};

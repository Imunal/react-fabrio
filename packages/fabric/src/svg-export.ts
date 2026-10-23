import type { DecorationArea, DesignElement, FontConfig } from "@react-fabrio/core";
import { boundary, transform, clipGeometry, vectorPath } from "./geometry.js";
import { importSvgPath } from "./svg-import.js";
import { outlineTextPath } from "./text-geometry.js";
/**
 * Produces monochrome SVG artwork clipped to an engraving decoration area.
 *
 * @param area - Engraving boundary and physical dimensions in millimeters.
 * @param elements - Text and vector elements in document order; images are rejected.
 * @param fonts - Font catalog used to outline text; defaults to the area's fonts.
 * @returns An SVG blob with physical dimensions and filled paths instead of live text.
 * @throws Error - If the area/content is incompatible, fonts fail, or geometry cannot be exported.
 */
export const exportEngravingArea = async (
  area: DecorationArea,
  elements: DesignElement[],
  fonts: FontConfig[] = area.fonts ?? [],
): Promise<Blob> => {
  if (area.production !== "engraving") throw new Error("Area is not configured for engraving.");
  const { default: svgpath } = await import("svgpath");
  const boundaryMarkup = boundary(area);
  const boundaryPath = await importSvgPath(`<svg>${boundaryMarkup}</svg>`);
  const content: string[] = [];
  for (const element of elements) {
    if (element.type === "image") throw new Error("Raster images are prohibited in engraving.");
    const markup =
      element.type === "text"
        ? `<path d="${await outlineTextPath(element, fonts)}"/>`
        : `<path d="${await vectorPath(element)}"/>`;
    for (const match of markup.matchAll(/d="([^"]*)"/g)) {
      if (!match[1].trim()) continue;
      const path = svgpath(match[1])
        .transform(transform(element))
        .unshort()
        .unarc()
        .abs()
        .toString();
      const data = await clipGeometry(path, boundaryPath);
      if (data) content.push(`<path d="${data}"/>`);
    }
  }
  return new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${area.width}mm" height="${area.height}mm" viewBox="0 0 ${area.width} ${area.height}"><g fill="black">${content.join("")}</g></svg>`,
    ],
    { type: "image/svg+xml" },
  );
};

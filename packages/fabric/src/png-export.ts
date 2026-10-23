import type { AssetReference, DecorationArea, DesignElement, FontConfig } from "@react-fabrio/core";
import { printPixelDimensions } from "@react-fabrio/core";
import { validatePath, vectorPath, escapeXml } from "./geometry.js";
import { outlineTextPath } from "./text-geometry.js";
const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * Adds or replaces PNG physical-resolution metadata without changing image pixels.
 *
 * @param bytes - Complete PNG bytes, including signature and chunks.
 * @param dpi - Resolution of at least 300 dots per inch.
 * @returns New PNG bytes containing a pixels-per-meter `pHYs` chunk.
 * @throws RangeError - If DPI is nonfinite or below 300.
 * @throws Error - If the PNG signature or chunk boundaries are invalid.
 */
export const addPngResolution = (bytes: Uint8Array, dpi: number): Uint8Array => {
  if (!Number.isFinite(dpi) || dpi < 300) throw new RangeError("Print DPI must be at least 300.");
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => bytes[index] !== value))
    throw new Error("Invalid PNG signature.");
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  view.setUint32(8, Math.round(dpi / 0.0254));
  view.setUint32(12, Math.round(dpi / 0.0254));
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts: Uint8Array[] = [bytes.slice(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("Truncated PNG chunk.");
    const kind = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (kind !== "pHYs") parts.push(bytes.slice(offset, end));
    if (kind === "IHDR") {
      parts.push(chunk);
      inserted = true;
    }
    offset = end;
  }
  if (!inserted || offset !== bytes.length) throw new Error("Invalid PNG chunks.");
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
};

const imageFromUrl = async (url: string) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  return image;
};

/**
 * Renders one print decoration area to a PNG with physical-resolution metadata.
 *
 * @param area - Print area dimensions, boundary and bleed in millimeters.
 * @param elements - Elements in stacking order, from bottom to top.
 * @param assets - Image references indexed by asset ID.
 * @param options - DPI and font overrides; otherwise uses area settings and 300 DPI.
 * @returns A PNG blob with bleed and pixel dimensions rounded up from the physical size.
 * @throws Error - If the area is not for printing, resources fail to load, or rendering fails.
 *
 * @remarks
 * Uses browser canvas APIs and excludes guides, selection and mockups. Use `exportDesign`
 * when full document validation, product-level defaults and all-area output are needed.
 */
export const exportPrintArea = async (
  area: DecorationArea,
  elements: DesignElement[],
  assets: Record<string, AssetReference>,
  options: { dpi?: number; fonts?: FontConfig[] } = {},
): Promise<Blob> => {
  if (area.production !== "print") throw new Error("Area is not configured for printing.");
  const dpi = options.dpi ?? area.printDpi ?? 300;
  const bleed = area.bleed ?? 0;
  const size = printPixelDimensions(area.width, area.height, dpi, bleed);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Production canvas could not initialize.");
  const scale = dpi / 25.4;
  context.scale(scale, scale);
  context.translate(bleed, bleed);
  const clipping =
    area.boundary?.type === "path"
      ? new Path2D(validatePath(area.boundary.path ?? ""))
      : new Path2D();
  if (area.boundary?.type === "ellipse")
    clipping.ellipse(
      area.width / 2,
      area.height / 2,
      area.width / 2 + bleed,
      area.height / 2 + bleed,
      0,
      0,
      Math.PI * 2,
    );
  else if (area.boundary?.type !== "path")
    clipping.rect(-bleed, -bleed, area.width + bleed * 2, area.height + bleed * 2);
  if (!(area.boundary?.type === "path" && bleed)) context.clip(clipping);
  for (const element of elements) {
    context.save();
    context.translate(element.x + element.width / 2, element.y + element.height / 2);
    context.rotate(((element.rotation ?? 0) * Math.PI) / 180);
    context.translate(-element.width / 2, -element.height / 2);
    if (element.type === "image") {
      const asset = assets[element.assetId];
      if (!asset) throw new Error(`Missing asset: ${element.assetId}`);
      const image = await imageFromUrl(asset.url);
      const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 };
      if (element.flipX) {
        context.translate(element.width, 0);
        context.scale(-1, 1);
      }
      if (element.flipY) {
        context.translate(0, element.height);
        context.scale(1, -1);
      }
      context.drawImage(
        image,
        crop.x * image.naturalWidth,
        crop.y * image.naturalHeight,
        crop.width * image.naturalWidth,
        crop.height * image.naturalHeight,
        0,
        0,
        element.width,
        element.height,
      );
    } else if (element.type === "vector") {
      context.fillStyle = element.color;
      context.fill(new Path2D(await vectorPath(element)));
    } else {
      const geometry = `<path d="${await outlineTextPath(element, options.fonts ?? area.fonts ?? [])}"/>`;
      const svg = new Blob(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(element.width * scale)}" height="${Math.ceil(element.height * scale)}" viewBox="0 0 ${element.width} ${element.height}"><g fill="${escapeXml(element.color)}">${geometry}</g></svg>`,
        ],
        { type: "image/svg+xml" },
      );
      const url = URL.createObjectURL(svg);
      try {
        context.drawImage(await imageFromUrl(url), 0, 0, element.width, element.height);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    context.restore();
  }
  if (area.boundary?.type === "path" && bleed) {
    // Expand a vector boundary by the physical bleed using a rounded stroke mask.
    // Build the mask separately so fill and stroke form a union before compositing.
    const mask = document.createElement("canvas");
    mask.width = size.width;
    mask.height = size.height;
    const maskContext = mask.getContext("2d");
    if (!maskContext) throw new Error("Production boundary mask could not initialize.");
    maskContext.scale(scale, scale);
    maskContext.translate(bleed, bleed);
    maskContext.fill(clipping);
    maskContext.lineWidth = bleed * 2;
    maskContext.lineJoin = "round";
    maskContext.lineCap = "round";
    maskContext.stroke(clipping);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(mask, 0, 0);
  }
  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG export failed at the requested resolution.")),
      "image/png",
    ),
  );
  return new Blob(
    [addPngResolution(new Uint8Array(await png.arrayBuffer()), dpi) as Uint8Array<ArrayBuffer>],
    { type: "image/png" },
  );
};

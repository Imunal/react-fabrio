import type { Crop } from "./contracts.js";
/**
 * Calculates the lower effective resolution of the image's two axes.
 *
 * @param source - Original image dimensions in pixels.
 * @param placed - Image dimensions in millimeters in the design.
 * @param crop - Normalized source crop. Omit to use the entire image.
 * @returns Source pixels per inch of the placed image, accounting for the crop.
 */
export const effectiveImageDpi = (
  source: { width: number; height: number },
  placed: { width: number; height: number },
  crop?: Crop,
): number => {
  return Math.min(
    (source.width * (crop?.width ?? 1)) / (placed.width / 25.4),
    (source.height * (crop?.height ?? 1)) / (placed.height / 25.4),
  );
};
/**
 * Converts physical print dimensions to pixels, rounding each axis upward.
 *
 * @param width - Finished width in millimeters, excluding bleed.
 * @param height - Finished height in millimeters, excluding bleed.
 * @param dpi - Output resolution; defaults to 300 and must be at least 300.
 * @param bleed - Nonnegative bleed in millimeters added to each edge; defaults to zero.
 * @returns Pixel dimensions including bleed on both sides of each axis.
 * @throws Error - If dimensions or resolution are invalid.
 */
export const printPixelDimensions = (width: number, height: number, dpi = 300, bleed = 0) => {
  if (
    !Number.isFinite(bleed) ||
    bleed < 0 ||
    !Number.isFinite(dpi) ||
    dpi < 300 ||
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  )
    throw new Error("Positive dimensions and at least 300 DPI are required");
  return {
    width: Math.ceil(((width + 2 * bleed) / 25.4) * dpi),
    height: Math.ceil(((height + 2 * bleed) / 25.4) * dpi),
  };
};

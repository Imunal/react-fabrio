import type { Crop } from "@react-fabrio/core";

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
export const fitImageCrop = (
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
): Crop => {
  const ratio = frameWidth / frameHeight / (sourceWidth / sourceHeight);
  const width = Math.min(1, ratio);
  const height = Math.min(1, 1 / ratio);
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
};
export const zoomImageCrop = (crop: Crop, base: Crop, zoom: number): Crop => {
  const width = base.width / Math.max(1, zoom);
  const height = base.height / Math.max(1, zoom);
  return {
    x: clamp(crop.x + (crop.width - width) / 2, 1 - width),
    y: clamp(crop.y + (crop.height - height) / 2, 1 - height),
    width,
    height,
  };
};
export const panImageCrop = (
  crop: Crop,
  dx: number,
  dy: number,
  frame: { width: number; height: number; rotation: number; flipX?: boolean; flipY?: boolean },
): Crop => {
  const angle = (frame.rotation * Math.PI) / 180;
  const x = (dx * Math.cos(angle) + dy * Math.sin(angle)) * (frame.flipX ? -1 : 1);
  const y = (-dx * Math.sin(angle) + dy * Math.cos(angle)) * (frame.flipY ? -1 : 1);
  return {
    ...crop,
    x: clamp(crop.x - (x / frame.width) * crop.width, 1 - crop.width),
    y: clamp(crop.y - (y / frame.height) * crop.height, 1 - crop.height),
  };
};

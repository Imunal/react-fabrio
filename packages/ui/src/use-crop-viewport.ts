import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CropSession } from "./use-image-crop.js";

/** Keep the photo large enough to crop, and restore the customer's workspace afterward. */
export const useCropViewport = (
  session: CropSession | null,
  viewport: RefObject<HTMLElement | null>,
  product: RefObject<HTMLElement | null>,
  areaWidth: number,
  zoom: number,
  setZoom: (zoom: number) => void,
) => {
  const previous = useRef<{ zoom: number; left: number; top: number } | null>(null);
  const element = session?.element;
  const savedViewport = session?.viewport;
  useLayoutEffect(() => {
    const view = viewport.current;
    const surface = product.current;
    if (!element || !savedViewport) {
      const saved = previous.current;
      if (!saved) return;
      if (zoom !== saved.zoom) {
        setZoom(saved.zoom);
        return;
      }
      if (!view) {
        previous.current = null;
        return;
      }
      const frame = requestAnimationFrame(() => {
        view.scrollTo(saved.left, saved.top);
        previous.current = null;
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!view || !surface) return;
    if (!previous.current) {
      previous.current = { zoom, ...savedViewport };
      const scale = surface.clientWidth / areaWidth;
      const angle = (element.rotation * Math.PI) / 180;
      const width =
        (element.width * Math.abs(Math.cos(angle)) + element.height * Math.abs(Math.sin(angle))) *
        scale;
      const height =
        (element.width * Math.abs(Math.sin(angle)) + element.height * Math.abs(Math.cos(angle))) *
        scale;
      const factor = Math.min(
        Math.min(480, view.clientWidth - 64) / width,
        Math.min(360, view.clientHeight - 48) / height,
      );
      const target = Math.max(0.25, Math.min(3, Math.floor(zoom * factor * 4) / 4));
      if (Math.abs(target - zoom) > 0.01) setZoom(target);
    }
    const frame = requestAnimationFrame(() => {
      const viewBox = view.getBoundingClientRect();
      const surfaceBox = surface.getBoundingClientRect();
      const scale = surface.clientWidth / areaWidth;
      view.scrollBy(
        surfaceBox.left +
          (element.x + element.width / 2) * scale -
          viewBox.left -
          view.clientWidth / 2,
        surfaceBox.top +
          (element.y + element.height / 2) * scale -
          viewBox.top -
          view.clientHeight / 2,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [element, savedViewport, areaWidth, zoom, setZoom, viewport, product]);
};

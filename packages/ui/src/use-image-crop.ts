import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { AssetReference, Crop, ImageElement } from "@react-fabrio/core";
import { useEditor } from "@react-fabrio/react";
import { fitImageCrop, zoomImageCrop } from "./crop-geometry.js";

export interface CropSession {
  areaId: string;
  element: ImageElement;
  asset: AssetReference;
  base: Crop;
  edited: boolean;
  draft: Crop;
  maxZoom: number;
  viewport: { left: number; top: number };
}
export const useImageCrop = (busy: boolean, root: RefObject<HTMLDivElement | null>) => {
  const { editor, document, areaId, selectedId } = useEditor();
  const [session, setSession] = useState<CropSession | null>(null);
  const loading = useRef<AbortController | null>(null);
  useEffect(() => () => loading.current?.abort(), []);
  const current = session && document.areas[areaId]?.find((e) => e.id === session.element.id);
  const valid =
    !!session &&
    !busy &&
    areaId === session.areaId &&
    selectedId === null &&
    current?.type === "image" &&
    current.assetId === session.element.assetId &&
    !current.locked &&
    current.permissions?.edit !== false;
  useEffect(() => {
    if (!session) return;
    return editor.subscribe(() => {
      const snapshot = editor.getSnapshot();
      const target = snapshot.document.areas[snapshot.areaId]?.find(
        (e) => e.id === session.element.id,
      );
      if (
        snapshot.areaId !== session.areaId ||
        snapshot.selectedId !== null ||
        target?.type !== "image" ||
        target.assetId !== session.element.assetId ||
        target.locked ||
        target.permissions?.edit === false
      )
        setSession(null);
    });
  }, [editor, session]);
  const finish = (apply: boolean, restore = true) => {
    loading.current?.abort();
    if (session && valid && restore) {
      editor.select(session.element.id);
      const original = session.element.crop ?? { x: 0, y: 0, width: 1, height: 1 };
      if (
        apply &&
        session.edited &&
        (["x", "y", "width", "height"] as const).some((key) => session.draft[key] !== original[key])
      )
        editor.update({ kind: "image", changes: { crop: session.draft } });
      requestAnimationFrame(() =>
        root.current?.querySelector<HTMLElement>("[data-crop-trigger]")?.focus(),
      );
    }
    setSession(null);
  };
  return {
    session: valid ? session : null,
    async start() {
      const selected = editor.getSelected();
      if (
        busy ||
        selected?.type !== "image" ||
        selected.locked ||
        selected.permissions?.edit === false
      )
        return;
      // Remember scrolling before the crop panel changes the viewport dimensions.
      const view = root.current?.querySelector<HTMLElement>(".rf-viewport");
      const viewport = { left: view?.scrollLeft ?? 0, top: view?.scrollTop ?? 0 };
      const asset = editor.getSnapshot().document.assets[selected.assetId];
      if (!asset) return;
      loading.current?.abort();
      const controller = new AbortController();
      loading.current = controller;
      const startArea = editor.getSnapshot().areaId;
      // Use decoded dimensions rather than optional or out-of-date asset metadata.
      const image = new Image();
      image.src = asset.url;
      await image.decode();
      if (
        controller.signal.aborted ||
        editor.getSnapshot().areaId !== startArea ||
        editor.getSelected() !== selected
      )
        return;
      const base = fitImageCrop(
        image.naturalWidth,
        image.naturalHeight,
        selected.width,
        selected.height,
      );
      const existing = selected.crop ?? base;
      const zoom = Math.max(1, base.width / existing.width, base.height / existing.height);
      const initial = zoomImageCrop(existing, base, zoom);
      setSession({
        areaId: startArea,
        element: selected,
        asset,
        base,
        edited: false,
        draft: initial,
        maxZoom: Math.max(5, zoom),
        viewport,
      });
      editor.select(null);
    },
    change(draft: Crop) {
      setSession((value) => (value ? { ...value, draft, edited: true } : null));
    },
    cancel: (restore = true) => finish(false, restore),
    apply: () => finish(true),
  };
};

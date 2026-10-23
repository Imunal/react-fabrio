import { useFabrioTranslation } from "./i18n.js";
import { useEffect, useRef } from "react";
import type { DesignDocument, ProductConfig } from "@react-fabrio/core";
import { exportPrintArea } from "@react-fabrio/fabric";

const loadMug = () => import("@react-fabrio/three");
export const MugPreview = ({
  product,
  document,
  onError,
}: {
  product: ProductConfig;
  document: DesignDocument;
  onError: (error: Error) => void;
}) => {
  const { t } = useFabrioTranslation();
  const label = t("mugCanvasLabel");
  const labelRef = useRef(label);
  useEffect(() => {
    labelRef.current = label;
    handle.current?.setAriaLabel(label);
  }, [label]);
  const host = useRef<HTMLDivElement>(null);
  const handle =
    useRef<Awaited<ReturnType<(typeof import("@react-fabrio/three"))["mountMugPreview"]>>>(null);
  const ready = useRef<Promise<
    Awaited<ReturnType<(typeof import("@react-fabrio/three"))["mountMugPreview"]>>
  > | null>(null);
  const errorCallback = useRef(onError);
  useEffect(() => {
    errorCallback.current = onError;
  }, [onError]);
  useEffect(() => {
    let active = true;
    const mug = product.mug!;
    const area = product.sides
      .flatMap((side) => side.areas)
      .find((area) => area.id === mug.areaId)!;
    ready.current = loadMug()
      .then(async ({ mountMugPreview }) => {
        if (!active || !host.current) return null;
        const instance = await mountMugPreview(host.current, {
          ariaLabel: labelRef.current,
          diameter: mug.radius * 2,
          height: mug.height,
          color: mug.color,
          handleColor: mug.handleColor,
          artworkHeight: area.height,
          wrapFraction: (mug.wrapAngle ?? 306) / 360,
          wrapStart: mug.wrapStart === undefined ? undefined : (mug.wrapStart * Math.PI) / 180,
          onUnavailable: (error) => errorCallback.current(error),
        });
        if (active) {
          handle.current = instance;
          instance?.setAriaLabel(labelRef.current);
        } else instance?.dispose();
        return active ? instance : null;
      })
      .catch((error) => {
        if (active)
          errorCallback.current(error instanceof Error ? error : new Error(String(error)));
        return null;
      });
    return () => {
      active = false;
      handle.current?.dispose();
      handle.current = null;
    };
  }, [product]);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    const area = product.sides
      .flatMap((side) => side.areas)
      .find((area) => area.id === product.mug!.areaId)!;
    void exportPrintArea(area, document.areas[area.id] ?? [], document.assets, {
      fonts: area.fonts ?? product.fonts,
    })
      .then(async (blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        const preview = await ready.current;
        if (active && preview) await preview.setArtwork(url);
      })
      .catch((error) => {
        if (active)
          errorCallback.current(error instanceof Error ? error : new Error(String(error)));
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [product, document]);
  return <div className="rf-mug" ref={host} />;
};

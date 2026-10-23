import { useFabrioTranslation } from "./i18n.js";
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- A focusable two-dimensional crop surface supports arrow-key panning. */
import { useEffect, useId, useRef } from "react";
import { Button } from "react-aria-components";
import { panImageCrop, zoomImageCrop } from "./crop-geometry.js";
import type { Crop } from "@react-fabrio/core";
import type { CropSession } from "./use-image-crop.js";

export interface CropEditorProps {
  session: CropSession;
  onChange: (crop: Crop) => void;
}
export const CropControls = ({
  session,
  onChange,
  onApply,
  onCancel,
}: CropEditorProps & { onApply: () => void; onCancel: () => void }) => {
  const { t, locale } = useFabrioTranslation();
  const zoom = session.base.width / session.draft.width;
  return (
    <section className="rf-crop-controls" aria-label={t("crop")}>
      <h3>{t("crop")}</h3>
      <p>{t("cropHint")}</p>
      <label className="rf-field">
        <span className="rf-crop-zoom-label">
          {t("cropZoom")}
          <span aria-hidden="true">
            {new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
              zoom,
            )}
          </span>
        </span>
        <input
          type="range"
          aria-label={t("cropZoom")}
          aria-valuetext={new Intl.NumberFormat(locale, {
            style: "percent",
            maximumFractionDigits: 0,
          }).format(zoom)}
          min="1"
          max={session.maxZoom}
          step="0.01"
          value={zoom}
          onChange={(event) =>
            onChange(zoomImageCrop(session.draft, session.base, event.currentTarget.valueAsNumber))
          }
        />
      </label>
      <Button className="rf-button" onPress={() => onChange(session.base)}>
        {t("cropFit")}
      </Button>
      <div className="rf-crop-actions">
        <Button className="rf-button" onPress={onCancel}>
          {t("cancel")}
        </Button>
        <Button className="rf-button rf-primary" onPress={onApply}>
          {t("cropApply")}
        </Button>
      </div>
    </section>
  );
};

export const CropOverlay = ({
  session,
  onChange,
  areaWidth,
  areaHeight,
  onError,
}: CropEditorProps & { areaWidth: number; areaHeight: number; onError: () => void }) => {
  const { t } = useFabrioTranslation();
  const surface = useRef<HTMLFieldSetElement>(null);
  const gesture = useRef<{ pointerId: number; x: number; y: number; crop: Crop } | null>(null);
  const hint = useId();
  const { element, draft, asset } = session;
  useEffect(() => {
    const frame = requestAnimationFrame(() => surface.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      className="rf-crop-overlay"
      style={{
        left: `${(element.x / areaWidth) * 100}%`,
        top: `${(element.y / areaHeight) * 100}%`,
        width: `${(element.width / areaWidth) * 100}%`,
        height: `${(element.height / areaHeight) * 100}%`,
        transform: `rotate(${element.rotation}deg)`,
      }}
    >
      <fieldset
        ref={surface}
        aria-label={t("cropFrame")}
        aria-describedby={hint}
        tabIndex={0}
        className="rf-crop-frame"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            crop: draft,
          };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.pointerId !== event.pointerId) return;
          onChange(
            panImageCrop(start.crop, event.clientX - start.x, event.clientY - start.y, {
              ...element,
              width: event.currentTarget.clientWidth,
              height: event.currentTarget.clientHeight,
            }),
          );
        }}
        onPointerUp={() => {
          gesture.current = null;
        }}
        onPointerCancel={() => {
          if (gesture.current) onChange(gesture.current.crop);
          gesture.current = null;
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
        }}
        onKeyDown={(event) => {
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          const direction = directions[event.key];
          if (!direction) return;
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 0.1 : 0.02;
          const width = event.currentTarget.clientWidth;
          const height = event.currentTarget.clientHeight;
          onChange(
            panImageCrop(draft, direction[0] * width * step, direction[1] * height * step, {
              width,
              height,
              rotation: 0,
              flipX: element.flipX,
              flipY: element.flipY,
            }),
          );
        }}
      >
        <div
          className="rf-crop-image"
          style={{ transform: `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})` }}
        >
          <img
            src={asset.url}
            alt=""
            draggable={false}
            onError={onError}
            style={{
              width: `${100 / draft.width}%`,
              height: `${100 / draft.height}%`,
              left: `${(-draft.x / draft.width) * 100}%`,
              top: `${(-draft.y / draft.height) * 100}%`,
            }}
          />
        </div>
        <span className="rf-crop-grid" aria-hidden="true" />
      </fieldset>
      <span id={hint} className="rf-sr-only">
        {t("cropHint")}
      </span>
    </div>
  );
};

import { useFabrioTranslation } from "./i18n.js";
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable viewport needs keyboard focus for arrow-key scrolling. */
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "react-aria-components";
import { EditorCanvas, useEditor } from "@react-fabrio/react";
import type { SelectionBounds } from "@react-fabrio/react";
import type { DesignDocument, ProductConfig } from "@react-fabrio/core";
import { areaGuidePaths } from "@react-fabrio/core";
import { useCropViewport } from "./use-crop-viewport.js";
import { CropOverlay } from "./crop-editor.js";
import type { CropSession } from "./use-image-crop.js";
import type { Crop } from "@react-fabrio/core";
import { ContextToolbar } from "./context-toolbar.js";
import { AreaThumbnail, EditorIcon } from "./editor-shell.js";
import { MugPreview } from "./mug-preview.js";
export const DesignWorkspace = ({
  view,
  setView,
  zoom,
  setZoom,
  preview,
  busy,
  reportError,
  renderMug: RenderMug,
  onEdit,
  onAreaChange,
  cropSession,
  onCropChange,
  onCrop,
}: {
  cropSession: CropSession | null;
  onCropChange: (crop: Crop) => void;
  onCrop: () => void;
  view: string;
  setView: (view: string) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  preview?: string;
  busy: boolean;
  reportError: (error: Error) => void;
  renderMug?: (props: {
    product: ProductConfig;
    document: DesignDocument;
    onError: (error: Error) => void;
  }) => ReactNode;
  onEdit: () => void;
  onAreaChange: (id: string) => void;
}) => {
  const { t, locale } = useFabrioTranslation();
  const {
    editor,
    product,
    document: design,
    area,
    areaId,
    selected,
    canUndo,
    canRedo,
  } = useEditor();
  const [bounds, setBounds] = useState<SelectionBounds | null>(null);
  const productHost = useRef<HTMLDivElement>(null);
  const workspaceHost = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState(false);
  const [offCenter, setOffCenter] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | undefined>(undefined);
  const center = () => {
    const node = viewport.current;
    if (node) {
      node.scrollLeft = (node.scrollWidth - node.clientWidth) / 2;
      node.scrollTop = (node.scrollHeight - node.clientHeight) / 2;
    }
    setOffCenter(false);
  };
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const frame = requestAnimationFrame(center);
    const observer = new ResizeObserver(() => {
      if (zoom === 1) center();
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [zoom, view, areaId]);
  useCropViewport(cropSession, viewport, productHost, area.width, zoom, setZoom);
  const guides = areaGuidePaths(area);
  const fitted = zoom === 1 && !offCenter;
  const mockup = product.sides
    .flatMap((side) => side.mockups ?? [])
    .find((item) => item.areaId === areaId);
  return (
    <section className="rf-preview" aria-label={t("preview")} data-cropping={!!cropSession}>
      <div className="rf-preview-heading">
        <span>
          {area.width.toLocaleString(locale)} × {area.height.toLocaleString(locale)} mm ·{" "}
          {t(area.production)}
        </span>
      </div>
      <div className="rf-workspace" ref={workspaceHost}>
        {view === "flat" && (
          <section
            className="rf-viewport"
            ref={viewport}
            tabIndex={0}
            aria-label={t("pan")}
            data-pan={pan && !cropSession}
            onScroll={(event) => {
              const n = event.currentTarget;
              setOffCenter(
                Math.abs(n.scrollLeft - (n.scrollWidth - n.clientWidth) / 2) > 2 ||
                  Math.abs(n.scrollTop - (n.scrollHeight - n.clientHeight) / 2) > 2,
              );
            }}
            onPointerDownCapture={(event) => {
              if (!pan || cropSession) return;
              event.stopPropagation();
              event.preventDefault();
              const n = event.currentTarget;
              n.setPointerCapture(event.pointerId);
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                left: n.scrollLeft,
                top: n.scrollTop,
              };
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              const n = event.currentTarget;
              n.scrollLeft = drag.current.left + drag.current.x - event.clientX;
              n.scrollTop = drag.current.top + drag.current.y - event.clientY;
            }}
            onPointerUp={() => {
              drag.current = undefined;
            }}
            onPointerCancel={() => {
              drag.current = undefined;
            }}
          >
            <div className="rf-stage">
              <div
                ref={productHost}
                className={`rf-product ${product.mug ? "rf-product-mug" : ""}`}
                style={{
                  aspectRatio: `${area.width}/${area.height}`,
                  width: `calc(min(${product.mug ? "100cqw - 104px" : "100cqw - 48px"}, max(48px, 100cqh - ${cropSession ? "48px" : "var(--rf-stage-clearance, 128px)"}) * ${area.width / area.height}) * ${zoom})`,
                  borderRadius: area.boundary?.type === "ellipse" ? "50%" : undefined,
                }}
              >
                <EditorCanvas
                  className="rf-canvas"
                  zoom={1}
                  onError={reportError}
                  ariaLabel={t("canvasLabel")}
                  onSelectionBoundsChange={setBounds}
                />
                {cropSession && (
                  <CropOverlay
                    session={cropSession}
                    onChange={onCropChange}
                    areaWidth={area.width}
                    areaHeight={area.height}
                    onError={() => reportError(new Error(t("cropLoadError")))}
                  />
                )}
                <svg
                  className="rf-production-guides"
                  viewBox={`0 0 ${area.width} ${area.height}`}
                  aria-hidden="true"
                >
                  <path
                    className="rf-bleed-guide"
                    d={`${guides.bleed} ${guides.boundary}`}
                    fillRule="evenodd"
                  />
                  <path className="rf-cut-guide" d={guides.boundary} />
                  <path className="rf-safe-guide" d={guides.safe} />
                </svg>
              </div>
            </div>
          </section>
        )}
        {view === "mockup" && mockup && (
          <div className="rf-mockup">
            <img src={mockup.url} alt={product.name} />
            {preview && (
              <img
                className="rf-mockup-art"
                src={preview}
                alt={t("yourArtwork")}
                style={{
                  left: `${mockup.x}%`,
                  top: `${mockup.y}%`,
                  width: `${mockup.width}%`,
                  height: `${mockup.height}%`,
                  transform: `rotate(${mockup.rotation ?? 0}deg)`,
                  maskImage: mockup.maskUrl ? `url(${JSON.stringify(mockup.maskUrl)})` : undefined,
                }}
              />
            )}
            {mockup.shadingUrl && (
              <img className="rf-mockup-shading" src={mockup.shadingUrl} alt="" />
            )}
          </div>
        )}
        {view === "mug" &&
          (RenderMug ? (
            <RenderMug
              product={product}
              document={design}
              onError={(error) => {
                reportError(error);
                setView("flat");
              }}
            />
          ) : (
            <MugPreview
              product={product}
              document={design}
              onError={(error) => {
                reportError(error);
                setView("flat");
              }}
            />
          ))}
        {selected && bounds && view === "flat" && (
          <ContextToolbar
            bounds={bounds}
            workspace={workspaceHost}
            host={productHost}
            busy={busy}
            onEdit={onEdit}
            onCrop={onCrop}
          />
        )}
      </div>
      {view === "flat" && (
        <p className="rf-guide-legend">
          <span>{t("cutLine")}</span>
          <span>
            {t("safeLine")}: {(area.safeMargin ?? 0).toLocaleString(locale)} mm
          </span>
          <span>
            {t("bleedLine")}: {(area.bleed ?? 0).toLocaleString(locale)} mm
          </span>
        </p>
      )}
      <nav className="rf-areas" aria-label={t("sides")}>
        {product.sides.map((side) =>
          side.areas.map((item) => (
            <Button
              key={item.id}
              className="rf-button"
              aria-pressed={areaId === item.id}
              onPress={() => {
                onAreaChange(item.id);
              }}
            >
              <AreaThumbnail
                area={item}
                elements={design.areas[item.id] ?? []}
                assets={design.assets}
              />
              {side.name} · {item.name}
            </Button>
          )),
        )}
      </nav>
      <div className="rf-preview-footer">
        <div className="rf-inline rf-history-controls">
          <Button
            className="rf-icon-button"
            aria-label={t("undo")}
            isDisabled={!canUndo || busy || !!cropSession}
            onPress={() => editor.undo()}
          >
            <EditorIcon name="undo" />
          </Button>
          <Button
            className="rf-icon-button"
            aria-label={t("redo")}
            isDisabled={!canRedo || busy || !!cropSession}
            onPress={() => editor.redo()}
          >
            <EditorIcon name="redo" />
          </Button>
        </div>

        <div className="rf-inline">
          <Button
            className="rf-button"
            aria-pressed={view === "flat"}
            onPress={() => {
              setView("flat");
            }}
          >
            {t("flat")}
          </Button>
          {mockup && (
            <Button
              className="rf-button"
              aria-pressed={view === "mockup"}
              onPress={() => {
                setView("mockup");
              }}
            >
              {t("mockup")}
            </Button>
          )}
          {product.mug && (
            <Button
              className="rf-button"
              aria-pressed={view === "mug"}
              onPress={() => setView("mug")}
            >
              {t("mug")}
            </Button>
          )}
        </div>

        <span>{product.name}</span>
        {view === "flat" && !cropSession && (
          <fieldset className="rf-zoom-controls" aria-label={t("zoomControls")}>
            <Button
              className="rf-icon-button"
              aria-label={t("zoomOut")}
              isDisabled={zoom <= 0.25}
              onPress={() => setZoom(Math.max(0.25, zoom - 0.25))}
            >
              −
            </Button>
            <span className="rf-zoom-percent" title={t("zoomHint")}>
              {new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
                zoom,
              )}
            </span>
            <label title={t("zoomHint")}>
              <span className="rf-zoom-label">{t("zoom")}</span>
              <input
                aria-label={t("zoom")}
                type="range"
                min="0.25"
                max="3"
                step="0.25"
                value={zoom}
                onChange={(event) => setZoom(event.target.valueAsNumber)}
              />
            </label>
            <Button
              className="rf-icon-button"
              aria-label={t("zoomIn")}
              isDisabled={zoom >= 3}
              onPress={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              +
            </Button>
            <span title={fitted ? t("fitted") : t("zoomHint")}>
              <Button
                className="rf-button rf-view-action"
                aria-label={t("fit")}
                isDisabled={fitted}
                onPress={() => {
                  if (zoom === 1) center();
                  else setZoom(1);
                }}
              >
                <EditorIcon name="fit" />
                <span>{t("fit")}</span>
              </Button>
            </span>
            <Button
              className="rf-button rf-view-action"
              aria-label={t("pan")}
              aria-pressed={pan}
              onPress={() => setPan(!pan)}
            >
              <EditorIcon name="pan" />
              <span>{t("pan")}</span>
            </Button>
          </fieldset>
        )}
      </div>
    </section>
  );
};

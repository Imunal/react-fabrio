import { FabrioI18nBoundary, useFabrioTranslation } from "./i18n.js";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "react-aria-components";
import { AssetUploadError, EditorProvider, useEditor, useAssetUploads } from "@react-fabrio/react";
import type {
  ProductConfig,
  DesignDocument,
  DesignResult,
  ValidationIssue,
} from "@react-fabrio/core";
import { getDesignIssues } from "@react-fabrio/core";
import { exportPrintArea, exportDesign } from "@react-fabrio/fabric";
import { EditorHeader, ToolNavigation, ResourcePanel } from "./editor-shell.js";
import { DesignWorkspace } from "./design-workspace.js";
import { CropControls } from "./crop-editor.js";
import { useImageCrop } from "./use-image-crop.js";
import { ElementList } from "./element-list.js";
import { AssetPanels } from "./asset-panels.js";
import { PropertiesPanel } from "./properties-panel.js";
import { errorIssues, translateIssue, uploadErrorKey } from "./translated-errors.js";
import type { Tool } from "./editor-shell.js";
import type { UploadAsset } from "@react-fabrio/react";

export interface ProductEditorProps {
  className?: string;
  headerStart?: ReactNode;
  headerActions?: ReactNode;
  product: ProductConfig;
  initialDesign?: DesignDocument;
  uploadAsset?: UploadAsset;
  onChange?: (document: DesignDocument) => void;
  onConfirm?: (result: DesignResult) => void | Promise<void>;
  onError?: (error: Error) => void;
  renderMug?: (props: {
    product: ProductConfig;
    document: DesignDocument;
    onError: (error: Error) => void;
  }) => ReactNode;
}
/**
 * Renders the product editor, including its provider, controls, uploads and confirmation flow.
 *
 * @param props - Editor configuration, callbacks and layout options.
 *
 * @remarks
 * Import the UI stylesheet explicitly. An enclosing `FabrioI18nProvider` controls locale;
 * without one, the editor provides English. Confirmation validates and exports every area
 * before invoking `onConfirm`; errors are reported through `onError`.
 */
export const ProductEditor = (props: ProductEditorProps) => (
  <FabrioI18nBoundary>
    <EditorProvider
      product={props.product}
      initialDesign={props.initialDesign}
      onChange={props.onChange}
    >
      <Designer {...props} />
    </EditorProvider>
  </FabrioI18nBoundary>
);

const Designer = ({
  uploadAsset,
  onConfirm,
  onError,
  renderMug,
  className,
  headerStart,
  headerActions,
}: ProductEditorProps) => {
  "use no memo";
  const { editor, product, document: design, area, areaId, selected, layers } = useEditor();
  const { t, locale, dir } = useFabrioTranslation();
  const id = useId();
  const [panel, setPanel] = useState(area.allowedElements.includes("image") ? "images" : "text");
  const [open, setOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState("flat");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const crop = useImageCrop(busy, root);
  const [status, setStatus] = useState<
    "error" | "ready" | ReturnType<typeof uploadErrorKey> | ValidationIssue[] | null
  >(null);

  const [preview, setPreview] = useState<string>();
  const controllers = useRef(new Set<AbortController>());
  const localUrls = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const active = controllers.current;
    const urls = localUrls.current;
    return () => {
      mounted.current = false;
      active.forEach((controller) => controller.abort());
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  const reportError = useCallback(
    (error: unknown) => {
      if (!mounted.current) return;
      const value = error instanceof Error ? error : new Error(String(error));
      if (mounted.current)
        setStatus(
          errorIssues(value) ??
            (value instanceof AssetUploadError ? uploadErrorKey(value.code) : "error"),
        );
      onError?.(value);
    },
    [onError],
  );
  const startCrop = () => {
    setView("flat");
    setPanel("images");
    setOpen(true);
    void crop.start().catch(reportError);
  };
  const displayedIssues = getDesignIssues(design, product);
  const fontOptions = area.fonts ?? product.fonts ?? [];
  const addText = () => {
    editor.add({
      id: crypto.randomUUID(),
      type: "text",
      text: t("text"),
      fontId: fontOptions[0]?.id ?? "",
      fontSize: 4,
      color: area.colors?.[0] ?? "#263c32",
      x: Math.min(3, area.width * 0.1),
      y: Math.min(3, area.height * 0.1),
      width: Math.min(area.width * 0.8, 40),
      height: Math.min(8, area.height * 0.8),
      rotation: 0,
    });
    setPanel("text");
    setOpen(true);
  };
  const { upload: uploadFiles, pendingUploads } = useAssetUploads({
    uploadAsset,
    onError: reportError,
  });
  const upload = (files: File[], replace = false) =>
    uploadFiles(files, { replaceElementId: replace ? selected?.id : undefined });
  const confirm = async () => {
    if (controllers.current.size || pendingUploads) return;
    const confirmation = new AbortController();
    controllers.current.add(confirmation);
    setBusy(true);
    crop.cancel();
    editor.setReadOnly(true);
    setStatus(null);
    const document = structuredClone(editor.getSnapshot().document);
    try {
      const result = await exportDesign(product, document, { signal: confirmation.signal });
      if (confirmation.signal.aborted || !mounted.current) return;
      await onConfirm?.(result);
      if (mounted.current) setStatus("ready");
    } catch (error) {
      reportError(error);
    } finally {
      controllers.current.delete(confirmation);
      editor.setReadOnly(false);
      if (mounted.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (view !== "mockup") return;
    let active = true;
    let url: string | undefined;
    void exportPrintArea(
      { ...area, production: "print" },
      design.areas[areaId] ?? [],
      design.assets,
      { dpi: 300, fonts: area.fonts ?? product.fonts },
    )
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch((error) => {
        if (active) {
          reportError(error);
          setView("flat");
        }
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [view, area, areaId, design, product, reportError]);
  const save = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(design, null, 2)], { type: "application/json" }),
    );
    localUrls.current.add(url);
    const link = globalThis.document.createElement("a");
    link.href = url;
    link.download = `${product.id}.json`;
    link.click();
  };
  const guidedTemplate = area.templates?.[0];
  return (
    <div
      ref={root}
      lang={locale}
      dir={dir}
      className={`rf-editor ${className ?? ""}`}
      aria-busy={busy || pendingUploads > 0}
      onKeyDownCapture={(event) => {
        if (crop.session && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          crop.cancel();
        }
      }}
    >
      <EditorHeader
        start={headerStart}
        actions={
          <>
            <Button className="rf-button" onPress={save}>
              {t("save")}
            </Button>
            {headerActions}
          </>
        }
      >
        <Button
          className="rf-button rf-primary"
          isDisabled={
            busy ||
            pendingUploads > 0 ||
            displayedIssues.some((issue) => issue.severity === "error")
          }
          onPress={() => {
            void confirm();
          }}
        >
          {busy ? t("confirming") : t("confirm")}
        </Button>
      </EditorHeader>
      <fieldset className="rf-session-controls" disabled={busy}>
        <div className="rf-layout" data-panel-open={open}>
          <ToolNavigation
            id={id}
            tools={
              [
                ...(area.allowedElements.includes("image") ? ["images"] : []),
                ...(area.allowedElements.includes("text") ? ["text"] : []),
                ...(area.allowedElements.includes("vector") ? ["artwork"] : []),
                ...(area.templates?.length ? ["templates"] : []),
                "elements",
                "settings",
              ] as Tool[]
            }
            active={panel}
            open={open}
            onChange={(tool) => {
              crop.cancel();
              setPanel(tool);
              setOpen(!open || panel !== tool);
            }}
          />
          <ResourcePanel
            id={id}
            title={t(panel as Tool)}
            focusKey={panel}
            open={open}
            onClose={() => {
              crop.cancel();
              setOpen(false);
              globalThis.document.getElementById(`${id}-tool-${panel}`)?.focus();
            }}
          >
            {panel === "text" &&
              area.mode === "freeform" &&
              area.allowedElements.includes("text") && (
                <Button className="rf-button rf-primary" onPress={addText}>
                  {t("addText")}
                </Button>
              )}
            {panel === "settings" && (
              <p>
                {area.width.toLocaleString(locale)} × {area.height.toLocaleString(locale)} mm ·{" "}
                {t(area.production)}
              </p>
            )}
            {area.mode === "guided" && !crop.session && (
              <section className="rf-field">
                {guidedTemplate?.slots?.map((slot) => {
                  const element = layers.find((item) => item.id === slot.elementId);
                  return (
                    element && (
                      <Button
                        key={slot.id}
                        className="rf-button"
                        onPress={() => {
                          editor.select(element.id);
                          setPanel(element.type === "text" ? "text" : "images");
                        }}
                      >
                        {slot.label}
                        {slot.required ? " *" : ""}
                      </Button>
                    )
                  );
                })}
              </section>
            )}
            {crop.session ? (
              <CropControls
                session={crop.session}
                onChange={crop.change}
                onApply={crop.apply}
                onCancel={() => crop.cancel()}
              />
            ) : (
              <>
                <AssetPanels
                  panel={panel}
                  busy={busy}
                  pendingUploads={pendingUploads}
                  upload={upload}
                  onImageError={() => setStatus("error")}
                  onCrop={startCrop}
                />
                {panel !== "elements" && <PropertiesPanel panel={panel} disabled={busy} />}
              </>
            )}
            {panel === "elements" && (
              <ElementList
                key={`${areaId}-${busy}`}
                disabled={busy}
                onEdit={(element) =>
                  setPanel(
                    element.type === "text"
                      ? "text"
                      : element.type === "image"
                        ? "images"
                        : "artwork",
                  )
                }
              />
            )}
          </ResourcePanel>
          <DesignWorkspace
            view={view}
            setView={(next) => {
              crop.cancel();
              setView(next);
            }}
            zoom={zoom}
            setZoom={setZoom}
            preview={preview}
            busy={busy}
            reportError={reportError}
            cropSession={crop.session}
            onCropChange={crop.change}
            onCrop={startCrop}
            renderMug={renderMug}
            onEdit={() => {
              setPanel(
                selected?.type === "text"
                  ? "text"
                  : selected?.type === "image"
                    ? "images"
                    : "artwork",
              );
              setOpen(true);
            }}
            onAreaChange={(id) => {
              crop.cancel(false);
              editor.setArea(id);
              setPanel(editor.getArea().allowedElements.includes("image") ? "images" : "text");
              setView("flat");
            }}
          />
        </div>
      </fieldset>
      {displayedIssues.length > 0 && (
        <ul className="rf-issues">
          {displayedIssues.map((issue) => (
            <li
              key={`${issue.code}-${issue.areaId ?? ""}-${issue.elementId ?? ""}-${issue.message}`}
            >
              {translateIssue(issue, t)}
            </li>
          ))}
        </ul>
      )}
      <output className="rf-status" aria-live="polite">
        {Array.isArray(status)
          ? status.map((issue) => translateIssue(issue, t)).join(" ")
          : status && t(status)}
      </output>
    </div>
  );
};

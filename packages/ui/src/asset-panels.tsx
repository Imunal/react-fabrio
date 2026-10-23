import { useFabrioTranslation } from "./i18n.js";
import { Button } from "react-aria-components";
import { useEditor } from "@react-fabrio/react";
import type { ImagePatch } from "@react-fabrio/core";
import { EditorIcon } from "./editor-shell.js";
export const AssetPanels = ({
  panel,
  busy,
  pendingUploads,
  upload,
  onImageError,
  onCrop,
}: {
  panel: string;
  busy: boolean;
  pendingUploads: number;
  upload: (files: File[], replace?: boolean) => Promise<void>;
  onImageError: () => void;
  onCrop: () => void;
}) => {
  const { t } = useFabrioTranslation();
  const { editor, area, product, document: design, selected } = useEditor();
  const can = (operation: "edit") =>
    !!selected && !selected.locked && selected.permissions?.[operation] !== false;
  const update = (patch: ImagePatch) => editor.update({ kind: "image", changes: patch });
  return (
    <>
      {panel === "images" && (
        <section className="rf-field">
          <h2>{t("images")}</h2>
          <span aria-live="polite">
            {t("galleryCount", {
              count: Object.values(design.assets).filter(
                (asset) =>
                  asset.mimeType.startsWith("image/") && asset.mimeType !== "image/svg+xml",
              ).length,
              limit: product.upload?.maxFiles ?? 10,
            })}
          </span>
          {area.allowedElements.includes("image") && area.production === "print" && (
            <>
              <label className="rf-upload">
                <EditorIcon name="images" />
                {t("upload")}
                <input
                  type="file"
                  multiple
                  aria-label={t("upload")}
                  accept={(product.upload?.mimeTypes ?? ["image/png", "image/jpeg", "image/webp"])
                    .filter((t) => t !== "image/svg+xml")
                    .join(",")}
                  disabled={busy}
                  onChange={(event) => {
                    void upload(Array.from(event.currentTarget.files ?? []));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {selected?.type === "image" && (
                <label className="rf-upload">
                  {t("replace")}
                  <input
                    type="file"
                    aria-label={t("replace")}
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy || !can("edit")}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void upload([file], true);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </>
          )}
          {Object.values(design.assets).filter(
            (a) => a.mimeType.startsWith("image/") && a.mimeType !== "image/svg+xml",
          ).length +
            pendingUploads >=
            (product.upload?.maxFiles ?? 10) && <p className="rf-empty">{t("galleryFull")}</p>}
          {pendingUploads > 0 && (
            <output aria-live="polite">{t("pendingUploads", { count: pendingUploads })}</output>
          )}
          <div className="rf-gallery">
            {Object.values(design.assets)
              .filter(
                (asset) =>
                  asset.mimeType.startsWith("image/") && asset.mimeType !== "image/svg+xml",
              )
              .map((asset) => {
                const used = Object.values(design.areas)
                  .flat()
                  .some((e) => e.type === "image" && e.assetId === asset.id);
                return (
                  <div className="rf-gallery-item" key={asset.id}>
                    <Button
                      className="rf-photo"
                      aria-label={t("photoLabel", { id: asset.id })}
                      isDisabled={
                        busy ||
                        !area.allowedElements.includes("image") ||
                        (area.mode === "guided" && (selected?.type !== "image" || !can("edit")))
                      }
                      onPress={() => {
                        if (area.mode === "guided") editor.replaceImage(selected!.id, asset);
                        else
                          editor.add({
                            id: crypto.randomUUID(),
                            type: "image",
                            assetId: asset.id,
                            x: 3,
                            y: 3,
                            width: Math.min(40, area.width * 0.8),
                            height:
                              (Math.min(40, area.width * 0.8) * (asset.height ?? 1)) /
                              (asset.width ?? 1),
                            rotation: 0,
                          });
                      }}
                    >
                      <img src={asset.url} alt={t("photo")} onError={onImageError} />
                    </Button>
                    {selected?.type === "image" && (
                      <Button
                        className="rf-button"
                        isDisabled={busy || !can("edit")}
                        onPress={() => editor.replaceImage(selected!.id, asset)}
                      >
                        {t("replace")}
                      </Button>
                    )}
                    {!used && (
                      <Button
                        className="rf-button"
                        isDisabled={busy}
                        aria-label={t("removePhotoLabel", { id: asset.id })}
                        onPress={() => editor.removeAsset(asset.id)}
                      >
                        {t("removePhoto")}
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
          {!Object.keys(design.assets).length && <p className="rf-empty">{t("photosEmpty")}</p>}
          {selected?.type === "image" && (
            <>
              <Button
                className="rf-button"
                isDisabled={!can("edit")}
                onPress={() => update({ flipX: !selected.flipX })}
              >
                {t("flipX")}
              </Button>
              <Button
                className="rf-button"
                isDisabled={!can("edit")}
                onPress={() => update({ flipY: !selected.flipY })}
              >
                {t("flipY")}
              </Button>
              <Button
                className="rf-button"
                data-crop-trigger
                isDisabled={busy || !can("edit")}
                onPress={onCrop}
              >
                {t("crop")}
              </Button>
            </>
          )}
        </section>
      )}
      {panel === "artwork" && (
        <section className="rf-field">
          <h2>{t("artwork")}</h2>
          {(area.artwork ?? product.artwork ?? []).map((art) => (
            <Button
              key={art.id}
              className="rf-button"
              onPress={() =>
                editor.add({
                  id: crypto.randomUUID(),
                  type: "vector",
                  path: art.path,
                  color: art.color ?? "#263c32",
                  x: 3,
                  y: 3,
                  width: 20,
                  height: 20,
                  rotation: 0,
                })
              }
            >
              <svg aria-hidden="true" viewBox="-10 -10 50 50" width="56" height="56">
                <path d={art.path} fill={art.color ?? "currentColor"} />
              </svg>
              {art.name}
            </Button>
          ))}
          {area.allowedElements.includes("vector") &&
            product.upload?.mimeTypes?.includes("image/svg+xml") && (
              <label>
                {t("vectorUpload")}
                <input
                  type="file"
                  accept="image/svg+xml"
                  disabled={area.mode === "guided" && (selected?.type !== "vector" || !can("edit"))}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void upload([file]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            )}
        </section>
      )}
      {panel === "templates" && (
        <section className="rf-field">
          <h2>{t("templates")}</h2>
          {area.templates?.map((template) => (
            <Button
              className="rf-button rf-template"
              key={template.id}
              onPress={() => editor.applyTemplate(template.id)}
            >
              <svg aria-hidden="true" viewBox={`0 0 ${area.width} ${area.height}`}>
                {template.elements.map((element) =>
                  element.type === "text" ? (
                    <text
                      key={element.id}
                      x={element.x}
                      y={element.y + element.fontSize}
                      fontSize={element.fontSize}
                      fill={element.color}
                    >
                      {element.text}
                    </text>
                  ) : element.type === "vector" ? (
                    <svg
                      key={element.id}
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                      viewBox="0 0 24 24"
                    >
                      <path d={element.path} fill={element.color} />
                    </svg>
                  ) : null,
                )}
              </svg>
              {template.name}
            </Button>
          ))}
        </section>
      )}
    </>
  );
};

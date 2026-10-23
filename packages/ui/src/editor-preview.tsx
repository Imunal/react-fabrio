import { useFabrioTranslation } from "./i18n.js";
import { EditorCanvas, useEditor } from "@react-fabrio/react";
/**
 * Renders the interactive canvas in a preview container.
 *
 * @remarks
 * Requires `FabrioI18nProvider`, `EditorProvider` and the UI stylesheet.
 */
export const EditorPreview = () => {
  const { t } = useFabrioTranslation();
  const { area } = useEditor();
  return (
    <section className="rf-preview" aria-label={t("preview")}>
      <div className="rf-workspace">
        <div className="rf-product" style={{ aspectRatio: `${area.width}/${area.height}` }}>
          <EditorCanvas className="rf-canvas" ariaLabel={t("canvasLabel")} />
        </div>
      </div>
    </section>
  );
};

import { useFabrioTranslation } from "./i18n.js";
import { Button } from "react-aria-components";
import { useEditor } from "@react-fabrio/react";
/**
 * Renders localized undo/redo controls using the current session history.
 *
 * @param props - Optional disabled state and supported panel callbacks.
 *
 * @remarks
 * Requires `FabrioI18nProvider`, `EditorProvider` and the UI stylesheet.
 */
export const EditorToolbar = ({ disabled }: { disabled?: boolean }) => {
  const { t } = useFabrioTranslation();
  const { editor, canUndo, canRedo } = useEditor();
  return (
    <div className="rf-toolbar">
      <Button className="rf-button" isDisabled={disabled || !canUndo} onPress={() => editor.undo()}>
        {t("undo")}
      </Button>
      <Button className="rf-button" isDisabled={disabled || !canRedo} onPress={() => editor.redo()}>
        {t("redo")}
      </Button>
    </div>
  );
};

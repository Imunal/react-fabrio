import { Button } from "react-aria-components";
import { useEditor } from "@react-fabrio/react";

export const EditorToolbar = () => {
  const { editor, layers, product } = useEditor();
  const download = () => {
    if (!editor) return;
    const link = document.createElement("a");
    link.href = editor.exportPng();
    link.download = `${product.id}-design.png`;
    link.click();
  };
  return (
    <div className="rf-toolbar">
      <Button
        className="rf-button rf-primary"
        isDisabled={!editor}
        onPress={() => editor?.addText()}
      >
        + Add text
      </Button>
      <Button className="rf-button" isDisabled={!editor || layers.length === 0} onPress={download}>
        Download PNG <span aria-hidden="true">↗</span>
      </Button>
    </div>
  );
};

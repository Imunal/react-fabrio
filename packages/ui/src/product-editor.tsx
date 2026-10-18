import { EditorProvider } from "@react-fabrio/react";
import type { Product } from "@react-fabrio/react";
import { EditorToolbar } from "./editor-toolbar.js";
import { EditorPreview } from "./editor-preview.js";
import { EditorControls } from "./editor-controls.js";

export const ProductEditor = ({ product }: { product: Product }) => {
  return (
    <EditorProvider product={product}>
      <div className="rf-editor">
        <EditorToolbar />
        <div className="rf-layout">
          <EditorPreview />
          <EditorControls />
        </div>
      </div>
    </EditorProvider>
  );
};

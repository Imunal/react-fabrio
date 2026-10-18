import { EditorCanvas, useEditor } from "@react-fabrio/react";

export const EditorPreview = () => {
  const { product, layers } = useEditor();
  return (
    <section className="rf-preview" aria-label="Design preview">
      <div className="rf-preview-heading">
        <span>Preview</span>
        <span>
          {product.width} × {product.height} mm
        </span>
      </div>
      <div className="rf-workspace">
        <div className="rf-product" style={{ aspectRatio: `${product.width} / ${product.height}` }}>
          <EditorCanvas className="rf-canvas" />
        </div>
      </div>
      <div className="rf-preview-footer">
        <span>{product.name}</span>
        <output>
          {layers.length} text {layers.length === 1 ? "element" : "elements"}
        </output>
      </div>
    </section>
  );
};

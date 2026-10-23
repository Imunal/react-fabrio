import type { GeometryPatch } from "@react-fabrio/core";
import { useEffect, useRef } from "react";
import type { SelectionBounds } from "@react-fabrio/fabric";
import { mountDocumentCanvas } from "@react-fabrio/fabric";
import { useEditor } from "./context.js";

/**
 * Mounts an interactive canvas and keeps it in sync with the provider session.
 *
 * @param props - Host styling, zoom, accessible label, selection-bounds and error callbacks.
 * @returns A canvas host. The renderer is disposed when the component unmounts.
 *
 * @remarks
 * Requires `EditorProvider`. Selection updates reuse objects; document and area changes
 * render content. The session checks permissions and records history when committing gesture geometry.
 */
export const EditorCanvas = ({
  className,
  zoom,
  onError,
  ariaLabel,
  onSelectionBoundsChange,
}: {
  onSelectionBoundsChange?: (bounds: SelectionBounds | null) => void;
  className?: string;
  zoom?: number;
  onError?: (error: Error) => void;
  ariaLabel?: string;
}) => {
  const { editor, product, document, areaId, selectedId } = useEditor();
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof mountDocumentCanvas> | null>(null);
  const boundsCallback = useRef(onSelectionBoundsChange);
  useEffect(() => {
    boundsCallback.current = onSelectionBoundsChange;
  }, [onSelectionBoundsChange]);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    if (!host.current) return;
    const makeOptions = () => ({
      product,
      ...editor.getSnapshot(),
      onSelectionBoundsChange: (bounds: SelectionBounds | null) => boundsCallback.current?.(bounds),
      onSelect: editor.select,
      onTransform: (id: string, patch: GeometryPatch) => {
        editor.select(id);
        return editor.update({ kind: "geometry", changes: patch }).status !== "rejected";
      },
      onError: (error: Error) => onErrorRef.current?.(error),
    });
    const canvas = mountDocumentCanvas(host.current, makeOptions());
    instance.current = canvas;
    return () => {
      instance.current = null;
      void canvas.dispose();
    };
  }, [editor, product]);
  useEffect(() => {
    void instance.current?.render({
      product,
      document,
      areaId,
      selectedId: editor.getSnapshot().selectedId,
      onSelectionBoundsChange: (bounds: SelectionBounds | null) => boundsCallback.current?.(bounds),
      onSelect: editor.select,
      onTransform: (id, patch) => {
        editor.select(id);
        return editor.update({ kind: "geometry", changes: patch }).status !== "rejected";
      },
      onError: (error) => onErrorRef.current?.(error),
    });
  }, [editor, product, document, areaId]);
  useEffect(() => {
    instance.current?.setAriaLabel(
      ariaLabel ?? "Design canvas. Use the element list and controls to edit with a keyboard.",
    );
  }, [editor, product, ariaLabel]);
  useEffect(() => {
    instance.current?.setSelection(selectedId);
  }, [selectedId]);
  useEffect(() => {
    instance.current?.setZoom(zoom ?? 1);
  }, [zoom]);
  return <div className={className} ref={host} />;
};

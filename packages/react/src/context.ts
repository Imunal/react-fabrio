import { createContext, useContext, useSyncExternalStore } from "react";
import type { EditorSession } from "@react-fabrio/core";

export const EditorContext = createContext<EditorSession | null>(null);
/**
 * Subscribes a React component to the provider's editor session.
 *
 * @returns The session, configuration, current snapshot, active area, selected element and layers.
 * @throws Error - If called outside `EditorProvider`.
 *
 * @remarks
 * Selection and area changes update this subscription without triggering `onChange`.
 */
export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error("Editor components must be inside EditorProvider.");
  return context;
};
export const useEditor = () => {
  const editor = useEditorContext();
  const snapshot = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  return {
    editor,
    product: editor.product,
    ...snapshot,
    area: editor.product.sides
      .flatMap((side) => side.areas)
      .find((area) => area.id === snapshot.areaId)!,
    selected: snapshot.document.areas[snapshot.areaId]?.find(
      (element) => element.id === snapshot.selectedId,
    ),
    layers: snapshot.document.areas[snapshot.areaId] ?? [],
  };
};

import { createContext, useContext, useSyncExternalStore } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Product } from "@react-fabrio/core";
import type { EditorSnapshot, FabricEditor } from "@react-fabrio/fabric";

interface EditorContextValue {
  product: Product;
  editor: FabricEditor | null;
  setEditor: Dispatch<SetStateAction<FabricEditor | null>>;
}

export const EditorContext = createContext<EditorContextValue | null>(null);
const emptySnapshot: EditorSnapshot = { layers: [], selected: null };
const getEmptySnapshot = () => emptySnapshot;
const emptySubscribe = () => () => {};

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error("Editor components must be inside EditorProvider.");
  return context;
};

export const useEditor = () => {
  const { product, editor } = useEditorContext();
  const snapshot = useSyncExternalStore(
    editor?.subscribe ?? emptySubscribe,
    editor?.getSnapshot ?? getEmptySnapshot,
    getEmptySnapshot,
  );
  return { product, editor, ...snapshot };
};

import { useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "@react-fabrio/core";
import type { FabricEditor } from "@react-fabrio/fabric";
import { EditorContext } from "./context.js";

export const EditorProvider = ({
  product,
  children,
}: {
  product: Product;
  children: ReactNode;
}) => {
  const [editor, setEditor] = useState<FabricEditor | null>(null);
  const value = { product, editor, setEditor };
  return <EditorContext value={value}>{children}</EditorContext>;
};

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ProductConfig, DesignDocument } from "@react-fabrio/core";
import { createEditorSession } from "@react-fabrio/core";
import { releaseAssetUrls } from "./asset-urls.js";
import { EditorContext } from "./context.js";

export interface EditorProviderProps {
  product: ProductConfig;
  initialDesign?: DesignDocument;
  onChange?: (document: DesignDocument) => void;
  children: ReactNode;
}
const SessionProvider = ({ product, initialDesign, onChange, children }: EditorProviderProps) => {
  const [session] = useState(() => createEditorSession(product, initialDesign));
  useEffect(() => () => releaseAssetUrls(session), [session]);
  useEffect(() => {
    let previous = session.getSnapshot().document;
    return session.subscribe(() => {
      const document = session.getSnapshot().document;
      if (document !== previous) {
        previous = document;
        onChange?.(structuredClone(document));
      }
    });
  }, [session, onChange]);
  return <EditorContext value={session}>{children}</EditorContext>;
};
/**
 * Provides a core editor session to canvas components and custom controls.
 *
 * @param props - Product configuration, optional initial design, change callback and children.
 * @returns The session context for the supplied children.
 *
 * @remarks
 * The initial design is read once. Changing product ID or revision creates a new session;
 * remount with a new React key to reopen a design for the same revision. `onChange` receives
 * cloned documents after edits and undo/redo, excluding selection and area-only changes.
 */
export const EditorProvider = (props: EditorProviderProps) => (
  <SessionProvider key={JSON.stringify([props.product.id, props.product.revision])} {...props} />
);

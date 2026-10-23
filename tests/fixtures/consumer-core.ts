import {
  createDesignDocument,
  createEditorSession,
  printPixelDimensions,
} from "@react-fabrio/core";
import { mugProduct } from "@react-fabrio/core/examples";
if ("document" in globalThis || "window" in globalThis) throw new Error("Unexpected DOM runtime");
const session = createEditorSession(mugProduct, createDesignDocument(mugProduct));
if (session.getSnapshot().document.schemaVersion !== 1) throw new Error("Unexpected schema");
if (printPixelDimensions(25.4, 25.4).width !== 300)
  throw new Error("Unexpected physical dimensions");
// @ts-expect-error The core consumer has no DOM library.
void (null as unknown as HTMLElement);

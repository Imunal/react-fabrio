import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createEditorSession, printPixelDimensions } from "@react-fabrio/core";
import { mugProduct } from "@react-fabrio/core/examples";
import {
  FabrioI18nProvider,
  ProductEditor,
  ElementList,
  PropertiesPanel,
  PositionControls,
} from "@react-fabrio/ui";
import { EditorProvider } from "@react-fabrio/react";

assert.equal(typeof globalThis.document, "undefined");
assert.equal(typeof globalThis.window, "undefined");
assert.deepEqual(printPixelDimensions(25.4, 25.4), { width: 300, height: 300 });
assert.equal(createEditorSession(mugProduct).getSnapshot().document.productId, mugProduct.id);
assert.ok(renderToString(createElement(ProductEditor, { product: mugProduct })).includes("canvas"));
assert.ok(
  renderToString(
    createElement(
      FabrioI18nProvider,
      { locale: "pl" },
      createElement(
        EditorProvider,
        { product: mugProduct },
        createElement(ElementList),
        createElement(PropertiesPanel),
        createElement(PositionControls),
      ),
    ),
  ),
);

const polishHtml = renderToString(
  createElement(
    FabrioI18nProvider,
    { locale: "pl" },
    createElement(ProductEditor, { product: mugProduct }),
  ),
);
assert.ok(polishHtml.includes('lang="pl"'));
assert.ok(polishHtml.includes("Zatwierdź projekt"));

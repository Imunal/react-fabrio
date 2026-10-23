import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ProductEditor } from "@react-fabrio/ui";
import { mugProduct } from "@react-fabrio/core/examples";
import "@react-fabrio/ui/styles.css";
createRoot(document.getElementById("root")!).render(
  createElement(ProductEditor, { product: mugProduct }),
);

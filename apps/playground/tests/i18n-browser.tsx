/* oxlint-disable react/only-export-components -- Browser integration test harness. */
import { useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { FabrioI18nProvider, ProductEditor } from "@react-fabrio/ui";
import { mugProduct } from "@react-fabrio/core/examples";
import type { AssetReference } from "@react-fabrio/core";

export const harness: {
  changes: number;
  signal?: AbortSignal;
  resolve?: (asset: AssetReference) => void;
  hydrationErrors: string[];
} = { changes: 0, hydrationErrors: [] };
const uploadAsset = (_file: File, signal: AbortSignal) =>
  new Promise<AssetReference>((resolve) => {
    harness.signal = signal;
    harness.resolve = resolve;
  });
const Editor = () => {
  const [locale, setLocale] = useState("pl");
  return (
    <>
      <button onClick={() => setLocale(locale === "pl" ? "en" : "pl")}>Switch language</button>
      <FabrioI18nProvider locale={locale}>
        <ProductEditor
          product={mugProduct}
          uploadAsset={uploadAsset}
          onChange={() => harness.changes++}
        />
      </FabrioI18nProvider>
    </>
  );
};
export const mountUpload = () => {
  const host = document.createElement("div");
  host.style.height = "100dvh";
  document.body.replaceChildren(host);
  createRoot(host).render(<Editor />);
};
export const mountHydrated = () => {
  const app = (
    <FabrioI18nProvider locale="pl">
      <ProductEditor product={mugProduct} />
    </FabrioI18nProvider>
  );
  const host = document.createElement("div");
  host.style.height = "100dvh";
  host.innerHTML = renderToString(app);
  document.body.replaceChildren(host);
  hydrateRoot(host, app, {
    onRecoverableError: (error) => harness.hydrationErrors.push(String(error)),
  });
};
export const mountPair = () => {
  const host = document.createElement("div");
  document.body.replaceChildren(host);
  createRoot(host).render(
    <>
      <section aria-label="Polish editor" style={{ height: "500px" }}>
        <FabrioI18nProvider locale="pl">
          <ProductEditor product={mugProduct} />
        </FabrioI18nProvider>
      </section>
      <section aria-label="English editor" style={{ height: "500px" }}>
        <ProductEditor product={mugProduct} />
      </section>
    </>,
  );
};

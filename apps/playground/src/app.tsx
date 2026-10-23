import { useState } from "react";
import { FabrioI18nProvider, ProductEditor } from "@react-fabrio/ui";
import { validateDesignDocument } from "@react-fabrio/core";
import type { DesignDocument } from "@react-fabrio/core";
import "@react-fabrio/ui/styles.css";
import "./styles.css";

import { products, createDemoDesign } from "./demo.js";
const hostTranslations = {
  pl: {
    product: "Produkt",
    language: "Język / Language",
    reopen: "Wczytaj projekt JSON",
    error: "Nie udało się wczytać projektu. Sprawdź plik i spróbuj ponownie.",
  },
  en: {
    product: "Product",
    language: "Język / Language",
    reopen: "Open design JSON",
    error: "Unable to open the design. Check the file and retry.",
  },
};

const App = () => {
  const [locale, setLocale] = useState<"pl" | "en">("pl");
  const host = hostTranslations[locale];
  const [example, setExample] = useState("mug");
  const [initialDesign, setInitialDesign] = useState<DesignDocument | undefined>(createDemoDesign);
  const [session, setSession] = useState(0);
  const [error, setError] = useState(false);
  const product = products[example]!;
  return (
    <FabrioI18nProvider locale={locale}>
      <main className="playground" lang={locale}>
        <ProductEditor
          key={`${example}-${session}`}
          product={product}
          headerStart={
            <>
              <label>
                <select
                  aria-label={host.language}
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as "pl" | "en")}
                >
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label>
                <select
                  aria-label={host.product}
                  value={example}
                  onChange={(event) => {
                    setExample(event.target.value);
                    setInitialDesign(event.target.value === "mug" ? createDemoDesign() : undefined);
                    setSession((value) => value + 1);
                  }}
                >
                  {Object.entries(products).map(([id, product]) => (
                    <option key={id} value={id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
          headerActions={
            <label>
              {host.reopen}
              <input
                type="file"
                accept="application/json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file
                    .text()
                    .then((text) => {
                      const value: unknown = JSON.parse(text);
                      const issues = validateDesignDocument(value, product);
                      if (
                        issues.some(
                          (issue) =>
                            issue.severity === "error" &&
                            !["outside-safe-area", "asset-limit-exceeded"].includes(issue.code),
                        )
                      )
                        throw new Error(issues.map((issue) => issue.message).join("; "));
                      setInitialDesign(value as DesignDocument);
                      setSession((value) => value + 1);
                      setError(false);
                    })
                    .catch(() => setError(true));
                  event.target.value = "";
                }}
              />
            </label>
          }
          initialDesign={initialDesign}
          onChange={(document) => {
            localStorage.setItem(`fabrio-${product.id}`, JSON.stringify(document));
          }}
          onConfirm={(result) => {
            for (const file of result.files) {
              const url = URL.createObjectURL(file.blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = file.filename;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          }}
        />
        {error && (
          <p className="playground-error" role="alert">
            {host.error}
          </p>
        )}
      </main>
    </FabrioI18nProvider>
  );
};
export default App;

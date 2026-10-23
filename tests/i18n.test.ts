import { createRequire } from "node:module";
import { expect, test } from "vitest";
import {
  FabrioI18nProvider,
  fabrioTranslations,
  useFabrioTranslation,
} from "../packages/ui/src/i18n.js";
import type { FabrioTranslationResources } from "../packages/ui/src/i18n.js";

const require = createRequire(new URL("../apps/playground/package.json", import.meta.url));
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const Probe = ({ count = 1 }: { count?: number }) => {
  const { locale, t } = useFabrioTranslation();
  return `${locale}|${t("confirm")}|${t("galleryCount", { count, limit: 30 })}|${t("layerMoved", { name: "Photo", position: 2, total: 3 })}`;
};
const render = (locale?: string, resources?: FabrioTranslationResources, count = 1): string =>
  renderToStaticMarkup(
    createElement(FabrioI18nProvider, { locale, resources }, createElement(Probe, { count })),
  );

test("bundled catalogues contain the same complete set of keys and interpolation parameters", () => {
  expect(Object.keys(fabrioTranslations.pl).sort()).toEqual(
    Object.keys(fabrioTranslations.en).sort(),
  );
  for (const key of Object.keys(fabrioTranslations.en) as (keyof typeof fabrioTranslations.en)[]) {
    const params = (value: string) =>
      [...value.matchAll(/{{(.*?)}}/g)].map((match) => match[1]).sort();
    expect(params(fabrioTranslations.pl[key]), key).toEqual(params(fabrioTranslations.en[key]));
  }
});

test("SSR renders the requested locale synchronously, including interpolation", () => {
  expect(render("pl")).toContain(
    "pl|Zatwierdź projekt|1 zdjęcie z 30|Photo. Pozycja warstwy 2 z 3.",
  );
  expect(render()).toContain("en|Confirm design|1 photo of 30|Photo. Layer position 2 of 3.");
});

test.each([
  [0, "0 zdjęć z 30"],
  [1, "1 zdjęcie z 30"],
  [2, "2 zdjęcia z 30"],
  [5, "5 zdjęć z 30"],
  [22, "22 zdjęcia z 30"],
])("Polish plural rules select the right form for %i", (count, expected) => {
  expect(render("pl", undefined, count)).toContain(expected);
  expect(render("en", undefined, count)).toContain(
    `${count} ${count === 1 ? "photo" : "photos"} of 30`,
  );
});

test("host overrides, regional fallback, new languages and English fallback compose", () => {
  expect(render("pl-PL", { pl: { confirm: "Akceptuj" } })).toContain(
    "pl-PL|Akceptuj|1 zdjęcie z 30",
  );
  expect(
    render("pl-PL", { "pl-PL": { confirm: "Zapisz" }, pl: { confirm: "Akceptuj" } }),
  ).toContain("pl-PL|Zapisz|1 zdjęcie z 30");
  expect(render("de-DE", { de: { confirm: "Bestätigen" } })).toContain(
    "de-DE|Bestätigen|1 photo of 30",
  );
});

test("simultaneous SSR providers remain isolated from each other and a host i18next provider", async () => {
  const uiRequire = createRequire(new URL("../packages/ui/package.json", import.meta.url));
  const { createInstance } = uiRequire("i18next");
  const { I18nextProvider } = uiRequire("react-i18next");
  const host = createInstance();
  await host.init({ lng: "de", resources: { de: { translation: { confirm: "Host" } } } });
  const markup: string = renderToStaticMarkup(
    createElement(I18nextProvider, { i18n: host }, [
      createElement(FabrioI18nProvider, { locale: "pl", key: "pl" }, createElement(Probe)),
      createElement(FabrioI18nProvider, { locale: "en", key: "en" }, createElement(Probe)),
    ]),
  );
  expect(markup).toContain("pl|Zatwierdź projekt");
  expect(markup).toContain("en|Confirm design");
  expect(host.language).toBe("de");
  expect(host.t("confirm")).toBe("Host");
});

// These compile-time assertions ensure the hook does not widen its public contract.
const typeChecks = (t: ReturnType<typeof useFabrioTranslation>["t"]) => {
  t("confirm");
  t("galleryCount", { count: 2, limit: 10 });
  // @ts-expect-error Unknown catalogue key.
  t("nonexistent");
  // @ts-expect-error Required interpolation parameters cannot be omitted.
  t("layerMoved");
  // @ts-expect-error Plural counts must be numbers.
  t("pendingUploads", { count: "two" });
};
void typeChecks;

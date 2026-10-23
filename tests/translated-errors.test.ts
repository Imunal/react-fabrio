import { expect, test } from "vitest";
import { createRequire } from "node:module";
const { createInstance } = createRequire(new URL("../packages/ui/package.json", import.meta.url))(
  "i18next",
);
import { fabrioTranslations } from "../packages/ui/src/i18n.js";
import type { useFabrioTranslation } from "../packages/ui/src/i18n.js";
import {
  errorIssues,
  translateIssue,
  uploadErrorKey,
} from "../packages/ui/src/translated-errors.js";

test("validation presentation translates stable codes and parameters without exposing technical messages", async () => {
  const instance = createInstance();
  await instance.init({
    lng: "pl",
    resources: { pl: { translation: fabrioTranslations.pl } },
    interpolation: { escapeValue: false },
  });
  const t = instance.t.bind(instance) as ReturnType<typeof useFabrioTranslation>["t"];
  expect(
    translateIssue(
      {
        code: "required-field",
        severity: "error",
        message: "technical",
        params: { label: "Imię" },
      },
      t,
    ),
  ).toBe("Pole Imię jest wymagane.");
  expect(
    translateIssue({ code: "unknown", severity: "error", message: "private host exception" }, t),
  ).toBe(fabrioTranslations.pl.error);
  expect(
    translateIssue({ code: "outside-safe-area", severity: "warning", message: "technical" }, t),
  ).toBe(fabrioTranslations.pl.cropWarning);
});

test.each([
  ["invalid-replacement", "uploadInvalidReplacement"],
  ["gallery-capacity", "uploadGalleryCapacity"],
  ["upload-not-permitted", "uploadNotPermitted"],
  ["engraving-vector-required", "uploadEngravingVectorRequired"],
  ["invalid-svg", "uploadInvalidSvg"],
  ["unknown", "uploadFailed"],
])("upload presentation maps %s to a translatable key", (code, key) => {
  expect(uploadErrorKey(code)).toBe(key);
});

test("domain errors retain their issue codes and interpolation parameters", () => {
  const issues = [
    {
      code: "required-field",
      message: "technical",
      severity: "error" as const,
      params: { label: "Imię" },
    },
  ];
  expect(errorIssues(Object.assign(new Error("private"), { issues }))).toEqual(issues);
  expect(errorIssues(new Error("private"))).toBeUndefined();
  expect(errorIssues(Object.assign(new Error("private"), { issues: ["private"] }))).toBeUndefined();
});

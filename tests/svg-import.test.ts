import { expect, test } from "vitest";
import { importSvgPath, parseRestrictedSvg } from "../packages/fabric/src/svg-import.js";

test.each([
  "<svg><g></svg>",
  "<svg><path></g></svg>",
  "<svg></svg><svg></svg>",
  "<svg><svg></svg>",
  '<svg width="1" width="2"></svg>',
  '<svg><path d="M0 0"d="M1 1"/></svg>',
  "<svg><script / >alert(1)</script></svg>",
  "<svg><scr<script>ipt/></svg>",
  "<svg><!-- hidden --></svg>",
  "<svg><![CDATA[ ]]></svg>",
  '<?xml version="1.0"?><svg/>',
  "<!DOCTYPE svg><svg/>",
  '<svg fill="&#98;lack"/>',
  "<svg>text</svg>",
  '<svg fill="url (file:///tmp/a)"/>',
  '<svg xmlns="https://example.com/svg"/>',
  '<svg><path\u00a0d="M0 0"/></svg>',
])("rejects malformed or unsupported XML %#", (source) => {
  expect(() => parseRestrictedSvg(source)).toThrow();
});

test("validates a complete document and preserves accepted markup", () => {
  const source =
    ' \n<svg xmlns="http://www.w3.org/2000/svg"><g fill="black"><path d="M0 0L1 0L0 1Z" /></g></svg>\t';
  expect(parseRestrictedSvg(source)).toBe(source);
  expect(parseRestrictedSvg("<svg/>")).toBe("<svg/>");
});

test.each([
  "translate(1,,2)",
  "translate(1 2 3)",
  "translate(1e 2)",
  "translate(.)",
  "translate(1e999)",
  "matrix(1 0 0 1 0)",
  "scale(1) garbage",
  "rotate(1 2)",
  "skewX(1 2)",
  "translate(1)scale(2),",
])("rejects invalid transform syntax: %s", async (transform) => {
  await expect(
    importSvgPath(`<svg><rect width="2" height="3" transform="${transform}"/></svg>`),
  ).rejects.toThrow("transform");
});

test("imports all supported transform functions with valid numeric syntax", async () => {
  const source =
    '<svg><rect width="2" height="3" transform="matrix(1 0 0 1 0 0) translate(1e1,-2)scale(.5) rotate(0 1 1)skewX(0)skewY(0)"/></svg>';
  expect(await importSvgPath(source)).toBe("M10-2H11V-0.5H10Z");
});

test("handles adversarial attribute names and whitespace without rescanning", () => {
  const whitespace = " ".repeat(100_000);
  expect(parseRestrictedSvg(`<svg${whitespace}width="1"></svg>`)).toContain('width="1"');
  expect(() => parseRestrictedSvg(`<svg ${"a".repeat(100_000)}="1"></svg>`)).toThrow();
  expect(() => parseRestrictedSvg(`<svg ${whitespace}width${whitespace}></svg>`)).toThrow();
});

test("rejects long malformed transform lists", async () => {
  await expect(
    importSvgPath(`<svg><rect transform="${"translate(1) ".repeat(2_000)}!"/></svg>`),
  ).rejects.toThrow("transform");
});

test.each([
  '<svg stroke="black"><rect width="2" height="3"/></svg>',
  '<svg><g stroke="black"><rect width="2" height="3"/></g></svg>',
  '<svg><rect fill-rule="evenodd" width="2" height="3"/></svg>',
  '<svg><line x2="2" y2="3"/></svg>',
  '<svg><polyline points="0 0 2 3"/></svg>',
  '<svg><svg><rect width="2" height="3"/></svg></svg>',
  '<svg fill="none"><rect width="2" height="3"/></svg>',
])("preserves filled geometry import restrictions %#", async (source) => {
  await expect(importSvgPath(source)).rejects.toThrow();
});

test("self-closing shapes do not leak transforms or fills into siblings", async () => {
  const result = await importSvgPath(
    '<svg><rect fill="none" transform="translate(50)" width="2" height="3"/><g transform="translate(2 3)"><rect width="2" height="3"/></g><rect width="2" height="3"/></svg>',
  );
  expect(result).toBe("M2 3H4V6H2Z M0 0H2V3H0Z");
});

test("normalizes large valid transform whitespace before conversion", async () => {
  const space = " ".repeat(100_000);
  const source = `<svg><rect width="2" height="3" transform="${space}translate${space}(${space}1${space},${space}2${space})${space}"/></svg>`;
  expect(await importSvgPath(source)).toBe("M1 2H3V5H1Z");
});

test("rejects whitespace-only transform lists", async () => {
  await expect(
    importSvgPath('<svg><rect width="2" height="3" transform="   "/></svg>'),
  ).rejects.toThrow("transform");
});

test("rejects overflow from combining finite transforms", async () => {
  await expect(
    importSvgPath(
      '<svg transform="scale(1e200)"><rect width="2" height="3" transform="scale(1e200)"/></svg>',
    ),
  ).rejects.toThrow("finite");
});

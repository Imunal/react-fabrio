import { afterEach, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const fixtures: string[] = [];
afterEach(() => fixtures.splice(0).forEach((directory) => rmSync(directory, { recursive: true })));

const checkDocumentation = (body: string) => {
  const root = mkdtempSync(resolve(tmpdir(), "fabrio-docs-"));
  fixtures.push(root);
  for (const name of ["README.md", "CONTRIBUTING.md", "GLOSSARY.md", "AGENTS.md"])
    writeFileSync(resolve(root, name), "# Repository\n");
  const content = resolve(root, "apps/docs/content");
  mkdirSync(content, { recursive: true });
  writeFileSync(resolve(content, "meta.json"), JSON.stringify({ pages: ["index"] }));
  writeFileSync(
    resolve(content, "index.md"),
    `---\ntitle: Example\ndescription: Example page.\n---\n\n${body}\n`,
  );

  return spawnSync(process.execPath, ["scripts/check-docs.mjs", root], {
    encoding: "utf8",
  });
};

test.each([
  ["[Missing](missing.md)", "missing target"],
  ["[Missing anchor](#unknown)", "missing anchor"],
  ["Read `docs/obsolete.md`.", "obsolete documentation directory"],
])("rejects invalid documentation: %s", (body, error) => {
  const result = checkDocumentation(body);

  // then
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(error);
});

test("checks visible heading text and duplicate anchors without producing HTML", () => {
  const result = checkDocumentation(`
## Read <em>this</em> first
## Read <em>this</em> first
## Zażółć <strong>gęślą</strong>
## <scr<script>ipt>
## n < 3

[Inline HTML](#read-this-first)
[Duplicate](#read-this-first-1)
[Unicode](#zażółć-gęślą)
[Malformed HTML](#ipt)
[Less than](#n--3)
`);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
});

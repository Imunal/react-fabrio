import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const output = resolve("dist/client");
const exported = JSON.parse(await readFile(resolve(output, "export.json"), "utf8"));
const write = async (path, content) => {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
};
await write("llms.txt", exported.index);
await write("llms-full.txt", exported.full);
await write("api/search.json", JSON.stringify(exported.search));
for (const page of exported.pages) {
  const slug = page.url.replace(/^\/react-fabrio\//, "").replace(/\/$/, "");
  await write(`${slug}/content.md`, page.markdown);
  await readFile(resolve(output, `${slug}/index.html`));
}
await write(".nojekyll", "");
await write(
  "404.html",
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found | React Fabrio</title><h1>Page not found</h1><a href="/react-fabrio/docs/">Read the documentation</a></html>',
);
await unlink(resolve(output, "export.json"));
console.log(`Exported ${exported.pages.length} Markdown pages, LLM indexes and static search.`);

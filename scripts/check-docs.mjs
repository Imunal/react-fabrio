import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../", import.meta.url));
const collection = resolve(root, "apps/docs/content");
const markdownFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? markdownFiles(path) : /\.mdx?$/.test(entry.name) ? [path] : [];
      }),
    )
  ).flat();
};
const pages = await markdownFiles(collection);
const files = [
  ...["README.md", "CONTRIBUTING.md", "GLOSSARY.md", "AGENTS.md"].map((name) =>
    resolve(root, name),
  ),
  ...pages,
];
const failures = [];
const stripCode = (content) =>
  content.replace(/^---\n[^]*?\n---\n/, "").replace(/```[^]*?```/g, "");
// Build an anchor from visible heading characters; this does not produce HTML.
const headingAnchor = (heading) => {
  let anchor = "";
  let inTag = false;
  const text = heading.toLowerCase();
  const lastTagEnd = text.lastIndexOf(">");
  let index = 0;
  for (const character of text) {
    if (character === "<" && index < lastTagEnd) inTag = true;
    else if (character === ">" && inTag) inTag = false;
    else if (!inTag) {
      if (/\s/u.test(character)) anchor += "-";
      else if (/[\p{L}\p{N}_-]/u.test(character)) anchor += character;
    }
    index += character.length;
  }
  return anchor;
};
const anchors = (text) => {
  const counts = new Map();
  const result = new Set();
  for (const match of stripCode(text).matchAll(/^#{1,6}\s+(.+?)(?:\s+#+)?$/gm)) {
    const base = headingAnchor(match[1]);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    result.add(count ? `${base}-${count}` : base);
  }
  return result;
};
for (const file of files) {
  const raw = await readFile(file, "utf8");
  const content = stripCode(raw);
  const label = relative(root, file);
  if (/(?:^|[\s`(])docs\//m.test(content))
    failures.push(`${label}: obsolete documentation directory`);
  if (pages.includes(file)) {
    if (!/^---\n[^]*?\btitle: .+\n[^]*?\bdescription: .+\n[^]*?---\n/.test(raw))
      failures.push(`${label}: missing title or description`);
    const meta = JSON.parse(await readFile(resolve(dirname(file), "meta.json"), "utf8"));
    const slug = file.slice(dirname(file).length + 1).replace(/\.mdx?$/, "");
    if (!meta.pages.includes(slug)) failures.push(`${label}: absent from navigation`);
  }
  for (const match of content.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
    const [path, fragment] = target.split("#");
    const destination = path
      ? resolve(dirname(file), decodeURIComponent(path.split("?")[0]))
      : file;
    try {
      await stat(destination);
      if (fragment && /\.mdx?$/.test(destination)) {
        const text = await readFile(destination, "utf8");
        // Fumadocs renders the frontmatter title as the page heading without an anchor.
        if (!anchors(text).has(decodeURIComponent(fragment)))
          failures.push(`${label}: missing anchor ${target}`);
      }
    } catch {
      failures.push(`${label}: missing target ${target}`);
    }
  }
}
// Every folder in the collection must be reachable from its parent's navigation.
for (const directory of new Set(pages.map(dirname))) {
  if (directory === collection) continue;
  const meta = JSON.parse(await readFile(resolve(directory, "../meta.json"), "utf8"));
  if (!meta.pages.includes(relative(dirname(directory), directory)))
    failures.push(`${relative(root, directory)}: folder absent from navigation`);
}
try {
  await stat(resolve(root, "docs"));
  failures.push("Old documentation directory still exists");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
console.log(
  `Checked ${files.length} Markdown files, anchors and navigation; ${failures.length} errors.`,
);

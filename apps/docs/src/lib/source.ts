import { loader, llms } from "fumadocs-core/source";
import { resolveDocLink } from "./links";
import { defineDocs } from "fumadocs-mdx/macro";

export const docs = defineDocs({
  dir: "content",
  docs: { postprocess: { includeProcessedMarkdown: true } },
});

export const source = loader({
  baseUrl: "/react-fabrio/docs",
  source: docs.toFumadocsSource(),
});

export const docsLlms = llms(source, {
  renderPage: async (page) =>
    `# ${page.data.title}\n\n${(await page.data.getText("processed")).replace(/\]\(([^\s)]+)\)/g, (_match, href: string) => `](${resolveDocLink(page.path, href)})`)}`,
});

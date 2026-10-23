import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { source, docsLlms } from "../../lib/source";

export const Route = createFileRoute("/api/export")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          index: await docsLlms.index(),
          full: await docsLlms.full(),
          search: await createFromSource(source).export(),
          pages: await Promise.all(
            source.getPages().map(async (page) => ({
              url: page.url,
              markdown: await docsLlms.page(page),
            })),
          ),
        }),
    },
  },
});

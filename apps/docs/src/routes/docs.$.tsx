import { createFileRoute, notFound } from "@tanstack/react-router";
import { source, docsLlms } from "../lib/source";
import { Documentation } from "../components/documentation";

export const Route = createFileRoute("/docs/$")({
  server: {
    handlers: {
      GET: async ({ params, next }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        if (slugs.at(-1) !== "content.md") return next();
        const page = source.getPage(slugs.slice(0, -1));
        if (!page) return new Response("Page not found", { status: 404 });
        return new Response(await docsLlms.page(page), {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
      },
    },
  },
  loader: ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const page = source.getPage(slugs);
    if (!page) throw notFound();
    return { slugs, title: page.data.title, description: page.data.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Documentation"} | React Fabrio` },
      { name: "description", content: loaderData?.description ?? "React Fabrio documentation" },
    ],
  }),
  component: function Page() {
    const { slugs } = Route.useLoaderData();
    return <Documentation slugs={slugs} />;
  },
});

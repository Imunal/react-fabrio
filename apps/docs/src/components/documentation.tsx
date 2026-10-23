import { notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ComponentProps } from "react";
import { source } from "../lib/source";
import { resolveDocLink } from "../lib/links";

export const Documentation = ({ slugs }: { slugs: string[] }) => {
  const page = source.getPage(slugs);
  if (!page) throw notFound();
  const MDX = page.data.body;
  const Anchor = ({ href, ...props }: ComponentProps<"a">) => {
    const Component = defaultMdxComponents.a;
    return <Component {...props} href={href ? resolveDocLink(page.path, href) : href} />;
  };
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: "React Fabrio", url: "/react-fabrio/" }}
      githubUrl="https://github.com/Imunal/react-fabrio"
    >
      <DocsPage toc={page.data.toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <div className="mb-6 flex items-center gap-4 border-b pb-4 text-sm">
          <MarkdownCopyButton
            markdownUrl={`${page.url.replace(/^\/react-fabrio/, "")}/content.md`}
          />
          <a
            href={`https://github.com/Imunal/react-fabrio/blob/main/apps/docs/content/${page.path}`}
          >
            View source
          </a>
        </div>
        <DocsBody>
          <MDX components={{ ...defaultMdxComponents, a: Anchor }} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
};

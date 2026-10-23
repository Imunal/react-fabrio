import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";

const files = readdirSync(resolve("content"), { recursive: true })
  .map(String)
  .filter((file) => /\.mdx?$/.test(file));
const paths = [
  "/",
  ...files.map((file) => `/docs/${file.replace(/\.mdx?$/, "").replace(/(?:^|\/)index$/, "")}`),
];

export default defineConfig({
  base: "/react-fabrio/",
  plugins: [
    fumadocsMdx({ macro: { include: ["**/lib/source.ts"] } }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        autoSubfolderIndex: true,
        failOnError: true,
      },
      pages: [
        ...paths.map((path) => ({ path: `/react-fabrio${path}` })),
        { path: "/react-fabrio/api/export", prerender: { outputPath: "/export.json" } },
      ],
    }),
    react(),
  ],
});

---
title: Documentation maintenance
description: Edit the single Markdown collection, verify the static export and deploy to GitHub Pages.
---

## Choose the page purpose

Choose a section based on what the reader needs:

| Section       | Purpose                                          | Example                 |
| ------------- | ------------------------------------------------ | ----------------------- |
| Tutorials     | Teach a newcomer through a complete exercise     | Quick Start             |
| How-to guides | Solve one integration task with concrete steps   | Save and reopen designs |
| Reference     | Define fields, defaults, signatures and behavior | Product configuration   |
| Explanation   | Explain the model and design choices             | Architecture            |
| Contributing  | Maintain and verify the project                  | This page               |

Keep one primary purpose per page. Put exact contracts in reference pages and link to them from task guides. Keep release targets in [release acceptance](release.md), separate from current behavior. Use the root [glossary](../../../GLOSSARY.md) for terminology and check examples against exported code.

## Edit sources and navigation

All documentation sources live in `apps/docs/content/`. Ordinary pages use `.md`; reserve `.mdx` for pages requiring components. Every page needs a frontmatter title and description and an entry in its folder's `meta.json`. Keep links relative to the source file so they work on GitHub. Rendering maps links inside this collection to the documentation site and links outside it to the repository on GitHub.

Link to the root `README.md`, `CONTRIBUTING.md`, `GLOSSARY.md` and `AGENTS.md` for repository instructions and terminology. Keep those files authoritative instead of duplicating their contents.

## Run and verify locally

```sh
pnpm docs:dev
node scripts/check-docs.mjs
pnpm docs:build
pnpm docs:test
```

Development and preview use `http://localhost:3000/react-fabrio/`. Run `pnpm docs:preview` after building to inspect the static site. Build before running browser tests.

Run `node scripts/check-docs.mjs` from the repository root to check files, anchors, navigation coverage and obsolete documentation paths. Run `pnpm docs:build` and `pnpm docs:test` to verify generated HTML, static search, Markdown endpoints and keyboard/mobile navigation. The compiled public examples remain covered by `pnpm typecheck`.

## Static output

The static output is `apps/docs/dist/client/`. Preview uses a strict static server at `http://localhost:3000/react-fabrio/`, with no application fallback. The site uses `/react-fabrio/` for assets, router links and text endpoints. Search downloads a static index and runs in the browser; no server or API key is needed.

## Deploy with GitHub Pages

The Pages workflow validates pull requests and publishes successful `main` builds through the `github-pages` environment. It can also be dispatched manually on `main`. On the first deployment, a repository administrator must choose **GitHub Actions** under **Settings → Pages → Build and deployment → Source**. This setting requires repository administration access; the workflow does not grant itself that access.

## Verify a deployment

After deployment, inspect the homepage, reload `/react-fabrio/docs/agents/domain/`, search for "durable", and open `/react-fabrio/llms.txt`. The workflow performs HTTP smoke checks for these public endpoints. Inspect keyboard and mobile behavior in the build's Playwright checks.

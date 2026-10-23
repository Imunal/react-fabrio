# Contributing

Use Node and pnpm versions declared in [package.json](package.json). Install dependencies with `pnpm install`, then run `pnpm dev` for the playground.

## Workflow

Read the [glossary](GLOSSARY.md), [architecture](apps/docs/content/architecture.md), and [relevant domain references](apps/docs/content/index.md). Keep changes in the owning package and update the reference that defines the changed contract. Add meaningful behavior tests for document fidelity, permissions, output correctness or customer workflows; avoid tests that duplicate implementation details.

The playground imports the exported product fixtures. Change those fixtures rather than maintaining copied example configurations. Keep API examples aligned with emitted declaration files.

## Code and test style

Define functions with `const` and arrow syntax. Build JSON contracts with Zod, infer their types using `z.infer`, and derive JSON Schema exports using `z.toJSONSchema`.

Write straightforward tests with explicit `// given`, `// when`, and `// then` sections. Keep setup, the action and assertions separate. Split independent behaviors into separate tests; use `test.each` for input tables instead of loops with assertions. Keep fixtures small and avoid hiding the tested behavior behind helpers.

## Verification

Run `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and `pnpm react-doctor` before release preparation. Install the configured Playwright browsers with `pnpm exec playwright install --with-deps chromium firefox webkit`. The E2E projects cover desktop Chromium (`desktop`), Firefox (`desktop-firefox`), WebKit (`desktop-webkit`), Pixel 7 (`mobile`), iPhone 13 (`mobile-webkit`) and iPad (`tablet-webkit`). These device profiles are browser emulation, not physical devices. Run all projects with `pnpm test:e2e`, or select one with `pnpm test:e2e --project desktop-firefox`. Touch drag tests use Chromium CDP and are skipped on other engines; the remaining mobile flows also run on WebKit. A missing browser or unavailable network is an incomplete check, not a pass.

For production changes inspect dimensions, PNG physical resolution metadata, clipping and SVG contents. For document changes verify save/reopen and undo/redo. For UI changes verify keyboard access and desktop/mobile flows. Run `node scripts/check-docs.mjs` for Markdown relative links. `tests/integration.tsx` compiles the documented integration examples as part of typecheck. Check schema-valid examples whenever contracts change.

Documentation lives in `apps/docs/content/`; see [documentation maintenance](apps/docs/content/documentation.md) for navigation, static verification and Pages deployment.

## Package boundaries and release preparation

Core owns physical documents and domain rules. Fabric adapts interactions and generates production artifacts. React owns lifecycle and subscriptions. UI owns default controls. Three-dimensional visualization remains optional; see [architecture](apps/docs/content/architecture.md).

Build before packing. Inspect tarball exports, declarations, dependencies and CSS; consume packages outside the workspace to catch accidental source aliases. Retain React 19 peers and MIT licensing. Prepare release notes that name unavailable features and compatibility changes.

Pushes to `main` publish library packages automatically after all CI checks pass. The five packages share one version, determined by Conventional Commits. See [Releasing packages](apps/docs/content/releasing.md) for npm authentication, commit conventions and recovery. Run publication locally only when explicitly requested.

For tickets, follow [issue tracker instructions](apps/docs/content/agents/issue-tracker.md) and [triage roles](apps/docs/content/agents/triage-labels.md).

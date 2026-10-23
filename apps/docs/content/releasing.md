---
title: "Releasing packages"
description: "Automatic npm releases from main, shared versions and CI authentication."
---

The CI workflow publishes the five library packages from `packages/` with one shared version: core, Fabric, React, UI and Three. The root package, playground and documentation app remain private.

## Configure npm access

Add an Actions secret named `NPM_TOKEN` in the GitHub repository. Use an npm granular access token with permission to publish every package in the `@react-fabrio` scope, including creating the packages for the first release. The token must support unattended publication under the npm account's two-factor authentication policy. Renew it before it expires.

The workflow supplies this secret as `NODE_AUTH_TOKEN` through the registry configuration created by `actions/setup-node`. GitHub tags and releases use the job's `GITHUB_TOKEN` with `contents: write`. No separate GitHub token is needed.

## Choose commit messages

Semantic-release uses Conventional Commits to determine the next version:

| Commit                                           | Release    |
| ------------------------------------------------ | ---------- |
| `fix: correct image cropping`                    | Patch      |
| `feat: add a product option`                     | Minor      |
| A commit with a `BREAKING CHANGE:` footer        | Major      |
| Only documentation, tests or maintenance commits | No release |

Use these conventions in the final commit message on `main`, including the squash commit when merging a pull request. The first release is `1.0.0` when there is no existing release tag. Later releases use the previous `v…` tag as their baseline.

## What CI publishes

The `publish` job runs automatically for pushes to `main` after `validate`, `e2e` and `docs` pass. Pull requests and manual workflow dispatches do not publish. Release jobs run one at a time.

The job installs the locked dependencies and builds the library packages. Its separate **Publish packages and create GitHub release** step runs `pnpm release`. Semantic-release checks registry and GitHub access, analyzes commits and generates release notes. When a release is needed, it sets every public library package to the new version, creates the tag and publishes through pnpm. A GitHub release follows successful npm publication.

Workspace dependencies become registry versions during packing. The optional Three peer uses `workspace:^`, so its published range follows the release version too. Version changes happen in the CI checkout and are not committed back to the repository; tags and published manifests record the released versions.

`pnpm release:dry-run` previews the release decision and notes without publishing or changing versions. It still checks remote access and requires registry authentication and a GitHub token. Use a checkout of `main` with full Git history.

## Recover from a partial publication

If publication fails after the tag was created, inspect the job logs and npm before retrying. Semantic-release may see the existing tag and decide there is no new release.

To finish that release, use a clean checkout of its tag, install dependencies and run the preparation script with that tag's version, for example `node scripts/prepare-release.mjs 1.2.3`. Build the packages, then rerun the pnpm publish command from [release.config.mjs](../../../release.config.mjs) with valid registry credentials. Recursive publishing skips package versions already on npm. After all five versions are available, create the missing GitHub release using the notes from the failed run.

Do not remove a tag or reuse a version to change files that have already reached npm.

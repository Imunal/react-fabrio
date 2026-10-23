export default {
  branches: ["main"],
  repositoryUrl: "https://github.com/Imunal/react-fabrio.git",
  tagFormat: "v${version}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/exec",
      {
        verifyConditionsCmd: "npm whoami --registry https://registry.npmjs.org/",
        prepareCmd: "node scripts/prepare-release.mjs ${nextRelease.version}",
        publishCmd: "pnpm --filter './packages/**' -r publish --access public --no-git-checks",
      },
    ],
    [
      "@semantic-release/github",
      { successCommentCondition: false, failCommentCondition: false, releasedLabels: false },
    ],
  ],
};

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const directories: string[] = [];
const script = resolve("scripts/prepare-release.mjs");

const workspace = () => {
  const directory = mkdtempSync(join(tmpdir(), "fabrio-release-"));
  directories.push(directory);
  writeFileSync(join(directory, "package.json"), JSON.stringify({ private: true }));
  writeFileSync(join(directory, "pnpm-workspace.yaml"), 'packages:\n  - "packages/*"\n');
  const manifests = {
    "packages/core": { name: "@react-fabrio/core", version: "0.0.1" },
    "packages/three": { name: "@react-fabrio/three", version: "0.0.1" },
    "packages/ui": {
      name: "@react-fabrio/ui",
      version: "0.0.1",
      dependencies: { "@react-fabrio/core": "workspace:*" },
      peerDependencies: { "@react-fabrio/three": "workspace:^", react: "^19.0.0" },
    },
    "packages/internal": { name: "internal", version: "0.0.0", private: true },
    "apps/playground": { name: "playground", version: "0.0.0", private: true },
  };
  for (const [path, manifest] of Object.entries(manifests)) {
    mkdirSync(join(directory, path), { recursive: true });
    writeFileSync(join(directory, path, "package.json"), JSON.stringify(manifest));
  }
  mkdirSync(join(directory, "packages/empty"));
  return directory;
};

const manifest = (directory: string, path: string) =>
  JSON.parse(readFileSync(join(directory, path, "package.json"), "utf8"));

afterEach(() =>
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true })),
);

test("prepares one release version for public library packages and preserves workspace ranges", () => {
  // given
  const directory = workspace();

  // when
  execFileSync(process.execPath, [script, "1.2.3"], { cwd: directory });

  // then
  expect(manifest(directory, "packages/core").version).toBe("1.2.3");
  expect(manifest(directory, "packages/three").version).toBe("1.2.3");
  expect(manifest(directory, "packages/ui")).toEqual({
    name: "@react-fabrio/ui",
    version: "1.2.3",
    dependencies: { "@react-fabrio/core": "workspace:*" },
    peerDependencies: { "@react-fabrio/three": "workspace:^", react: "^19.0.0" },
  });
  expect(manifest(directory, "packages/internal").version).toBe("0.0.0");
  expect(manifest(directory, "apps/playground").version).toBe("0.0.0");
});

test("rejects an invalid release version before changing package manifests", () => {
  // given
  const directory = workspace();

  // when
  const result = spawnSync(process.execPath, [script, "not-a-version"], {
    cwd: directory,
    encoding: "utf8",
  });

  // then
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Expected a stable release version");
  expect(manifest(directory, "packages/core").version).toBe("0.0.1");
  expect(manifest(directory, "packages/ui").version).toBe("0.0.1");
});

test("packs dependencies and optional peers against the generated release version", () => {
  // given
  const directory = workspace();

  // when
  execFileSync(process.execPath, [script, "2.3.4"], { cwd: directory });
  execFileSync("pnpm", ["--ignore-scripts", "pack", "--pack-destination", directory], {
    cwd: join(directory, "packages/ui"),
    stdio: "pipe",
  });
  const packed = JSON.parse(
    execFileSync(
      "tar",
      ["-xOf", join(directory, "react-fabrio-ui-2.3.4.tgz"), "package/package.json"],
      {
        encoding: "utf8",
      },
    ),
  );

  // then
  expect(packed.version).toBe("2.3.4");
  expect(packed.dependencies["@react-fabrio/core"]).toBe("2.3.4");
  expect(packed.peerDependencies["@react-fabrio/three"]).toBe("^2.3.4");
  expect(packed.peerDependencies.react).toBe("^19.0.0");
});

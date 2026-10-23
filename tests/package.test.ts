import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

const publicPackages = ["core", "fabric", "react", "ui", "three"] as const;
const run = (directory: string, command: string, args: string[]) =>
  execFileSync(command, args, { cwd: directory, encoding: "utf8", stdio: "pipe", timeout: 60_000 });

const packPackages = async (directory: string) => {
  const tarballs: Record<string, string> = {};
  for (const name of publicPackages) {
    run(directory, "pnpm", [
      "--dir",
      resolve(`packages/${name}`),
      "pack",
      "--pack-destination",
      directory,
    ]);
    const tarball = (await readdir(directory)).find(
      (file) => file.startsWith(`react-fabrio-${name}-`) && file.endsWith(".tgz"),
    );
    if (!tarball) throw new Error(`Missing ${name} tarball`);
    tarballs[`@react-fabrio/${name}`] = `file:${join(directory, tarball)}`;
  }
  return tarballs;
};

const installConsumer = async (
  directory: string,
  tarballs: Record<string, string>,
  mode: "core" | "ui" | "three",
) => {
  const root = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  const playground = JSON.parse(await readFile(resolve("apps/playground/package.json"), "utf8"));
  const uiPackage = JSON.parse(await readFile(resolve("packages/ui/package.json"), "utf8"));
  const reactPackage = JSON.parse(await readFile(resolve("packages/react/package.json"), "utf8"));
  const packages = Object.fromEntries(
    Object.entries(tarballs).filter(([name]) =>
      mode === "core"
        ? name === "@react-fabrio/core"
        : mode === "three" || name !== "@react-fabrio/three",
    ),
  );
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      devDependencies: {
        typescript: root.devDependencies.typescript,
        "@types/node": root.devDependencies["@types/node"],
        ...(mode !== "core"
          ? {
              vite: root.devDependencies.vite,
              i18next: uiPackage.dependencies.i18next,
              "@types/react": reactPackage.devDependencies["@types/react"],
            }
          : {}),
      },
      dependencies: {
        ...packages,
        ...(mode !== "core"
          ? {
              react: playground.dependencies.react,
              "react-dom": playground.dependencies["react-dom"],
            }
          : {}),
      },
    }),
  );
  await writeFile(
    join(directory, "pnpm-workspace.yaml"),
    JSON.stringify({ overrides: packages, autoInstallPeers: false }),
  );
  for (const file of mode === "core"
    ? ["consumer-core.ts"]
    : ["consumer.ts", "consumer.mjs", "consumer-browser.ts"]) {
    await cp(resolve(`tests/fixtures/${file}`), join(directory, file));
  }
  run(directory, "pnpm", ["install", "--offline", "--ignore-scripts", "--reporter=append-only"]);
};

test("tarballs support core without React/DOM and UI with or without optional Three", async () => {
  const directory = await mkdtemp(join(tmpdir(), "react-fabrio-consumer-"));
  try {
    const tarballs = await packPackages(directory);
    for (const mode of ["core", "ui", "three"] as const) {
      const consumer = await mkdtemp(join(directory, `${mode}-`));
      await installConsumer(consumer, tarballs, mode);
      const core = mode === "core";
      expect(
        run(consumer, join(consumer, "node_modules/.bin/tsc"), [
          "--strict",
          "--noEmit",
          "--module",
          "NodeNext",
          "--moduleResolution",
          "NodeNext",
          "--lib",
          core ? "ES2023" : "ES2023,DOM,DOM.Iterable",
          "--types",
          core ? "node" : "react",
          core ? "consumer-core.ts" : "consumer.ts",
        ]),
      ).toBe("");
      if (core) {
        expect(run(consumer, process.execPath, ["consumer-core.ts"])).toBe("");
        expect(await readdir(join(consumer, "node_modules"))).not.toContain("react");
      } else {
        expect(run(consumer, process.execPath, ["consumer.mjs"])).toBe("");
        await writeFile(
          join(consumer, "index.html"),
          '<div id="root"></div><script type="module" src="/consumer-browser.ts"></script>',
        );
        run(consumer, join(consumer, "node_modules/.bin/vite"), ["build"]);
        expect(await readdir(join(consumer, "dist"))).toContain("index.html");
        expect(
          await readFile(join(consumer, "node_modules/@react-fabrio/ui/src/styles.css"), "utf8"),
        ).toContain("--rf-ink");
        if (mode === "ui")
          expect(await readdir(join(consumer, "node_modules/@react-fabrio"))).not.toContain(
            "three",
          );
        else
          expect(
            run(consumer, process.execPath, [
              "--input-type=module",
              "-e",
              'import { mountMugPreview } from "@react-fabrio/three"; if (typeof mountMugPreview !== "function") throw Error("Missing mug export");',
            ]),
          ).toBe("");
      }
      for (const name of core
        ? ["core"]
        : publicPackages.filter((name) => mode === "three" || name !== "three")) {
        const installed = join(consumer, `node_modules/@react-fabrio/${name}`);
        const metadata = JSON.parse(await readFile(join(installed, "package.json"), "utf8"));
        const files = await readdir(installed);
        expect(metadata.private).not.toBe(true);
        expect(metadata.license).toBe("MIT");
        expect(JSON.stringify(metadata)).not.toContain("workspace:");
        expect(files).not.toContain("tsconfig.json");
        if (name !== "ui") expect(files).not.toContain("src");
        expect(await readFile(join(installed, "LICENSE"), "utf8")).toContain("MIT License");
        expect(await readdir(join(installed, "dist"))).toEqual(
          expect.arrayContaining(["index.d.ts", "index.js"]),
        );
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 240_000);

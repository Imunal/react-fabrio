import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

test("core tarball works in an isolated ESM TypeScript consumer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "react-fabrio-consumer-"));
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, { cwd: directory, encoding: "utf8", stdio: "pipe" });

  try {
    run("pnpm", ["--dir", resolve("packages/core"), "pack", "--pack-destination", directory]);
    const tarball = (await readdir(directory)).find((file) => file.endsWith(".tgz"));
    expect(tarball).toBeDefined();
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ private: true, type: "module" }),
    );
    run("npm", [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      join(directory, tarball!),
    ]);

    const installed = join(directory, "node_modules/@react-fabrio/core");
    const files = await readdir(installed);
    expect(files).toContain("LICENSE");
    expect(files).not.toContain("src");
    expect(files).not.toContain("tsconfig.json");
    expect(await readFile(join(installed, "LICENSE"), "utf8")).toContain("MIT License");

    await writeFile(
      join(directory, "consumer.ts"),
      `import type { Product } from "@react-fabrio/core";
const product: Product = { id: "tag", name: "Tag", width: 60, height: 35, unit: "mm" };
// @ts-expect-error Physical dimensions must use millimeters.
const invalidUnit: Product["unit"] = "px";
void product;
void invalidUnit;
`,
    );
    run(resolve("node_modules/.bin/tsc"), [
      "--strict",
      "--noEmit",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--types",
      "node",
      "--typeRoots",
      resolve("node_modules/@types"),
      "consumer.ts",
    ]);
    await writeFile(join(directory, "consumer.mjs"), 'import "@react-fabrio/core";');
    run(process.execPath, ["consumer.mjs"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

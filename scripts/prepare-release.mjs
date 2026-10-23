import { globSync, readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? "")) {
  throw new Error("Expected a stable release version, for example 1.2.3.");
}

const packages = globSync("packages/*/package.json").map((file) => ({
  file,
  manifest: JSON.parse(readFileSync(file, "utf8")),
}));

for (const { file, manifest } of packages) {
  if (manifest.private) continue;
  manifest.version = version;
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

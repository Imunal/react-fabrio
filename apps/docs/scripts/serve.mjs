import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("dist/client");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!path.startsWith("/react-fabrio/")) throw new Error("Not found");
    let file = resolve(root, path.slice("/react-fabrio/".length));
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error("Not found");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    response.setHeader(
      "Content-Type",
      `${types[extname(file)] ?? "application/octet-stream"}; charset=utf-8`,
    );
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(await readFile(resolve(root, "404.html")));
  }
}).listen(3000, () => console.log("Static docs: http://localhost:3000/react-fabrio/"));

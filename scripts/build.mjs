import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { withPreviewLink } from "./build-support.mjs";

const root = resolve(".");
const out = resolve(root, "dist");
if (dirname(out) !== root) throw new Error("Unsafe build path");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ["index.html", "assets", "CNAME", ".nojekyll"])
  await cp(resolve(root, name), resolve(out, name), { recursive: true });
const originalIndex = await readFile(resolve(out, "index.html"), "utf8");
const previewIndex = withPreviewLink(originalIndex, process.env);
if (previewIndex !== originalIndex)
  await writeFile(resolve(out, "index.html"), previewIndex);

// Relative companion assets require the trailing slash on both static hosts.
await writeFile(
  resolve(out, "_redirects"),
  "/companion /companion/ 308\n/companion/index.html /companion/ 308\n",
);
// Pages otherwise treats every missing path as the root class-draft SPA.
await writeFile(
  resolve(out, "404.html"),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — Gregular</title></head>
<body><main><h1>Page not found</h1><p><a href="/companion/">Open companion</a> · <a href="/">Open class draft</a></p></main></body></html>
`,
);
console.log(
  "Built public static files in dist. No saves, tests, credentials or server files are published.",
);

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Preview only the allowlisted build, including nested companion routes.
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

export function createPreviewServer(directory = resolve("dist")) {
  const root = resolve(directory);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === "/companion" || pathname === "/companion/index.html") {
        response.writeHead(308, { Location: "/companion/" + url.search });
        response.end();
        return;
      }
      const file = resolve(
        root,
        "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
      );
      if (!file.startsWith(root + sep) || !(await stat(file)).isFile())
        throw new Error("Not public");
      response.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(await readFile(file));
    } catch {
      try {
        const page = await readFile(resolve(root, "404.html"));
        response.writeHead(404, { "Content-Type": types[".html"] });
        response.end(page);
      } catch {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Not found");
      }
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  createPreviewServer().listen(5174, "127.0.0.1", () =>
    console.log(
      "Combined build: http://127.0.0.1:5174/companion/ | Class draft: http://127.0.0.1:5174/",
    ),
  );

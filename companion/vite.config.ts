import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const packageInfo = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

function commitId() {
  const cloudflareCommit = process.env.CF_PAGES_COMMIT_SHA;
  if (cloudflareCommit && /^[a-f\d]{7,40}$/i.test(cloudflareCommit))
    return cloudflareCommit.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig(({ command }) => {
  const commit = commitId();
  const environment =
    command === "serve"
      ? "development"
      : process.env.CF_PAGES === "1"
        ? "preview"
        : "build";
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    base: "./",
    plugins: [react()],
    define: {
      __GREGULAR_BUILD__: JSON.stringify({
        version: packageInfo.version,
        commit,
        environment,
        displayLabel:
          environment === "build"
            ? null
            : `${environment === "preview" ? "Preview" : "Development"} · ${commit}`,
      }),
    },
    build: { outDir: "../dist/companion", emptyOutDir: true },
    test: { include: ["src/**/*.test.ts"], environment: "node" },
  };
});

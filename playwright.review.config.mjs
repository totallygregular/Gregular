// Explicit preview-only acceptance. Never points tests at the production site.
import companion from "./playwright.companion.config.mjs";
const target = new URL(process.env.GREGULAR_PREVIEW_URL ?? "https://invalid.example/");
if (target.protocol !== "https:" || !target.hostname.endsWith(".gregular.pages.dev") || target.pathname !== "/companion/")
  throw new Error("Set GREGULAR_PREVIEW_URL to an HTTPS Gregular Pages feature preview under /companion/.");
export default {
  ...companion,
  testMatch: ["gear-discovery.spec.mjs", "item-providers.live.spec.mjs"],
  outputDir: "artifacts/preview-test-results",
  use: { ...companion.use, baseURL: target.href },
  webServer: undefined,
};

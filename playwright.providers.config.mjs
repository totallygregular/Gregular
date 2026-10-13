// Deliberately separate: live provider availability never gates the local suite.
import companion from "./playwright.companion.config.mjs";
export default { ...companion, testMatch: ["item-providers.live.spec.mjs"], outputDir: "artifacts/provider-test-results", timeout: 60_000, use: { ...companion.use, baseURL: process.env.COMPANION_BUILT === "1" ? "http://127.0.0.1:5174/companion/" : "http://127.0.0.1:5187/" }, webServer: process.env.COMPANION_BUILT === "1" ? companion.webServer : { ...companion.webServer, command: "npm run dev -- --port 5187", url: "http://127.0.0.1:5187/" } };

import { test, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const demo = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
test("live ForeverDB with Gear Discovery stat matches", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  await page.evaluate(profile => { localStorage.setItem("gregular:forever:profile:gregular%20demo", JSON.stringify(profile)); sessionStorage.setItem("gregular.active-profile", profile.username); }, demo);
  await page.reload();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name: "Equipment", exact: true }).click();
  await page.getByRole("checkbox", { name: "Intellect", exact: true }).check();
  await page.getByRole("checkbox", { name: "Spirit", exact: true }).check();
  await page.getByLabel("Stat matching", { exact: true }).selectOption("all");
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("2");
  await page.getByLabel("Minimum Spirit", { exact: true }).fill("8");
  await page.getByLabel("Required level window", { exact: true }).selectOption("plus10");
  await page.getByLabel("Item details service", { exact: true }).selectOption("foreverdb");
  const card = page.locator(".equipment-results article");
  await expect(card).toHaveCount(1);
  await expect(card.locator(".item-portrait img")).toBeVisible({ timeout: 20000 });
  await expect(card).toContainText("2/2 desired stats match");
  await mkdir("artifacts/pass-7", { recursive: true });
  await page.locator("h2").click();
  await page.screenshot({ path: "artifacts/pass-7/gear-live-desktop.png", fullPage: true });
  await card.screenshot({ path: "artifacts/pass-7/gear-live-result.png" });
  await card.getByRole("button", { name: "Inspect Ponderous Orb", exact: true }).click();
  const frame = page.frameLocator('iframe[title="foreverdb tooltip for Ponderous Orb"]');
  await expect(frame.getByRole("status")).toContainText("script loaded", { timeout: 20000 });
  await frame.locator("#item").focus();
  await expect(frame.getByRole("tooltip")).toContainText("Ponderous Orb", { timeout: 20000 });
  await page.screenshot({ path: "artifacts/pass-7/gear-live-tooltip.png" });
  await page.getByRole("dialog").getByRole("button", { name: /Close/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("h2").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/pass-7/gear-live-mobile.png", fullPage: true });
});
for (const provider of ["foreverdb", "wow-forever"]) test(`live ${provider} inside Gregular`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const requests = [], errors = [];
  page.on("response", r => { if (/https:\/\/(foreverdb.net|wow-forever.gg)\//.test(r.url())) requests.push({ url: r.url(), status: r.status(), cors: r.headers()["access-control-allow-origin"], bytes: r.headers()["content-length"], encoding: r.headers()["content-encoding"] }); });
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./");
  await page.evaluate(profile => { localStorage.setItem("gregular:forever:profile:gregular%20demo", JSON.stringify(profile)); sessionStorage.setItem("gregular.active-profile", profile.username); }, demo);
  await page.reload(); await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name: "Equipment", exact: true }).click();
  if (provider === "foreverdb") await page.getByLabel("Item details service", { exact: true }).selectOption(provider);
  const observed = [];
  await mkdir("artifacts/pass-6", { recursive: true });
  try {
    for (const name of ["Ponderous Orb", "Grizzled Boots", "Glowing Copper Boots"]) {
      const result = page.locator(".equipment-results article").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await result.getByRole("button", { name: `Inspect ${name}`, exact: true }).click();
      if (provider === "wow-forever") await page.getByRole("dialog").evaluate(dialog => { const iframe = document.createElement("iframe"); iframe.title = "wow-forever tooltip for Ponderous Orb"; iframe.src = "./tooltip-frame.html?provider=wow-forever&ids=273052"; iframe.sandbox = "allow-scripts"; dialog.append(iframe); });
      const frame = page.frameLocator(`iframe[title="${provider} tooltip for ${name}"]`);
      await expect(frame.getByRole("status")).toContainText("script loaded", { timeout: 20000 });
      await frame.locator("#item").focus();
      if (provider === "wow-forever") {
        await expect.poll(() => errors.some(e => /CORS/.test(e)), { timeout: 20000 }).toBe(true);
        await expect(page.getByRole("dialog")).toContainText("Intellect");
        observed.push({ name, outcome: "Script loads; item request rejected by CORS for sandbox Origin null. Local details remain available." });
        break;
      }
      await expect(frame.getByRole("tooltip")).toBeVisible({ timeout: 20000 });
      if (provider === "foreverdb") await expect(frame.getByRole("tooltip")).toContainText(name);
      const text = await frame.getByRole("tooltip").evaluate(el => el.shadowRoot?.textContent || el.textContent);
      observed.push({ name, text, describedBy: await frame.locator("#item").getAttribute("aria-describedby") });
      await page.screenshot({ path: `artifacts/pass-6/${provider}-${name.toLowerCase().replaceAll(" ", "-")}.png`, fullPage: false });
      await frame.locator("#item").press("Escape"); await expect(frame.getByRole("tooltip")).toBeHidden();
      await frame.locator("#item").hover(); await expect(frame.getByRole("tooltip")).toBeVisible(); await page.mouse.move(1, 1);
      await page.getByRole("dialog").getByRole("button", { name: /Close/ }).click();
    }
    if (provider === "foreverdb") await expect(page.locator(".equipment-results .item-portrait img").first()).toBeVisible();
    if (provider === "wow-forever") return;
    await page.locator("h2").click(); await page.mouse.move(1, 1); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/pass-6/equipment-${provider}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: `artifacts/pass-6/equipment-${provider}-mobile.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await writeFile(`artifacts/pass-6/${provider}-live.json`, JSON.stringify({ requests, errors, observed }, null, 2)); }
});

test("live ForeverDB touch tooltip and missing-record plain-link fallback", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto("./tooltip-frame.html?provider=foreverdb&ids=6335");
    await expect(page.getByRole("status")).toContainText("script loaded");
    await page.locator("#item").tap();
    await expect(page.getByRole("tooltip")).toContainText("Grizzled Boots", { timeout: 20000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "artifacts/pass-6/foreverdb-touch.png" });
    await page.goto("./tooltip-frame.html?provider=foreverdb&ids=999999999");
    await expect(page.getByRole("status")).toContainText("script loaded");
    const loaded = page.waitForResponse(r => r.url().includes("/embed/v1/data") && r.status() === 200);
    await page.locator("#item").tap(); await loaded;
    await expect(page.locator("#item")).toHaveAttribute("href", "https://foreverdb.net/item/999999999");
    await expect(page.getByRole("tooltip")).toBeHidden();
  } finally { await context.close(); }
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const demo = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
async function equipment(page) {
  await page.goto("./");
  await page.evaluate(profile => { localStorage.setItem("gregular:forever:profile:gregular%20demo", JSON.stringify(profile)); sessionStorage.setItem("gregular.active-profile", profile.username); }, demo);
  await page.reload();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name: "Equipment", exact: true }).click();
}
const result = page => page.locator(".equipment-results article").filter({ has: page.getByRole("heading", { name: "Ponderous Orb", exact: true }) });
test("local hover, focus, Escape and inspection stay separate from wishlist", async ({ page }) => {
  let requests = 0; page.on("request", r => { if (/foreverdb.net|wow-forever.gg/.test(r.url())) requests++; });
  await equipment(page);
  const item = result(page);
  await expect(item.getByRole("heading")).toHaveClass(/acquisition-quality-rare/);
  await expect(item.getByText("No icon", { exact: true })).toBeVisible();
  const inspect = item.getByRole("button", { name: "Inspect Ponderous Orb", exact: true });
  await inspect.focus(); await expect(page.getByRole("tooltip")).toContainText("Requires level 30");
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toBeHidden();
  await inspect.hover(); await expect(page.getByRole("tooltip")).toBeVisible();
  await inspect.click(); await expect(page.getByRole("dialog", { name: "Ponderous Orb", exact: true })).toContainText("Shade of the Archmage");
  await page.getByRole("dialog").getByRole("button", { name: /Close/ }).click();
  await item.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(item.getByRole("button", { name: "On wishlist · Wanted", exact: true })).toBeDisabled();
  expect(requests).toBe(0);
});
test("blocked providers retain local details, placeholder and working actions", async ({ page }) => {
  await page.route(/https:\/\/(foreverdb.net|wow-forever.gg)\//, r => r.abort());
  await equipment(page);
  for (const provider of ["foreverdb"]) {
    await page.getByLabel("Item details service", { exact: true }).selectOption(provider);
    await result(page).getByRole("button", { name: "Inspect Ponderous Orb", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Intellect");
    await expect(page.frameLocator(`iframe[title="${provider} tooltip for Ponderous Orb"]`).getByRole("status")).toContainText("Provider unavailable");
    await dialog.getByRole("button", { name: /Close/ }).click();
  }
  await result(page).getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(result(page).getByRole("button", { name: "On wishlist · Wanted", exact: true })).toBeDisabled();
  await expect(result(page).getByText("No icon", { exact: true })).toBeVisible();
});
test("documented icon bridge accepts supported art and falls back on image failure", async ({ page }) => {
  await page.route("https://foreverdb.net/embed/tooltips.js", r => r.fulfill({ contentType: "application/javascript", body: `document.querySelectorAll('a[data-item-id]').forEach(a=>{const i=document.createElement('img');i.setAttribute('data-foreverdb-icon','');i.src='https://foreverdb.net/icons/132765.webp';a.prepend(i);});` }));
  await page.route("https://foreverdb.net/icons/132765.webp", r => r.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="blue"/></svg>' }));
  await equipment(page);
  await page.getByLabel("Item details service", { exact: true }).selectOption("foreverdb");
  await expect(result(page).locator(".item-portrait img")).toBeVisible();
  await result(page).locator(".item-portrait img").evaluate(img => img.dispatchEvent(new Event("error")));
  await expect(result(page).getByText("No icon", { exact: true })).toBeVisible();
});
for (const width of [1440, 820, 390]) test(`equipment visual/accessibility ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 }); await equipment(page);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".equipment-results")).toHaveClass(/is-list/);
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});
test("touch inspection leaves Add to wishlist independent", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try { const page = await context.newPage(); await equipment(page); await result(page).getByRole("button", { name: "Inspect Ponderous Orb", exact: true }).tap(); await expect(page.getByRole("dialog")).toContainText("Required level"); await page.getByRole("dialog").getByRole("button", { name: /Close/ }).tap(); await result(page).getByRole("button", { name: "Add to wishlist", exact: true }).tap(); await expect(result(page).getByRole("button", { name: "On wishlist · Wanted", exact: true })).toBeDisabled(); } finally { await context.close(); }
});

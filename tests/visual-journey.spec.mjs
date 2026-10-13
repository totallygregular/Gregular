import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";

const username = "Visual Journey";
const storageKey = "gregular:forever:profile:visual%20journey";
const longName = "A personally named destination beyond the familiar roads";
const route = (page) => page.getByRole("region", { name: "My Route", exact: true });
const browser = (page) => page.getByRole("region", { name: "Zone Browser", exact: true });
const stop = (page, name) => route(page).getByRole("article", { name: `Route stop: ${name}`, exact: true });
const candidate = (page, name) => browser(page).getByRole("article", { name: `Zone: ${name}`, exact: true });
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);

function entry(title, slug, min, max, status = "planned") {
  return {
    id: randomUUID(), kind: "zone", title, notes: "", priority: "normal", status,
    origin: "user", access: "unknown", prerequisiteEntryIds: [],
    targetLevel: { min, max }, targetLevelSource: "user",
    ...(slug ? { recordId: `forever:zone:${slug}` } : {}),
  };
}
function sampleEntries({ extended = false } = {}) {
  const entries = [
    entry("Elwynn Forest", "elwynn-forest", 1, 12, "completed"),
    entry("Westfall", "westfall", 12, 18, "active"),
    entry("Redridge Mountains", "redridge-mountains", 18, 24),
  ];
  if (extended) entries.push(
    entry("Darkshore", "darkshore", 24, 28),
    entry("Riverglades", "riverglades", 28, 32, "skipped"),
    entry(longName, undefined, 32, 36),
  );
  return entries;
}
async function openFixture(page, entries = sampleEntries(), level = 12) {
  const characterId = randomUUID();
  const now = new Date().toISOString();
  const profile = {
    schemaVersion: 2, id: randomUUID(), username, usernameKey: "visual journey",
    revision: 0, createdAt: now, updatedAt: now,
    characters: [{
      id: characterId, name: "Alden", race: "Human", className: "Priest",
      faction: "Alliance", plannedSpec: "", level, status: "leveling",
      objectives: [], notes: "", planner: {
        id: randomUUID(), name: "My route", datasetVersion: "forever-zones-2026-10-13.1", entries,
      },
    }],
  };
  await page.addInitScript(({ key, profile }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(profile));
    sessionStorage.setItem("gregular.active-profile", profile.username);
  }, { key: storageKey, profile });
  await page.goto(`./#/character/${characterId}/leveling`);
  await expect(route(page)).toBeVisible();
  await expect(browser(page)).toBeVisible();
  return profile;
}
async function accessible(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function capture(page, name) {
  await mkdir("artifacts", { recursive: true });
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  const dialog = page.getByRole("dialog");
  const dialogOpen = await dialog.count() > 0 && await dialog.first().isVisible();
  await page.screenshot({ path: `artifacts/after-${name}.png`, fullPage: !dialogOpen });
}
async function edit(page, name, max) {
  await stop(page, name).getByRole("button", { name: `Edit planned levels for ${name}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Edit plan: ${name}`, exact: true });
  await dialog.getByLabel("Planned exit level", { exact: true }).fill(String(max));
  await dialog.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("journey overview and direct completion keep manual states and personal levels persistent", async ({ page }) => {
  await openFixture(page);
  const overview = page.locator(".route-overview");
  await expect(overview).toContainText("Westfall");
  await expect(overview).toContainText("12–18");
  await expect(overview).toContainText("Redridge Mountains");
  await expect(stop(page, "Elwynn Forest")).toHaveAttribute("data-route-state", "completed");
  await expect(stop(page, "Westfall")).toHaveAttribute("data-route-state", "current");
  await expect(stop(page, "Redridge Mountains")).toHaveAttribute("data-route-state", "upcoming");
  await stop(page, "Westfall").getByRole("button", { name: "Complete zone: Westfall", exact: true }).click();
  await expect(stop(page, "Westfall")).toHaveAttribute("data-route-state", "completed");
  await expect(overview).toContainText("Redridge Mountains");
  await stop(page, "Westfall").getByRole("button", { name: "Reactivate zone: Westfall", exact: true }).click();
  await expect(stop(page, "Westfall")).toHaveAttribute("data-route-state", "current");
  await edit(page, "Westfall", 19);
  const before = await saved(page);
  expect(before.characters[0].planner.entries[1]).toMatchObject({ status: "active", targetLevel: { min: 12, max: 19 } });
  await page.reload();
  await expect(stop(page, "Westfall").locator(".personal-range")).toContainText(/Your plan\s*12–19/);
  expect(await saved(page)).toEqual(before);
});

test("suggested focus leaves earlier visits visibly unfinished and never completes saved plans", async ({ page }) => {
  const entries = sampleEntries();
  entries[1].status = "planned";
  await openFixture(page, entries, 20);
  await expect(page.locator(".route-overview")).toContainText("Redridge Mountains");
  await expect(stop(page, "Westfall").locator(".stop-state")).toHaveText("Earlier unfinished");
  await expect(stop(page, "Redridge Mountains").locator(".stop-state")).toHaveText("Next zone");
  const before = await saved(page);
  expect(before.characters[0].planner.entries).toEqual(entries);
  await page.reload();
  await expect(stop(page, "Westfall").locator(".stop-state")).toHaveText("Earlier unfinished");
  expect(await saved(page)).toEqual(before);
});
test("future-only overview shows the first destination and its saved successor without changing progress", async ({ page }) => {
  const entries = sampleEntries().slice(1).map((visit) => ({ ...visit, status: "planned" }));
  await openFixture(page, entries, 1);
  const overview = page.getByRole("region", { name: "Journey overview", exact: true });
  await expect(overview.locator(".overview-location")).toContainText("Westfall");
  await expect(overview.locator(".overview-location")).toContainText("12–18");
  await expect(overview.locator(".overview-next")).toContainText("Redridge Mountains");
  await expect(overview.locator(".overview-next")).toContainText("18–24");
  await expect(overview.locator(".overview-next")).toContainText("Moderate travel");
  await expect(overview.locator(".overview-next")).not.toContainText("Choose the next stop");
  const before = await saved(page);
  expect(before.characters[0].planner.entries).toEqual(entries);
  await page.reload();
  await expect(overview.locator(".overview-next")).toContainText("Redridge Mountains");
  expect(await saved(page)).toEqual(before);
});
test("travel connectors precede destination cards and only show supported transport", async ({ page }) => {
  await openFixture(page, sampleEntries({ extended: true }));
  for (const name of ["Westfall", "Redridge Mountains", "Darkshore", longName]) {
    const item = stop(page, name);
    await expect(item.locator(".route-connector")).toBeVisible();
    expect(await item.evaluate((article) => {
      const connector = article.querySelector(".route-connector");
      const card = article.querySelector(".stop-card");
      return Boolean(connector && card && (connector.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING));
    })).toBe(true);
  }
  const connector = (name) => stop(page, name).locator(".route-connector .travel-summary");
  await expect(connector("Westfall")).toHaveAttribute("data-difficulty", "easy");
  await expect(connector("Westfall")).toHaveAttribute("data-transport", "walking");
  await expect(connector("Redridge Mountains")).toHaveAttribute("data-difficulty", "moderate");
  await expect(connector("Darkshore")).toHaveAttribute("data-difficulty", "long");
  await expect(connector("Darkshore")).toHaveAttribute("data-transport", "boat");
  await expect(connector("Darkshore")).toContainText("Boat required");
  await expect(connector(longName)).toHaveAttribute("data-difficulty", "unknown");
  await expect(connector(longName)).toHaveAttribute("data-transport", "unknown");
  await expect(stop(page, "Riverglades")).toHaveAttribute("data-route-state", "skipped");
  await expect(stop(page, longName)).toContainText("Unknown");
  const boatLabels = page.locator('.route-connector [data-transport="boat"]');
  for (const label of await boatLabels.all()) await expect(label).toContainText("Boat required");
  await stop(page, "Darkshore").getByText("View travel route", { exact: true }).click();
  await expect(stop(page, "Darkshore").locator(".travel-path a").first()).toBeVisible();
});

test("keyboard reordering immediately updates travel without rewriting ranges", async ({ page }) => {
  await openFixture(page);
  const before = (await saved(page)).characters[0].planner.entries;
  const move = stop(page, "Redridge Mountains").getByRole("button", { name: "Move stop Redridge Mountains up", exact: true });
  await move.focus();
  await page.keyboard.press("Enter");
  await expect(stop(page, "Redridge Mountains").locator(".route-connector [data-difficulty]")).toHaveAttribute("data-difficulty", "easy");
  await expect(stop(page, "Westfall").locator(".route-connector [data-difficulty]")).toHaveAttribute("data-difficulty", "moderate");
  const after = (await saved(page)).characters[0].planner.entries;
  expect(after.map(({ id }) => id)).toEqual([before[0].id, before[2].id, before[1].id]);
  expect(after).toEqual([before[0], before[2], before[1]]);
  const editor = stop(page, "Westfall").getByRole("button", { name: "Edit planned levels for Westfall", exact: true });
  await editor.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Edit plan: Westfall", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editor).toBeFocused();
});

test("empty and resolved overview states retain a primary destination action", async ({ page }) => {
  await openFixture(page, []);
  await expect(route(page).getByRole("heading", { name: "Build your route", exact: true })).toBeVisible();
  const add = page.locator(".route-overview").getByRole("button", { name: "Add zone", exact: true });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(browser(page).getByLabel("Search zones", { exact: true })).toBeFocused();
  await candidate(page, "Westfall").getByRole("button", { name: "Plan Westfall", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Plan Westfall", exact: true });
  await dialog.getByLabel("Planned entry level", { exact: true }).fill("12");
  await dialog.getByLabel("Planned exit level", { exact: true }).fill("18");
  await dialog.getByRole("button", { name: "Add to route", exact: true }).click();
  await stop(page, "Westfall").getByRole("button", { name: "Complete zone: Westfall", exact: true }).click();
  await expect(page.locator(".route-overview")).toContainText(/complete/i);
  await expect(add).toBeVisible();
  expect((await saved(page)).characters[0].planner.entries[0].status).toBe("completed");
});

for (const [label, width, height] of [
  ["desktop", 1440, 1000], ["laptop", 1024, 1000], ["tablet", 820, 1100], ["mobile", 390, 844],
]) {
  test(`visual journey ${label}: readable empty, route, search, insertion and editor layouts`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openFixture(page, []);
    await noOverflow(page);
    await capture(page, `empty-${label}`);
    const fixture = await saved(page);
    fixture.characters[0].planner.entries = sampleEntries();
    await page.evaluate(({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)), { key: storageKey, profile: fixture });
    await page.reload();
    await browser(page).getByRole("combobox", { name: "Level suitability", exact: true }).selectOption("now");
    await capture(page, `comparison-populated-${label}`);
    await stop(page, "Westfall").evaluate((node) => scrollTo(0, node.getBoundingClientRect().top + scrollY - 50));
    await page.screenshot({ path: `artifacts/after-route-focus-${label}.png` });
    fixture.characters[0].planner.entries = sampleEntries({ extended: true });
    await page.evaluate(({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)), { key: storageKey, profile: fixture });
    await page.reload();
    await expect(stop(page, "Westfall")).toBeVisible();
    await browser(page).getByRole("combobox", { name: "Level suitability", exact: true }).selectOption("now");
    await noOverflow(page);
    await accessible(page);
    await capture(page, `populated-${label}`);
    await page.screenshot({ path: `artifacts/after-populated-${label}-viewport.png` });
    const sizes = await page.locator('.stop-primary-actions button, .candidate-footer button, .zone-browser input, .zone-browser select').evaluateAll((nodes) => nodes.map((node) => ({ text: node.getAttribute("aria-label") || node.textContent, size: parseFloat(getComputedStyle(node).fontSize) })));
    expect(sizes.length).toBeGreaterThan(3);
    expect(sizes.filter(({ size }) => size < 14)).toEqual([]);
    for (const [selector, minimum] of [[".stop-card h4", 22], [".stop-card .personal-range strong", 24]]) {
      const displaySizes = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
      expect(displaySizes.length).toBeGreaterThan(0);
      expect(Math.min(...displaySizes)).toBeGreaterThanOrEqual(minimum);
    }
    await browser(page).getByRole("combobox", { name: "Level suitability", exact: true }).selectOption("");
    await browser(page).getByLabel("Search zones", { exact: true }).fill("ridge");
    await expect(candidate(page, "Redridge Mountains")).toBeVisible();
    await expect(candidate(page, "Westfall")).toHaveCount(0);
    await capture(page, `search-${label}`);
    await browser(page).getByLabel("Search zones", { exact: true }).fill("Riverglades");
    await expect(candidate(page, "Riverglades")).toContainText("Unknown");
    await capture(page, `unknown-${label}`);
    await route(page).getByRole("button", { name: "Insert zone after Westfall", exact: true }).click();
    await browser(page).getByLabel("Search zones", { exact: true }).fill("ridge");
    await candidate(page, "Redridge Mountains").getByRole("button", { name: "Plan Redridge Mountains", exact: true }).click();
    const insertion = page.getByRole("dialog", { name: "Plan Redridge Mountains", exact: true });
    await expect(insertion).toContainText("Affected transitions");
    expect(await insertion.getByLabel("Planned entry level", { exact: true }).evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(24);
    await noOverflow(page);
    await capture(page, `insertion-${label}`);
    await page.keyboard.press("Escape");
    await stop(page, "Westfall").getByRole("button", { name: "Edit planned levels for Westfall", exact: true }).click();
    await noOverflow(page);
    await accessible(page);
    await capture(page, `editor-${label}`);
    await page.keyboard.press("Escape");
    const motion = await stop(page, "Westfall").evaluate((node) => ({ animation: getComputedStyle(node).animationDuration, transition: getComputedStyle(node).transitionDuration }));
    for (const value of Object.values(motion)) expect(value.split(",").every((duration) => parseFloat(duration) <= 0.001)).toBe(true);
    await noOverflow(page);
  });
}

test.describe("visual journey touch actions", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("primary completion and editing work with comfortable touch targets", async ({ page }) => {
    await openFixture(page);
    const complete = stop(page, "Westfall").getByRole("button", { name: "Complete zone: Westfall", exact: true });
    const box = await complete.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await complete.tap();
    const reactivate = stop(page, "Westfall").getByRole("button", { name: "Reactivate zone: Westfall", exact: true });
    await reactivate.tap();
    await stop(page, "Westfall").getByRole("button", { name: "Edit planned levels for Westfall", exact: true }).tap();
    const editor = page.getByRole("dialog", { name: "Edit plan: Westfall", exact: true });
    await editor.getByLabel("Planned exit level", { exact: true }).fill("19");
    await editor.getByRole("button", { name: "Save plan", exact: true }).tap();
    await expect(editor).toBeHidden();
    await expect(stop(page, "Westfall").locator(".personal-range")).toContainText(/Your plan\s*12–19/);
    await noOverflow(page);
    await accessible(page);
  });
});

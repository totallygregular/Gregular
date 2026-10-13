import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";

const key = "gregular:forever:profile:route%20relevance";
const route = (page) => page.getByRole("region", { name: "My Route", exact: true });
const browser = (page) => page.getByRole("region", { name: "Zone Browser", exact: true });
const candidate = (page, name) => browser(page).getByRole("article", { name: `Zone: ${name}`, exact: true });
const stop = (page, name) => route(page).getByRole("article", { name: `Route stop: ${name}`, exact: true });
function visit(name, slug, min, max, status = "planned") {
  return { id: randomUUID(), kind: "zone", title: name, notes: "", priority: "normal", status,
    origin: "user", access: "unknown", prerequisiteEntryIds: [], targetLevel: { min, max },
    targetLevelSource: "user", ...(slug ? { recordId: `forever:zone:${slug}` } : {}) };
}
async function open(page, entries = [], level = 35) {
  const id = randomUUID(), now = new Date().toISOString();
  const profile = { schemaVersion: 2, id: randomUUID(), username: "Route relevance", usernameKey: "route relevance",
    revision: 0, createdAt: now, updatedAt: now, characters: [{ id, name: "Rowan", race: "Human", className: "Priest",
      faction: "Alliance", plannedSpec: "", level, status: "leveling", objectives: [], notes: "",
      planner: { id: randomUUID(), name: "A road of my own", datasetVersion: "forever-zones-2026-10-13.1", entries } }] };
  await page.addInitScript(({ key, profile }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(profile));
    sessionStorage.setItem("gregular.active-profile", profile.username);
  }, { key, profile });
  await page.goto(`./#/character/${id}/leveling`);
  await expect(browser(page)).toBeVisible();
}
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

test("current relevance leads, labels explain fits and the full catalogue remains reachable", async ({ page }) => {
  await open(page);
  await expect(browser(page).locator(".zone-results")).toContainText("next suggested zone, then travel");
  const first = browser(page).locator(".zone-candidate").first();
  await expect(first).toHaveAttribute("data-fit", "good");
  await expect(first.locator(".candidate-level-range")).toContainText("35–45");
  await expect(candidate(page, "Riverglades")).toHaveAttribute("data-fit", "good");
  await expect(candidate(page, "Elwynn Forest")).toHaveAttribute("data-fit", "awkward");
  await expect(candidate(page, "Winterspring")).toHaveAttribute("data-fit", "later");
  await browser(page).getByRole("combobox", { name: "Zone faction", exact: true }).selectOption("");
  await expect(browser(page).locator(".zone-candidate")).toHaveCount(45);
  await expect(candidate(page, "Durotar")).toHaveAttribute("data-fit", "awkward");
  await browser(page).getByRole("combobox", { name: "Zone faction", exact: true }).selectOption("Alliance");
  await expect(candidate(page, "Durotar")).toHaveCount(0);
  const names = await browser(page).locator(".zone-candidate").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  await page.reload();
  expect(await browser(page).locator(".zone-candidate").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))).toEqual(names);
});

test("insertion context uses the reviewed upper bracket and exposes onward travel", async ({ page }) => {
  await open(page, [visit("Elwynn Forest", "elwynn-forest", 1, 12, "completed"),
    visit("Westfall", "westfall", 12, 18, "active"), visit("Tanaris", "tanaris", 40, 45)], 12);
  await expect(browser(page).locator(".suggestion-context")).toContainText("48–50");
  await expect(candidate(page, "Tanaris").locator(".candidate-suitability")).toContainText("Suitable laterBrowser level 12");
  await browser(page).getByRole("combobox", { name: "Insert at", exact: true }).selectOption("1");
  await expect(browser(page).locator(".suggestion-context")).toContainText("12–12");
  await expect(browser(page).locator(".insertion-context")).toContainText("Elwynn Forest");
  await expect(browser(page).locator(".insertion-context")).toContainText("Westfall");
  await expect(candidate(page, "Loch Modan").locator(".outgoing-travel")).toContainText("Then to Westfall");
  await expect(candidate(page, "Westfall").locator(".candidate-fit")).toContainText(/route|visit/i);
  await expect(candidate(page, "Darkshore").locator(".candidate-travel")).toContainText("Long travel");
});

test("Riverglades shows 35–45 with editorial confidence and coverage distinct from personal plans", async ({ page }) => {
  await open(page);
  await browser(page).getByLabel("Search zones", { exact: true }).fill("Riverglades");
  const card = candidate(page, "Riverglades");
  await expect(card.locator(".candidate-level-range")).toContainText("35–45");
  await expect(card.locator(".zone-evidence")).toContainText("Editorial estimate");
  await expect(card.locator(".zone-guidance")).toHaveAttribute("data-guidance", "editorial");
  await card.getByRole("button", { name: "Plan Riverglades", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Plan Riverglades", exact: true });
  await expect(dialog).toContainText("not a promised stay");
  await dialog.getByLabel("Planned entry level", { exact: true }).fill("35");
  await dialog.getByLabel("Planned exit level", { exact: true }).fill("55");
  await expect(dialog.locator(".stay-warning")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Add to route", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Add to route", exact: true }).click();
  await expect(stop(page, "Riverglades").locator(".personal-range")).toContainText("35–55");
  await expect(stop(page, "Riverglades").locator(".recommended-range")).toContainText("35–45");
  await expect(stop(page, "Riverglades").locator(".stay-warning")).toBeVisible();
  await page.reload();
  await expect(stop(page, "Riverglades").locator(".personal-range")).toContainText("35–55");
});

test("unknown guidance is explicit without an invented long-stay estimate", async ({ page }) => {
  await open(page, [visit("Moonglade", "moonglade", 1, 60)]);
  await browser(page).getByLabel("Search zones", { exact: true }).fill("Moonglade");
  await expect(candidate(page, "Moonglade").locator(".zone-guidance")).toHaveAttribute("data-guidance", "unknown");
  await expect(stop(page, "Moonglade").locator(".zone-guidance")).toContainText(/unknown/i);
  await expect(stop(page, "Moonglade").locator(".stay-warning")).toHaveCount(0);
  await expect(stop(page, "Moonglade").locator(".personal-range")).toContainText("1–60");
});

for (const [name, width, height] of [["desktop", 1440, 1050], ["mobile", 390, 1100]]) {
  test(`${name} motifs preserve text space, travel and manual states with accessible screenshots`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await open(page, [visit("Elwynn Forest", "elwynn-forest", 1, 12, "completed"),
      visit("Westfall", "westfall", 12, 18, "active"), visit("Redridge Mountains", "redridge-mountains", 18, 24)], 12);
    await expect(stop(page, "Elwynn Forest")).toHaveAttribute("data-route-state", "completed");
    await expect(stop(page, "Westfall")).toHaveAttribute("data-route-state", "current");
    await expect(stop(page, "Redridge Mountains")).toHaveAttribute("data-route-state", "upcoming");
    await expect(stop(page, "Westfall").locator(".travel-label")).toContainText("Easy travel");
    await browser(page).getByLabel("Search zones", { exact: true }).fill("Redridge");
    for (const heading of [stop(page, "Westfall").locator(".stop-destination"), candidate(page, "Redridge Mountains").locator(".candidate-heading")]) {
      await expect(heading.locator(".zone-motif")).toHaveAttribute("aria-hidden", "true");
      expect(await heading.evaluate((el) => {
        const text = el.querySelector("h4").getBoundingClientRect();
        const motif = el.querySelector(".zone-motif").getBoundingClientRect();
        return text.right <= motif.left && text.width > 100;
      })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await mkdir("docs/images/relevance-pass", { recursive: true });
    await stop(page, "Westfall").locator(".stop-card").screenshot({ path: `docs/images/relevance-pass/${name}-route.png` });
    await candidate(page, "Redridge Mountains").screenshot({ path: `docs/images/relevance-pass/${name}-browser.png` });
    expect(errors).toEqual([]);
  });
}

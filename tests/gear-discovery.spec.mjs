import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const demo = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
const keyFor = name => `gregular:forever:profile:${encodeURIComponent(name.toLowerCase())}`;
const nav = (page, name) => page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name, exact: true });
const result = (page, name) => page.locator(".equipment-results article").filter({ has: page.getByRole("heading", { name, exact: true }) });
const names = page => page.locator(".equipment-results h4").allTextContents();
const saved = (page, username) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), keyFor(username));
const blankAcquisition = () => ({ wishlist: [], questProgress: [], manualItems: [], manualSources: [], manualDungeons: [], manualQuests: [], manualChains: [], dungeonProgress: [] });
const blankCrafting = () => ({ professions: [], goals: [], manualRecipes: [], manualMaterials: [] });

async function createCharacter(page) {
  await page.goto("./");
  await page.getByLabel("Username", { exact: true }).fill("Discovery QA");
  await page.getByRole("button", { name: "Open my planner", exact: true }).click();
  await page.getByRole("button", { name: "New character", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Character name", { exact: true }).fill("Discovery Priest");
  await dialog.getByRole("combobox", { name: "Race", exact: true }).selectOption("troll");
  await dialog.getByRole("combobox", { name: "Class", exact: true }).selectOption("Priest");
  await dialog.getByLabel("Current level", { exact: true }).fill("24");
  await dialog.getByRole("combobox", { name: "Starting zone", exact: true }).selectOption({ label: "The Barrens · 10–25" });
  await dialog.getByRole("button", { name: "Create character", exact: true }).click();
  await page.getByRole("button", { name: "Open Discovery Priest's overview", exact: true }).click();
  await nav(page, "Equipment").click();
}
async function exportProfile(page) {
  await page.getByRole("button", { name: "Profile settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Profile settings", exact: true });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export profile", exact: true }).click();
  const value = JSON.parse(await readFile(await (await download).path(), "utf8"));
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  return value;
}
async function importProfile(page, value) {
  await page.goto("./");
  await page.getByRole("button", { name: "Import profile", exact: true }).click();
  await page.getByLabel("Profile JSON", { exact: true }).setInputFiles({ name: "gear-profile.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
  await page.getByRole("dialog", { name: "Import profile", exact: true }).getByRole("button", { name: "Import profile", exact: true }).click();
}

test("reviewed gear: character creation, ANY/ALL, minimums, level windows, linked goals and portable route", async ({ page, browser, baseURL }) => {
  await createCharacter(page);
  await page.getByRole("checkbox", { name: "Intellect", exact: true }).check();
  await page.getByRole("checkbox", { name: "Spirit", exact: true }).check();
  await expect(page.locator(".equipment-results article")).toHaveCount(2);
  await expect(result(page, "Ponderous Orb")).toContainText("+2 Intellect");
  await expect(result(page, "Ponderous Orb")).toContainText("+8 Spirit");
  await page.getByLabel("Stat matching", { exact: true }).selectOption("all");
  await expect(page.locator(".equipment-results article")).toHaveCount(1);
  await expect(result(page, "Ponderous Orb")).toContainText("2/2 desired stats match");
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("3");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("2");
  await page.getByLabel("Minimum Spirit", { exact: true }).fill("8");
  for (const mode of ["current", "plus5"]) {
    await page.getByLabel("Required level window", { exact: true }).selectOption(mode);
    await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  }
  await page.getByText("More item filters", { exact: true }).click();
  await page.getByLabel("Maximum required level", { exact: true }).fill("40");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await page.getByLabel("Maximum required level", { exact: true }).fill("");
  await page.getByLabel("Required level window", { exact: true }).selectOption("plus10");
  await expect(result(page, "Ponderous Orb")).toBeVisible();
  await page.getByLabel("Source scope", { exact: true }).selectOption("route");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Include unknown acquisition locations separately", exact: true }).check();
  await expect(result(page, "Ponderous Orb")).toContainText("Incomplete filter match");
  await page.getByLabel("Source scope", { exact: true }).selectOption("nearby");
  await result(page, "Ponderous Orb").getByText("Source locations and travel", { exact: true }).click();
  await expect(result(page, "Ponderous Orb")).toContainText("Acquisition location is not verified");
  await result(page, "Ponderous Orb").getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await nav(page, "Dungeons").click();
  await expect(page.locator("article.acquisition-card").filter({ has: page.getByRole("heading", { name: "City of Dalaran", exact: true }) })).toContainText("Ponderous Orb");
  await nav(page, "Equipment").click();
  await result(page, "Glowing Copper Boots").getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await result(page, "Tattered Mittens").getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await nav(page, "Professions").click();
  await expect(page.getByRole("article", { name: "Glowing Copper Boots crafting goal", exact: true })).toBeVisible();
  await nav(page, "Quests").click();
  await expect(page.locator("article.acquisition-card").filter({ has: page.getByRole("heading", { name: "The Book of Ur", exact: true }) })).toContainText("Tattered Mittens");
  await nav(page, "Leveling Route").click();
  await page.getByRole("region", { name: "Zone Browser", exact: true }).getByRole("button", { name: "Plan Stonetalon Mountains", exact: true }).click();
  const plan = page.getByRole("dialog", { name: "Plan Stonetalon Mountains", exact: true });
  await plan.getByLabel("Planned entry level", { exact: true }).fill("25");
  await plan.getByLabel("Planned exit level", { exact: true }).fill("28");
  await plan.getByRole("button", { name: "Add to route", exact: true }).click();
  const exported = await exportProfile(page);
  await mkdir("artifacts/pass-7", { recursive: true });
  await writeFile("artifacts/pass-7/reviewed-planning-demo.json", JSON.stringify(exported, null, 2));
  expect(exported.characters[0].acquisition.wishlist).toHaveLength(3);
  expect(exported.characters[0].planner.entries.map(e => e.title)).toEqual(["The Barrens", "Stonetalon Mountains"]);
  await page.reload();
  expect((await saved(page, "Discovery QA")).characters[0].acquisition.wishlist).toEqual(exported.characters[0].acquisition.wishlist);
  const otherContext = await browser.newContext({ baseURL });
  try {
    const other = await otherContext.newPage();
    await importProfile(other, exported);
    await other.getByRole("button", { name: "Open Discovery Priest's overview", exact: true }).click();
    await nav(other, "Equipment").click();
    expect((await saved(other, "Discovery QA")).characters[0]).toEqual(exported.characters[0]);
    await expect(other.getByRole("heading", { name: "Discovery Priest's wishlist", exact: true }).locator("..")).toContainText("3 wanted");
  } finally { await otherContext.close(); }
});

// Isolated user-supplied QA data. No game IDs and no claim of Forever content.
function fixtureProfile({ many = false } = {}) {
  const profile = structuredClone(demo);
  profile.schemaVersion = 4;
  profile.username = "Gear Fixture QA"; profile.usernameKey = "gear fixture qa";
  for (const character of profile.characters) { character.acquisition = blankAcquisition(); character.crafting = blankCrafting(); }
  const character = profile.characters[0];
  character.planner.entries = [{ id: "50000000-0000-4000-8000-000000000001", kind: "zone", title: "The Barrens", recordId: "forever:zone:the-barrens", notes: "Isolated fixture route", priority: "normal", status: "active", targetLevel: { min: 23, max: 26 }, targetLevelSource: "user", prerequisiteEntryIds: [], origin: "user", access: "confirmed" }];
  const evidence = { kind: "user-supplied", note: "Isolated test fixture. Not Forever content or an acquisition recommendation." };
  const rows = [
    ["direct", "the-barrens"], ["nearby", "stonetalon-mountains"], ["distant", "tanaris"], ["unknown", undefined],
  ];
  if (many) for (let i = 0; i < 40; i++) rows.push([`page-${String(i).padStart(2, "0")}`, "the-barrens"]);
  for (const [id, zone] of rows) {
    const sourceId = `user:source:fixture-${id}`;
    character.acquisition.manualItems.push({ id: `user:item:fixture-${id}`, name: `Fixture ${id} · NOT GAME CONTENT`, quality: "common", slot: "Hands", equipmentType: "Cloth", requiredLevel: 20, stats: [{ label: "Intellect", value: "+6" }, { label: "Spirit", value: "+8" }], numericStats: { values: { intellect: 6, spirit: 8 }, completeness: "partial" }, classRestrictions: ["Priest"], sourceIds: zone ? [sourceId] : [], evidence });
    if (zone) character.acquisition.manualSources.push({ id: sourceId, itemIds: [`user:item:fixture-${id}`], method: "vendor", label: `Fixture vendor ${id} · NOT GAME CONTENT`, zoneId: `forever:zone:${zone}`, zoneName: zone === "the-barrens" ? "The Barrens" : zone === "stonetalon-mountains" ? "Stonetalon Mountains" : "Tanaris", locationRole: "vendor", availability: "unknown", evidence });
  }
  // Mixed sources catch false intersections: the quest source is distant while vendor is direct.
  const mixed = character.acquisition.manualItems[0];
  mixed.sourceIds.push("user:source:fixture-distant-quest");
  character.acquisition.manualSources.push({ id: "user:source:fixture-distant-quest", itemIds: [mixed.id], method: "quest", label: "Fixture distant quest · NOT GAME CONTENT", questId: "user:quest:fixture", zoneId: "forever:zone:tanaris", zoneName: "Tanaris", locationRole: "quest-turn-in", availability: "unknown", evidence });
  return profile;
}
async function seedFixture(page, options) {
  const profile = fixtureProfile(options);
  await page.goto("./");
  await page.evaluate(({ profile, key }) => { localStorage.setItem(key, JSON.stringify(profile)); sessionStorage.setItem("gregular.active-profile", profile.username); }, { profile, key: keyFor(profile.username) });
  await page.reload();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await nav(page, "Equipment").click();
  await page.getByRole("checkbox", { name: "Intellect", exact: true }).check();
  await page.getByRole("checkbox", { name: "Spirit", exact: true }).check();
  await page.getByLabel("Stat matching", { exact: true }).selectOption("all");
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("5");
  await page.getByLabel("Minimum Spirit", { exact: true }).fill("8");
}

test("isolated fixture: route scopes, same-source method intersection, route changes and personal source roles", async ({ page }) => {
  await seedFixture(page);
  await page.getByLabel("Source scope", { exact: true }).selectOption("route");
  await expect(page.locator(".equipment-results article")).toHaveCount(1);
  await expect(result(page, "Fixture direct · NOT GAME CONTENT")).toContainText("User supplied");
  await page.getByRole("combobox", { name: "Acquisition", exact: true }).selectOption("quest");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Acquisition", exact: true }).selectOption("");
  await page.getByLabel("Source scope", { exact: true }).selectOption("nearby");
  await expect(page.locator(".equipment-results article")).toHaveCount(2);
  const nearby = result(page, "Fixture nearby · NOT GAME CONTENT");
  await expect(nearby).toContainText("Nearby detour");
  await nearby.getByText("Source locations and travel", { exact: true }).click();
  await expect(nearby).toContainText(/Adjacent|Walking|road|walk/i);
  await expect(nearby).toContainText("Provisional");
  await mkdir("artifacts/pass-7", { recursive: true });
  await page.locator(".equipment-results").screenshot({ path: "artifacts/pass-7/isolated-route-fixture.png" });
  await page.getByRole("checkbox", { name: "Include unknown acquisition locations separately", exact: true }).check();
  await expect(result(page, "Fixture unknown · NOT GAME CONTENT")).toContainText("Incomplete filter match");
  await expect(result(page, "Fixture distant · NOT GAME CONTENT")).toHaveCount(0);
  await nearby.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await nav(page, "Leveling Route").click();
  await page.getByRole("article", { name: "Route stop: The Barrens", exact: true }).getByRole("button", { name: "Complete zone: The Barrens", exact: true }).click();
  await nav(page, "Equipment").click();
  await page.getByLabel("Source scope", { exact: true }).selectOption("route");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await nav(page, "Leveling Route").click();
  await page.getByRole("region", { name: "Zone Browser", exact: true }).getByRole("button", { name: "Plan Stonetalon Mountains", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add to route", exact: true }).click();
  await nav(page, "Equipment").click();
  await page.getByLabel("Source scope", { exact: true }).selectOption("route");
  await expect(result(page, "Fixture nearby · NOT GAME CONTENT")).toContainText("On my route");
  const value = await exportProfile(page);
  expect(value.characters[0].acquisition.manualSources[0].locationRole).toBe("vendor");
  expect(value.characters[1].acquisition.wishlist).toEqual([]);
  expect(value.characters[0].acquisition.wishlist[0].status).toBe("wanted");
  await writeFile("artifacts/pass-7/isolated-route-fixture.json", JSON.stringify(value, null, 2));
});

test("unknown stat separation, editable presets, invalid ranges and bounded result pages", async ({ page }) => {
  await seedFixture(page, { many: true });
  await page.getByLabel("Source scope", { exact: true }).selectOption("route");
  await expect(page.locator(".equipment-results article")).toHaveCount(36);
  await page.getByRole("button", { name: "Next results", exact: true }).click();
  await expect(page.locator(".equipment-results article")).toHaveCount(5);
  await page.getByRole("button", { name: "Previous results", exact: true }).click();
  await page.getByLabel("Sort equipment", { exact: true }).selectOption("stat");
  await page.getByRole("button", { name: "Clear stats", exact: true }).click();
  await expect(page.getByLabel("Sort equipment", { exact: true })).toHaveValue("match");
  await expect(page.getByLabel("Stat to sort by", { exact: true })).toHaveCount(0);
  await page.getByLabel("Stat preset", { exact: true }).selectOption("healing");
  await expect(page.getByRole("checkbox", { name: "Healing power", exact: true })).toBeChecked();
  await expect(page.getByLabel("Stat preset", { exact: true })).toHaveValue("healing");
  await page.getByRole("checkbox", { name: "Healing power", exact: true }).uncheck();
  await expect(page.getByLabel("Stat preset", { exact: true })).toHaveValue("");
  await page.getByLabel("Required level window", { exact: true }).selectOption("custom");
  await page.getByLabel("Minimum required level", { exact: true }).fill("30");
  await page.getByLabel("Custom maximum required level", { exact: true }).fill("10");
  await expect(page.getByRole("alert")).toContainText("valid required-level range");
  await page.getByLabel("Custom maximum required level", { exact: true }).fill("40");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const width of [1440, 820, 390]) test(`gear discovery keyboard, responsive layout and screenshot ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await createCharacter(page);
  await page.getByRole("checkbox", { name: "Intellect", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("checkbox", { name: "Spirit", exact: true }).check();
  await page.getByLabel("Stat matching", { exact: true }).selectOption("all");
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("2");
  await page.getByLabel("Minimum Spirit", { exact: true }).fill("8");
  await page.getByLabel("Required level window", { exact: true }).selectOption("plus10");
  await expect(result(page, "Ponderous Orb")).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".equipment-results")).toHaveClass(/is-list/);
  await page.evaluate(async () => { await Promise.allSettled(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished)); });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const output = process.env.GEAR_SCREENSHOTS_DIR ?? "artifacts/pass-7";
  await mkdir(output, { recursive: true });
  await page.getByRole("heading", { name: "Equipment", exact: true }).click();
  await page.screenshot({ path: resolve(output, `gear-discovery-${width}.png`), fullPage: true });
  if (width === 1440) await writeFile(resolve(output, "reviewed-demo-profile.json"), JSON.stringify(await exportProfile(page), null, 2));
});

test("touch stat controls and explicit personal vendor location preserve source meaning", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage(); await createCharacter(page);
    await page.getByRole("checkbox", { name: "Intellect", exact: true }).tap();
    await expect(page.getByRole("checkbox", { name: "Intellect", exact: true })).toBeChecked();
    await result(page, "Ponderous Orb").getByRole("button", { name: "Add personal source", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Add personal source link", exact: true });
    await dialog.getByRole("combobox", { name: "Acquisition method", exact: true }).selectOption("vendor");
    await dialog.getByLabel("Source label", { exact: true }).fill("Isolated QA source · NOT GAME CONTENT");
    await dialog.getByLabel("Associated zone (optional)", { exact: true }).fill("The Barrens");
    await dialog.getByLabel("Location relationship (optional)", { exact: true }).selectOption("vendor");
    await dialog.getByRole("button", { name: "Save source link", exact: true }).tap();
    await page.getByLabel("Source scope", { exact: true }).selectOption("route");
    await expect(result(page, "Ponderous Orb")).toContainText("User supplied");
    await expect(result(page, "Ponderous Orb")).toContainText("On my route");
    await page.reload();
    expect((await saved(page, "Discovery QA")).characters[0].acquisition.manualSources[0].locationRole).toBe("vendor");
  } finally { await context.close(); }
});

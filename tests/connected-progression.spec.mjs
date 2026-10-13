import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const demo = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
const key = "gregular:forever:profile:connected%20qa";
const clone = (value) => JSON.parse(JSON.stringify(value));
const nav = (page, name) => page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name, exact: true });
const card = (page, name) => page.locator("article.acquisition-card").filter({ has: page.getByRole("heading", { name, exact: true }) });
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
async function seed(page, { resolvedRoute = false } = {}) {
  const profile = clone(demo);
  if (resolvedRoute) profile.characters[0].planner.entries.find((e) => e.kind === "zone").recordId = "forever:zone:the-barrens";
  profile.username = "Connected QA"; profile.usernameKey = "connected qa";
  await page.goto("./");
  await page.evaluate(({ profile, key }) => {
    localStorage.setItem(key, JSON.stringify(profile));
    sessionStorage.setItem("gregular.active-profile", profile.username);
  }, { profile, key });
  await page.reload();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your overview.", exact: true })).toBeVisible();
  return profile;
}
async function wishlist(page, name) {
  await nav(page, "Equipment").click();
  await page.getByRole("searchbox", { name: "Item name", exact: true }).fill(name);
  await card(page, name).getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(card(page, name)).toHaveCount(2);
}
async function exportProfile(page) {
  await page.getByRole("button", { name: "Profile settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog", { name: "Profile settings", exact: true }).getByRole("button", { name: "Export profile", exact: true }).click();
  const download = await downloadPromise;
  const value = JSON.parse(await readFile(await download.path(), "utf8"));
  await page.getByRole("dialog", { name: "Profile settings", exact: true }).getByRole("button", { name: "Cancel", exact: true }).click();
  return value;
}
async function importProfile(page, value) {
  await page.goto("./");
  await page.getByRole("button", { name: "Import profile", exact: true }).click();
  await page.getByLabel("Profile JSON", { exact: true }).setInputFiles({ name: "connected.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
  const dialog = page.getByRole("dialog", { name: "Import profile", exact: true });
  await expect(dialog).toContainText("wishlist entries");
  await dialog.getByRole("button", { name: "Import profile", exact: true }).click();
  await expect(dialog).toBeHidden();
}
async function accessible(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished));
  });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("Overview defaults, journal bookmarks and independent character navigation", async ({ page }) => {
  await seed(page);
  await expect(page).toHaveURL(/\/overview$/);
  const id = demo.characters[0].id;
  await page.goto(`./#/character/${id}/journal`);
  await expect(nav(page, "Overview")).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Your overview.", exact: true })).toBeVisible();
  await nav(page, "Quests").click();
  await expect(page).toHaveURL(/\/quests$/);
  await expect(page.getByRole("heading", { name: "Quests", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "All characters", exact: true }).click();
  await page.getByRole("button", { name: "Open Bram's overview", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${demo.characters.find((c) => c.name === "Bram").id}/overview$`));
  await nav(page, "Equipment").click();
  await expect(page.getByRole("heading", { name: "Bram's wishlist", exact: true })).toBeVisible();
  await expect(page.getByText("No wishlist items in this view", { exact: true })).toBeVisible();
});

test("reviewed dungeon and shared quest rewards connect, stay independent and export to a new browser", async ({ page, browser }) => {
  const original = await seed(page);
  await wishlist(page, "Ponderous Orb");
  await wishlist(page, "Tattered Mittens");
  await wishlist(page, "Grizzled Boots");
  await nav(page, "Dungeons").click();
  const dungeon = card(page, "City of Dalaran");
  await expect(dungeon).toContainText("Ponderous Orb");
  await expect(dungeon).toContainText("Shade of the Archmage");
  await dungeon.getByRole("button", { name: /Record completed run/ }).click();
  expect((await saved(page)).characters[0].acquisition.wishlist.every((e) => e.status === "wanted")).toBe(true);
  await nav(page, "Quests").click();
  const quest = card(page, "The Book of Ur");
  await expect(quest).toHaveCount(1);
  await expect(quest).toContainText("Tattered Mittens");
  await expect(quest).toContainText("Grizzled Boots");
  await expect(quest).toContainText(/unknown|incomplete/i);
  await page.getByRole("button", { name: "Create quest chain", exact: true }).click();
  let chainDialog = page.getByRole("dialog");
  await chainDialog.getByLabel("Chain name", { exact: true }).fill("My session preparation");
  await chainDialog.getByRole("button", { name: "Create chain", exact: true }).click();
  const chain = page.locator("details.quest-chain");
  for (const name of ["Review personal quest notes", "Confirm the meeting point"]) {
    await chain.getByRole("button", { name: "Add chain step", exact: true }).click();
    chainDialog = page.getByRole("dialog");
    await chainDialog.getByLabel("Quest name", { exact: true }).fill(name);
    await chainDialog.getByRole("button", { name: "Add quest", exact: true }).click();
  }
  await chain.getByRole("checkbox", { name: /1\. Review personal quest notes/ }).check();
  await expect(chain).toContainText("1/2 quests completed");
  await nav(page, "Overview").click();
  await expect(page.getByRole("region", { name: "Connected progression" })).toContainText("3 wanted");
  await expect(page.getByRole("region", { name: "Next Up", exact: true })).not.toContainText("The Book of Ur");
  await nav(page, "Equipment").click();
  const wishedOrb = card(page, "Ponderous Orb").filter({ has: page.getByRole("combobox", { name: "Item status", exact: true }) });
  await wishedOrb.getByRole("combobox", { name: "Item status", exact: true }).selectOption("acquired");
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("");
  await expect(wishedOrb.getByRole("combobox", { name: "Item status", exact: true })).toHaveValue("acquired");
  const current = await saved(page);
  expect(current.characters[0].acquisition.dungeonProgress[0].runsCompleted).toBe(1);
  expect(current.characters[0].acquisition.questProgress.find((q) => q.questId === "forever:quest:1013")).toBeUndefined();
  expect(current.characters[0].acquisition.manualChains).toHaveLength(1);
  expect(current.characters[0].acquisition.questProgress.filter((q) => q.status === "completed")).toHaveLength(1);
  expect(current.characters[0].planner).toEqual(original.characters[0].planner);
  expect(current.characters[1].acquisition.wishlist).toEqual([]);
  const exported = await exportProfile(page);
  expect(exported.schemaVersion).toBe(3);
  await mkdir("artifacts/pass-5", { recursive: true });
  await writeFile("artifacts/pass-5/connected-demo-profile.json", JSON.stringify(exported, null, 2) + "\n");
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  try {
    await importProfile(other, exported);
    const imported = await saved(other);
    expect(imported.characters).toEqual(exported.characters);
    await other.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
    await nav(other, "Quests").click();
    await expect(card(other, "The Book of Ur")).toContainText("Tattered Mittens");
    await expect(other.locator("details.quest-chain")).toContainText("1/2 quests completed");
    await nav(other, "Dungeons").click();
    await expect(card(other, "City of Dalaran")).toContainText("1");
  } finally { await otherContext.close(); }
});

test("equipment filters, unknown sources, duplicate prevention and manual notes survive reload", async ({ page }) => {
  await seed(page);
  await nav(page, "Equipment").click();
  await page.getByRole("combobox", { name: "Acquisition", exact: true }).selectOption("dungeon");
  await expect(page.locator("article.acquisition-card")).toHaveCount(1);
  await expect(card(page, "Ponderous Orb")).toBeVisible();
  await page.getByLabel("Maximum required level", { exact: true }).fill("20");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Acquisition", exact: true }).selectOption("unknown");
  await expect(card(page, "Snake Eye Kaleidoscope")).toBeVisible();
  await card(page, "Snake Eye Kaleidoscope").getByRole("button", { name: "Add to wishlist", exact: true }).click();
  const finderItem = card(page, "Snake Eye Kaleidoscope").filter({ has: page.getByRole("button", { name: "On wishlist · Wanted", exact: true }) });
  await expect(finderItem.getByRole("button", { name: "On wishlist · Wanted", exact: true })).toBeDisabled();
  const desired = card(page, "Snake Eye Kaleidoscope").filter({ has: page.getByRole("combobox", { name: "Item status", exact: true }) });
  await desired.getByText("Item details and sources", { exact: true }).click();
  await expect(desired).toContainText("Source unknown");
  await page.getByRole("button", { name: "Add personal item", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add personal item", exact: true });
  await dialog.getByLabel("Item name", { exact: true }).fill("My researched shield");
  await dialog.getByLabel("Personal acquisition notes", { exact: true }).fill("Ask the party to review my external reference");
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  const state = (await saved(page)).characters[0].acquisition;
  expect(state.wishlist).toHaveLength(2);
  expect(state.wishlist.find((e) => e.itemId.startsWith("user:")).notes).toBe("Ask the party to review my external reference");
  await expect(card(page, "My researched shield").filter({ has: page.getByRole("combobox", { name: "Item status", exact: true }) })).toContainText("User supplied");
});

test("manual quest chains create, edit, reorder, complete and retain quest state on deletion", async ({ page }) => {
  await seed(page);
  await nav(page, "Quests").click();
  await page.getByRole("button", { name: "Create quest chain", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Chain name", { exact: true }).fill("My Westfall research");
  await dialog.getByLabel("Chain notes", { exact: true }).fill("Personal plan, verify quest details in game");
  await dialog.getByRole("button", { name: "Create chain", exact: true }).click();
  const chain = page.locator("details.quest-chain");
  await expect(chain).toContainText("0/0 quests completed");
  for (const name of ["Check the notice board", "Ask the party leader"]) {
    await chain.getByRole("button", { name: "Add chain step", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Quest name", { exact: true }).fill(name);
    await dialog.getByLabel("Associated zone", { exact: true }).fill("Westfall");
    await dialog.getByLabel("Target level (optional)", { exact: true }).fill("24");
    await dialog.getByRole("button", { name: "Add quest", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await expect(chain).toContainText("0/2 quests completed");
  const before = (await saved(page)).characters[0].acquisition;
  await chain.getByRole("button", { name: "Move Ask the party leader up", exact: true }).click();
  await expect(chain.locator(".quest-steps > li").first()).toContainText("Ask the party leader");
  await chain.getByRole("checkbox", { name: /1\. Ask the party leader/ }).check();
  await expect(chain).toContainText("1/2 quests completed");
  await chain.locator(".quest-steps > li").first().getByRole("button", { name: "Edit step", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Quest name", { exact: true }).fill("Confirm the party plan");
  await dialog.getByRole("button", { name: "Save quest", exact: true }).click();
  await expect(chain).toContainText("1. Confirm the party plan");
  await chain.getByRole("button", { name: "Edit chain", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Chain name", { exact: true }).fill("My revised Westfall plan");
  await dialog.getByRole("button", { name: "Save chain", exact: true }).click();
  await expect(chain).toContainText("My revised Westfall plan");
  await mkdir("artifacts/pass-5", { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await accessible(page);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: `artifacts/pass-5/quest-chain-${width === 390 ? "mobile" : "desktop"}.png`, fullPage: true });
  }
  await nav(page, "Overview").click();
  await expect(page.getByRole("region", { name: "Connected progression" })).toContainText("1 active chains");
  await nav(page, "Quests").click();
  await chain.getByRole("button", { name: "Complete whole chain", exact: true }).click();
  await page.getByRole("combobox", { name: "Journal view", exact: true }).selectOption("all");
  await expect(chain).toContainText("2/2 quests completed");
  const progressed = (await saved(page)).characters[0].acquisition;
  expect(progressed.manualChains[0].questIds).toEqual([...before.manualChains[0].questIds].reverse());
  await chain.getByRole("button", { name: "Delete chain", exact: true }).click();
  await expect(chain).toHaveCount(0);
  expect((await saved(page)).characters[0].acquisition.questProgress).toEqual(progressed.questProgress);
  await page.reload();
  expect((await saved(page)).characters[0].acquisition.manualQuests).toHaveLength(2);
});

test("preferred personal sources update linked views and preserve notes, progress and route", async ({ page }) => {
  const original = await seed(page, { resolvedRoute: true });
  await wishlist(page, "Snake Eye Kaleidoscope");
  const finder = card(page, "Snake Eye Kaleidoscope").filter({ has: page.getByRole("button", { name: "On wishlist · Wanted", exact: true }) });
  async function addSource(method, label) {
    await finder.getByRole("button", { name: "Add personal source", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add personal source link", exact: true });
    await dialog.getByRole("combobox", { name: "Acquisition method", exact: true }).selectOption(method);
    await dialog.getByLabel("Source label", { exact: true }).fill(label);
    if (method === "quest") await dialog.getByRole("combobox", { name: /Reward quest/ }).selectOption("forever:quest:1013");
    else await dialog.getByRole("combobox", { name: "Dungeon", exact: true }).selectOption("forever:dungeon:city-of-dalaran");
    await dialog.getByLabel("Associated zone (optional)", { exact: true }).fill("The Barrens");
    await dialog.getByRole("button", { name: "Save source link", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await addSource("quest", "My quest research");
  await addSource("dungeon", "My dungeon research");
  const wished = card(page, "Snake Eye Kaleidoscope").filter({ has: page.getByRole("combobox", { name: "Item status", exact: true }) });
  await wished.getByRole("combobox", { name: "Preferred acquisition source", exact: true }).selectOption({ label: "My quest research" });
  await wished.getByText("Personal notes and management", { exact: true }).click();
  await wished.getByLabel("Wishlist notes", { exact: true }).fill("This relationship is my research plan");
  await wished.getByRole("button", { name: "Save notes", exact: true }).click();
  await nav(page, "Quests").click();
  await expect(card(page, "The Book of Ur")).toContainText("Snake Eye Kaleidoscope");
  await card(page, "The Book of Ur").getByRole("checkbox").click();
  expect((await saved(page)).characters[0].acquisition.wishlist[0].status).toBe("wanted");
  await nav(page, "Leveling Route").click();
  await expect(page.getByLabel("Connected goals for Meet the party in the Barrens", { exact: true })).toContainText("1 desired items");
  await nav(page, "Equipment").click();
  await wished.getByRole("combobox", { name: "Preferred acquisition source", exact: true }).selectOption({ label: "My dungeon research" });
  await nav(page, "Dungeons").click();
  await expect(card(page, "City of Dalaran")).toContainText("Snake Eye Kaleidoscope");
  const state = (await saved(page)).characters[0];
  expect(state.acquisition.wishlist[0].notes).toBe("This relationship is my research plan");
  expect(state.acquisition.questProgress.find((q) => q.questId === "forever:quest:1013").status).toBe("completed");
  expect(state.planner).toEqual(original.characters[0].planner);
});

test("touch emulation can wishlist, expand details and create a personal quest on mobile", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await seed(page);
    await nav(page, "Equipment").tap();
    await card(page, "Ponderous Orb").getByRole("button", { name: "Add to wishlist", exact: true }).tap();
    const wished = card(page, "Ponderous Orb").filter({ has: page.getByRole("combobox", { name: "Item status", exact: true }) });
    await wished.getByText("Item details and sources", { exact: true }).tap();
    await expect(wished).toContainText("Shade of the Archmage");
    await nav(page, "Quests").tap();
    await page.getByRole("button", { name: "Add personal quest", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Add personal quest", exact: true });
    await dialog.getByLabel("Quest name", { exact: true }).fill("My mobile quest research");
    await accessible(page);
    await mkdir("artifacts/pass-5", { recursive: true });
    await page.screenshot({ path: "artifacts/pass-5/quest-editor-mobile.png", fullPage: false });
    await dialog.getByRole("button", { name: "Add quest", exact: true }).tap();
    await expect(card(page, "My mobile quest research")).toBeVisible();
  } finally { await context.close(); }
});

for (const width of [390, 820, 1440]) {
  test(`connected pages support keyboard, ${width}px layout and accessible local details`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seed(page);
    await wishlist(page, "Ponderous Orb");
    await wishlist(page, "Tattered Mittens");
    for (const name of ["Overview", "Quests", "Dungeons", "Equipment"]) {
      await nav(page, name).click();
      await accessible(page);
      if (name === "Equipment") {
        const details = page.getByText("Item details and sources", { exact: true }).first();
        await details.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("details[open]").first()).toContainText("Game item ID");
        await accessible(page);
      }
      if (width !== 820) {
        await mkdir("artifacts/pass-5", { recursive: true });
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
        await page.screenshot({ path: `artifacts/pass-5/${name.toLowerCase()}-${width === 390 ? "mobile" : "desktop"}.png`, fullPage: true });
      }
    }
  });
}

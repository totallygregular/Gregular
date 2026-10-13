import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";

const username = "Destination Explorer";
const key = `gregular:forever:profile:${encodeURIComponent(username.toLowerCase())}`;
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
const combo = (dialog, name) => dialog.getByRole("combobox", { name, exact: true });
const route = (page) => page.getByRole("region", { name: "My Route", exact: true });
const zoneBrowser = (page) => page.getByRole("region", { name: "Zone Browser", exact: true });
const optionValues = (select) => select.locator("option").evaluateAll((options) => options.map(({ value }) => value).filter(Boolean));

async function enter(page) {
  await page.goto("./");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByRole("button", { name: "Open my planner", exact: true }).click();
  await expect(page.getByRole("button", { name: "New character", exact: true })).toBeVisible();
}

async function newCharacter(page, name = "Zala") {
  await page.getByRole("button", { name: "New character", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Character name", { exact: true }).fill(name);
  return dialog;
}

async function create(dialog) {
  await dialog.getByRole("button", { name: "Create character", exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function openRoute(page, name = "Zala") {
  await page.getByRole("button", { name: `Open ${name}'s overview`, exact: true }).click();
  await page.getByRole("navigation", { name: "Character sections" }).locator('a[href$="/leveling"]').click();
  await expect(route(page)).toBeVisible();
  await expect(zoneBrowser(page)).toBeVisible();
}

async function accessible(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished));
  });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("Troll Shaman creation suggests Durotar, then Barrens and Silverpine as the next bracket", async ({ page }) => {
  await enter(page);
  const dialog = await newCharacter(page);
  await expect(combo(dialog, "Race")).toHaveJSProperty("tagName", "SELECT");
  await expect(combo(dialog, "Class")).toBeDisabled();
  await expect(combo(dialog, "Planned specialisation")).toBeDisabled();
  await expect(combo(dialog, "Starting zone")).toBeDisabled();
  await expect(combo(dialog, "Faction")).toHaveCount(0);
  await combo(dialog, "Race").selectOption("troll");
  await combo(dialog, "Class").selectOption("Shaman");
  await combo(dialog, "Planned specialisation").selectOption("Enhancement");
  await expect(dialog.getByRole("status")).toContainText("Faction: Horde");
  await expect(combo(dialog, "Starting zone")).toHaveValue("forever:zone:durotar");
  await create(dialog);
  const character = (await saved(page)).characters[0];
  expect(character).toMatchObject({ race: "Troll", className: "Shaman", faction: "Horde", plannedSpec: "Enhancement" });
  expect(character.planner.entries).toHaveLength(1);
  expect(character.planner.entries[0]).toMatchObject({ title: "Durotar", targetLevel: { min: 1, max: 12 } });
  await openRoute(page);
  const candidates = zoneBrowser(page).getByRole("article");
  await expect(candidates.nth(0)).toHaveAccessibleName("Zone: The Barrens");
  await expect(candidates.nth(1)).toHaveAccessibleName("Zone: Silverpine Forest");
  await expect(candidates.nth(0)).toContainText("Easy travel");
  await expect(candidates.nth(1)).toContainText("Long travel");
  await expect(zoneBrowser(page)).toContainText(/next suggested zone/i);
  await page.reload();
  expect((await saved(page)).characters[0]).toEqual(character);
});

test("race and class selectors constrain Forever choices and reset incompatible dependent choices", async ({ page }) => {
  await enter(page);
  const dialog = await newCharacter(page);
  await combo(dialog, "Race").selectOption("troll");
  await combo(dialog, "Class").selectOption("Priest");
  await combo(dialog, "Planned specialisation").selectOption("Holy");
  await combo(dialog, "Race").selectOption("orc");
  await expect(combo(dialog, "Class")).toHaveValue("");
  await expect(combo(dialog, "Planned specialisation")).toHaveValue("");
  await expect(combo(dialog, "Planned specialisation")).toBeDisabled();
  expect(await optionValues(combo(dialog, "Class"))).not.toContain("Priest");
  await combo(dialog, "Class").selectOption("Mage");
  await combo(dialog, "Planned specialisation").selectOption("Arcane");
  await combo(dialog, "Class").selectOption("Warrior");
  await expect(combo(dialog, "Planned specialisation")).toHaveValue("");
  expect(await optionValues(combo(dialog, "Planned specialisation"))).toEqual(["Arms", "Fury", "Protection"]);
  for (const [race, className, spec] of [
    ["gnome", "Priest", "Discipline"],
    ["dwarf", "Shaman", "Elemental Combat"],
    ["undead", "Paladin", "Protection"],
    ["human", "Hunter", "Survival"],
    ["troll", "Warlock", "Demonology"],
  ]) {
    await combo(dialog, "Race").selectOption(race);
    await combo(dialog, "Class").selectOption(className);
    await combo(dialog, "Planned specialisation").selectOption(spec);
    await expect(combo(dialog, "Class")).toHaveValue(className);
    await expect(combo(dialog, "Planned specialisation")).toHaveValue(spec);
  }
  expect(await optionValues(combo(dialog, "Race"))).not.toContain("blood-elf");
  expect(await optionValues(combo(dialog, "Class"))).not.toContain("Death Knight");
  await create(dialog);
  expect((await saved(page)).characters[0]).toMatchObject({ race: "Troll", className: "Warlock", plannedSpec: "Demonology" });
});

test("the two Skyborne affiliations derive faction and offer their different confirmed classes", async ({ page }) => {
  await enter(page);
  const dialog = await newCharacter(page, "High Order");
  await combo(dialog, "Race").selectOption("skyborne-alliance");
  expect(await optionValues(combo(dialog, "Class"))).toContain("Mage");
  expect(await optionValues(combo(dialog, "Class"))).not.toContain("Shaman");
  await combo(dialog, "Class").selectOption("Mage");
  await combo(dialog, "Planned specialisation").selectOption("Frost");
  await expect(dialog.getByRole("status")).toContainText("Faction: Alliance");
  await expect(combo(dialog, "Starting zone")).toHaveValue("forever:zone:zephras-isle");
  await create(dialog);
  const horde = await newCharacter(page, "Windshaper");
  await combo(horde, "Race").selectOption("skyborne-alliance");
  await combo(horde, "Class").selectOption("Mage");
  await combo(horde, "Planned specialisation").selectOption("Fire");
  await combo(horde, "Race").selectOption("skyborne-horde");
  await expect(combo(horde, "Class")).toHaveValue("");
  await expect(combo(horde, "Planned specialisation")).toHaveValue("");
  expect(await optionValues(combo(horde, "Class"))).not.toContain("Mage");
  await combo(horde, "Class").selectOption("Shaman");
  await expect(horde.getByRole("status")).toContainText("Faction: Horde");
  await expect(combo(horde, "Starting zone")).toHaveValue("forever:zone:zephras-isle");
  await create(horde);
  expect((await saved(page)).characters.map(({ race, faction, className }) => ({ race, faction, className }))).toEqual([
    { race: "Skyborne", faction: "Alliance", className: "Mage" },
    { race: "Skyborne", faction: "Horde", className: "Shaman" },
  ]);
});

test("a friend destination override survives another race choice and remains freely editable", async ({ page }) => {
  await enter(page);
  const dialog = await newCharacter(page);
  await combo(dialog, "Race").selectOption("troll");
  await combo(dialog, "Class").selectOption("Shaman");
  await combo(dialog, "Starting zone").selectOption("forever:zone:elwynn-forest");
  await expect(dialog).toContainText("You can still plan this visit");
  await combo(dialog, "Race").selectOption("tauren");
  await dialog.getByLabel("Current level", { exact: true }).fill("25");
  await expect(combo(dialog, "Starting zone")).toHaveValue("forever:zone:elwynn-forest");
  await expect(combo(dialog, "Class")).toHaveValue("Shaman");
  await create(dialog);
  const before = (await saved(page)).characters[0];
  expect(before).toMatchObject({ race: "Tauren", faction: "Horde" });
  expect(before.planner.entries).toHaveLength(1);
  expect(before.planner.entries[0].title).toBe("Elwynn Forest");
  await page.reload();
  expect((await saved(page)).characters[0]).toEqual(before);
  await openRoute(page);
  await route(page).getByRole("button", { name: "Edit planned levels for Elwynn Forest", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit plan: Elwynn Forest", exact: true });
  await editor.getByLabel("Planned exit level", { exact: true }).fill("35");
  await editor.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(editor).toBeHidden();
  expect((await saved(page)).characters[0].planner.entries[0].targetLevel.max).toBe(35);
});

test("choosing the first stop later preserves an empty route and an optional blank specialisation", async ({ page }) => {
  await enter(page);
  const dialog = await newCharacter(page);
  await combo(dialog, "Race").selectOption("human");
  await combo(dialog, "Class").selectOption("Priest");
  await combo(dialog, "Starting zone").selectOption("");
  await combo(dialog, "Race").selectOption("troll");
  await expect(combo(dialog, "Starting zone")).toHaveValue("");
  await create(dialog);
  const before = (await saved(page)).characters[0];
  expect(before.plannedSpec).toBe("");
  expect(before.planner.entries).toEqual([]);
  await page.reload();
  expect((await saved(page)).characters[0]).toEqual(before);
  await openRoute(page);
  await expect(route(page).getByRole("article")).toHaveCount(0);
  await expect(route(page).getByRole("button", { name: "Plan Durotar", exact: true })).toBeVisible();
});

test("advanced characters default to an empty route rather than adding a starter zone automatically", async ({ page }) => {
  await enter(page);
  const dialog = await newCharacter(page);
  await combo(dialog, "Race").selectOption("troll");
  await combo(dialog, "Class").selectOption("Shaman");
  await expect(combo(dialog, "Starting zone")).toHaveValue("forever:zone:durotar");
  await dialog.getByLabel("Current level", { exact: true }).fill("25");
  await expect(combo(dialog, "Starting zone")).toHaveValue("");
  await dialog.getByLabel("Current level", { exact: true }).fill("1");
  await expect(combo(dialog, "Starting zone")).toHaveValue("forever:zone:durotar");
  await dialog.getByLabel("Current level", { exact: true }).fill("25");
  await create(dialog);
  expect((await saved(page)).characters[0].planner.entries).toEqual([]);
  await page.reload();
  await openRoute(page);
  await expect(zoneBrowser(page).getByRole("article", { name: "Zone: Durotar", exact: true })).toHaveAttribute("data-fit", "awkward");
});

test("imported legacy labels and their route survive unrelated character edits", async ({ page }) => {
  const profile = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
  Object.assign(profile.characters[0], {
    name: "Saved traveller", race: "Saved race", className: "Saved class",
    faction: "Saved faction", plannedSpec: "Saved specialisation",
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Import profile", exact: true }).click();
  await page.getByRole("dialog", { name: "Profile settings", exact: true })
    .getByLabel("Profile JSON", { exact: true }).setInputFiles({ name: "legacy.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(profile)) });
  const confirmation = page.getByRole("dialog", { name: "Import profile", exact: true });
  await confirmation.getByRole("button", { name: "Import profile", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await page.getByRole("button", { name: "Edit Saved traveller", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(combo(dialog, "Race")).toHaveValue("saved");
  await expect(combo(dialog, "Class")).toHaveValue("Saved class");
  await expect(combo(dialog, "Planned specialisation")).toHaveValue("Saved specialisation");
  await expect(dialog).toContainText("Saved labels are kept");
  await dialog.getByLabel("Character name", { exact: true }).fill("Saved traveller updated");
  await dialog.getByLabel("Current level", { exact: true }).fill("18");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toBeHidden();
  const importedKey = `gregular:forever:profile:${encodeURIComponent(profile.usernameKey)}`;
  const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), importedKey);
  const blankAcquisition = { wishlist: [], questProgress: [], manualItems: [], manualSources: [], manualDungeons: [], manualQuests: [], manualChains: [], dungeonProgress: [] };
  expect(after.schemaVersion).toBe(4);
  expect(after.characters[0]).toEqual({ ...profile.characters[0], name: "Saved traveller updated", level: 18, acquisition: blankAcquisition, crafting: { professions: [], goals: [], manualRecipes: [], manualMaterials: [] } });
  expect(after.characters.slice(1)).toEqual(profile.characters.slice(1).map((character) => ({ ...character, acquisition: blankAcquisition, crafting: { professions: [], goals: [], manualRecipes: [], manualMaterials: [] } })));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Saved traveller updated", exact: true })).toBeVisible();
});

for (const [label, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
  test(`${label} character choices and new route remain readable and accessible`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enter(page);
    const dialog = await newCharacter(page);
    await combo(dialog, "Race").selectOption("troll");
    await combo(dialog, "Class").selectOption("Shaman");
    await combo(dialog, "Planned specialisation").selectOption("Enhancement");
    await accessible(page);
    await mkdir("docs/images/character-followup", { recursive: true });
    await dialog.getByLabel("Character name", { exact: true }).focus();
    await page.screenshot({ path: `docs/images/character-followup/character-form-${label}.png`, fullPage: true });
    await create(dialog);
    await openRoute(page);
    await expect(zoneBrowser(page).getByRole("article").first()).toHaveAccessibleName("Zone: The Barrens");
    await expect(route(page).getByRole("article", { name: "Route stop: Durotar", exact: true })).toContainText("Your plan");
    await accessible(page);
    await page.evaluate((mobile) => {
      document.activeElement?.blur();
      scrollTo(0, mobile ? document.querySelector('[aria-label="My Route"]').getBoundingClientRect().top + scrollY - 16 : 0);
    }, label === "mobile");
    await page.screenshot({ path: `docs/images/character-followup/character-route-${label}.png` });
    await page.evaluate(() => {
      const first = document.querySelector(".zone-candidate");
      scrollTo(0, first.getBoundingClientRect().top + scrollY - 110);
    });
    await page.screenshot({ path: `docs/images/character-followup/character-browser-${label}.png` });
  });
}

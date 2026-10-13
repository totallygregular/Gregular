import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const demo = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
const key = "gregular:forever:profile:crafting%20qa";
const nav = (page, name) => page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name, exact: true });
const goal = (page, name) => page.getByRole("article", { name: `${name} crafting goal`, exact: true });
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
async function seed(page) {
  const profile = structuredClone(demo);
  profile.username = "Crafting QA"; profile.usernameKey = "crafting qa";
  await page.goto("./");
  await page.evaluate(({ profile, key }) => {
    localStorage.setItem(key, JSON.stringify(profile));
    sessionStorage.setItem("gregular.active-profile", profile.username);
  }, { profile, key });
  await page.reload();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await nav(page, "Professions").click();
  await expect(page.getByRole("heading", { name: "Professions", exact: true })).toBeVisible();
  return profile;
}
async function chooseProfession(page, name, skill, category = "primary") {
  await page.getByRole("button", { name: "Choose profession", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Choose profession", exact: true });
  await dialog.getByLabel("Profession name", { exact: true }).fill(name);
  await dialog.getByLabel("Profession category", { exact: true }).selectOption(category);
  if (skill !== undefined) await dialog.getByLabel("Current skill", { exact: true }).fill(String(skill));
  await dialog.getByRole("button", { name: "Save profession", exact: true }).click();
  await expect(dialog).toBeHidden();
}
async function reviewedGoal(page, name = "Rough Copper Vest") {
  const example = page.locator("article.crafting-example").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await example.getByRole("button", { name: "Plan crafted item", exact: true }).click();
  await expect(goal(page, name)).toBeVisible();
  return goal(page, name);
}
async function collect(card, name, count) {
  await card.getByRole("spinbutton", { name: `${name} collected`, exact: true }).fill(String(count));
  await card.getByRole("button", { name: `Save ${name} collected`, exact: true }).click();
  await expect(card.getByRole("button", { name: `Save ${name} collected`, exact: true })).toBeDisabled();
}
async function accessible(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished));
  });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function screenshot(page, path) {
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path, fullPage: true });
}
async function exportProfile(page) {
  await page.getByRole("button", { name: "Profile settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Profile settings", exact: true });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export profile", exact: true }).click();
  const value = JSON.parse(await readFile(await (await downloadPromise).path(), "utf8"));
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  return value;
}
async function importProfile(page, value) {
  await page.goto("./");
  await page.getByRole("button", { name: "Import profile", exact: true }).click();
  await page.getByLabel("Profile JSON", { exact: true }).setInputFiles({ name: "crafting.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
  const dialog = page.getByRole("dialog", { name: "Import profile", exact: true });
  await dialog.getByRole("button", { name: "Import profile", exact: true }).click();
  await expect(dialog).toBeHidden();
}
async function manualGoal(page, name, { material, quantity = 12, complete = false } = {}) {
  await page.getByRole("button", { name: "Add personal crafting goal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add personal crafting goal", exact: true });
  await dialog.getByLabel("Item name", { exact: true }).fill(name);
  await dialog.getByLabel("Recipe name (optional)", { exact: true }).fill(`${name} personal recipe`);
  if (material) {
    await dialog.getByRole("button", { name: "Add material requirement", exact: true }).click();
    await dialog.getByLabel("Material 1 name", { exact: true }).fill(material);
    await dialog.getByLabel("Required quantity", { exact: true }).fill(String(quantity));
  }
  if (complete) await dialog.getByRole("checkbox", { name: "This is the complete material list for my personal plan", exact: true }).check();
  await dialog.getByRole("button", { name: "Add crafting goal", exact: true }).click();
  await expect(dialog).toBeHidden();
  return goal(page, name);
}

test("reviewed crafting connects wishlist, independent preparation, character isolation and portable progress", async ({ page, browser }) => {
  const original = await seed(page);
  await chooseProfession(page, "Blacksmithing", 35);
  await chooseProfession(page, "Fishing", undefined, "secondary");
  await expect(page.locator("article.profession-card").filter({ hasText: "Blacksmithing" })).toContainText("Current skill 35");
  await expect(page.locator("article.profession-card").filter({ hasText: "Fishing" })).toContainText("Skill unknown");
  const vest = await reviewedGoal(page);
  await vest.getByLabel("Recipe acquisition status", { exact: true }).selectOption("learned");
  await collect(vest, "Copper Bar", 2);
  await vest.getByLabel("Who will craft this?", { exact: true }).selectOption("other");
  await vest.getByLabel("Crafter name (optional)", { exact: true }).fill("Bram");
  await vest.getByRole("button", { name: "Save crafter", exact: true }).click();
  await expect(vest).toContainText("2/4 collected");
  await vest.getByRole("checkbox", { name: "Item has been crafted", exact: false }).check();
  await expect(vest.getByRole("checkbox", { name: "Finished item received", exact: false })).not.toBeChecked();
  let state = (await saved(page)).characters[0];
  expect(state.crafting.goals[0]).toMatchObject({ recipeStatus: "learned", crafted: true, crafter: "other", crafterName: "Bram" });
  expect(state.acquisition.wishlist[0].status).toBe("wanted");
  await vest.getByRole("checkbox", { name: "Finished item received", exact: false }).check();
  await vest.getByRole("checkbox", { name: "Item has been crafted", exact: false }).uncheck();
  state = (await saved(page)).characters[0];
  expect(state.acquisition.wishlist[0].status).toBe("acquired");
  expect(state.crafting.goals[0].crafted).toBe(false);
  expect(state.planner).toEqual(original.characters[0].planner);
  expect((await saved(page)).characters[1].crafting).toEqual({ professions: [], goals: [], manualRecipes: [], manualMaterials: [] });
  await vest.getByRole("checkbox", { name: "Finished item received", exact: false }).uncheck();
  await accessible(page);
  await mkdir("artifacts/pass-6", { recursive: true });
  await screenshot(page, "artifacts/pass-6/professions-desktop.png");
  await nav(page, "Equipment").click();
  await expect(page.getByRole("heading", { name: "Zala's wishlist", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rough Copper Vest", exact: true }).first()).toBeVisible();
  await nav(page, "Overview").click();
  await expect(page.getByRole("region", { name: "Connected progression" })).toContainText(/crafting/i);
  const exported = await exportProfile(page);
  expect(exported.schemaVersion).toBe(4);
  await writeFile("artifacts/pass-6/crafting-demo-profile.json", JSON.stringify(exported, null, 2) + "\n");
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await importProfile(other, exported);
    expect((await saved(other)).characters).toEqual(exported.characters);
    await other.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
    await nav(other, "Professions").click();
    await expect(goal(other, "Rough Copper Vest")).toContainText("2/4 collected");
    await expect(goal(other, "Rough Copper Vest").getByLabel("Crafter name (optional)", { exact: true })).toHaveValue("Bram");
    await other.reload();
    await expect(goal(other, "Rough Copper Vest")).toContainText("Recipe learned");
  } finally { await context.close(); }
});

test("personal recipes retain unknown fields and share material references without sharing counts", async ({ page }) => {
  await seed(page);
  const first = await manualGoal(page, "Personal vest plan", { material: "Personal cloth", quantity: 12, complete: true });
  await collect(first, "Personal cloth", 8);
  const second = await manualGoal(page, "Personal glove plan", { material: "Personal cloth", quantity: 5 });
  await expect(second).toContainText("0/5 collected");
  await expect(first).toContainText("8/12 collected");
  await expect(first).toContainText("Profession unknown");
  await expect(first).toContainText("Required skill unknown");
  const unknown = await manualGoal(page, "Unresearched craft");
  await expect(unknown).toContainText("Material requirements have not been established");
  await expect(unknown).toContainText("No material requirements recorded");
  await first.getByText("Recipe source & evidence", { exact: true }).click();
  await expect(first).toContainText("User-authored recipe");
  await expect(first).toContainText("Recipe acquisition source unknown");
  await first.getByLabel("Who will craft this?", { exact: true }).selectOption("self");
  await expect(first).toContainText("This profession is not recorded on your character");
  const state = (await saved(page)).characters[0];
  expect(state.crafting.manualMaterials).toHaveLength(1);
  expect(state.crafting.manualRecipes[0].materials[0].materialId).toBe(state.crafting.manualRecipes[1].materials[0].materialId);
  expect(state.crafting.goals[1].materialsCollected).toEqual([]);
  expect(state.crafting.manualRecipes[2].profession).toBeUndefined();
  await accessible(page);
  await page.reload();
  await expect(goal(page, "Personal vest plan")).toContainText("8/12 collected");
});

test("professions keyboard, tablet and touch layouts remain accessible", async ({ page, browser }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await seed(page);
  await chooseProfession(page, "Blacksmithing", 35);
  const vest = await reviewedGoal(page);
  await collect(vest, "Copper Bar", 2);
  const recipe = vest.getByLabel("Recipe acquisition status", { exact: true });
  await recipe.focus();
  await page.keyboard.press("l");
  await page.keyboard.press("Tab");
  await expect(vest.getByLabel("Who will craft this?", { exact: true })).toBeFocused();
  await accessible(page);
  await mkdir("artifacts/pass-6", { recursive: true });
  await screenshot(page, "artifacts/pass-6/professions-tablet.png");
  const portable = await saved(page);
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const mobile = await mobileContext.newPage();
    await mobile.goto("./");
    await mobile.evaluate(({ profile, key }) => { localStorage.setItem(key, JSON.stringify(profile)); sessionStorage.setItem("gregular.active-profile", profile.username); }, { profile: portable, key });
    await mobile.reload();
    await mobile.getByRole("button", { name: "Open Zala's overview", exact: true }).tap();
    await nav(mobile, "Professions").tap();
    const mobileGoal = goal(mobile, "Rough Copper Vest");
    await mobileGoal.getByText("Recipe source & evidence", { exact: true }).tap();
    await expect(mobileGoal).toContainText("Recipe acquisition source unknown");
    await accessible(mobile);
    await screenshot(mobile, "artifacts/pass-6/professions-mobile.png");
    await mobile.getByRole("button", { name: "Add personal crafting goal", exact: true }).tap();
    await mobile.getByRole("dialog").getByRole("button", { name: "Add material requirement", exact: true }).tap();
    await accessible(mobile);
    await mobile.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).tap();
  } finally { await mobileContext.close(); }
});

test("unavailable recipe and material records retain progress, and form validation remains visible", async ({ page }) => {
  await seed(page);
  const first = await manualGoal(page, "Saved missing recipe", { material: "Personal cloth", quantity: 12 });
  await collect(first, "Personal cloth", 8);
  await manualGoal(page, "Saved missing material", { material: "Personal cloth", quantity: 5 });
  const before = await saved(page);
  const removedRecipe = before.characters[0].crafting.manualRecipes[0].id;
  await page.evaluate(({ key, removedRecipe }) => {
    const value = JSON.parse(localStorage.getItem(key));
    value.characters[0].crafting.manualRecipes = value.characters[0].crafting.manualRecipes.filter((recipe) => recipe.id !== removedRecipe);
    value.characters[0].crafting.manualMaterials = [];
    localStorage.setItem(key, JSON.stringify(value));
  }, { key, removedRecipe });
  await page.reload();
  await expect(goal(page, "Saved missing recipe")).toContainText("This saved recipe is unavailable in the current catalogue");
  await goal(page, "Saved missing recipe").getByText("Retained material counts", { exact: true }).click();
  await expect(goal(page, "Saved missing recipe")).toContainText("8 collected · requirement unknown");
  await expect(goal(page, "Saved missing material")).toContainText("Unresolved material");
  await page.getByRole("button", { name: "Add personal crafting goal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add personal crafting goal", exact: true });
  await dialog.getByLabel("Item name", { exact: true }).fill("Invalid duplicate requirement");
  for (let index = 1; index <= 2; index++) {
    await dialog.getByRole("button", { name: "Add material requirement", exact: true }).click();
    await dialog.getByLabel(`Material ${index} name`, { exact: true }).fill("Personal cloth");
    await dialog.getByLabel("Required quantity", { exact: true }).nth(index - 1).fill("2");
  }
  await dialog.getByRole("button", { name: "Add crafting goal", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("duplicate names");
  expect((await saved(page)).characters[0].crafting.goals).toEqual(before.characters[0].crafting.goals);
  await accessible(page);
});

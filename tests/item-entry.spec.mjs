import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const demo = JSON.parse(await readFile(new URL("../companion/public/demo-profile-v2.json", import.meta.url), "utf8"));
const username = "Item Entry QA";
const key = "gregular:forever:profile:item%20entry%20qa";
const nav = (page, name) => page.getByRole("navigation", { name: "Character sections" }).getByRole("link", { name, exact: true });
const result = (page, name) => page.locator(".equipment-results article").filter({ has: page.getByRole("heading", { name, exact: true }) });
const wishlist = page => page.getByRole("heading", { name: "Zala's wishlist", exact: true }).locator("xpath=ancestor::section[1]");
const wish = (page, name) => wishlist(page).locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const blankAcquisition = () => ({ wishlist: [], questProgress: [], manualItems: [], manualSources: [], manualDungeons: [], manualQuests: [], manualChains: [], dungeonProgress: [] });

// These out-of-catalogue IDs exercise unknown identity storage only. They are not
// a fixture catalogue, verified Forever records, or claims that such items exist.
const unknownId = 999991;
const unknownName = `Forever item #${unknownId}`;

async function equipment(page) {
  const profile = structuredClone(demo);
  profile.username = username; profile.usernameKey = username.toLowerCase();
  for (const character of profile.characters) character.acquisition = blankAcquisition();
  await page.goto("./");
  await page.evaluate(({ profile, key }) => {
    localStorage.setItem(key, JSON.stringify(profile));
    sessionStorage.setItem("gregular.active-profile", profile.username);
  }, { profile, key });
  await page.reload();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await nav(page, "Equipment").click();
}

async function identify(page, input) {
  await page.getByRole("button", { name: "Add item by ID or link", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add item by ID or link", exact: true });
  await dialog.getByLabel("Item ID or Forever database link", { exact: true }).fill(String(input));
  await dialog.getByRole("button", { name: "Identify item", exact: true }).click();
  return dialog;
}

async function addUnknown(page, name) {
  const dialog = await identify(page, unknownId);
  await expect(dialog.getByText(`WoW Forever · Item ID ${unknownId}`, { exact: true })).toBeVisible();
  if (name) await dialog.getByLabel("Personal item name", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(wish(page, name || unknownName)).toBeVisible();
}

async function exportProfile(page) {
  await page.getByRole("button", { name: "Profile settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Profile settings", exact: true });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export profile", exact: true }).click();
  const profile = JSON.parse(await readFile(await (await download).path(), "utf8"));
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  return profile;
}

async function importProfile(page, profile) {
  await page.goto("./");
  await page.getByRole("button", { name: "Import profile", exact: true }).click();
  await page.getByLabel("Profile JSON", { exact: true }).setInputFiles({ name: "item-entry-profile.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(profile)) });
  await page.getByRole("dialog", { name: "Import profile", exact: true }).getByRole("button", { name: "Import profile", exact: true }).click();
  await page.getByRole("button", { name: "Open Zala's overview", exact: true }).click();
  await nav(page, "Equipment").click();
}

// No automated check depends on the current availability or contents of a
// provider. Successful provider presentation below also uses pinned mock art.
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(foreverdb\.net|wow-forever\.gg)\//, route => route.abort());
});

test("numeric Forever ID can remain incomplete and survives reload without invented facts", async ({ page }) => {
  let providerRequests = 0;
  page.on("request", request => { if (/https:\/\/(foreverdb\.net|wow-forever\.gg)\//.test(request.url())) providerRequests++; });
  await equipment(page);
  await addUnknown(page);
  const acquisition = (await saved(page)).characters[0].acquisition;
  expect(acquisition.wishlist).toHaveLength(1);
  expect(acquisition.manualItems).toHaveLength(1);
  const item = acquisition.manualItems[0];
  expect(item).toMatchObject({ id: "user:item:forever:999991", gameId: unknownId, gameVariant: "wow-forever", name: unknownName, quality: "unknown", stats: [], sourceIds: [], evidence: { kind: "user-supplied" } });
  expect(item.requiredLevel).toBeUndefined();
  expect(item.numericStats).toEqual({ values: {}, completeness: "partial" });
  expect(acquisition.manualSources).toEqual([]);
  expect(providerRequests).toBe(0);
  await page.reload();
  await expect(wish(page, unknownName)).toBeVisible();
  expect((await saved(page)).characters[0].acquisition).toEqual(acquisition);
  const duplicate = await identify(page, `https://foreverdb.net/item/${unknownId}`);
  await expect(duplicate).toContainText(/already.*wishlist/i);
  await expect(duplicate.getByRole("button", { name: "Add to wishlist", exact: true })).toBeDisabled();
  expect((await saved(page)).characters[0].acquisition.wishlist).toHaveLength(1);
});

test("reviewed ID reuses verified local facts and numeric/link duplicates cannot add another wishlist identity", async ({ page }) => {
  await equipment(page);
  const dialog = await identify(page, 273052);
  await expect(dialog).toContainText("Ponderous Orb");
  await expect(dialog).toContainText("Intellect");
  await expect(dialog).toContainText("Spirit");
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(wish(page, "Ponderous Orb")).toBeVisible();
  const duplicate = await identify(page, "https://www.wowhead.com/forever/item=273052/ponderous-orb");
  await expect(duplicate).toContainText(/already.*wishlist/i);
  await expect(duplicate.getByRole("button", { name: "Add to wishlist", exact: true })).toBeDisabled();
  await duplicate.getByRole("button", { name: "Close dialog", exact: true }).click();
  const acquisition = (await saved(page)).characters[0].acquisition;
  expect(acquisition.wishlist).toHaveLength(1);
  expect(acquisition.wishlist[0].itemId).toBe("forever:item:273052");
  expect(acquisition.manualItems).toEqual([]);
  await expect(result(page, "Ponderous Orb").getByRole("button", { name: "On wishlist · Wanted", exact: true })).toBeDisabled();
});

test("personal missing details for a reviewed item stay separate from the core and roundtrip", async ({ page, browser, baseURL }) => {
  await equipment(page);
  const dialog = await identify(page, "https://foreverdb.net/item/270030");
  await expect(dialog).toContainText("Tattered Mittens");
  await expect(dialog).toContainText("Required level unknown");
  await dialog.getByLabel("Personal item name", { exact: true }).fill("My mittens observation · QA only");
  await dialog.getByLabel("Required level", { exact: true }).fill("17");
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  const card = wish(page, "Tattered Mittens");
  await expect(card).toBeVisible();
  await expect(result(page, "Tattered Mittens")).toContainText("Required level unknown");
  await card.getByText("Your saved personal details", { exact: true }).click();
  const personalDetails = card.locator("details").filter({ has: page.getByText("Your saved personal details", { exact: true }) });
  await expect(personalDetails).toContainText("User supplied");
  await expect(personalDetails.locator("dt").filter({ hasText: /^Required level$/ }).locator("..").locator("dd")).toHaveText("17");
  await card.getByRole("button", { name: "Edit personal details", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit personal details", exact: true });
  await expect(editor.getByLabel("Personal item name", { exact: true })).toHaveValue("My mittens observation · QA only");
  await editor.getByLabel("Required level", { exact: true }).fill("18");
  await editor.getByRole("button", { name: "Save personal details", exact: true }).click();
  const profile = await exportProfile(page);
  const acquisition = profile.characters[0].acquisition;
  expect(acquisition.wishlist).toHaveLength(1);
  expect(acquisition.wishlist[0].itemId).toBe("forever:item:270030");
  expect(acquisition.manualItems).toHaveLength(1);
  expect(acquisition.manualItems[0]).toMatchObject({ id: "user:item:forever:270030", gameId: 270030, gameVariant: "wow-forever", name: "My mittens observation · QA only", requiredLevel: 18, quality: "unknown", stats: [], sourceIds: [], evidence: { kind: "user-supplied" } });
  expect(acquisition.manualItems[0].numericStats.values.armor).toBeUndefined();
  const otherContext = await browser.newContext({ baseURL });
  try {
    const other = await otherContext.newPage();
    await other.route(/https:\/\/(foreverdb\.net|wow-forever\.gg)\//, route => route.abort());
    await importProfile(other, profile);
    await expect(wish(other, "Tattered Mittens")).toBeVisible();
    await expect(result(other, "Tattered Mittens")).toContainText("Required level unknown");
    expect((await saved(other)).characters[0].acquisition).toEqual(acquisition);
  } finally { await otherContext.close(); }
});

test("reviewed wishlist can gain personal details later and safely reuse them after removal", async ({ page }) => {
  await equipment(page);
  const dialog = await identify(page, 270030);
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  const card = wish(page, "Tattered Mittens");
  await expect(card).toBeVisible();
  expect((await saved(page)).characters[0].acquisition.manualItems).toEqual([]);
  await card.getByRole("button", { name: "Add personal details", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit personal details", exact: true });
  await expect(editor.getByLabel("Required level", { exact: true })).toHaveValue("");
  await editor.getByLabel("Personal item name", { exact: true }).fill("Saved mittens observation · QA only");
  await editor.getByLabel("Required level", { exact: true }).fill("19");
  await editor.getByRole("button", { name: "Save personal details", exact: true }).click();
  await expect(card.getByRole("button", { name: "Edit personal details", exact: true })).toBeVisible();
  await expect(card.getByText("Your saved personal details", { exact: true })).toBeVisible();
  await expect(result(page, "Tattered Mittens")).toContainText("Required level unknown");
  const beforeRemoval = (await saved(page)).characters[0].acquisition;
  expect(beforeRemoval.wishlist[0].itemId).toBe("forever:item:270030");
  expect(beforeRemoval.manualItems).toHaveLength(1);
  expect(beforeRemoval.manualItems[0]).toMatchObject({ name: "Saved mittens observation · QA only", requiredLevel: 19, quality: "unknown", stats: [] });
  await card.getByText("Personal notes and management", { exact: true }).click();
  await card.getByRole("button", { name: "Remove from wishlist", exact: true }).click();
  await expect(wish(page, "Tattered Mittens")).toHaveCount(0);
  expect((await saved(page)).characters[0].acquisition.manualItems).toEqual(beforeRemoval.manualItems);
  const reentry = await identify(page, "https://www.wowhead.com/forever/item=270030/tattered-mittens");
  await expect(reentry).toContainText("Your existing personal record will be reused");
  await expect(reentry.getByLabel("Personal item name", { exact: true })).toHaveCount(0);
  await expect(reentry.getByLabel("Required level", { exact: true })).toHaveCount(0);
  await reentry.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(wish(page, "Tattered Mittens")).toBeVisible();
  expect((await saved(page)).characters[0].acquisition.manualItems).toEqual(beforeRemoval.manualItems);
  await wish(page, "Tattered Mittens").getByRole("button", { name: "Edit personal details", exact: true }).click();
  await expect(editor.getByLabel("Personal item name", { exact: true })).toHaveValue("Saved mittens observation · QA only");
  await expect(editor.getByLabel("Required level", { exact: true })).toHaveValue("19");
});

for (const input of [
  "https://foreverdb.net/item/999991",
  "https://foreverdb.net/item/999991-personal-observation",
  "https://www.wowhead.com/forever/item=999991/personal-observation",
  "https://wow-forever.gg/db/items/999991-personal-observation/",
]) test(`supported explicit Forever link preserves unknown fields: ${input}`, async ({ page }) => {
  await equipment(page);
  const dialog = await identify(page, input);
  await expect(dialog.getByText(`WoW Forever · Item ID ${unknownId}`, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  const item = (await saved(page)).characters[0].acquisition.manualItems[0];
  expect(item.gameId).toBe(unknownId);
  expect(item.gameVariant).toBe("wow-forever");
  expect(item.stats).toEqual([]);
  expect(item.requiredLevel).toBeUndefined();
});

test("malformed, unsupported and wrong-variant links never identify a Forever item", async ({ page }) => {
  await equipment(page);
  await page.getByRole("button", { name: "Add item by ID or link", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add item by ID or link", exact: true });
  await dialog.getByLabel("Item ID or Forever database link", { exact: true }).fill("273052");
  await dialog.getByRole("button", { name: "Identify item", exact: true }).click();
  await expect(dialog).toContainText("Ponderous Orb");
  for (const input of [
    "0", "-42", "12.5", "not an item", "https://foreverdb.net/item/not-a-number",
    "https://example.com/item/273052", "https://foreverdb.net.evil.example/item/273052",
    "https://www.wowhead.com/item=273052", "https://www.wowhead.com/classic/item=273052",
    "https://www.wowhead.com/tbc/item=273052", "javascript:alert(273052)",
  ]) {
    await dialog.getByLabel("Item ID or Forever database link", { exact: true }).fill(input);
    await dialog.getByRole("button", { name: "Identify item", exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Add to wishlist", exact: true })).toHaveCount(0);
  }
  expect((await saved(page)).characters[0].acquisition.wishlist).toEqual([]);
});

test("personal details, source relationships and independent character choices survive export/import", async ({ page, browser, baseURL }) => {
  await equipment(page);
  await addUnknown(page);
  await wish(page, unknownName).getByRole("button", { name: "Edit personal details", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit personal details", exact: true });
  const personalName = "Personal observation · QA item";
  await editor.getByLabel("Personal item name", { exact: true }).fill(personalName);
  await editor.getByLabel("Equipment slot", { exact: true }).fill("Hands");
  await editor.getByLabel("Equipment type", { exact: true }).fill("Cloth");
  await editor.getByLabel("Required level", { exact: true }).fill("24");
  await editor.getByRole("combobox", { name: "Item quality", exact: true }).selectOption("uncommon");
  await editor.getByRole("button", { name: "Save personal details", exact: true }).click();
  const itemCard = wish(page, personalName);
  await expect(itemCard).toContainText("User supplied");
  await itemCard.getByText("Personal notes and management", { exact: true }).click();
  await itemCard.getByRole("button", { name: "Add source link", exact: true }).click();
  const source = page.getByRole("dialog", { name: "Add personal source link", exact: true });
  await source.getByRole("combobox", { name: "Acquisition method", exact: true }).selectOption("quest");
  await source.getByLabel("Source label", { exact: true }).fill("My tentative reward plan · QA only");
  await source.getByRole("combobox", { name: /^Reward quest/ }).selectOption({ label: "The Book of Ur" });
  await source.getByLabel("Associated zone (optional)", { exact: true }).fill("The Barrens");
  await source.getByLabel("Location relationship (optional)", { exact: true }).selectOption("quest-pickup");
  await source.getByRole("button", { name: "Save source link", exact: true }).click();
  const after = (await saved(page)).characters[0].acquisition;
  await itemCard.getByRole("combobox", { name: "Preferred acquisition source", exact: true }).selectOption(after.manualSources[0].id);
  await nav(page, "Quests").click();
  await expect(page.locator("article.acquisition-card").filter({ has: page.getByRole("heading", { name: "The Book of Ur", exact: true }) })).toContainText(personalName);
  const profile = await exportProfile(page);
  const personal = profile.characters[0].acquisition.manualItems[0];
  expect(personal).toMatchObject({ gameId: unknownId, gameVariant: "wow-forever", name: personalName, slot: "Hands", equipmentType: "Cloth", requiredLevel: 24, quality: "uncommon", evidence: { kind: "user-supplied" } });
  expect(personal.stats).toEqual([]);
  expect(personal.numericStats).toEqual({ values: {}, completeness: "partial" });
  expect(profile.characters[0].acquisition.manualSources[0]).toMatchObject({ method: "quest", locationRole: "quest-pickup", availability: "unknown", evidence: { kind: "user-supplied" } });
  expect(profile.characters[1].acquisition).toEqual(blankAcquisition());
  const otherContext = await browser.newContext({ baseURL });
  try {
    const other = await otherContext.newPage();
    await other.route(/https:\/\/(foreverdb\.net|wow-forever\.gg)\//, route => route.abort());
    await importProfile(other, profile);
    await expect(wish(other, personalName)).toBeVisible();
    expect((await saved(other)).characters.map(character => character.acquisition)).toEqual(profile.characters.map(character => character.acquisition));
    await other.reload();
    await expect(wish(other, personalName)).toBeVisible();
  } finally { await otherContext.close(); }
  await mkdir("artifacts/pass-8", { recursive: true });
  await writeFile("artifacts/pass-8/personal-item-roundtrip-qa.json", JSON.stringify(profile, null, 2));
});

test("unknown ID supports documented provider presentation and failed icons/tooltips remain usable", async ({ page }) => {
  await equipment(page);
  const dialog = await identify(page, unknownId);
  await dialog.getByRole("combobox", { name: "Item details service", exact: true }).selectOption("foreverdb");
  await expect(page.frameLocator(`iframe[title="foreverdb tooltip for ${unknownName}"]`).getByRole("status")).toContainText("Provider unavailable");
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  const card = wish(page, unknownName);
  await expect(card.getByText("No icon", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: `Inspect ${unknownName}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: unknownName, exact: true })).toBeVisible();
  await expect(page.frameLocator(`iframe[title="foreverdb tooltip for ${unknownName}"]`).getByRole("status")).toContainText("Provider unavailable");
  await page.getByRole("dialog").getByRole("button", { name: "Close dialog", exact: true }).click();
  await card.getByRole("button", { name: "Edit personal details", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit personal details", exact: true })).toBeVisible();
  expect((await saved(page)).characters[0].acquisition.wishlist).toHaveLength(1);
});

test("explicit personal numeric values and effects stay user supplied and work with discovery filters", async ({ page }) => {
  await equipment(page);
  const dialog = await identify(page, unknownId);
  const name = "Personal stat observation · QA item";
  await dialog.getByLabel("Personal item name", { exact: true }).fill(name);
  await dialog.getByLabel("Equipment slot", { exact: true }).fill("Hands");
  await dialog.getByLabel("Equipment type", { exact: true }).fill("Cloth");
  await dialog.getByLabel("Required level", { exact: true }).fill("24");
  await dialog.getByRole("combobox", { name: "Item quality", exact: true }).selectOption("uncommon");
  await dialog.getByText("Personal numeric stats and special effects", { exact: true }).click();
  await dialog.getByLabel("Intellect", { exact: true }).fill("6");
  await dialog.getByLabel("Spirit", { exact: true }).fill("0");
  await dialog.getByRole("textbox", { name: /^Special effects \(one per line\)/ }).fill("Personal effect observation · QA only");
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  const personal = (await saved(page)).characters[0].acquisition.manualItems[0];
  expect(personal.numericStats).toEqual({ values: { intellect: 6, spirit: 0 }, completeness: "partial" });
  expect(personal.numericStats.values.stamina).toBeUndefined();
  expect(personal.stats).toContainEqual({ label: "Personal effect", value: "Personal effect observation · QA only" });
  expect(personal.evidence.kind).toBe("user-supplied");
  await page.getByRole("searchbox", { name: "Item name", exact: true }).fill("Personal stat observation");
  await page.getByRole("checkbox", { name: "Intellect", exact: true }).check();
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("6");
  await page.getByLabel("Required level window", { exact: true }).selectOption("current");
  await page.getByRole("combobox", { name: "Slot", exact: true }).selectOption("Hands");
  await page.getByRole("combobox", { name: "Quality", exact: true }).selectOption("uncommon");
  await expect(page.locator(".equipment-results article")).toHaveCount(1);
  await expect(result(page, name)).toContainText("User supplied");
  await expect(result(page, name)).toContainText("+6 Intellect");
  await page.getByLabel("Minimum Intellect", { exact: true }).fill("7");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  await page.reload();
  await wish(page, name).getByRole("button", { name: "Edit personal details", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit personal details", exact: true });
  await editor.getByText("Personal numeric stats and special effects", { exact: true }).click();
  await expect(editor.getByLabel("Intellect", { exact: true })).toHaveValue("6");
  await expect(editor.getByLabel("Spirit", { exact: true })).toHaveValue("0");
  await expect(editor.getByRole("textbox", { name: /^Special effects \(one per line\)/ })).toHaveValue("Personal effect observation · QA only");
});

test("documented ForeverDB icon bridge accepts personal IDs without turning provider art into metadata", async ({ page }) => {
  await page.route("https://foreverdb.net/embed/tooltips.js", route => route.fulfill({ contentType: "application/javascript", body: `document.querySelectorAll('a[data-item-id]').forEach(a=>{const image=document.createElement('img');image.setAttribute('data-foreverdb-icon','');image.src='https://foreverdb.net/icons/132765.webp';a.prepend(image);});` }));
  await page.route("https://foreverdb.net/icons/132765.webp", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="blue"/></svg>' }));
  await equipment(page);
  await page.getByLabel("Item details service", { exact: true }).selectOption("foreverdb");
  await addUnknown(page);
  const card = wish(page, unknownName);
  await expect(card.locator(".item-portrait img")).toBeVisible();
  await card.locator(".item-portrait img").evaluate(image => image.dispatchEvent(new Event("error")));
  await expect(card.getByText("No icon", { exact: true })).toBeVisible();
  const personal = (await saved(page)).characters[0].acquisition.manualItems[0];
  expect(personal.name).toBe(unknownName);
  expect(personal.stats).toEqual([]);
  expect(personal.requiredLevel).toBeUndefined();
});

for (const width of [1440, 820, 390]) test(`item entry keyboard, focus, accessibility and screenshot ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await equipment(page);
  const opener = page.getByRole("button", { name: "Add item by ID or link", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add item by ID or link", exact: true });
  await expect(dialog.getByLabel("Item ID or Forever database link", { exact: true })).toBeFocused();
  await page.keyboard.type("273052");
  await dialog.getByRole("button", { name: "Identify item", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toContainText("Ponderous Orb");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const output = process.env.ITEM_SCREENSHOTS_DIR ?? "artifacts/pass-8";
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: resolve(output, `item-entry-${width}.png`) });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByLabel("Item ID or Forever database link", { exact: true }).fill("https://foreverdb.net/item/273052");
  await dialog.getByRole("button", { name: "Identify item", exact: true }).click();
  await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).click();
  await expect(wish(page, "Ponderous Orb")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await wishlist(page).scrollIntoViewIfNeeded();
  await wishlist(page).screenshot({ path: resolve(output, `item-wishlist-${width}.png`) });
});

test("touch supports incomplete item entry and later personal edits", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.route(/https:\/\/(foreverdb\.net|wow-forever\.gg)\//, route => route.abort());
    await equipment(page);
    await page.getByRole("button", { name: "Add item by ID or link", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Add item by ID or link", exact: true });
    await dialog.getByLabel("Item ID or Forever database link", { exact: true }).fill(String(unknownId));
    await dialog.getByRole("button", { name: "Identify item", exact: true }).tap();
    await dialog.getByRole("button", { name: "Add to wishlist", exact: true }).tap();
    await wish(page, unknownName).getByRole("button", { name: "Edit personal details", exact: true }).tap();
    const editor = page.getByRole("dialog", { name: "Edit personal details", exact: true });
    await editor.getByLabel("Personal item name", { exact: true }).fill("Touch observation · QA item");
    await editor.getByRole("button", { name: "Save personal details", exact: true }).tap();
    await expect(wish(page, "Touch observation · QA item")).toBeVisible();
    await page.reload();
    await expect(wish(page, "Touch observation · QA item")).toBeVisible();
  } finally { await context.close(); }
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";

const username = "Zone Planner";
const keyFor = (name = username) =>
  `gregular:forever:profile:${encodeURIComponent(name.normalize("NFKC").trim().toLowerCase())}`;
const saved = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), keyFor());
const route = (page) =>
  page.getByRole("region", { name: "My Route", exact: true });
const browser = (page) =>
  page.getByRole("region", { name: "Zone Browser", exact: true });
const candidate = (page, name) =>
  browser(page).getByRole("article", { name: `Zone: ${name}`, exact: true });
const stop = (page, name) =>
  route(page).getByRole("article", {
    name: `Route stop: ${name}`,
    exact: true,
  });
const section = (page, name) =>
  page
    .getByRole("navigation", { name: "Character sections" })
    .locator(`a[href$="/${name}"]`);
const nextUp = (page) =>
  page.getByRole("region", { name: "Next Up", exact: true });

async function signIn(page, name = username) {
  await page.goto("./");
  await page.getByLabel("Username", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Open my journal", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New character", exact: true }),
  ).toBeVisible();
}

async function createCharacter(
  page,
  { name = "Alden", race = "Human", faction = "Alliance", level = 1 } = {},
) {
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Character name", { exact: true }).fill(name);
  await dialog.getByRole("combobox", { name: "Race", exact: true }).fill(race);
  await dialog
    .getByRole("combobox", { name: "Class", exact: true })
    .fill("Priest");
  await dialog
    .getByRole("combobox", { name: "Faction", exact: true })
    .selectOption(faction);
  await dialog.getByLabel("Current level", { exact: true }).fill(String(level));
  await dialog
    .getByRole("combobox", { name: "Progression status", exact: true })
    .selectOption("leveling");
  await dialog
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await expect(dialog).toBeHidden();
}

async function openCharacter(page, name = "Alden") {
  await page
    .getByRole("button", { name: `Open ${name}'s journal`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name, exact: true, level: 1 }),
  ).toBeVisible();
}

async function openRoute(page) {
  await section(page, "leveling").click();
  await expect(route(page)).toBeVisible();
  await expect(browser(page)).toBeVisible();
}

async function planZone(page, name, min, max, { suggested = false } = {}) {
  const opener = suggested
    ? route(page).getByRole("button", { name: `Plan ${name}`, exact: true })
    : candidate(page, name).getByRole("button", {
        name: `Plan ${name}`,
        exact: true,
      });
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: `Plan ${name}`,
    exact: true,
  });
  await dialog
    .getByLabel("Planned entry level", { exact: true })
    .fill(String(min));
  await dialog
    .getByLabel("Planned exit level", { exact: true })
    .fill(String(max));
  await dialog
    .getByRole("button", { name: "Add to route", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    stop(page, name).last().locator(".personal-range"),
  ).toContainText(new RegExp(`Your plan\\s*${min}–${max}`));
}

async function editPlan(page, name, min, max) {
  await stop(page, name)
    .getByRole("button", {
      name: `Edit planned levels for ${name}`,
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Edit plan: ${name}`,
    exact: true,
  });
  await dialog
    .getByLabel("Planned entry level", { exact: true })
    .fill(String(min));
  await dialog
    .getByLabel("Planned exit level", { exact: true })
    .fill(String(max));
  await dialog.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function updateLevel(page, level) {
  await page
    .getByRole("button", { name: "Edit character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current level", { exact: true }).fill(String(level));
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toBeHidden();
}

async function accessible(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.allSettled(
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished),
    );
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}

async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("Human Priest builds a personal route, recomputes travel and advances without implicit completion", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await expect(
    route(page).getByRole("heading", { name: "Build your route", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).characters[0].planner.entries).toEqual([]);
  await planZone(page, "Elwynn Forest", 1, 12, { suggested: true });
  await expect(stop(page, "Elwynn Forest")).toContainText("Recommended");
  await expect(candidate(page, "Westfall")).toContainText("Easy travel");
  await expect(candidate(page, "Westfall")).toContainText("Adjacent zone");
  await expect(candidate(page, "Darkshore")).toContainText("Long travel");
  await expect(candidate(page, "Darkshore")).toContainText("Boat required");
  await planZone(page, "Westfall", 12, 18);
  await planZone(page, "Redridge Mountains", 18, 24);
  const ids = (await saved(page)).characters[0].planner.entries.map(
    (item) => item.id,
  );
  await expect(stop(page, "Redridge Mountains")).toContainText(
    "Moderate travel",
  );
  await stop(page, "Redridge Mountains")
    .getByRole("button", {
      name: "Move stop Redridge Mountains up",
      exact: true,
    })
    .click();
  await expect(stop(page, "Redridge Mountains")).toContainText("Easy travel");
  await expect(stop(page, "Westfall")).toContainText("Moderate travel");
  expect(
    (await saved(page)).characters[0].planner.entries.map((item) => item.id),
  ).toEqual([ids[0], ids[2], ids[1]]);
  await stop(page, "Redridge Mountains")
    .getByRole("button", {
      name: "Move stop Redridge Mountains down",
      exact: true,
    })
    .click();
  await editPlan(page, "Westfall", 12, 17);
  await stop(page, "Elwynn Forest")
    .getByRole("combobox", {
      name: "Route status for Elwynn Forest",
      exact: true,
    })
    .selectOption("completed");
  await stop(page, "Westfall")
    .getByRole("combobox", {
      name: "Route status for Westfall",
      exact: true,
    })
    .selectOption("active");
  await section(page, "journal").click();
  await updateLevel(page, 18);
  await expect(nextUp(page)).toContainText("Redridge Mountains");
  const after = await saved(page);
  expect(after.characters[0].planner.entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: ids[0],
        status: "completed",
        targetLevel: { min: 1, max: 12 },
      }),
      expect.objectContaining({
        id: ids[1],
        status: "active",
        targetLevel: { min: 12, max: 17 },
      }),
      expect.objectContaining({
        id: ids[2],
        status: "planned",
        targetLevel: { min: 18, max: 24 },
      }),
    ]),
  );
  await page.reload();
  await expect(nextUp(page)).toContainText("Redridge Mountains");
  expect(await saved(page)).toEqual(after);
});

test("insertion shows both transitions; repeated visits, overlaps and gaps remain editable", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await planZone(page, "Elwynn Forest", 1, 12, { suggested: true });
  await planZone(page, "Westfall", 10, 18);
  await route(page)
    .getByRole("button", {
      name: "Insert zone after Elwynn Forest",
      exact: true,
    })
    .click();
  await candidate(page, "Redridge Mountains")
    .getByRole("button", {
      name: "Plan Redridge Mountains",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Plan Redridge Mountains",
    exact: true,
  });
  await expect(dialog).toContainText("Affected transitions");
  await expect(dialog).toContainText("Elwynn Forest");
  await expect(dialog).toContainText("Westfall");
  await dialog.getByLabel("Planned entry level", { exact: true }).fill("11");
  await dialog.getByLabel("Planned exit level", { exact: true }).fill("16");
  await dialog
    .getByRole("button", { name: "Add to route", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(
    (await saved(page)).characters[0].planner.entries.map((item) => item.title),
  ).toEqual(["Elwynn Forest", "Redridge Mountains", "Westfall"]);
  // Choose the endpoint explicitly after the insertion, then revisit an existing zone.
  const insertAt = browser(page).getByRole("combobox", {
    name: "Insert at",
    exact: true,
  });
  await insertAt.selectOption("3");
  await planZone(page, "Westfall", 30, 35);
  await expect(stop(page, "Westfall")).toHaveCount(2);
  const entries = (await saved(page)).characters[0].planner.entries;
  expect(new Set(entries.map((item) => item.id)).size).toBe(4);
  expect(entries.map((item) => item.targetLevel)).toEqual([
    { min: 1, max: 12 },
    { min: 11, max: 16 },
    { min: 10, max: 18 },
    { min: 30, max: 35 },
  ]);
  await expect(stop(page, "Westfall").last()).toContainText(/outside/i);
  await stop(page, "Westfall")
    .last()
    .getByRole("combobox", {
      name: "Route status for Westfall",
      exact: true,
    })
    .selectOption("skipped");
  await stop(page, "Westfall")
    .last()
    .getByRole("combobox", {
      name: "Route status for Westfall",
      exact: true,
    })
    .selectOption("planned");
  await route(page)
    .getByLabel("Route title", { exact: true })
    .fill("Alden's shared route");
  await route(page)
    .getByRole("button", { name: "Save route title", exact: true })
    .click();
  expect((await saved(page)).characters[0].planner.name).toBe(
    "Alden's shared route",
  );
  await stop(page, "Redridge Mountains")
    .getByRole("button", {
      name: "Remove stop Redridge Mountains",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Remove Redridge Mountains?", exact: true })
    .getByRole("button", { name: "Remove stop", exact: true })
    .click();
  // Removing one visit must not remove another visit or normalize the saved ranges.
  await expect(stop(page, "Redridge Mountains")).toHaveCount(0);
  expect(
    (await saved(page)).characters[0].planner.entries.map(
      (item) => item.targetLevel,
    ),
  ).toEqual([
    { min: 1, max: 12 },
    { min: 10, max: 18 },
    { min: 30, max: 35 },
  ]);
});

test("version-2 JSON export imports the new visits without duplication and preserves character IDs", async ({
  page,
  browser: playwrightBrowser,
}, testInfo) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await planZone(page, "Elwynn Forest", 1, 9, { suggested: true });
  await planZone(page, "Westfall", 12, 16);
  await stop(page, "Elwynn Forest")
    .getByRole("combobox", {
      name: "Route status for Elwynn Forest",
      exact: true,
    })
    .selectOption("completed");
  const before = await saved(page);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export profile", exact: true })
    .click();
  const download = await downloadPromise;
  const raw = await readFile(await download.path(), "utf8");
  expect(JSON.parse(raw)).toEqual(before);
  const fresh = await playwrightBrowser.newContext({
    baseURL: testInfo.project.use.baseURL,
    reducedMotion: "reduce",
  });
  try {
    const importedPage = await fresh.newPage();
    await importedPage.goto("./");
    await importedPage
      .getByRole("button", { name: "Import profile", exact: true })
      .click();
    const settings = importedPage.getByRole("dialog", {
      name: "Profile settings",
      exact: true,
    });
    await settings.getByLabel("Profile JSON", { exact: true }).setInputFiles({
      name: "route.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
    const confirmation = importedPage.getByRole("dialog", {
      name: "Import profile",
      exact: true,
    });
    await confirmation
      .getByRole("button", { name: "Import profile", exact: true })
      .click();
    await expect(confirmation).toBeHidden();
    const imported = await saved(importedPage);
    expect(imported.id).toBe(before.id);
    expect(imported.characters).toEqual(before.characters);
    await openCharacter(importedPage);
    await openRoute(importedPage);
    await expect(stop(importedPage, "Elwynn Forest")).toHaveCount(1);
    await expect(stop(importedPage, "Westfall")).toHaveCount(1);
    await expect(
      stop(importedPage, "Westfall").locator(".personal-range"),
    ).toContainText(/Your plan\s*12–16/);
    await importedPage.reload();
    expect((await saved(importedPage)).characters).toEqual(before.characters);
  } finally {
    await fresh.close();
  }
});

test("Horde starting suggestions and default filtering stay separate from Alliance", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page, {
    name: "Zala",
    race: "Troll",
    faction: "Horde",
  });
  await openCharacter(page, "Zala");
  await openRoute(page);
  await expect(
    browser(page).getByRole("combobox", { name: "Zone faction", exact: true }),
  ).toHaveValue("Horde");
  await expect(candidate(page, "Elwynn Forest")).toHaveCount(0);
  await expect(candidate(page, "Westfall")).toHaveCount(0);
  await planZone(page, "Durotar", 1, 11, { suggested: true });
  await expect(candidate(page, "The Barrens")).toContainText("Easy travel");
  await planZone(page, "The Barrens", 11, 22);
  await stop(page, "Durotar")
    .getByRole("combobox", {
      name: "Route status for Durotar",
      exact: true,
    })
    .selectOption("completed");
  await page.reload();
  expect(
    (await saved(page)).characters[0].planner.entries.map((item) => item.title),
  ).toEqual(["Durotar", "The Barrens"]);
  await browser(page)
    .getByLabel("Search zones", { exact: true })
    .fill("barrens");
  await expect(candidate(page, "The Barrens")).toBeVisible();
  await expect(candidate(page, "Durotar")).toHaveCount(0);
});

test("browser filters combine level, continent and transition difficulty without changing the route", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await planZone(page, "Elwynn Forest", 1, 10, { suggested: true });
  const before = await saved(page);
  await browser(page).getByLabel("Browser level", { exact: true }).fill("12");
  await browser(page)
    .getByRole("combobox", { name: "Level suitability", exact: true })
    .selectOption("now");
  await browser(page)
    .getByRole("combobox", { name: "Travel difficulty", exact: true })
    .selectOption("easy");
  await expect(candidate(page, "Westfall")).toBeVisible();
  await expect(candidate(page, "Darkshore")).toHaveCount(0);
  await browser(page)
    .getByRole("combobox", { name: "Travel difficulty", exact: true })
    .selectOption("long");
  await expect(candidate(page, "Darkshore")).toBeVisible();
  await expect(candidate(page, "Westfall")).toHaveCount(0);
  await browser(page)
    .getByRole("combobox", { name: "Continent", exact: true })
    .selectOption("Eastern Kingdoms");
  await expect(candidate(page, "Darkshore")).toHaveCount(0);
  await browser(page)
    .getByRole("combobox", { name: "Continent", exact: true })
    .selectOption("");
  await browser(page)
    .getByRole("combobox", { name: "Travel difficulty", exact: true })
    .selectOption("");
  await browser(page)
    .getByRole("combobox", { name: "Level suitability", exact: true })
    .selectOption("later");
  await expect(candidate(page, "Redridge Mountains")).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test("editing the character faction refreshes browser suggestions and preserves the existing plan", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await planZone(page, "Elwynn Forest", 1, 12, { suggested: true });
  const plan = (await saved(page)).characters[0].planner;
  await page
    .getByRole("button", { name: "Edit character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Race", exact: true })
    .fill("Troll");
  await dialog
    .getByRole("combobox", { name: "Faction", exact: true })
    .selectOption("Horde");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    browser(page).getByRole("combobox", { name: "Zone faction", exact: true }),
  ).toHaveValue("Horde");
  await expect(candidate(page, "Westfall")).toHaveCount(0);
  await expect(candidate(page, "Durotar")).toBeVisible();
  expect((await saved(page)).characters[0].planner).toEqual(plan);
  await expect(stop(page, "Elwynn Forest")).toBeVisible();
  await browser(page)
    .getByRole("combobox", { name: "Zone faction", exact: true })
    .selectOption("");
  await expect(candidate(page, "Durotar")).toBeVisible();
  await expect(candidate(page, "Elwynn Forest")).toBeVisible();
});

test("starting blank removes zone visits after confirmation and preserves objectives and dungeon milestones", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await planZone(page, "Elwynn Forest", 1, 10, { suggested: true });
  const legacy = page.locator("details.legacy-planner");
  await legacy.locator("summary").first().click();
  for (const [title, kind] of [
    ["Restock before meeting friends", "custom"],
    ["Our planned dungeon", "dungeon"],
  ]) {
    await legacy
      .getByRole("button", { name: "Add objective", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Add objective",
      exact: true,
    });
    await dialog
      .getByRole("combobox", { name: "Type", exact: true })
      .selectOption(kind);
    await dialog.getByLabel("Title", { exact: true }).fill(title);
    await dialog
      .getByRole("textbox", { name: "Notes", exact: true })
      .fill("Keep my own checklist.");
    await dialog
      .getByRole("button", { name: "Save objective", exact: true })
      .click();
    await expect(dialog).toBeHidden();
  }
  const before = (await saved(page)).characters[0].planner.entries;
  await route(page)
    .getByRole("button", { name: "Start blank", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Start a blank route?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await saved(page)).characters[0].planner.entries).toEqual(before);
  await route(page)
    .getByRole("button", { name: "Start blank", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Clear zone visits", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const after = (await saved(page)).characters[0].planner.entries;
  expect(after).toEqual(before.filter((entry) => entry.kind !== "zone"));
  await expect(stop(page, "Elwynn Forest")).toHaveCount(0);
  await expect(stop(page, "Our planned dungeon")).toBeVisible();
  await page.reload();
  expect((await saved(page)).characters[0].planner.entries).toEqual(after);
});

test("zone visits respect character isolation and an observed multi-tab conflict", async ({
  page,
  context,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  await planZone(page, "Elwynn Forest", 1, 10, { suggested: true });
  const originalId = (await saved(page)).characters[0].id;
  await page
    .getByRole("link", { name: "Gregular character roster", exact: true })
    .click();
  await createCharacter(page, {
    name: "Friend",
    race: "Troll",
    faction: "Horde",
    level: 12,
  });
  await openCharacter(page, "Friend");
  await openRoute(page);
  await expect(stop(page, "Elwynn Forest")).toHaveCount(0);
  await planZone(page, "The Barrens", 12, 22);
  await page
    .getByRole("link", { name: "Gregular character roster", exact: true })
    .click();
  await openCharacter(page);
  await openRoute(page);
  const other = await context.newPage();
  await signIn(other);
  await openCharacter(other);
  await openRoute(other);
  await planZone(page, "Westfall", 10, 18);
  const latest = await saved(page);
  await expect(other.locator(".save-bar")).toContainText(
    "Another tab changed browser data",
  );
  await candidate(other, "Redridge Mountains")
    .getByRole("button", {
      name: "Plan Redridge Mountains",
      exact: true,
    })
    .click();
  const staleDialog = other.getByRole("dialog", {
    name: "Plan Redridge Mountains",
    exact: true,
  });
  await staleDialog
    .getByLabel("Planned entry level", { exact: true })
    .fill("18");
  await staleDialog
    .getByLabel("Planned exit level", { exact: true })
    .fill("24");
  await staleDialog
    .getByRole("button", { name: "Add to route", exact: true })
    .click();
  await expect(other.locator(".save-bar")).toContainText("temporary");
  expect(await saved(other)).toEqual(latest);
  expect(
    latest.characters
      .find((item) => item.id === originalId)
      .planner.entries.map((item) => item.title),
  ).toEqual(["Elwynn Forest", "Westfall"]);
  expect(
    latest.characters
      .find((item) => item.name === "Friend")
      .planner.entries.map((item) => item.title),
  ).toEqual(["The Barrens"]);
  await other.reload();
  await expect(stop(other, "Westfall")).toBeVisible();
  await expect(stop(other, "Redridge Mountains")).toHaveCount(0);
  await other.close();
});

test("keyboard planning validates ranges, traps modal focus and restores the opener", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await openRoute(page);
  const opener = candidate(page, "Westfall").getByRole("button", {
    name: "Plan Westfall",
    exact: true,
  });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Plan Westfall",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Planned entry level", { exact: true }).fill("30");
  await dialog.getByLabel("Planned exit level", { exact: true }).fill("10");
  const before = await saved(page);
  await dialog
    .getByRole("button", { name: "Add to route", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await accessible(page);
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          Boolean(document.activeElement?.closest("dialog")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test.describe("touch route planning", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("touch can add a zone, edit planned levels and reorder visits", async ({
    page,
  }) => {
    await signIn(page);
    await createCharacter(page);
    await openCharacter(page);
    await openRoute(page);
    await route(page)
      .getByRole("button", { name: "Plan Elwynn Forest", exact: true })
      .tap();
    const dialog = page.getByRole("dialog", {
      name: "Plan Elwynn Forest",
      exact: true,
    });
    await dialog.getByLabel("Planned exit level", { exact: true }).fill("12");
    await dialog
      .getByRole("button", { name: "Add to route", exact: true })
      .tap();
    await expect(dialog).toBeHidden();
    await candidate(page, "Westfall")
      .getByRole("button", { name: "Plan Westfall", exact: true })
      .tap();
    const westfall = page.getByRole("dialog", {
      name: "Plan Westfall",
      exact: true,
    });
    await westfall
      .getByLabel("Planned entry level", { exact: true })
      .fill("12");
    await westfall.getByLabel("Planned exit level", { exact: true }).fill("18");
    await westfall
      .getByRole("button", { name: "Add to route", exact: true })
      .tap();
    await expect(westfall).toBeHidden();
    await stop(page, "Westfall")
      .getByRole("button", {
        name: "Move stop Westfall up",
        exact: true,
      })
      .tap();
    expect(
      (await saved(page)).characters[0].planner.entries.map(
        (item) => item.title,
      ),
    ).toEqual(["Westfall", "Elwynn Forest"]);
    await stop(page, "Westfall")
      .getByRole("button", {
        name: "Edit planned levels for Westfall",
        exact: true,
      })
      .tap();
    const editor = page.getByRole("dialog", {
      name: "Edit plan: Westfall",
      exact: true,
    });
    await editor.getByLabel("Planned exit level", { exact: true }).fill("16");
    await editor.getByRole("button", { name: "Save plan", exact: true }).tap();
    await expect(editor).toBeHidden();
    await noOverflow(page);
    await accessible(page);
  });
});

for (const [label, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 820, 1100],
  ["mobile", 390, 844],
]) {
  test(`zone route ${label} layout, travel labels and editing are accessible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    await createCharacter(page, { level: 12 });
    await openCharacter(page);
    await openRoute(page);
    await planZone(page, "Elwynn Forest", 1, 12, { suggested: true });
    await planZone(page, "Westfall", 12, 18);
    await planZone(page, "Redridge Mountains", 18, 24);
    await stop(page, "Elwynn Forest")
      .getByRole("combobox", {
        name: "Route status for Elwynn Forest",
        exact: true,
      })
      .selectOption("completed");
    await stop(page, "Westfall")
      .getByRole("combobox", {
        name: "Route status for Westfall",
        exact: true,
      })
      .selectOption("active");
    await expect(stop(page, "Westfall")).toContainText("Easy travel");
    await expect(stop(page, "Redridge Mountains")).toContainText(
      "Moderate travel",
    );
    await browser(page)
      .getByRole("combobox", { name: "Level suitability", exact: true })
      .selectOption("now");
    await noOverflow(page);
    await accessible(page);
    await mkdir("artifacts", { recursive: true });
    await page.evaluate(() => {
      document.activeElement?.blur();
      document.querySelector(".zone-candidates")?.scrollTo(0, 0);
      scrollTo(0, 0);
    });
    await page.screenshot({
      path: `artifacts/zone-route-${label}.png`,
      fullPage: true,
    });
    await stop(page, "Westfall")
      .getByRole("button", {
        name: "Edit planned levels for Westfall",
        exact: true,
      })
      .click();
    await noOverflow(page);
    await accessible(page);
    await page.keyboard.press("Escape");
    const move = stop(page, "Redridge Mountains").getByRole("button", {
      name: "Move stop Redridge Mountains up",
      exact: true,
    });
    await move.focus();
    await page.keyboard.press("Enter");
    await expect(stop(page, "Redridge Mountains")).toContainText("Easy travel");
    await noOverflow(page);
    await accessible(page);
  });
}

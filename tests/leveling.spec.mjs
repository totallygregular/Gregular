import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";

const keyFor = (username = "Planner") =>
  `gregular:forever:profile:${encodeURIComponent(username.normalize("NFKC").trim().toLowerCase())}`;
const saved = (page, username = "Planner") =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    keyFor(username),
  );
const entry = (page, title) =>
  page.getByRole("article", { name: title, exact: true });
const nextUp = (page) =>
  page.getByRole("region", { name: "Next Up", exact: true });
const navigation = (page, section) =>
  page
    .getByRole("navigation", { name: "Character sections" })
    .locator(`a[href$="/${section}"]`);

async function signIn(page, username = "Planner", navigate = true) {
  if (navigate) await page.goto("./");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page
    .getByRole("button", { name: "Open my journal", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New character", exact: true }),
  ).toBeVisible();
}

async function createCharacter(
  page,
  name = "Zala",
  { level = 24, faction = "Horde" } = {},
) {
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Character name", { exact: true }).fill(name);
  await dialog
    .getByRole("combobox", { name: "Race", exact: true })
    .fill("Troll");
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

async function openCharacter(page, name = "Zala") {
  const card = page.locator(".character-card").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
  await card.getByRole("button", { name: /^Open / }).click();
  await expect(
    page.getByRole("heading", { name, exact: true, level: 1 }),
  ).toBeVisible();
  await expect(nextUp(page)).toBeVisible();
}

async function roadmap(page) {
  await navigation(page, "leveling").click();
  await expect(
    page.getByRole("heading", { name: "Your roadmap", exact: true }),
  ).toBeVisible();
}

async function addObjective(page, title, options = {}) {
  await page
    .getByRole("button", { name: "Add objective", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Add objective",
    exact: true,
  });
  if (options.kind)
    await dialog
      .getByRole("combobox", { name: "Type", exact: true })
      .selectOption(options.kind);
  if (options.reference)
    await dialog
      .getByRole("combobox", {
        name: "Forever reference (optional)",
        exact: true,
      })
      .selectOption(options.reference);
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  if (options.min !== undefined)
    await dialog
      .getByLabel("Target level from", { exact: true })
      .fill(String(options.min));
  if (options.max !== undefined)
    await dialog
      .getByLabel("Target level to", { exact: true })
      .fill(String(options.max));
  if (options.notes)
    await dialog
      .getByRole("textbox", { name: "Notes", exact: true })
      .fill(options.notes);
  if (options.priority)
    await dialog
      .getByRole("combobox", { name: "Priority", exact: true })
      .selectOption(options.priority);
  if (options.status)
    await dialog
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption(options.status);
  if (options.access)
    await dialog
      .getByRole("combobox", { name: "Access / readiness", exact: true })
      .selectOption(options.access);
  if (options.associationType)
    await dialog
      .getByRole("combobox", { name: "Association type", exact: true })
      .selectOption(options.associationType);
  if (options.association)
    await dialog
      .getByLabel("Associated zone or dungeon", { exact: true })
      .fill(options.association);
  if (options.prerequisite) {
    await dialog.getByText(/^Personal prerequisites /).click();
    await dialog
      .getByRole("checkbox", { name: options.prerequisite, exact: true })
      .check();
  }
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
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

async function removeObjective(page, title) {
  await entry(page, title)
    .getByRole("button", { name: `Remove ${title}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Remove route entry?",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Remove entry", exact: true })
    .click();
  await expect(dialog).toBeHidden();
}

async function accessible(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
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

test("blank routes support personal, zone and dungeon CRUD, ordering and status tracking", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await expect(nextUp(page)).toContainText(
    "No actionable objectives at this level.",
  );
  await roadmap(page);
  await expect(
    page.getByRole("heading", { name: "Your route is empty", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Route name", { exact: true })
    .fill("Zala's next sessions");
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await addObjective(page, "Train new abilities", {
    min: 24,
    max: 26,
    priority: "high",
    notes: "Check trainers with the group.",
    association: "My current zone",
  });
  await addObjective(page, "My current zone", {
    kind: "zone",
    min: 24,
    max: 28,
    status: "active",
    access: "confirmed",
  });
  await addObjective(page, "Prepare a dungeon run", {
    kind: "dungeon",
    min: 26,
    max: 30,
    access: "unknown",
    notes: "Confirm access and collect my quests.",
  });
  await expect(
    page.getByRole("heading", { name: "Level 24–32", exact: true }),
  ).toBeVisible();
  await expect(entry(page, "Prepare a dungeon run")).toContainText(
    "Confirm access before this becomes actionable.",
  );
  const before = await saved(page);
  const ids = before.characters[0].planner.entries.map((item) => item.id);
  await entry(page, "My current zone")
    .getByRole("button", { name: "Move My current zone up", exact: true })
    .click();
  await expect(page.locator(".roadmap-current article h4")).toHaveText([
    "My current zone",
    "Train new abilities",
    "Prepare a dungeon run",
  ]);
  expect(
    (await saved(page)).characters[0].planner.entries.map((item) => item.id),
  ).toEqual([ids[1], ids[0], ids[2]]);
  await entry(page, "Train new abilities")
    .getByRole("button", { name: "Edit Train new abilities", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit objective",
    exact: true,
  });
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Train and buy supplies");
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await entry(page, "Train and buy supplies")
    .getByRole("combobox", {
      name: "Status for Train and buy supplies",
      exact: true,
    })
    .selectOption("completed");
  await entry(page, "Prepare a dungeon run")
    .getByRole("combobox", {
      name: "Status for Prepare a dungeon run",
      exact: true,
    })
    .selectOption("skipped");
  await expect(page.locator(".planner-summary")).toContainText("1 completed");
  await expect(page.locator(".planner-summary")).toContainText("1 skipped");
  const after = await saved(page);
  expect(after.characters[0].planner.entries[1]).toMatchObject({
    id: ids[0],
    title: "Train and buy supplies",
    status: "completed",
    association: { name: "My current zone" },
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export local profile", exact: true })
      .click(),
  ]);
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported).toEqual(after);
  await page.reload();
  await expect(
    entry(page, "Train and buy supplies").getByRole("combobox", {
      name: "Status for Train and buy supplies",
      exact: true,
    }),
  ).toHaveValue("completed");
  expect(await saved(page)).toEqual(after);
  await removeObjective(page, "Prepare a dungeon run");
  await expect(entry(page, "Prepare a dungeon run")).toHaveCount(0);
  expect((await saved(page)).characters[0].planner.entries).toHaveLength(2);
});

test("Next Up follows levels, personal priorities, access, prerequisites and skipped state", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  await addObjective(page, "Overdue profession goal", {
    min: 20,
    max: 22,
    priority: "high",
  });
  await addObjective(page, "Train at 26", { min: 26, max: 26 });
  await addObjective(page, "Continue my active zone", {
    kind: "zone",
    min: 24,
    max: 28,
    access: "confirmed",
    status: "active",
  });
  await addObjective(page, "Group run", {
    kind: "dungeon",
    min: 24,
    max: 30,
    access: "unknown",
    prerequisite: "Train at 26",
  });
  await navigation(page, "journal").click();
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Overdue profession goal",
      exact: true,
    }),
  ).toBeVisible();
  await expect(nextUp(page)).toContainText(
    "High priority; planned by level 22.",
  );
  await expect(nextUp(page)).toContainText("Coming up: Train at 26");
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Train at 26",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Group run",
      exact: true,
    }),
  ).toHaveCount(0);
  await updateLevel(page, 26);
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Train at 26",
      exact: true,
    }),
  ).toBeVisible();
  await roadmap(page);
  await entry(page, "Group run")
    .getByRole("button", { name: "Edit Group run", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit objective",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: "Access / readiness", exact: true })
    .selectOption("confirmed");
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(entry(page, "Group run")).toContainText(
    "Complete “Train at 26” first.",
  );
  await navigation(page, "journal").click();
  await nextUp(page)
    .getByRole("button", { name: "Complete Train at 26", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Group run",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Overdue profession goal",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Overdue profession goal",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Continue my active zone",
      exact: true,
    }),
  ).toBeFocused();
  await roadmap(page);
  await entry(page, "Group run")
    .getByRole("combobox", { name: "Status for Group run", exact: true })
    .selectOption("skipped");
  await updateLevel(page, 33);
  await expect(
    page.getByRole("heading", { name: "Level 33–41", exact: true }),
  ).toBeVisible();
  await page.getByText("Earlier levels", { exact: true }).click();
  await expect(
    entry(page, "Group run").getByRole("combobox", {
      name: "Status for Group run",
      exact: true,
    }),
  ).toHaveValue("skipped");
  await navigation(page, "journal").click();
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Group run",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(nextUp(page)).toContainText(
    "Your active zone; above its planned window.",
  );
});

test("editorial starters filter by faction and restore missing entries without resetting progress", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  const starter = page.getByLabel("Choose starter route", { exact: true });
  await expect(starter.locator("option")).toHaveText([
    "Blank / keep my route",
    "Horde starter · 20–30",
  ]);
  await starter.selectOption("editorial-horde-20-30");
  await page
    .getByRole("button", { name: "Merge starter", exact: true })
    .click();
  await expect(entry(page, "Ashenvale")).toContainText("Editorial starter");
  await expect(entry(page, "Ashenvale")).toContainText(
    "Unverified planning window",
  );
  await entry(page, "Ashenvale")
    .getByRole("combobox", { name: "Status for Ashenvale", exact: true })
    .selectOption("completed");
  await entry(page, "Ashenvale")
    .getByRole("button", { name: "Edit Ashenvale", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill("My Ashenvale goals");
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await addObjective(page, "Meet my friends", { min: 24, max: 30 });
  await removeObjective(page, "Stonetalon Mountains");
  const before = (await saved(page)).characters[0].planner;
  await starter.selectOption("editorial-horde-20-30");
  await page
    .getByRole("button", { name: "Merge starter", exact: true })
    .click();
  const after = (await saved(page)).characters[0].planner;
  expect(after.entries).toHaveLength(4);
  for (const existing of before.entries)
    expect(after.entries.find((item) => item.id === existing.id)).toEqual(
      existing,
    );
  await expect(
    entry(page, "My Ashenvale goals").getByRole("combobox", {
      name: "Status for My Ashenvale goals",
      exact: true,
    }),
  ).toHaveValue("completed");
  await expect(entry(page, "Stonetalon Mountains")).toBeVisible();
  await navigation(page, "journal").click();
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Hillsbrad Foothills",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Meet my friends",
      exact: true,
    }),
  ).toBeVisible();
});

test("routes remain isolated across characters, usernames and reloads", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  await addObjective(page, "Only Zala", { min: 24, max: 30 });
  await page
    .getByRole("button", { name: "All characters", exact: true })
    .click();
  await createCharacter(page, "Bram", { level: 50, faction: "Alliance" });
  await openCharacter(page, "Bram");
  await roadmap(page);
  await expect(
    page.getByRole("heading", { name: "Your route is empty", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Choose starter route", { exact: true }).locator("option"),
  ).toHaveText(["Blank / keep my route", "Alliance starter · 20–30"]);
  await addObjective(page, "Only Bram", { min: 50, max: 55 });
  const original = await saved(page);
  await page.reload();
  await expect(entry(page, "Only Bram")).toBeVisible();
  await expect(entry(page, "Only Zala")).toHaveCount(0);
  await page.locator(".profile-switch").click();
  await signIn(page, "Friend", false);
  await createCharacter(page, "Kori");
  await openCharacter(page, "Kori");
  await roadmap(page);
  await addObjective(page, "Only Friend", { min: 24, max: 30 });
  await page.locator(".profile-switch").click();
  await signIn(page, "  PLANNER  ", false);
  await openCharacter(page);
  await roadmap(page);
  await expect(entry(page, "Only Zala")).toBeVisible();
  await expect(entry(page, "Only Bram")).toHaveCount(0);
  await expect(entry(page, "Only Friend")).toHaveCount(0);
  expect(await saved(page)).toEqual(original);
  expect(
    (await saved(page, "Friend")).characters[0].planner.entries[0].title,
  ).toBe("Only Friend");
});

test("real v1 JSON migrates on first edit with IDs, notes, completion and raw backup intact", async ({
  page,
}) => {
  const legacy = {
    schemaVersion: 1,
    id: "10000000-0000-4000-8000-000000000001",
    username: "Planner",
    usernameKey: "planner",
    revision: 5,
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T01:00:00.000Z",
    characters: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        name: "Zala",
        race: "Troll",
        className: "Priest",
        faction: "Horde",
        plannedSpec: "Holy",
        level: 24,
        status: "leveling",
        notes: "My old notes\n  Keep this spacing.  ",
        objectives: [
          {
            id: "30000000-0000-4000-8000-000000000001",
            title: "Previous completed objective",
            completed: true,
            priority: "normal",
          },
          {
            id: "30000000-0000-4000-8000-000000000002",
            title: "Previous personal goal",
            completed: false,
            priority: "high",
          },
        ],
      },
    ],
  };
  const raw = JSON.stringify(legacy);
  await page.addInitScript(
    ({ key, raw }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    },
    { key: keyFor(), raw },
  );
  await signIn(page);
  await openCharacter(page);
  expect(await saved(page)).toEqual(legacy);
  await expect(
    page.getByRole("checkbox", { name: /^Previous completed objective/ }),
  ).toBeChecked();
  await expect(
    nextUp(page).getByRole("button", {
      name: "Complete Previous personal goal",
      exact: true,
    }),
  ).toBeVisible();
  await navigation(page, "notes").click();
  await expect(
    page.getByLabel("Your personal notes", { exact: true }),
  ).toHaveValue(legacy.characters[0].notes);
  await roadmap(page);
  await expect(
    page.getByRole("heading", { name: "Your route is empty", exact: true }),
  ).toBeVisible();
  await addObjective(page, "My first route goal", { min: 24, max: 30 });
  const migrated = await saved(page);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.id).toBe(legacy.id);
  expect(migrated.characters[0]).toMatchObject(legacy.characters[0]);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(`${key}:backup:v1`),
      keyFor(),
    ),
  ).toBe(raw);
  await page.reload();
  await expect(entry(page, "My first route goal")).toBeVisible();
  expect(await saved(page)).toEqual(migrated);
});

test("invalid target ranges preserve the saved route and keyboard dismissal returns focus", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  const before = await saved(page);
  const opener = page.getByRole("button", {
    name: "Add objective",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Add objective",
    exact: true,
  });
  await dialog.getByLabel("Title", { exact: true }).fill("Invalid range");
  await dialog.getByLabel("Target level from", { exact: true }).fill("30");
  await dialog.getByLabel("Target level to", { exact: true }).fill("24");
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Target levels must be whole numbers",
  );
  expect(await saved(page)).toEqual(before);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("another tab cannot overwrite a newer roadmap save", async ({
  page,
  context,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  await addObjective(page, "Shared starting goal", { min: 24, max: 30 });
  const other = await context.newPage();
  await signIn(other);
  await openCharacter(other);
  await roadmap(other);
  await addObjective(page, "Saved by first tab", { min: 24, max: 30 });
  const latest = await saved(page);
  await expect(other.locator(".save-bar")).toContainText(
    "Another tab changed browser data",
  );
  await addObjective(other, "Stale second tab goal", { min: 24, max: 30 });
  await expect(other.locator(".save-bar")).toContainText("temporary");
  expect(await saved(other)).toEqual(latest);
  await other.reload();
  await expect(entry(other, "Saved by first tab")).toBeVisible();
  await expect(entry(other, "Stale second tab goal")).toHaveCount(0);
  await other.close();
});

test("reference attachment preserves personal text, field provenance and optional empty associations", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  await page
    .getByRole("button", { name: "Add objective", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Add objective",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("dungeon");
  await dialog.getByLabel("Title", { exact: true }).fill("My dungeon checks");
  const notes =
    "My quest checklist\n  Indented details and trailing spacing.  ";
  await dialog.getByRole("textbox", { name: "Notes", exact: true }).fill(notes);
  await dialog
    .getByRole("combobox", {
      name: "Forever reference (optional)",
      exact: true,
    })
    .selectOption("forever:dungeon:excavation-site-wetlands");
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue(
    "My dungeon checks",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue(notes);
  await expect(
    dialog.getByLabel("Target level from", { exact: true }),
  ).toHaveValue("26");
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  let persisted = (await saved(page)).characters[0].planner.entries[0];
  expect(persisted).toMatchObject({
    notes,
    targetLevelSource: "announced",
    recordId: "forever:dungeon:excavation-site-wetlands",
  });
  const id = persisted.id;
  await entry(page, "My dungeon checks")
    .getByRole("button", { name: "Edit My dungeon checks", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit objective",
    exact: true,
  });
  await editor
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("high");
  await editor
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(editor).toBeHidden();
  persisted = (await saved(page)).characters[0].planner.entries[0];
  expect(persisted).toMatchObject({
    id,
    notes,
    priority: "high",
    targetLevelSource: "announced",
  });
  await entry(page, "My dungeon checks")
    .getByRole("button", { name: "Edit My dungeon checks", exact: true })
    .click();
  await editor.getByLabel("Target level from", { exact: true }).fill("27");
  await editor
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(editor).toBeHidden();
  expect((await saved(page)).characters[0].planner.entries[0]).toMatchObject({
    id,
    notes,
    targetLevelSource: "user",
    targetLevel: { min: 27, max: 31 },
  });
  await addObjective(page, "Supply check", { associationType: "dungeon" });
  expect(
    (await saved(page)).characters[0].planner.entries[1].association,
  ).toBeUndefined();
});

test("snapshot changes preserve completed goals with missing references and allow unlinking", async ({
  page,
}) => {
  await signIn(page);
  await createCharacter(page);
  await openCharacter(page);
  await roadmap(page);
  await addObjective(page, "Previous zone goal", {
    kind: "zone",
    reference: "forever:zone:ashenvale",
    min: 24,
    max: 27,
    status: "completed",
    notes: "My progress remains mine.",
  });
  const original = await saved(page);
  const previous = structuredClone(original);
  previous.characters[0].planner.datasetVersion = "previous-reviewed-snapshot";
  previous.characters[0].planner.entries[0].recordId =
    "forever:zone:removed-reference";
  await page.evaluate(
    ({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)),
    { key: keyFor(), profile: previous },
  );
  await page.reload();
  await expect(entry(page, "Previous zone goal")).toContainText(
    "Reference no longer in this snapshot",
  );
  await expect(
    entry(page, "Previous zone goal").getByRole("combobox", {
      name: "Status for Previous zone goal",
      exact: true,
    }),
  ).toHaveValue("completed");
  await page
    .getByText("Forever references & planning limits", { exact: true })
    .click();
  await expect(page.locator(".planner-data")).toContainText(
    "Your route uses snapshot previous-reviewed-snapshot",
  );
  expect(await saved(page)).toEqual(previous);
  await entry(page, "Previous zone goal")
    .getByRole("button", { name: "Edit Previous zone goal", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit objective",
    exact: true,
  });
  await dialog
    .getByRole("combobox", {
      name: "Forever reference (optional)",
      exact: true,
    })
    .selectOption("");
  await dialog
    .getByRole("button", { name: "Save objective", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const changed = (await saved(page)).characters[0].planner.entries[0];
  expect(changed).toMatchObject({
    id: original.characters[0].planner.entries[0].id,
    title: "Previous zone goal",
    notes: "My progress remains mine.",
    status: "completed",
    origin: "user",
    targetLevel: { min: 24, max: 27 },
  });
  expect(changed.recordId).toBeUndefined();
});

for (const [label, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 820, 1100],
  ["mobile", 390, 844],
]) {
  test(`leveling ${label} layout, editor and Next Up are accessible without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    await createCharacter(page);
    await openCharacter(page);
    await roadmap(page);
    await page
      .getByLabel("Choose starter route", { exact: true })
      .selectOption("editorial-horde-20-30");
    await page
      .getByRole("button", { name: "Merge starter", exact: true })
      .click();
    await entry(page, "Ashenvale")
      .getByRole("button", { name: "Edit Ashenvale", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("active");
    await dialog
      .getByRole("combobox", { name: "Access / readiness", exact: true })
      .selectOption("confirmed");
    await accessible(page);
    await noOverflow(page);
    await dialog
      .getByRole("button", { name: "Save objective", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await addObjective(page, "Train and restock", {
      min: 24,
      max: 26,
      priority: "high",
      notes:
        "Personal plan · check trainers and buy supplies before the next session.",
    });
    await addObjective(page, "Plan a Wetlands run", {
      kind: "dungeon",
      reference: "forever:dungeon:excavation-site-wetlands",
      notes: "Check access and arrange a group. This is my planned milestone.",
    });
    await expect(entry(page, "Plan a Wetlands run")).toContainText(
      "Announced beta band · not entry minimum",
    );
    await noOverflow(page);
    await accessible(page);
    await mkdir("artifacts", { recursive: true });
    await page.evaluate(() => {
      document.activeElement?.blur();
      scrollTo(0, 0);
    });
    await page.screenshot({
      path: `artifacts/leveling-${label}.png`,
      fullPage: true,
    });
    await navigation(page, "journal").click();
    await expect(nextUp(page)).toContainText("Train and restock");
    await noOverflow(page);
    await accessible(page);
  });
}

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";

const demo = JSON.parse(
  await readFile(
    new URL("../companion/public/demo-profile-v2.json", import.meta.url),
    "utf8",
  ),
);
const clone = (value) => JSON.parse(JSON.stringify(value));
const keyFor = (username = demo.username) =>
  `gregular:forever:profile:${encodeURIComponent(username.normalize("NFKC").trim().toLowerCase())}`;
const backupKey = (username = demo.username) =>
  `${keyFor(username)}:backup:replacement`;
const rawSaved = (page, username = demo.username) =>
  page.evaluate((key) => localStorage.getItem(key), keyFor(username));
const saved = async (page, username = demo.username) =>
  JSON.parse(await rawSaved(page, username));
const preview = (page, name = "Import profile") =>
  page.getByRole("dialog", { name, exact: true });

async function seed(page, profile = demo) {
  await page.goto("./");
  await page.evaluate((profile) => {
    localStorage.setItem(
      `gregular:forever:profile:${encodeURIComponent(profile.usernameKey)}`,
      JSON.stringify(profile),
    );
    sessionStorage.setItem("gregular.active-profile", profile.username);
  }, profile);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "New character", exact: true }),
  ).toBeVisible();
}

async function settings(page) {
  const button = page.getByRole("button", {
    name: "Profile settings",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
  else
    await page
      .getByRole("button", { name: "Import profile", exact: true })
      .click();
  const dialog = preview(page, "Profile settings");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function chooseFile(
  page,
  value = demo,
  { open = true, raw = false } = {},
) {
  const dialog = open
    ? await settings(page)
    : preview(page, "Profile settings");
  await dialog.getByLabel("Profile JSON", { exact: true }).setInputFiles({
    name: "profile.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw ? value : JSON.stringify(value)),
  });
}

async function importProfile(page, profile = demo) {
  await chooseFile(page, profile);
  const dialog = preview(page);
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: /^(Import profile|Replace current profile)$/ })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "New character", exact: true }),
  ).toBeVisible();
}

async function openCharacter(page, name = "Zala") {
  await page
    .getByRole("button", { name: `Open ${name}'s journal`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name, exact: true, level: 1 }),
  ).toBeVisible();
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

test("demo import is opt-in, previews its contents and saves only after confirmation", async ({
  page,
}) => {
  await page.goto("./");
  expect(await rawSaved(page)).toBeNull();
  const profileSettings = await settings(page);
  const fixtureDownload = page.waitForEvent("download");
  await profileSettings
    .getByRole("link", { name: "Download demo profile", exact: true })
    .click();
  const fixtureFile = await fixtureDownload;
  expect(fixtureFile.suggestedFilename()).toBe("gregular-demo-profile.json");
  expect(JSON.parse(await readFile(await fixtureFile.path(), "utf8"))).toEqual(
    demo,
  );
  expect(await rawSaved(page)).toBeNull();
  await chooseFile(page, demo, { open: false });
  const dialog = preview(page);
  await expect(dialog).toContainText("Gregular Demo");
  await expect(dialog).toContainText(
    "3 characters · 12 route entries · 3 journal objectives",
  );
  await expect(
    dialog.getByRole("list", { name: "Characters to import" }),
  ).toContainText("Level 24 · Troll Priest · Horde");
  expect(await rawSaved(page)).toBeNull();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(preview(page, "Profile settings")).toBeVisible();
  expect(await rawSaved(page)).toBeNull();
  await chooseFile(page, demo, { open: false });
  await preview(page)
    .getByRole("button", { name: "Import profile", exact: true })
    .click();
  await expect(page.locator(".character-card")).toHaveCount(3);
  const imported = await saved(page);
  expect(imported.id).toBe(demo.id);
  expect(imported.characters).toEqual(demo.characters);
  await openCharacter(page);
  const next = page.getByRole("region", { name: "Next Up", exact: true });
  await expect(next).toContainText("Review abilities with the group");
  await expect(next).toContainText("Meet the party in the Barrens");
  await expect(next).not.toContainText("Optional material gathering");
});

test("replacement requires confirmation and keeps an exact recoverable saved backup", async ({
  page,
}) => {
  await seed(page);
  const before = await rawSaved(page);
  const replacement = clone(demo);
  replacement.characters[0].name = "Zala restored";
  replacement.characters[0].notes =
    "New imported notes\n  Keep this spacing.  ";
  await chooseFile(page, replacement);
  await expect(preview(page)).toContainText(
    "Replace the saved profile “Gregular Demo”",
  );
  expect(await rawSaved(page)).toBe(before);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), backupKey()),
  ).toBeNull();
  await preview(page)
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(await rawSaved(page)).toBe(before);
  await chooseFile(page, replacement, { open: false });
  const confirm = preview(page).getByRole("button", {
    name: "Replace current profile",
    exact: true,
  });
  await confirm.focus();
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".save-bar")).toContainText(
    "Backup created. Profile imported.",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), backupKey()),
  ).toBe(before);
  expect((await saved(page)).characters).toEqual(replacement.characters);
  expect((await saved(page)).revision).toBeGreaterThan(demo.revision);
  await settings(page);
  const backupDownload = page.waitForEvent("download");
  await preview(page, "Profile settings")
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const backupFile = await backupDownload;
  expect(await readFile(await backupFile.path(), "utf8")).toBe(before);
});

test("version-2 export imports into a separate browser context with all supported character data", async ({
  page,
  browser,
}) => {
  await seed(page);
  const exportedPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export profile", exact: true })
    .click();
  const download = await exportedPromise;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported).toEqual(demo);
  const independent = await browser.newContext();
  try {
    const other = await independent.newPage();
    await other.goto(page.url());
    expect(await rawSaved(other)).toBeNull();
    await importProfile(other, exported);
    const restored = await saved(other);
    expect(restored.id).toBe(exported.id);
    expect(restored.createdAt).toBe(exported.createdAt);
    expect(restored.characters).toEqual(exported.characters);
    await other.reload();
    expect(await saved(other)).toEqual(restored);
    await expect(other.locator(".character-card")).toHaveCount(3);
  } finally {
    await independent.close();
  }
});

test("malformed, future, duplicate-ID and invalid-record files never mutate a good profile", async ({
  page,
}) => {
  await seed(page);
  const before = await rawSaved(page);
  const future = { ...clone(demo), schemaVersion: 99 };
  const duplicateCharacter = clone(demo);
  duplicateCharacter.characters[1].id =
    duplicateCharacter.characters[0].id.toUpperCase();
  const duplicateObjective = clone(demo);
  duplicateObjective.characters[0].objectives[1].id =
    duplicateObjective.characters[0].objectives[0].id;
  const duplicateRouteEntry = clone(demo);
  duplicateRouteEntry.characters[0].planner.entries[1].id =
    duplicateRouteEntry.characters[0].planner.entries[0].id;
  const invalidLevel = clone(demo);
  invalidLevel.characters[0].level = "24";
  await settings(page);
  for (const value of [
    "{broken",
    "null",
    future,
    duplicateCharacter,
    duplicateObjective,
    duplicateRouteEntry,
    invalidLevel,
  ]) {
    await chooseFile(page, value, {
      open: false,
      raw: typeof value === "string",
    });
    await expect(
      preview(page, "Profile settings").getByRole("alert"),
    ).toContainText("Import failed:");
    expect(await rawSaved(page)).toBe(before);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), backupKey()),
    ).toBeNull();
  }
});

test("version-1 import migrates safely and preserves IDs, completed goals and exact notes", async ({
  page,
}) => {
  const legacy = clone(demo);
  legacy.schemaVersion = 1;
  legacy.username = "Legacy Import";
  legacy.usernameKey = "legacy import";
  legacy.characters = legacy.characters
    .slice(0, 1)
    .map(({ planner, ...character }) => ({
      ...character,
      notes: "Old journal notes\n  Keep this spacing.  ",
    }));
  await page.goto("./");
  await chooseFile(page, legacy);
  await expect(preview(page)).toContainText(
    "Version 1 will be upgraded to version 2.",
  );
  expect(await rawSaved(page, legacy.username)).toBeNull();
  await preview(page)
    .getByRole("button", { name: "Import profile", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const migrated = await saved(page, legacy.username);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.id).toBe(legacy.id);
  expect(migrated.characters[0]).toMatchObject(legacy.characters[0]);
  expect(migrated.characters[0].planner.entries).toEqual([]);
  expect(migrated.characters[0].planner.id).toBe(legacy.characters[0].id);
  await page.reload();
  expect(await saved(page, legacy.username)).toEqual(migrated);
});

test("recovery previews the previous profile and preserves the replaced data as the next backup", async ({
  page,
}) => {
  await seed(page);
  const replacement = clone(demo);
  replacement.characters = replacement.characters.slice(0, 1);
  replacement.characters[0].notes = "Replacement notes";
  await importProfile(page, replacement);
  const replacedRaw = await rawSaved(page);
  await settings(page);
  await preview(page, "Profile settings")
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await expect(preview(page, "Restore backup")).toContainText("3 characters");
  expect(await rawSaved(page)).toBe(replacedRaw);
  await preview(page, "Restore backup")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(await rawSaved(page)).toBe(replacedRaw);
  await preview(page, "Profile settings")
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await preview(page, "Restore backup")
    .getByRole("button", { name: "Replace current profile", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".save-bar")).toContainText(
    "Backup created. Profile restored.",
  );
  expect((await saved(page)).characters).toEqual(demo.characters);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), backupKey()),
  ).toBe(replacedRaw);
  await page.reload();
  await expect(page.locator(".character-card")).toHaveCount(3);
});

test("an intervening save in another tab blocks stale import confirmation", async ({
  page,
  context,
}) => {
  await seed(page);
  const replacement = clone(demo);
  replacement.characters[0].name = "Stale import";
  await chooseFile(page, replacement);
  const other = await context.newPage();
  await other.goto("./");
  await other.getByLabel("Username", { exact: true }).fill(demo.username);
  await other
    .getByRole("button", { name: "Open my journal", exact: true })
    .click();
  await other.getByRole("button", { name: "Edit Zala", exact: true }).click();
  await other
    .getByRole("dialog")
    .getByLabel("Current level", { exact: true })
    .fill("25");
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(other.getByRole("dialog")).toBeHidden();
  const winningRaw = await rawSaved(other);
  await preview(page)
    .getByRole("button", { name: "Replace current profile", exact: true })
    .click();
  await expect(preview(page).getByRole("alert")).toContainText(
    "another tab or window",
  );
  expect(await rawSaved(page)).toBe(winningRaw);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), backupKey()),
  ).toBeNull();
  await preview(page)
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await preview(page, "Profile settings")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.reload();
  expect((await saved(page)).characters[0].level).toBe(25);
});

test("backup failure aborts replacement without losing the saved profile", async ({
  page,
}) => {
  await seed(page);
  const before = await rawSaved(page);
  const replacement = clone(demo);
  replacement.characters = [];
  await chooseFile(page, replacement);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (candidate, value) {
      if (candidate === key)
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, candidate, value);
    };
  }, backupKey());
  await preview(page)
    .getByRole("button", { name: "Replace current profile", exact: true })
    .click();
  await expect(preview(page).getByRole("alert")).toContainText(
    "could not be backed up",
  );
  expect(await rawSaved(page)).toBe(before);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), backupKey()),
  ).toBeNull();
});

test("import opens its own username and preserves other profiles through switching and direct hash refresh", async ({
  page,
}) => {
  const personal = clone(demo);
  personal.username = "My Real Profile";
  personal.usernameKey = "my real profile";
  personal.characters = personal.characters.slice(2);
  await seed(page, personal);
  const personalRaw = await rawSaved(page, personal.username);
  await chooseFile(page);
  await expect(preview(page)).toContainText(
    "Your current profile “My Real Profile” stays saved.",
  );
  await preview(page)
    .getByRole("button", { name: "Import profile", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await rawSaved(page, personal.username)).toBe(personalRaw);
  await openCharacter(page, "Mira");
  await page
    .getByRole("navigation", { name: "Character sections" })
    .locator('a[href$="/leveling"]')
    .click();
  await expect(
    page.getByRole("heading", { name: "Your roadmap", exact: true }),
  ).toBeVisible();
  const direct = page.url();
  expect(direct).toContain(`/character/${demo.characters[1].id}/leveling`);
  await page.goto(direct);
  await expect(
    page.getByRole("heading", { name: "Your roadmap", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).characters).toEqual(demo.characters);
  await page.getByRole("button", { name: /Switch profile/ }).click();
  await page.getByLabel("Username", { exact: true }).fill(personal.username);
  await page
    .getByRole("button", { name: "Open my journal", exact: true })
    .click();
  await expect(page.locator(".character-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Bram", exact: true }),
  ).toBeVisible();
  expect(await rawSaved(page, personal.username)).toBe(personalRaw);
});

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["tablet", { width: 820, height: 1100 }],
  ["mobile", { width: 390, height: 844 }],
  ["compact mobile", { width: 320, height: 780 }],
]) {
  test(`profile import and recovery are accessible and usable on ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seed(page);
    await chooseFile(page);
    await expect(preview(page)).toBeVisible();
    await accessible(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const dialog = preview(page);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await mkdir("artifacts", { recursive: true });
    await page.screenshot({
      path: `artifacts/profile-import-${name}.png`,
      fullPage: true,
    });
    await dialog
      .getByRole("button", { name: "Replace current profile", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await settings(page);
    await expect(
      preview(page, "Profile settings").getByRole("button", {
        name: "Restore backup",
        exact: true,
      }),
    ).toBeVisible();
    await accessible(page);
    await page.screenshot({
      path: `artifacts/profile-recovery-${name}.png`,
      fullPage: true,
    });
    await preview(page, "Profile settings")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await openCharacter(page);
    await page
      .getByRole("region", { name: "Next Up", exact: true })
      .getByRole("button", {
        name: "Complete Review abilities with the group",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("region", { name: "Next Up", exact: true }),
    ).not.toContainText("Review abilities with the group");
    const persisted = await saved(page);
    await page.reload();
    expect(await saved(page)).toEqual(persisted);
    await expect(
      page.getByRole("region", { name: "Next Up", exact: true }),
    ).not.toContainText("Review abilities with the group");
  });
}

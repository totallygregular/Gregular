import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const prefix = "gregular:forever:profile:";
const keyFor = (username = "Explorer") =>
  prefix + encodeURIComponent(username.normalize("NFKC").trim().toLowerCase());
const saved = (page, username = "Explorer") =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    keyFor(username),
  );

async function enter(page, username = "Explorer") {
  await page.goto("./");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(
    page.getByRole("heading", { name: "The company you keep." }),
  ).toBeVisible();
}

async function create(page, name = "Zala", options = {}) {
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Character name", { exact: true }).fill(name);
  await dialog
    .getByRole("combobox", { name: "Race", exact: true })
    .selectOption((options.race || "Troll").toLowerCase().replaceAll(" ", "-"));
  await dialog
    .getByRole("combobox", { name: "Class", exact: true })
    .selectOption(options.className || "Priest");
  await dialog.getByRole("combobox", { name: "Starting zone", exact: true }).selectOption("");
  if (options.level)
    await dialog.getByLabel("Current level").fill(String(options.level));
  if (options.spec)
    await dialog.getByLabel("Planned specialisation").selectOption(options.spec);
  if (options.sample)
    await dialog.getByLabel("Add sample planning objectives").check();
  await dialog
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function open(page, name = "Zala") {
  await page
    .getByRole("button", { name: `Open ${name}'s overview`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your overview." }),
  ).toBeVisible();
}

const section = (page, name) =>
  page
    .getByRole("navigation", { name: "Character sections" })
    .getByRole("link", { name });
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function accessible(page) {
  await page.evaluate(async () => {
    // Native hash navigation can resolve before React commits the next screen.
    // Flush rendering before enumerating animations, then scan settled colors.
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
  const content = page.locator(".dashboard-content");
  if (await content.count()) await expect(content).toHaveCSS("opacity", "1");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}

test("username entry validates empty input, explains local access, and opens an empty profile", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByText("This is not secure sign-in.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
  expect(
    await page
      .getByLabel("Username")
      .evaluate((input) => input.validity.valueMissing),
  ).toBe(true);
  await page.getByLabel("Username").fill("   ");
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(page.getByRole("alert")).toContainText("Username is required");
  await page.getByLabel("Username").fill("Explorer");
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(page.getByText("Your first story awaits.")).toBeVisible();
  await expect(page.locator(".character-card")).toHaveCount(0);
});

test("creates a Troll Priest with opted-in sample objectives and keeps it after reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enter(page);
  await create(page, "Zala", {
    race: "Troll",
    className: "Priest",
    faction: "Horde",
    level: 12,
    spec: "Holy",
    sample: true,
  });
  for (const text of ["Troll Priest", "Holy", "0 / 3 objectives"])
    await expect(page.locator(".character-card")).toContainText(text);
  const before = await saved(page);
  expect(before.schemaVersion).toBe(4);
  expect(before.characters[0].id).toMatch(/^[a-f0-9-]{36}$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Zala", exact: true }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test("preserves saved arbitrary planning labels, supports more than three characters, and edits preserve IDs", async ({
  page,
}) => {
  await enter(page);
  await create(page, "Zala");
  const legacy = await saved(page);
  Object.assign(legacy.characters[0], {
    race: "Unverified race", className: "Unverified class",
    faction: "Alliance", plannedSpec: "Custom saved path",
  });
  await page.evaluate(({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)),
    { key: keyFor(), profile: legacy });
  await page.reload();
  for (const name of ["Bram", "Mira", "Rowan"]) await create(page, name);
  await expect(page.locator(".character-card")).toHaveCount(4);
  const before = await saved(page);
  await page.getByRole("button", { name: "Edit Zala", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Character name", { exact: true })
    .fill("Zala the Wise");
  await dialog.getByLabel("Current level").fill("18");
  await dialog.getByLabel("Progression status").selectOption("leveling");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  const after = await saved(page);
  expect(after.characters[0]).toMatchObject({
    id: before.characters[0].id,
    name: "Zala the Wise",
    level: 18,
    status: "leveling",
    race: "Unverified race",
    className: "Unverified class",
    plannedSpec: "Custom saved path",
    faction: "Alliance",
  });
  expect(after.characters.slice(1)).toEqual(before.characters.slice(1));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Zala the Wise", exact: true }),
  ).toBeVisible();
});

test("character form rejects invalid levels before saving", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Character name", { exact: true })
    .fill("Invalid level");
  await dialog
    .getByRole("combobox", { name: "Race", exact: true })
    .selectOption("troll");
  await dialog
    .getByRole("combobox", { name: "Class", exact: true })
    .selectOption("Priest");
  for (const level of ["0", "61", "1.5"]) {
    await dialog.getByLabel("Current level").fill(level);
    await dialog
      .getByRole("button", { name: "Create character", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    expect(
      await dialog
        .getByLabel("Current level")
        .evaluate((input) => input.validity.valid),
    ).toBe(false);
  }
  await dialog.getByLabel("Current level").fill("1");
  await dialog.getByLabel("Character name", { exact: true }).fill("   ");
  await dialog
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Character name is required",
  );
  expect((await saved(page)).characters).toEqual([]);
});

test("section URLs, browser back, talent previews and reviewed item details are interactive", async ({
  page,
}) => {
  await enter(page);
  await create(page);
  await open(page);
  const characterId = (await saved(page)).characters[0].id;
  await expect(page).toHaveURL(
    new RegExp(`#\/character\/${characterId}\/overview$`),
  );
  await section(page, "Leveling Route").click();
  await expect(
    page.getByRole("heading", { name: "Your roadmap" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/leveling$/);
  await expect(page.locator("#main-content")).toBeFocused();
  await section(page, "Dungeons").click();
  await expect(
    page.getByRole("heading", { name: "Dungeons", exact: true }),
  ).toBeVisible();
  await section(page, "Talents").click();
  const node = page.getByRole("button", { name: /Preview fictional/ }).first();
  await node.click();
  await expect(node).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Fictional node.", { exact: false }),
  ).toBeVisible();
  await section(page, "Equipment").click();
  const orb = page.locator("article").filter({ has: page.getByRole("heading", { name: "Ponderous Orb", exact: true }) });
  await orb.getByText("Item details and sources", { exact: true }).click();
  await expect(
    orb.getByText("Game item ID", { exact: true }),
  ).toBeVisible();
  await expect(orb).toContainText("273052");
  await expect(orb).toContainText("Shade of the Archmage");
  await page.goBack();
  await expect(page).toHaveURL(/\/talents$/);
  await expect(
    page.getByRole("heading", { name: "Shape your potential." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All characters" }).click();
  await expect(page).toHaveURL(/#\/roster$/);
});

test("objectives, completion and saved notes persist across page reloads", async ({
  page,
}) => {
  await enter(page);
  await create(page, "Zala", { sample: true });
  await open(page);
  const first = page.locator('.objective-list input[type="checkbox"]').first();
  await first.check();
  await expect(first).toBeChecked();
  await page
    .getByLabel("New objective", { exact: true })
    .fill("Ask the party about Friday");
  await page
    .getByRole("button", { name: "Add objective", exact: true })
    .click();
  await expect(page.locator(".objective-list")).toContainText(
    "Ask the party about Friday",
  );
  await page.reload();
  await expect(
    page.locator('.objective-list input[type="checkbox"]').first(),
  ).toBeChecked();
  await expect(page.locator(".objective-list li")).toHaveCount(4);
  await section(page, "Notes").click();
  const notes =
    "Ask about a relaxed Friday session.\nBring a plan, leave room for detours.";
  await page.getByLabel("Your personal notes").fill(notes);
  await expect(page.getByText("You have unsaved notes.")).toBeVisible();
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(
    page.getByText("Notes updated.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Your personal notes")).toHaveValue(notes);
  const record = await saved(page);
  expect(record.characters[0].notes).toBe(notes);
  expect(record.characters[0].objectives[0].completed).toBe(true);
});

test("removal requires explicit confirmation and cancellation preserves the character", async ({
  page,
}) => {
  await enter(page);
  await create(page);
  await page.getByRole("button", { name: "Edit Zala", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove character", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Remove Zala?");
  await page.getByRole("button", { name: "Keep character" }).click();
  await expect(page.locator(".character-card")).toHaveCount(1);
  expect((await saved(page)).characters).toHaveLength(1);
  await page.getByRole("button", { name: "Edit Zala", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove character", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove character", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".character-card")).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).characters).toHaveLength(0);
});

test("profiles remain isolated and usernames reopen case insensitively", async ({
  page,
}) => {
  await enter(page, "Explorer");
  await create(page, "Zala");
  const original = await saved(page);
  await page.locator(".profile-switch").click();
  await page.getByLabel("Username").fill("Friend");
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(page.locator(".character-card")).toHaveCount(0);
  await create(page, "Bram");
  await page.locator(".profile-switch").click();
  await page.getByLabel("Username").fill("  EXPLORER  ");
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(
    page.getByRole("heading", { name: "Zala", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bram", exact: true }),
  ).toHaveCount(0);
  expect(await saved(page)).toEqual(original);
  expect((await saved(page, "Friend")).characters[0].name).toBe("Bram");
});

for (const [label, raw] of [
  ["corrupt", "bad-json"],
  ["newer version", '{"schemaVersion":99}'],
]) {
  test(`${label} profiles are preserved when edits cannot be saved`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, raw }) => {
        localStorage.setItem(key, raw);
      },
      { key: keyFor(), raw },
    );
    await enter(page);
    await expect(page.locator(".save-bar")).toContainText(
      "preserved without changes",
    );
    await create(page, "Temporary character");
    await expect(page.locator(".save-bar")).toContainText("temporary");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), keyFor()),
    ).toBe(raw);
    await expect(
      page.getByRole("button", { name: "Download backup" }),
    ).toBeVisible();
  });
}

test("blocked storage keeps temporary editing available and clearly states save failure", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
  });
  await enter(page);
  await expect(page.locator(".save-bar")).toContainText(
    "storage is unavailable",
  );
  await create(page, "Temporary character");
  await expect(page.locator(".save-bar")).toContainText("temporary");
  await expect(
    page.getByRole("button", { name: "Download backup" }),
  ).toBeVisible();
});

test("quota failure preserves the saved record and exposes an exportable temporary edit", async ({
  page,
}) => {
  await enter(page);
  await create(page);
  const before = await saved(page);
  await page.evaluate((prefix) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith(prefix))
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  }, prefix);
  await page.getByRole("button", { name: "Edit Zala", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Current level").fill("25");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".save-bar")).toContainText("full or blocked");
  await expect(page.locator(".save-bar")).toContainText("temporary");
  expect(await saved(page)).toEqual(before);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("gregular-profile-explorer.json");
});

test("another tab cannot overwrite a newer saved profile and explicit reopening loads it", async ({
  page,
  context,
}) => {
  await enter(page);
  await create(page);
  const other = await context.newPage();
  await enter(other);
  await other.getByRole("button", { name: "Edit Zala", exact: true }).click();
  await other.getByRole("dialog").getByLabel("Current level").fill("20");
  await other.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".save-bar")).toContainText("Another tab");
  await page.getByRole("button", { name: "Edit Zala", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Current level").fill("30");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".save-bar")).toContainText(
    "changed in another tab",
  );
  expect((await saved(page)).characters[0].level).toBe(20);
  await page.locator(".profile-switch").click();
  await page.getByLabel("Username").fill("Explorer");
  await page.getByRole("button", { name: "Open my planner" }).click();
  await expect(page.locator(".character-card .level-seal")).toContainText("20");
  await expect(page.locator(".save-bar")).toContainText(
    "Saved in this browser",
  );
});

test("invalid character routes show recovery and user text is escaped", async ({
  page,
}) => {
  await enter(page);
  const name = "<img src=x onerror=window.bad=1>";
  await create(page, name);
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
  expect(await page.locator(".character-card img").count()).toBe(0);
  await open(page, name);
  await page.getByLabel("New objective").fill("<script>window.bad=1</script>");
  await page
    .getByRole("button", { name: "Add objective", exact: true })
    .click();
  await expect(page.locator(".objective-list")).toContainText(
    "<script>window.bad=1</script>",
  );
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
  await page.goto("./#/character/does-not-exist/journal");
  await expect(
    page.getByRole("heading", { name: "Character not found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to characters" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
});

test("keyboard dialog focus, escape and reduced motion respect user preferences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  const newButton = page.getByRole("button", {
    name: "New character",
    exact: true,
  });
  await newButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByLabel("Character name", { exact: true }),
  ).toBeFocused();
  for (let count = 0; count < 16; count += 1) {
    await page.keyboard.press("Tab");
    // Native modal cycling can briefly focus body/browser chrome at its boundary;
    // no control in the inert page behind the dialog may receive focus.
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
  await expect(newButton).toBeFocused();
  await create(page);
  const timing = await page.locator(".character-card").evaluate((card) => ({
    duration: getComputedStyle(card).animationDuration,
    transition: getComputedStyle(card).transitionDuration,
  }));
  expect(
    timing.duration.split(",").every((value) => parseFloat(value) <= 0.001),
  ).toBe(true);
  expect(
    timing.transition.split(",").every((value) => parseFloat(value) <= 0.001),
  ).toBe(true);
});

test("automated accessibility covers entry, roster, creation, journal, notes and mock sections", async ({
  page,
}) => {
  await page.goto("./");
  await accessible(page);
  await enter(page);
  await accessible(page);
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  await accessible(page);
  await page.keyboard.press("Escape");
  await create(page, "Zala", { sample: true });
  await accessible(page);
  await open(page);
  await accessible(page);
  for (const name of [
    "Leveling Route",
    "Dungeons",
    "Talents",
    "Equipment",
    "Notes",
  ]) {
    await section(page, name).click();
    await expect(section(page, name)).toHaveAttribute("aria-current", "page");
    await accessible(page);
    if (name === "Equipment") {
      await page.getByText("Item details and sources", { exact: true }).first().click();
      await accessible(page);
    }
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`responsive ${width}px entry, modal, roster and dashboard avoid horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await noOverflow(page);
    await enter(page);
    await page
      .getByRole("button", { name: "New character", exact: true })
      .click();
    await noOverflow(page);
    if (width === 390) await accessible(page);
    await page.keyboard.press("Escape");
    await create(page, "Zala", { level: 12, spec: "Holy", sample: true });
    await create(page, "Bram", {
      race: "Dwarf",
      className: "Warrior",
      faction: "Alliance",
      level: 16,
      spec: "Protection",
    });
    await create(page, "Mira", {
      race: "Tauren",
      className: "Druid",
      level: 10,
      spec: "Restoration",
    });
    await page.mouse.move(0, 0);
    await noOverflow(page);
    if (width === 390) await accessible(page);
    if (width === 1440) {
      const cards = await page.locator(".character-card").evaluateAll((cards) =>
        cards.slice(0, 3).map((card) => ({
          x: card.getBoundingClientRect().x,
          y: card.getBoundingClientRect().y,
        })),
      );
      expect(
        Math.max(...cards.map((card) => card.y)) -
          Math.min(...cards.map((card) => card.y)),
      ).toBeLessThan(2);
      expect(new Set(cards.map((card) => card.x)).size).toBe(3);
    }
    if (width === 390 || width === 1440) {
      await mkdir("artifacts", { recursive: true });
      await page.evaluate(() => document.activeElement?.blur());
      await page.screenshot({
        path: `artifacts/companion-${width === 390 ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
    }
    await open(page);
    await noOverflow(page);
    if (width === 390) await accessible(page);
    for (const name of ["Dungeons", "Talents", "Equipment", "Notes"]) {
      await section(page, name).click();
      await noOverflow(page);
    }
    if (width === 390 || width === 1440) {
      await section(page, "Overview").click();
      await expect(
        page.getByRole("heading", { name: "Your overview." }),
      ).toBeVisible();
      await expect(section(page, "Overview")).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.locator("#main-content")).toBeFocused();
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: `artifacts/companion-journal-${width === 390 ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
    }
  });
}

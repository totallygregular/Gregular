import { describe, expect, it } from "vitest";
import {
  addCharacter,
  createProfile,
  migrateProfile,
  setCharacterPlanner,
  setNotes,
} from "./domain";
import { getZone } from "./data/zones";
import {
  addEntry,
  createBlankPlanner,
  getNextUp,
  moveEntry,
  removeEntry,
  setEntryStatus,
  updateEntry,
} from "./planner";
import { parseProfileTransfer } from "./profileTransfer";
import {
  BrowserProfileRepository,
  profileReplacementBackupKey,
  profileStorageKey,
  type StorageLike,
} from "./profileRepository";
import {
  addSuggestedStart,
  addZone,
  createStarterRoute,
  getInsertionTravel,
  getRouteProgress,
  getRouteTransitions,
  outstandingZoneObjectives,
  plannedRangeWarning,
  renameRoute,
  resolveEntryZone,
  startBlankRoute,
} from "./routeBuilder";

const elwynn = "forever:zone:elwynn-forest";
const westfall = "forever:zone:westfall";
const darkshore = "forever:zone:darkshore";
function route() {
  let plan = addZone(createBlankPlanner(), elwynn, { min: 1, max: 12 });
  plan = addZone(plan, westfall, { min: 12, max: 18 });
  return addZone(plan, darkshore, { min: 18, max: 24 });
}

describe("zone visits and personal plans", () => {
  it("adds, inserts and repeats visits without sharing IDs or adopting recommended ranges", () => {
    const blank = createBlankPlanner();
    let plan = addZone(blank, elwynn, { min: 4, max: 6 });
    const firstId = plan.entries[0].id;
    plan = addZone(plan, darkshore, { min: 24, max: 28 });
    plan = addZone(plan, westfall, { min: 11, max: 19 }, 1);
    plan = addZone(plan, elwynn, { min: 30, max: 32 });
    expect(blank.entries).toEqual([]);
    expect(plan.entries.map((entry) => entry.recordId)).toEqual([
      elwynn,
      westfall,
      darkshore,
      elwynn,
    ]);
    expect(plan.entries[0]).toMatchObject({
      id: firstId,
      targetLevel: { min: 4, max: 6 },
      targetLevelSource: "user",
      access: "unknown",
    });
    expect(new Set(plan.entries.map((entry) => entry.id)).size).toBe(4);
    expect(removeEntry(plan, firstId).entries).toHaveLength(3);
  });

  it("allows overlapping windows and gaps, validates only each personal range", () => {
    let plan = addZone(createBlankPlanner(), elwynn, { min: 1, max: 20 });
    plan = addZone(plan, westfall, { min: 12, max: 18 });
    plan = addZone(plan, darkshore, { min: 40, max: 45 });
    plan = updateEntry(plan, plan.entries[1].id, {
      targetLevel: { min: 15, max: 25 },
    });
    expect(plan.entries.map((entry) => entry.targetLevel)).toEqual([
      { min: 1, max: 20 },
      { min: 15, max: 25 },
      { min: 40, max: 45 },
    ]);
    expect(() => addZone(plan, westfall, { min: 30, max: 20 })).toThrow(
      "end level",
    );
    expect(() => addZone(plan, westfall, { min: 0, max: 10 })).toThrow(
      "1 to 60",
    );
    expect(() => addZone(plan, westfall, { min: 1, max: 10 }, -1)).toThrow(
      "insertion",
    );
    expect(() => addZone(plan, "removed-zone", { min: 1, max: 10 })).toThrow(
      "catalogue",
    );
  });

  it("keeps recommendation and personal plan independent with advisory warnings", () => {
    const zone = getZone(westfall)!;
    const plan = addZone(createBlankPlanner(), westfall, { min: 45, max: 50 });
    expect(plannedRangeWarning(plan.entries[0])).toContain("You can keep");
    expect(
      plannedRangeWarning({
        ...plan.entries[0],
        targetLevel: zone.recommendedLevel,
      }),
    ).toBeUndefined();
    expect(
      plannedRangeWarning(plan.entries[0], {
        ...zone,
        recommendedLevel: undefined,
      }),
    ).toBeUndefined();
    expect(plan.entries[0].targetLevel).toEqual({ min: 45, max: 50 });
    expect(zone.recommendedLevel).not.toEqual(plan.entries[0].targetLevel);
  });

  it("renames, completes, skips, reactivates and clears only visits", () => {
    let plan = route();
    plan = addEntry(plan, {
      kind: "dungeon",
      title: "My dungeon milestone",
      notes: "Keep my preparation",
    });
    plan = addEntry(plan, {
      kind: "custom",
      title: "Meet friends",
      notes: "Keep this goal",
    });
    const firstId = plan.entries[0].id;
    const completed = setEntryStatus(plan, firstId, "completed");
    expect(completed.entries[0].status).toBe("completed");
    expect(plan.entries[0].status).toBe("planned");
    const reactivated = setEntryStatus(
      setEntryStatus(completed, firstId, "skipped"),
      firstId,
      "active",
    );
    expect(reactivated.entries[0].status).toBe("active");
    expect(renameRoute(plan, "Friends' route").name).toBe("Friends' route");
    const blank = startBlankRoute(plan);
    expect(blank.entries.map((entry) => entry.kind)).toEqual([
      "dungeon",
      "custom",
    ]);
    expect(blank.entries[0].notes).toBe("Keep my preparation");
    expect(blank.id).toBe(plan.id);
  });

  it("offers optional race starts and preserves existing work when accepting", () => {
    const blank = createBlankPlanner();
    const human = addSuggestedStart(blank, "Human", "Alliance", {
      min: 1,
      max: 7,
    });
    expect(human.entries[0]).toMatchObject({
      recordId: elwynn,
      targetLevel: { min: 1, max: 7 },
    });
    expect(blank.entries).toEqual([]);
    expect(createStarterRoute("Orc", "Horde").entries[0].title).toBe("Durotar");
    expect(() => createStarterRoute("Human", "Horde")).toThrow("No sourced");
    expect(() => createStarterRoute("Unknown race", "Alliance")).toThrow(
      "No sourced",
    );
    const existing = addEntry(blank, {
      kind: "custom",
      title: "Bring supplies",
    });
    expect(addSuggestedStart(existing, "Human", "Alliance").entries[1]).toEqual(
      existing.entries[0],
    );
  });
});

describe("travel follows saved route order", () => {
  it("recalculates transitions after reordering and skips geographic assumptions for dungeons", () => {
    const plan = route();
    const before = getRouteTransitions(plan, "Alliance");
    expect(before[1].travel.difficulty).toBe("easy");
    expect(before[2].travel.difficulty).toBe("long");
    const moved = moveEntry(plan, plan.entries[2].id, 1);
    const after = getRouteTransitions(moved, "Alliance");
    expect(after[1].travel.difficulty).toBe("long");
    expect(after[1].previousEntryId).toBe(plan.entries[0].id);
    expect(getRouteTransitions(plan, "Alliance")).toEqual(before);
    const dungeon = addEntry(plan, {
      kind: "dungeon",
      title: "Unverified dungeon location",
    });
    const nextZone = addZone(dungeon, elwynn, { min: 30, max: 31 });
    expect(
      getRouteTransitions(nextZone, "Alliance").at(-1)!.travel.difficulty,
    ).toBe("unknown");
  });

  it("calculates both insertion sides and excludes skipped stops and personal objectives", () => {
    const plan = route();
    const insertion = getInsertionTravel(plan, elwynn, 2, "Alliance");
    expect(insertion.before?.recordId).toBe(westfall);
    expect(insertion.after?.recordId).toBe(darkshore);
    expect(insertion.incoming.difficulty).toBe("easy");
    expect(insertion.outgoing?.difficulty).toBe("long");
    const skipped = setEntryStatus(plan, plan.entries[1].id, "skipped");
    expect(getRouteTransitions(skipped, "Alliance")[1].previousEntryId).toBe(
      plan.entries[0].id,
    );
    const custom = addEntry(plan, { kind: "custom", title: "Bring supplies" });
    expect(getRouteTransitions(custom, "Alliance")).toEqual(
      getRouteTransitions(plan, "Alliance"),
    );
    expect(
      getInsertionTravel(plan, westfall, plan.entries.length, "Alliance")
        .outgoing,
    ).toBeUndefined();
    expect(() => getInsertionTravel(plan, elwynn, 0.5, "Alliance")).toThrow(
      "insertion",
    );
  });

  it("resolves legacy titles without altering saved IDs and never guesses missing references", () => {
    const plan = addEntry(createBlankPlanner(), {
      kind: "zone",
      title: "Elwynn Forest",
      targetLevel: { min: 4, max: 8 },
    });
    expect(resolveEntryZone(plan.entries[0])?.id).toBe(elwynn);
    const missing = { ...plan.entries[0], recordId: "deleted-reference" };
    expect(resolveEntryZone(missing)).toBeUndefined();
    expect(
      getRouteTransitions({ ...plan, entries: [missing] }, "Alliance")[0].travel
        .difficulty,
    ).toBe("unknown");
    expect(plan.entries[0].recordId).toBeUndefined();
  });
});

describe("explainable route progress and next up", () => {
  it("recognises an exit-level transition without completing earlier visits", () => {
    const plan = route();
    const progress = getRouteProgress(plan, 18);
    expect(progress.current?.recordId).toBe(darkshore);
    expect(progress.readyToTransition).toBe(true);
    expect(progress.earlierUnfinished.map((entry) => entry.recordId)).toEqual([
      elwynn,
      westfall,
    ]);
    const next = getNextUp({ planner: plan, level: 18, faction: "Alliance" });
    expect(next.recommendations[0].title).toBe("Darkshore");
    expect(next.recommendations[0].reason).toContain("provisional");
    expect(next.unfinished).toHaveLength(2);
    expect(plan.entries.every((entry) => entry.status === "planned")).toBe(
      true,
    );
  });

  it("uses saved order for overlaps, an active visit as an anchor and all future visits", () => {
    let plan = route();
    plan = updateEntry(plan, plan.entries[0].id, {
      targetLevel: { min: 1, max: 20 },
    });
    expect(getRouteProgress(plan, 18).current?.recordId).toBe(elwynn);
    plan = setEntryStatus(plan, plan.entries[1].id, "active");
    expect(getRouteProgress(plan, 17).current?.recordId).toBe(westfall);
    expect(
      getNextUp({ planner: plan, level: 17, faction: "Alliance" }).upcoming.map(
        (entry) => entry.title,
      ),
    ).toEqual(["Darkshore"]);
    plan = updateEntry(plan, plan.entries[2].id, {
      targetLevel: { min: 45, max: 50 },
    });
    expect(
      getNextUp({ planner: plan, level: 17, faction: "Alliance" }).upcoming.map(
        (entry) => entry.title,
      ),
    ).toEqual(["Darkshore"]);
  });

  it("separates earlier linked objectives and retains skipped/completed state", () => {
    let plan = route();
    plan = addEntry(plan, {
      kind: "custom",
      title: "Finish my Elwynn goal",
      association: { kind: "zone", recordId: elwynn, name: "Elwynn Forest" },
    });
    const next = getNextUp({ planner: plan, level: 18, faction: "Alliance" });
    expect(next.unfinished?.map((entry) => entry.title)).toContain(
      "Finish my Elwynn goal",
    );
    expect(outstandingZoneObjectives(plan, getZone(elwynn)!)).toHaveLength(1);
    plan = setEntryStatus(plan, plan.entries[0].id, "completed");
    plan = setEntryStatus(plan, plan.entries[1].id, "skipped");
    expect(getRouteProgress(plan, 18)).toMatchObject({
      completed: 1,
      skipped: 1,
    });
    expect(
      getNextUp({ planner: plan, level: 18, faction: "Alliance" })
        .recommendations[0].title,
    ).toBe("Darkshore");
    expect(
      getNextUp({
        planner: plan,
        level: 18,
        faction: "Alliance",
      }).unfinished?.map((entry) => entry.title),
    ).toContain("Finish my Elwynn goal");
  });

  it("handles empty, partial, gap and beyond-plan routes without invented stops", () => {
    expect(getRouteProgress(createBlankPlanner(), 1).current).toBeUndefined();
    let plan = addZone(createBlankPlanner(), westfall, { min: 15, max: 18 });
    expect(getRouteProgress(plan, 12).current).toBeUndefined();
    expect(getRouteProgress(plan, 12).next?.recordId).toBe(westfall);
    expect(getRouteProgress(plan, 60).current?.recordId).toBe(westfall);
    expect(
      getNextUp({ planner: plan, level: 60, faction: "Alliance" })
        .recommendations[0].title,
    ).toBe("Westfall");
    plan = updateEntry(plan, plan.entries[0].id, { access: "unavailable" });
    expect(
      getNextUp({ planner: plan, level: 15, faction: "Alliance" }).blocked[0]
        .reason,
    ).toContain("unavailable");
  });
});

describe("portable route compatibility", () => {
  it("roundtrips zone visits with old milestones, personal notes and character isolation", () => {
    let profile = addCharacter(createProfile("Route transfer"), {
      name: "Greg",
      race: "Human",
      className: "Priest",
      faction: "Alliance",
      level: 1,
      plannedSpec: "Holy",
      status: "leveling",
    });
    profile = addCharacter(profile, {
      name: "Zala",
      race: "Troll",
      className: "Priest",
      faction: "Horde",
      level: 1,
      plannedSpec: "Holy",
      status: "planned",
    });
    const first = profile.characters[0];
    const untouched = profile.characters[1];
    let plan = route();
    plan = setEntryStatus(plan, plan.entries[0].id, "completed");
    plan = addEntry(plan, {
      kind: "dungeon",
      title: "Legacy dungeon",
      status: "skipped",
      targetLevel: { min: 29, max: 30 },
      notes: "Quest preparations",
    });
    plan = addEntry(plan, {
      kind: "custom",
      title: "Legacy goal",
      notes: "Keep spacing.  ",
    });
    profile = setCharacterPlanner(profile, first.id, plan);
    profile = setNotes(profile, first.id, "Personal notes\n  exact.  ");
    const parsed = parseProfileTransfer(JSON.stringify(profile));
    expect(parsed.sourceSchemaVersion).toBe(3);
    expect(parsed.profile).toEqual(profile);
    expect(parsed.profile.characters[1]).toEqual(untouched);
    expect(parsed.profile.characters[0].planner.entries).toEqual(plan.entries);
    expect(migrateProfile(JSON.parse(JSON.stringify(profile)))).toEqual(
      profile,
    );
    // Read-time reference updates cannot replace a personal range or dataset tag.
    const older = { ...plan, datasetVersion: "previous-catalogue" };
    expect(
      parseProfileTransfer(
        JSON.stringify(setCharacterPlanner(profile, first.id, older)),
      ).profile.characters[0].planner,
    ).toEqual(older);
  });

  it("continues deterministic v1 migration and does not duplicate imported objectives", () => {
    const profile = addCharacter(
      createProfile("Old route"),
      {
        name: "Greg",
        race: "Human",
        className: "Priest",
        faction: "Alliance",
        level: 1,
        plannedSpec: "Holy",
        status: "leveling",
      },
      { mockObjectives: true },
    );
    const old = {
      ...profile,
      schemaVersion: 1,
      characters: profile.characters.map(
        ({ planner: _planner, ...character }) => character,
      ),
    };
    const first = parseProfileTransfer(JSON.stringify(old)).profile;
    const second = parseProfileTransfer(JSON.stringify(first)).profile;
    expect(second).toEqual(first);
    expect(second.characters[0].id).toBe(profile.characters[0].id);
    expect(second.characters[0].objectives).toEqual(
      profile.characters[0].objectives,
    );
    expect(second.characters[0].planner.entries).toEqual([]);
  });

  it("retains new route data after reload and rejects stale-tab route edits", async () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    };
    const writer = new BrowserProfileRepository(storage);
    let profile = addCharacter(createProfile("Route storage"), {
      name: "Greg",
      race: "Human",
      className: "Priest",
      faction: "Alliance",
      level: 1,
      plannedSpec: "Holy",
      status: "leveling",
    });
    const id = profile.characters[0].id;
    profile = setCharacterPlanner(profile, id, route());
    expect((await writer.save(profile)).ok).toBe(true);
    const tabA = new BrowserProfileRepository(storage);
    const tabB = new BrowserProfileRepository(storage);
    const first = (await tabA.load("Route storage")).profile!;
    const stale = (await tabB.load("Route storage")).profile!;
    expect(first.characters[0].planner).toEqual(profile.characters[0].planner);
    const changedRoute = updateEntry(
      first.characters[0].planner,
      first.characters[0].planner.entries[1].id,
      { targetLevel: { min: 14, max: 16 }, notes: "My shorter visit" },
    );
    expect(
      (await tabA.save(setCharacterPlanner(first, id, changedRoute))).ok,
    ).toBe(true);
    expect(
      (
        await tabB.save(
          setCharacterPlanner(
            stale,
            id,
            moveEntry(
              stale.characters[0].planner,
              stale.characters[0].planner.entries[2].id,
              0,
            ),
          ),
        )
      ).ok,
    ).toBe(false);
    expect(
      (await tabB.load("Route storage")).profile!.characters[0].planner,
    ).toEqual(changedRoute);
  });

  it("backs up and restores a complete zone route before profile replacement", async () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    };
    const repository = new BrowserProfileRepository(storage);
    let profile = addCharacter(createProfile("Route recovery"), {
      name: "Greg",
      race: "Human",
      className: "Priest",
      faction: "Alliance",
      level: 18,
      plannedSpec: "Holy",
      status: "leveling",
    });
    const id = profile.characters[0].id;
    profile = setCharacterPlanner(profile, id, route());
    const original = (await repository.save(profile)).profile!;
    const originalRaw = values.get(profileStorageKey("Route recovery"))!;
    const replacement = setCharacterPlanner(
      original,
      id,
      addZone(original.characters[0].planner, elwynn, { min: 55, max: 60 }),
    );
    const prepared = (
      await repository.prepareImport(JSON.stringify(replacement))
    ).preparation!;
    expect((await repository.applyTransfer(prepared.token)).ok).toBe(true);
    expect(values.get(profileReplacementBackupKey("Route recovery"))).toBe(
      originalRaw,
    );
    expect(
      (await repository.load("Route recovery")).profile!.characters[0].planner
        .entries,
    ).toHaveLength(4);
    const restore = (await repository.prepareRestore("Route recovery"))
      .preparation!;
    const restored = (await repository.applyTransfer(restore.token)).profile!;
    expect(restored.characters).toEqual(original.characters);
    expect(restored.characters[0].planner.entries).toHaveLength(3);
    expect(
      new Set(restored.characters[0].planner.entries.map((entry) => entry.id))
        .size,
    ).toBe(3);
  });
});

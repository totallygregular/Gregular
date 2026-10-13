import { describe, expect, it } from "vitest";
import {
  addEntry,
  applyTemplate,
  createBlankPlanner,
  entryFromRecord,
  getNextUp,
  moveEntry,
  removeEntry,
  setEntryStatus,
  updateEntry,
  validatePlanner,
} from "./planner";
import { progressionDataset } from "./data/progression";
import type {
  CharacterPlanner,
  PlannerEntryDraft,
  ProgressionDataset,
} from "./progressionTypes";

const personal: PlannerEntryDraft = {
  kind: "custom",
  title: "Train abilities",
  priority: "high",
};
const base = () => createBlankPlanner();
const context = (planner: CharacterPlanner, level = 24, faction = "Horde") => ({
  planner,
  level,
  faction,
  objectives: [],
});
const copiedData = (): ProgressionDataset =>
  JSON.parse(JSON.stringify(progressionDataset));

describe("character-specific route editing", () => {
  it("starts blank with a stable explicit migration ID and roundtrips untrusted JSON", () => {
    const id = crypto.randomUUID();
    const route = createBlankPlanner("My route", id);
    expect(route).toMatchObject({
      id,
      name: "My route",
      entries: [],
      datasetVersion: progressionDataset.version,
    });
    expect(validatePlanner(JSON.parse(JSON.stringify(route)))).toEqual(route);
    expect(createBlankPlanner().id).not.toBe(id);
  });

  it("creates independent IDs and immutable edits with personal associations", () => {
    const initial = base();
    const first = addEntry(initial, personal);
    const second = addEntry(first, personal);
    expect(initial.entries).toEqual([]);
    expect(first.entries[0]).toMatchObject({
      title: "Train abilities",
      notes: "",
      access: "confirmed",
      origin: "user",
      status: "planned",
      prerequisiteEntryIds: [],
    });
    expect(new Set(second.entries.map(({ id }) => id)).size).toBe(2);
    const edited = updateEntry(first, first.entries[0].id, {
      title: "Train before the next dungeon",
      notes: "Keep these notes.  ",
      targetLevel: { min: 24, max: 25 },
      association: {
        kind: "dungeon",
        name: "A personal destination",
        recordId: "missing-reference-is-allowed-as-context",
      },
    });
    expect(edited.entries[0]).toMatchObject({
      id: first.entries[0].id,
      targetLevelSource: "user",
      notes: "Keep these notes.  ",
    });
    expect(first.entries[0].title).toBe("Train abilities");
    expect(getNextUp(context(edited)).recommendations).toHaveLength(1);
  });

  it("reorders without inventing implicit prerequisites and preserves entry IDs", () => {
    let route = base();
    for (const title of ["First", "Second", "Third"])
      route = addEntry(route, { ...personal, title });
    const ids = route.entries.map(({ id }) => id);
    const moved = moveEntry(route, ids[2], "up");
    expect(moved.entries.map(({ title }) => title)).toEqual([
      "First",
      "Third",
      "Second",
    ]);
    expect(moveEntry(moved, ids[2], 0).entries.map(({ id }) => id)).toEqual([
      ids[2],
      ids[0],
      ids[1],
    ]);
    expect(moveEntry(route, ids[0], "up")).toBe(route);
    expect(route.entries[2].title).toBe("Third");
    expect(
      getNextUp(context(moved)).recommendations.map(({ id }) => id),
    ).toEqual([ids[0], ids[2], ids[1]]);
    expect(() => moveEntry(route, ids[0], 1.2)).toThrow("whole number");
  });

  it("completes, skips and removes entries without mutating previous progress", () => {
    let route = addEntry(base(), personal);
    const id = route.entries[0].id;
    const complete = setEntryStatus(route, id, "completed");
    expect(complete.entries[0].status).toBe("completed");
    expect(route.entries[0].status).toBe("planned");
    expect(getNextUp(context(complete)).recommendations).toEqual([]);
    route = setEntryStatus(route, id, "skipped");
    expect(getNextUp(context(route)).recommendations).toEqual([]);
    expect(removeEntry(route, id).entries).toEqual([]);
    expect(() => updateEntry(route, "missing", { title: "Edit" })).toThrow(
      "could not be found",
    );
    expect(() => removeEntry(route, "missing")).toThrow("could not be found");
  });

  it("removes a range and its source together and marks adjusted ranges as personal", () => {
    let route = addEntry(base(), {
      ...personal,
      targetLevel: { min: 20, max: 25 },
      targetLevelSource: "editorial",
    });
    const id = route.entries[0].id;
    route = updateEntry(route, id, { targetLevel: { min: 22, max: 27 } });
    expect(route.entries[0].targetLevelSource).toBe("user");
    route = updateEntry(route, id, { targetLevel: undefined });
    expect(route.entries[0].targetLevel).toBeUndefined();
    expect(route.entries[0].targetLevelSource).toBeUndefined();
  });
});

describe("starter templates and reference adaptation", () => {
  it("uses distinct character entries, explicit editorial windows and unconfirmed access", () => {
    const template = progressionDataset.templates[0];
    const first = applyTemplate(base(), template.id, "Horde");
    const second = applyTemplate(base(), template.id, "Horde");
    expect(first.entries).toHaveLength(3);
    expect(
      first.entries.every(
        (entry) =>
          entry.origin === "editorial" &&
          entry.targetLevelSource === "editorial" &&
          entry.access === "unknown",
      ),
    ).toBe(true);
    expect(first.entries.map(({ id }) => id)).not.toEqual(
      second.entries.map(({ id }) => id),
    );
    expect(getNextUp(context(first)).recommendations).toEqual([]);
    expect(getNextUp(context(first)).blocked).toHaveLength(3);
    expect(() => applyTemplate(base(), template.id, "Alliance")).toThrow(
      "another faction",
    );
    expect(() => applyTemplate(base(), "missing", "Horde")).toThrow(
      "could not be found",
    );
  });

  it("restores missing entries without resetting progress, notes, levels or custom goals", () => {
    const template = progressionDataset.templates[0];
    let route = applyTemplate(base(), template.id, "Horde");
    const firstId = route.entries[0].id,
      removedId = route.entries[2].id;
    route = updateEntry(route, firstId, {
      status: "completed",
      notes: "My own notes",
      targetLevel: { min: 21, max: 24 },
      access: "confirmed",
    });
    route = addEntry(route, { ...personal, title: "Meet friends" });
    const customId = route.entries.at(-1)!.id;
    route = removeEntry(route, removedId);
    const restored = applyTemplate(route, template.id, "Horde");
    expect(restored.entries).toHaveLength(4);
    expect(restored.entries.find(({ id }) => id === firstId)).toMatchObject({
      status: "completed",
      notes: "My own notes",
      targetLevel: { min: 21, max: 24 },
      access: "confirmed",
    });
    expect(restored.entries.some(({ id }) => id === customId)).toBe(true);
    expect(applyTemplate(restored, template.id, "Horde")).toEqual(restored);
  });

  it("imports only bounded announced testing bands, never manufactures a maximum", () => {
    expect(
      entryFromRecord("forever:dungeon:excavation-site-wetlands"),
    ).toMatchObject({
      title: "Excavation Site: Wetlands",
      origin: "reference",
      access: "unknown",
      targetLevel: { min: 26, max: 31 },
      targetLevelSource: "announced",
    });
    expect(
      entryFromRecord("forever:dungeon:razorfen-downs").targetLevel,
    ).toBeUndefined();
    expect(
      entryFromRecord("forever:zone:ashenvale").targetLevel,
    ).toBeUndefined();
    expect(() => entryFromRecord("missing")).toThrow("could not be found");
  });
});

describe("deterministic next objectives", () => {
  it("handles blank plans, level 1 and level 60 without invented tasks", () => {
    for (const level of [1, 24, 60])
      expect(getNextUp(context(base(), level))).toEqual({
        recommendations: [],
        upcoming: [],
        blocked: [],
      });
    expect(() => getNextUp(context(base(), NaN))).toThrow("whole numbers");
  });

  it("prioritises overdue high personal goals, the active zone, then current plans", () => {
    let route = addEntry(base(), {
      kind: "dungeon",
      title: "Plan a group",
      access: "confirmed",
      targetLevel: { min: 24, max: 28 },
    });
    route = addEntry(route, {
      kind: "zone",
      title: "Current zone",
      access: "confirmed",
      status: "active",
      targetLevel: { min: 20, max: 25 },
    });
    route = addEntry(route, {
      ...personal,
      title: "Overdue priority",
      targetLevel: { min: 20, max: 22 },
    });
    route = addEntry(route, {
      kind: "custom",
      title: "Current goal",
      targetLevel: { min: 24, max: 27 },
    });
    const next = getNextUp(context(route));
    expect(next.recommendations.map(({ title }) => title)).toEqual([
      "Overdue priority",
      "Current zone",
      "Current goal",
      "Plan a group",
    ]);
    expect(next.recommendations[0].reason).toContain("planned by level 22");
    expect(getNextUp(context(route))).toEqual(next);
  });

  it("updates current versus upcoming when levels change; the horizon is eight levels", () => {
    let route = addEntry(base(), {
      kind: "zone",
      title: "Now",
      access: "confirmed",
      targetLevel: { min: 24, max: 26 },
    });
    route = addEntry(route, {
      kind: "zone",
      title: "Soon",
      access: "confirmed",
      targetLevel: { min: 27, max: 30 },
    });
    route = addEntry(route, {
      kind: "dungeon",
      title: "Later",
      access: "confirmed",
      targetLevel: { min: 32, max: 35 },
    });
    route = addEntry(route, {
      kind: "zone",
      title: "Distant",
      access: "confirmed",
      targetLevel: { min: 33, max: 38 },
    });
    expect(
      getNextUp(context(route, 24)).recommendations.map(({ title }) => title),
    ).toEqual(["Now"]);
    expect(
      getNextUp(context(route, 24)).upcoming.map(({ title }) => title),
    ).toEqual(["Soon", "Later"]);
    expect(
      getNextUp(context(route, 27)).recommendations.map(({ title }) => title),
    ).toEqual(["Soon"]);
    expect(
      getNextUp(context(route, 27)).upcoming.map(({ title }) => title),
    ).toEqual(["Later", "Distant"]);
  });

  it("enforces only known faction restrictions and verified entry minima", () => {
    const dataset = copiedData();
    const record = dataset.records.find(({ kind }) => kind === "dungeon")!;
    record.faction = "Alliance";
    record.minimumLevel = 26;
    let route = addEntry(base(), {
      ...entryFromRecord(record.id, dataset),
      access: "confirmed",
      targetLevel: { min: 20, max: 31 },
    });
    expect(
      getNextUp(context(route, 24, "Horde"), dataset).blocked[0].reason,
    ).toContain("Alliance");
    expect(
      getNextUp(context(route, 24, "Alliance"), dataset).upcoming[0].reason,
    ).toContain("Verified minimum level 26");
    expect(
      getNextUp(context(route, 26, "Alliance"), dataset).recommendations,
    ).toHaveLength(1);
    route = setEntryStatus(route, route.entries[0].id, "completed");
    expect(getNextUp(context(route, 24, "Horde"), dataset).blocked).toEqual([]);
  });

  it("requires personal access confirmation and blocks unavailable beta references", () => {
    const dataset = copiedData(),
      record = dataset.records[0];
    let route = addEntry(base(), entryFromRecord(record.id, dataset));
    expect(getNextUp(context(route), dataset).blocked[0].reason).toContain(
      "Confirm access",
    );
    route = updateEntry(route, route.entries[0].id, { access: "confirmed" });
    expect(getNextUp(context(route), dataset).recommendations).toHaveLength(1);
    record.availability = "unknown";
    expect(getNextUp(context(route), dataset).blocked[0].reason).toContain(
      "unverified",
    );
    record.availability = "unavailable";
    expect(getNextUp(context(route), dataset).blocked[0].reason).toContain(
      "Unavailable",
    );
  });

  it("respects the reviewed beta cap while retaining personal future plans and published bands", () => {
    let route = addEntry(base(), {
      ...entryFromRecord("forever:dungeon:excavation-site-wetlands"),
      access: "confirmed",
    });
    route = addEntry(route, {
      kind: "custom",
      title: "My future goal",
      targetLevel: { min: 31, max: 35 },
    });
    route = addEntry(route, {
      kind: "zone",
      title: "My own later zone",
      access: "confirmed",
      targetLevel: { min: 31, max: 35 },
    });
    const atCap = getNextUp(context(route, 30));
    expect(atCap.recommendations.map(({ title }) => title)).toEqual([
      "Excavation Site: Wetlands",
    ]);
    expect(atCap.upcoming.map(({ title }) => title)).toEqual([
      "My future goal",
      "My own later zone",
    ]);
    const beyondCap = getNextUp(context(route, 31));
    expect(beyondCap.recommendations.map(({ title }) => title)).toEqual([
      "My future goal",
      "My own later zone",
    ]);
    expect(beyondCap.blocked[0].reason).toContain(
      "above the reviewed beta cap of 30",
    );
    expect(route.entries[0].targetLevel).toEqual({ min: 26, max: 31 });
    const futureReference = updateEntry(route, route.entries[0].id, {
      targetLevel: { min: 31, max: 35 },
    });
    expect(getNextUp(context(futureReference, 29)).blocked[0].reason).toContain(
      "target is above",
    );
    const updated = copiedData();
    updated.currentLevelCap = 35;
    expect(
      getNextUp(context(route, 31), updated).recommendations.some(
        ({ title }) => title === "Excavation Site: Wetlands",
      ),
    ).toBe(true);
    updated.records.find(
      ({ id }) => id === route.entries[0].recordId,
    )!.minimumLevel = 40;
    expect(getNextUp(context(route, 31), updated).blocked[0].reason).toContain(
      "target is above",
    );
  });

  it("requires explicit prerequisites completed, even when skipped or reordered", () => {
    let route = addEntry(base(), { ...personal, title: "Prepare supplies" });
    const prerequisite = route.entries[0].id;
    route = addEntry(route, {
      ...personal,
      title: "Travel with friends",
      prerequisiteEntryIds: [prerequisite],
    });
    const dependent = route.entries[1].id;
    route = moveEntry(route, dependent, "up");
    expect(getNextUp(context(route)).blocked[0].reason).toContain(
      "Prepare supplies",
    );
    expect(
      getNextUp(context(setEntryStatus(route, prerequisite, "skipped")))
        .blocked[0].reason,
    ).toContain("skipped");
    expect(
      getNextUp(
        context(setEntryStatus(route, prerequisite, "completed")),
      ).recommendations.map(({ title }) => title),
    ).toEqual(["Travel with friends"]);
    const removed = removeEntry(route, prerequisite);
    expect(getNextUp(context(removed)).blocked[0].reason).toContain("removed");
    expect(validatePlanner(removed).entries[0].prerequisiteEntryIds).toEqual([
      prerequisite,
    ]);
  });

  it("enforces known record prerequisites and re-evaluates snapshot updates", () => {
    const dataset = copiedData();
    const first = dataset.records[0],
      second = dataset.records[1];
    second.prerequisiteRecordIds = [first.id];
    let route = addEntry(base(), {
      ...entryFromRecord(second.id, dataset),
      access: "confirmed",
    });
    expect(getNextUp(context(route), dataset).blocked[0].reason).toContain(
      first.name,
    );
    route = addEntry(route, {
      ...entryFromRecord(first.id, dataset),
      access: "confirmed",
      status: "completed",
    });
    expect(getNextUp(context(route), dataset).recommendations).toHaveLength(1);
    dataset.records = dataset.records.filter(({ id }) => id !== second.id);
    expect(getNextUp(context(route), dataset).blocked[0].reason).toContain(
      "Reference missing",
    );
    expect(validatePlanner(route).entries[0].recordId).toBe(second.id);
    expect(route.entries[1].status).toBe("completed");
  });

  it("preserves personal titles against reference renames and never recommends illustrative tasks", () => {
    const dataset = copiedData();
    let route = addEntry(base(), {
      ...entryFromRecord(dataset.records[0].id),
      title: "My zone session",
      access: "confirmed",
    });
    route = addEntry(route, {
      ...personal,
      title: "Decorative example",
      origin: "illustrative",
    });
    dataset.records[0].name = "Renamed in reference";
    const next = getNextUp(
      {
        ...context(route),
        objectives: [
          {
            id: "old-personal",
            title: "Ask friends",
            priority: "high",
            completed: false,
          },
          {
            id: "sample",
            title: "Sample: compare plans",
            priority: "high",
            completed: false,
          },
          { id: "complete", title: "Done", priority: "high", completed: true },
        ],
      },
      dataset,
    );
    expect(next.recommendations.map(({ title }) => title)).toEqual([
      "Ask friends",
      "My zone session",
    ]);
    expect(next.recommendations[0].source).toBe("journal");
  });

  it("limits actionable cards and keeps stable route order for equal priorities", () => {
    let route = base();
    for (let index = 0; index < 8; index += 1)
      route = addEntry(route, { kind: "custom", title: `Goal ${index}` });
    expect(
      getNextUp(context(route)).recommendations.map(({ title }) => title),
    ).toEqual(["Goal 0", "Goal 1", "Goal 2", "Goal 3"]);
  });
});

describe("untrusted planner validation", () => {
  it.each([
    { title: "" },
    { kind: "unknown" },
    { notes: "x".repeat(5001) },
    { targetLevel: { min: 26, max: 24 } },
    { targetLevel: { min: 0, max: 4 } },
    { targetLevel: { min: 1.5, max: 4 } },
    { status: "lost" },
    { access: "probably" },
    { origin: "AI" },
    { priority: "urgent" },
    { recordId: "forever:custom:invented" },
    { targetLevelSource: "editorial" },
  ])(
    "rejects malformed entry patch %j without mutating the old route",
    (patch) => {
      const route = addEntry(base(), personal);
      expect(() =>
        updateEntry(
          route,
          route.entries[0].id,
          patch as Partial<PlannerEntryDraft>,
        ),
      ).toThrow();
      expect(route.entries[0].title).toBe("Train abilities");
    },
  );

  it("rejects duplicate IDs, malformed containers, control characters and self-dependencies", () => {
    const route = addEntry(base(), personal),
      entry = route.entries[0];
    expect(() =>
      validatePlanner({ ...route, entries: [entry, entry] }),
    ).toThrow("duplicate entry");
    expect(() =>
      validatePlanner({
        ...route,
        entries: [{ ...entry, prerequisiteEntryIds: [entry.id] }],
      }),
    ).toThrow("same objective");
    expect(() => validatePlanner({ ...route, entries: "bad" })).toThrow(
      "500 entries",
    );
    expect(() => validatePlanner({ ...route, id: "bad" })).toThrow("ID");
    expect(() => validatePlanner({ ...route, name: "Name\u0000" })).toThrow(
      "control",
    );
    expect(() => validatePlanner(null)).toThrow("object");
    expect(() =>
      addEntry(route, {
        kind: "custom",
        title: "Read",
        association: { kind: "zone", name: "" },
      }),
    ).toThrow();
  });

  it("does not allow excess caller properties to replace generated or existing IDs", () => {
    const injected = crypto.randomUUID();
    const route = addEntry(base(), {
      ...personal,
      id: injected,
    } as PlannerEntryDraft);
    expect(route.entries[0].id).not.toBe(injected);
    const edited = updateEntry(route, route.entries[0].id, {
      title: "Updated",
      id: injected,
    } as Partial<PlannerEntryDraft>);
    expect(edited.entries[0].id).toBe(route.entries[0].id);
    expect(edited.entries[0].title).toBe("Updated");
  });
});

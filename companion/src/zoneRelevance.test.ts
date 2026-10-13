import { describe, expect, it } from "vitest";
import { filterZones, getZone, zoneCatalogue, zoneId, type ZoneRecord } from "./data/zones";
import { addEntry, createBlankPlanner, moveEntry, setEntryStatus } from "./planner";
import { addZone, getInsertionTravel } from "./routeBuilder";
import { getSuggestionContext, rankZoneSuggestions, type SuggestionInput } from "./zoneRelevance";

function input(overrides: Partial<SuggestionInput> = {}): SuggestionInput {
  return { planner: createBlankPlanner(), level: 25, insertionIndex: 0, faction: "Alliance", ...overrides };
}

function zone(slug: string, levels?: { min: number; max: number }): ZoneRecord {
  const record = getZone(zoneId(slug))!;
  if (!record) throw new Error("Test fixture must resolve a catalogue zone");
  return { ...record, faction: "Both", ...(levels ? { recommendedLevel: levels } : {}) };
}

function fixture(id: string, min?: number, max?: number): ZoneRecord {
  return {
    ...zone("westfall"), id, name: id,
    recommendedLevel: min === undefined || max === undefined ? undefined : { min, max },
  };
}

function durotar(plannedMax = 12) {
  return addZone(createBlankPlanner(), zoneId("durotar"), { min: 1, max: plannedMax });
}

describe("next-bracket insertion context", () => {
  it("uses browser levels for an empty route and beginning insertion", () => {
    const planner = addZone(createBlankPlanner(), zoneId("duskwood"), { min: 30, max: 35 });
    expect(getSuggestionContext(input())).toMatchObject({
      planningLevel: 25, planningWindow: { min: 25, max: 28 }, basedOnPreviousZone: false,
    });
    expect(getSuggestionContext(input({ planner, level: 10 }))).toMatchObject({
      planningLevel: 10, planningWindow: { min: 10, max: 13 },
      basedOnPreviousPlan: false, basedOnPreviousZone: false, after: planner.entries[0],
    });
  });

  it("anchors near the reviewed upper bound, ignoring an arbitrarily long personal stay", () => {
    const planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 55 });
    const query = input({ planner, level: 12, insertionIndex: 1 });
    expect(getSuggestionContext(query)).toMatchObject({
      planningLevel: 16, planningWindow: { min: 16, max: 18 },
      sourceZone: { id: zoneId("westfall") }, sourceRange: { min: 10, max: 18 },
      basedOnPreviousZone: true, basedOnPreviousPlan: false,
    });
    const ranked = rankZoneSuggestions(query, [fixture("distant", 50, 60), fixture("next", 16, 25)]);
    expect(ranked[0].zone.id).toBe("next");
    expect(planner.entries[0].targetLevel).toEqual({ min: 12, max: 55 });
  });

  it("keeps the Durotar next bracket with short, default or overlong personal plans", () => {
    for (const plannedMax of [2, 12, 60]) {
      expect(getSuggestionContext(input({
        planner: durotar(plannedMax), level: 1, insertionIndex: 1, faction: "Horde",
      }))).toMatchObject({
        planningLevel: 10, planningWindow: { min: 10, max: 12 }, basedOnPreviousZone: true,
      });
    }
  });

  it("uses an advanced character or browser level once past the preceding suitable range", () => {
    const query = input({ planner: durotar(60), level: 30, insertionIndex: 1, faction: "Horde" });
    expect(getSuggestionContext(query)).toMatchObject({
      planningLevel: 30, planningWindow: { min: 30, max: 33 },
      basedOnPreviousZone: false, basedOnPreviousPlan: false,
    });
    const ranked = rankZoneSuggestions(query, [zone("the-barrens"), zone("arathi-highlands")]);
    expect(ranked[0].zone.id).toBe(zoneId("arathi-highlands"));
    expect(ranked[1].label).toBe("Past suitable range");
  });

  it("caps a middle insertion at the next pending personal entry without rewriting either stop", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 55 });
    planner = addZone(planner, zoneId("duskwood"), { min: 17, max: 32 });
    const snapshot = JSON.stringify(planner);
    expect(getSuggestionContext(input({ planner, level: 12, insertionIndex: 1 }))).toMatchObject({
      planningLevel: 16, planningWindow: { min: 16, max: 17 }, nextEntryLevel: 17,
      before: planner.entries[0], after: planner.entries[1], hasLevelConflict: false,
    });
    expect(JSON.stringify(planner)).toBe(snapshot);
  });

  it("never reverses its window when the next personal entry is earlier", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 55 });
    planner = addZone(planner, zoneId("duskwood"), { min: 15, max: 40 });
    expect(getSuggestionContext(input({ planner, level: 12, insertionIndex: 1 }))).toMatchObject({
      planningLevel: 16, planningWindow: { min: 16, max: 16 }, hasLevelConflict: true,
    });
  });

  it("ignores customs and skipped anchors while retaining completed geographic context", () => {
    let planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 55 });
    planner = setEntryStatus(planner, planner.entries[0].id, "completed");
    planner = addZone(planner, zoneId("westfall"), { min: 12, max: 55 });
    planner = setEntryStatus(planner, planner.entries[1].id, "skipped");
    planner = addEntry(planner, { kind: "custom", title: "Personal objective", targetLevel: { min: 50, max: 60 } });
    expect(getSuggestionContext(input({ planner, level: 1, insertionIndex: 3 }))).toMatchObject({
      planningLevel: 10, planningWindow: { min: 10, max: 12 }, before: planner.entries[0],
    });
  });

  it("uses unresolved stop personal bounds as a fallback and leaves travel unknown", () => {
    const planner = addEntry(createBlankPlanner(), {
      kind: "dungeon", title: "Personal milestone", targetLevel: { min: 28, max: 32 },
    });
    const query = input({ planner, insertionIndex: 1 });
    expect(getSuggestionContext(query)).toMatchObject({
      planningLevel: 32, planningWindow: { min: 32, max: 35 },
      basedOnPreviousZone: false, basedOnPreviousPlan: true,
    });
    const suggestion = rankZoneSuggestions(query, [zone("arathi-highlands")])[0];
    expect(suggestion.travel.incoming.difficulty).toBe("unknown");
    expect(suggestion).toMatchObject({ fit: "unknown", label: "Travel unverified" });
  });

  it("does not use a completed following stop to cap future planning", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 10, max: 18 });
    planner = setEntryStatus(planner, planner.entries[0].id, "completed");
    expect(getSuggestionContext(input({ planner }))).toMatchObject({
      planningWindow: { min: 25, max: 28 }, hasLevelConflict: false,
    });
    expect(getSuggestionContext(input({ planner })).nextEntryLevel).toBeUndefined();
  });

  it("caps the window at 60 and reuses insertion validation", () => {
    expect(getSuggestionContext(input({ level: 59 })).planningWindow).toEqual({ min: 59, max: 60 });
    for (const insertionIndex of [-1, 0.5, 1, Number.NaN]) {
      expect(() => getSuggestionContext(input({ insertionIndex }))).toThrow("insertion");
      expect(() => rankZoneSuggestions(input({ insertionIndex }), [])).toThrow("insertion");
    }
  });
});

describe("race starting-zone suggestions", () => {
  it("prioritises Troll Durotar without removing alternative race starts", () => {
    const query = input({ level: 1, faction: "Horde", race: "Troll" });
    const ranked = rankZoneSuggestions(query);
    expect(getSuggestionContext(query).suggestedStart?.id).toBe(zoneId("durotar"));
    expect(ranked[0]).toMatchObject({
      zone: { id: zoneId("durotar") }, label: "Suggested starting zone", fit: "good",
    });
    expect(ranked.some((item) => item.zone.id === zoneId("mulgore"))).toBe(true);
    expect(ranked).toHaveLength(zoneCatalogue.length);
  });

  it("uses the racial start at a beginning insertion but does not promote a repeated start", () => {
    const planner = addZone(createBlankPlanner(), zoneId("the-barrens"), { min: 10, max: 20 });
    const query = input({ planner, level: 1, faction: "Horde", race: "Troll" });
    expect(rankZoneSuggestions(query)[0].zone.id).toBe(zoneId("durotar"));
    const alreadyStarted = addZone(planner, zoneId("durotar"), { min: 1, max: 12 });
    expect(rankZoneSuggestions({ ...query, planner: alreadyStarted })[0].zone.id).not.toBe(zoneId("durotar"));
  });

  it("does not guess a start for unknown races or force a starting zone after its range", () => {
    expect(getSuggestionContext(input({ race: "Unlisted", level: 1 })).suggestedStart).toBeUndefined();
    expect(getSuggestionContext(input({ race: "Troll", faction: "Horde", level: 20 })).suggestedStart).toBeUndefined();
    expect(getSuggestionContext(input({ race: "Troll", faction: "Alliance", level: 1 })).suggestedStart).toBeUndefined();
  });
});

describe("deterministic next-bracket ordering", () => {
  it("puts current overlap ahead of later, exhausted and unknown ranges", () => {
    const ranked = rankZoneSuggestions(input(), [
      fixture("early", 1, 12), fixture("later", 45, 55), fixture("unknown"), fixture("now", 24, 32),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual(["now", "later", "early", "unknown"]);
    expect(ranked[0]).toMatchObject({ group: "next", fit: "good", label: "Next suggested zone" });
    expect(ranked[1]).toMatchObject({ fit: "later", label: "Later option" });
    expect(ranked[2].label).toBe("Past suitable range");
    expect(ranked[3]).toMatchObject({ fit: "unknown", label: "Fit unverified" });
  });

  it("ranks actual Durotar → Barrens first and Silverpine second across the full catalogue", () => {
    const ranked = rankZoneSuggestions(input({
      planner: durotar(60), level: 1, insertionIndex: 1, faction: "Horde", race: "Troll",
    }));
    expect(ranked.slice(0, 2).map((item) => item.zone.id))
      .toEqual([zoneId("the-barrens"), zoneId("silverpine-forest")]);
    expect(ranked.slice(0, 2).every((item) => item.group === "next" && item.fit === "good")).toBe(true);
    expect(ranked[0].travel.incoming.difficulty).toBe("easy");
    expect(ranked[1].travel.incoming.difficulty).toBe("long");
    expect(ranked[1].reasons).toContain("Long travel from the previous stop");
  });

  it("ranks Barrens after Silverpine even though both recommended ranges start at 10", () => {
    const planner = addZone(createBlankPlanner(), zoneId("silverpine-forest"), { min: 10, max: 18 });
    const ranked = rankZoneSuggestions(input({ planner, level: 10, insertionIndex: 1, faction: "Horde" }));
    expect(ranked[0]).toMatchObject({ zone: { id: zoneId("the-barrens") }, group: "next" });
    const stonetalon = ranked.find((item) => item.zone.id === zoneId("stonetalon-mountains"))!;
    expect(stonetalon.group).toBe("next");
    expect(ranked[0].travel.incoming.score).toBeLessThan(stonetalon.travel.incoming.score!);
  });

  it("accepts a shared or lower entry bound when the overlapping range extends onward", () => {
    const planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 10, max: 18 });
    const ranked = rankZoneSuggestions(input({ planner, level: 10, insertionIndex: 1 }), [
      fixture("same-entry", 10, 25), fixture("lower-entry", 5, 25), fixture("same-exit", 14, 18),
    ]);
    expect(ranked.find((item) => item.zone.id === "same-entry")?.group).toBe("next");
    expect(ranked.find((item) => item.zone.id === "lower-entry")?.group).toBe("next");
    expect(ranked.find((item) => item.zone.id === "same-exit")?.group).toBe("alternative");
    expect(ranked.at(-1)?.zone.id).toBe("same-exit");
  });

  it("prefers a bracket with onward levels to the exact end of an older broad range", () => {
    const ranked = rankZoneSuggestions(input({ level: 30 }), [
      fixture("old-wide-bracket", 10, 30), fixture("fresh-bracket", 30, 40),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual(["fresh-bracket", "old-wide-bracket"]);
    expect(ranked[0].group).toBe("next");
    expect(ranked[1]).toMatchObject({ group: "alternative", label: "Suitable alternative" });
  });

  it("uses the selected insertion predecessor instead of always using the final stop", () => {
    let planner = addZone(durotar(), zoneId("the-barrens"), { min: 12, max: 25 });
    planner = addZone(planner, zoneId("thousand-needles"), { min: 25, max: 35 });
    const query = input({ planner, level: 1, insertionIndex: 1, faction: "Horde" });
    expect(getSuggestionContext(query).sourceZone?.id).toBe(zoneId("durotar"));
    const ranked = rankZoneSuggestions(query, [zone("silverpine-forest"), zone("desolace")]);
    expect(ranked[0].zone.id).toBe(zoneId("silverpine-forest"));
    expect(ranked[0].travel.after?.recordId).toBe(zoneId("the-barrens"));
  });

  it("compares travel before small entry-distance differences within the next bracket", () => {
    const planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    const ranked = rankZoneSuggestions(input({ planner, level: 1, insertionIndex: 1 }), [
      zone("darkshore", { min: 11, max: 24 }), zone("westfall", { min: 10, max: 20 }),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("westfall"), zoneId("darkshore")]);
    expect(ranked.every((item) => item.group === "next" && item.fit === "good")).toBe(true);
  });

  it("compares both travel legs when inserting in the middle", () => {
    let planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    planner = addZone(planner, zoneId("burning-steppes"), { min: 50, max: 55 });
    const ranked = rankZoneSuggestions(input({ planner, level: 1, insertionIndex: 1 }), [
      zone("westfall", { min: 10, max: 25 }), zone("redridge-mountains", { min: 10, max: 25 }),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("redridge-mountains"), zoneId("westfall")]);
    expect(ranked[0].travel.incoming.score).toBe(ranked[1].travel.incoming.score);
    expect(ranked[0].travel.outgoing!.score).toBeLessThan(ranked[1].travel.outgoing!.score!);
    expect(ranked[0].travel).toEqual(getInsertionTravel(planner, ranked[0].zone.id, 1, "Alliance"));
  });

  it("keeps nearer future brackets ahead of convenient but distant ones", () => {
    const planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    const ranked = rankZoneSuggestions(input({ planner, level: 1, insertionIndex: 1 }), [
      zone("westfall", { min: 25, max: 35 }), zone("darkshore", { min: 14, max: 24 }),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("darkshore"), zoneId("westfall")]);
    expect(ranked.every((item) => item.group === "later")).toBe(true);
  });

  it("demotes mismatched factions while retaining explicit full-catalogue filtering", () => {
    const allowed = { ...fixture("alliance", 25, 35), faction: "Alliance" as const };
    const other = { ...fixture("horde", 25, 35), faction: "Horde" as const };
    const unknown = { ...fixture("uncertain", 25, 35), faction: "Unknown" as const };
    const catalogue = [other, unknown, allowed];
    const ranked = rankZoneSuggestions(input(), catalogue);
    expect(ranked.map((item) => item.zone.id)).toEqual(["alliance", "uncertain", "horde"]);
    expect(ranked.at(-1)).toMatchObject({ fit: "awkward", label: "Other faction" });
    const allowedIds = new Set(filterZones({ faction: "Alliance" }, catalogue).map((item) => item.id));
    expect(ranked.filter((item) => allowedIds.has(item.zone.id)).map((item) => item.zone.id))
      .toEqual(["alliance", "uncertain"]);
    expect(rankZoneSuggestions(input({ faction: "Horde" }), catalogue)[0].zone.id).toBe("horde");
    expect(rankZoneSuggestions(input({ faction: "Unspecified" }), [allowed])[0].fit).toBe("unknown");
  });

  it("demotes pending, completed and skipped visits without preventing repeats", () => {
    const planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 10, max: 18 });
    const catalogue = [zone("westfall", { min: 25, max: 35 }), zone("redridge-mountains", { min: 25, max: 35 })];
    const query = input({ planner, insertionIndex: 0 });
    const ranked = rankZoneSuggestions(query, catalogue);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("redridge-mountains"), zoneId("westfall")]);
    expect(ranked[1]).toMatchObject({ fit: "awkward", group: "repeat", label: "Already in route" });
    const completed = setEntryStatus(planner, planner.entries[0].id, "completed");
    expect(rankZoneSuggestions({ ...query, planner: completed }, catalogue).at(-1)?.label).toBe("Return visit");
    const skipped = setEntryStatus(planner, planner.entries[0].id, "skipped");
    expect(rankZoneSuggestions({ ...query, planner: skipped }, catalogue).at(-1)?.label).toBe("Previously skipped");
    expect(addZone(planner, zoneId("westfall"), { min: 25, max: 40 }).entries).toHaveLength(2);
  });

  it("resolves legacy names and recomputes reviewed context after reorder/status changes", () => {
    let planner = addEntry(createBlankPlanner(), {
      kind: "zone", title: "Westfall", targetLevel: { min: 10, max: 55 },
    });
    planner = addZone(planner, zoneId("redridge-mountains"), { min: 18, max: 60 });
    const query = input({ planner, level: 12, insertionIndex: 2 });
    expect(rankZoneSuggestions(query, [zone("westfall")])[0].reasons)
      .toContain("Already planned elsewhere in this route");
    expect(getSuggestionContext(query).planningLevel).toBe(23);
    const moved = moveEntry(planner, planner.entries[1].id, 0);
    expect(getSuggestionContext({ ...query, planner: moved }).planningLevel).toBe(16);
    const skipped = setEntryStatus(planner, planner.entries[1].id, "skipped");
    expect(getSuggestionContext({ ...query, planner: skipped }).planningLevel).toBe(16);
  });

  it("uses ASCII IDs for ties independent of input order, display name or repeat calls", () => {
    const catalogue = [fixture("z", 25, 35), fixture("a", 25, 35), fixture("A", 25, 35)];
    catalogue[0].name = "First alphabetically";
    const query = input();
    const expected = ["A", "a", "z"];
    expect(rankZoneSuggestions(query, catalogue).map((item) => item.zone.id)).toEqual(expected);
    expect(rankZoneSuggestions(query, [...catalogue].reverse()).map((item) => item.zone.id)).toEqual(expected);
    expect(rankZoneSuggestions(query, catalogue)).toEqual(rankZoneSuggestions(query, catalogue));
  });

  it("keeps unknown levels and travel explicit and never treats unknown travel as easy", () => {
    expect(rankZoneSuggestions(input(), [fixture("unknown")])[0]).toMatchObject({
      group: "unknown", fit: "unknown", label: "Fit unverified",
    });
    const planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    const query = input({ planner, insertionIndex: 1 });
    const ranked = rankZoneSuggestions(query, [fixture("unknown-road", 25, 35), zone("westfall", { min: 25, max: 35 })]);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("westfall"), "unknown-road"]);
    expect(ranked[1]).toMatchObject({ fit: "unknown", label: "Travel unverified" });
    expect(ranked[1].travel.incoming.score).toBeNull();
  });

  it("retains every destination without rewriting plans or catalogue records", () => {
    const planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 45 });
    const query = input({ planner, insertionIndex: 1 });
    const planSnapshot = JSON.stringify(planner);
    const catalogueSnapshot = JSON.stringify(zoneCatalogue);
    const ranked = rankZoneSuggestions(query);
    expect(ranked).toHaveLength(zoneCatalogue.length);
    expect(new Set(ranked.map((item) => item.zone.id)).size).toBe(zoneCatalogue.length);
    expect(JSON.stringify(planner)).toBe(planSnapshot);
    expect(JSON.stringify(zoneCatalogue)).toBe(catalogueSnapshot);
    expect(ranked.every((item) => item.reasons.length > 0)).toBe(true);
  });

  it("treats Riverglades as a 35–45 next-bracket option without an XP promise", () => {
    const riverglades = getZone(zoneId("riverglades"))!;
    expect(riverglades.recommendedLevel).toEqual({ min: 35, max: 45 });
    expect(rankZoneSuggestions(input({ level: 34 }), [riverglades])[0]).toMatchObject({
      group: "next", label: "Next suggested zone",
    });
    expect(rankZoneSuggestions(input({ level: 35 }), [riverglades])[0].group).toBe("next");
    expect(rankZoneSuggestions(input({ level: 46 }), [riverglades])[0].label).toBe("Past suitable range");
  });
});

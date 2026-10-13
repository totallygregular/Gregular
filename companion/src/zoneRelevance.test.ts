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

describe("zone suggestion insertion context", () => {
  it("uses the browser level for an empty route or a beginning insertion", () => {
    const planner = addZone(createBlankPlanner(), zoneId("duskwood"), { min: 30, max: 35 });
    expect(getSuggestionContext(input()).planningLevel).toBe(25);
    expect(getSuggestionContext(input({ planner, level: 10 }))).toMatchObject({
      planningLevel: 10, planningWindow: { min: 10, max: 13 },
      basedOnPreviousPlan: false, after: planner.entries[0],
    });
  });

  it("uses the preceding personal exit for future appends rather than global low-level order", () => {
    const planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 30 });
    const atEnd = input({ planner, level: 12, insertionIndex: 1 });
    expect(getSuggestionContext(atEnd)).toMatchObject({
      planningLevel: 30, planningWindow: { min: 30, max: 33 }, basedOnPreviousPlan: true,
    });
    const ranked = rankZoneSuggestions(atEnd, [fixture("early", 10, 20), fixture("future", 30, 40)]);
    expect(ranked[0].zone.id).toBe("future");
  });

  it("keeps a higher browser level and caps the short planning window at the following entry", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 20 });
    planner = addZone(planner, zoneId("duskwood"), { min: 27, max: 32 });
    const context = getSuggestionContext(input({ planner, level: 25, insertionIndex: 1 }));
    expect(context).toMatchObject({
      planningLevel: 25, planningWindow: { min: 25, max: 27 },
      nextEntryLevel: 27, basedOnPreviousPlan: false, hasLevelConflict: false,
    });
    expect(context.before?.id).toBe(planner.entries[0].id);
    expect(context.after?.id).toBe(planner.entries[1].id);
  });

  it("preserves overlapping plans without reversing the planning window", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 35 });
    planner = addZone(planner, zoneId("duskwood"), { min: 25, max: 40 });
    const snapshot = JSON.stringify(planner);
    expect(getSuggestionContext(input({ planner, insertionIndex: 1 }))).toMatchObject({
      planningLevel: 35, planningWindow: { min: 35, max: 35 }, hasLevelConflict: true,
    });
    expect(JSON.stringify(planner)).toBe(snapshot);
  });

  it("ignores customs and skipped stops while retaining completed geographic context", () => {
    let planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    planner = setEntryStatus(planner, planner.entries[0].id, "completed");
    planner = addZone(planner, zoneId("westfall"), { min: 12, max: 55 });
    planner = setEntryStatus(planner, planner.entries[1].id, "skipped");
    planner = addEntry(planner, { kind: "custom", title: "Personal objective", targetLevel: { min: 50, max: 60 } });
    expect(getSuggestionContext(input({ planner, level: 10, insertionIndex: 3 }))).toMatchObject({
      planningLevel: 12, before: planner.entries[0],
    });
  });

  it("uses personal dungeon bounds but preserves unknown geographic travel", () => {
    const planner = addEntry(createBlankPlanner(), {
      kind: "dungeon", title: "Personal milestone", targetLevel: { min: 28, max: 32 },
    });
    const query = input({ planner, insertionIndex: 1 });
    expect(getSuggestionContext(query).planningLevel).toBe(32);
    const suggestion = rankZoneSuggestions(query, [zone("arathi-highlands")])[0];
    expect(suggestion.travel.incoming.difficulty).toBe("unknown");
    expect(suggestion.fit).toBe("unknown");
    expect(suggestion.label).toBe("Travel unverified");
  });

  it("does not use a completed following stop to limit future planning", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 10, max: 18 });
    planner = setEntryStatus(planner, planner.entries[0].id, "completed");
    expect(getSuggestionContext(input({ planner }))).toMatchObject({
      planningWindow: { min: 25, max: 28 }, hasLevelConflict: false,
    });
    expect(getSuggestionContext(input({ planner })).nextEntryLevel).toBeUndefined();
  });

  it("caps the window at 60 and uses existing insertion validation", () => {
    expect(getSuggestionContext(input({ level: 59 })).planningWindow).toEqual({ min: 59, max: 60 });
    for (const insertionIndex of [-1, 0.5, 1, Number.NaN]) {
      expect(() => getSuggestionContext(input({ insertionIndex }))).toThrow("insertion");
      expect(() => rankZoneSuggestions(input({ insertionIndex }), [])).toThrow("insertion");
    }
  });
});

describe("deterministic zone relevance", () => {
  it("puts current-level fits ahead of distant future, exhausted and unknown ranges", () => {
    const ranked = rankZoneSuggestions(input(), [
      fixture("early", 1, 12), fixture("later", 45, 55), fixture("unknown"), fixture("now", 24, 32),
    ]);
    expect(ranked[0]).toMatchObject({ zone: { id: "now" }, fit: "good", label: "Good next fit" });
    expect(ranked.find((item) => item.zone.id === "later")).toMatchObject({ fit: "later", label: "Later option" });
    expect(ranked.find((item) => item.zone.id === "early")).toMatchObject({ fit: "awkward", label: "Past suitable range" });
    expect(ranked.find((item) => item.zone.id === "unknown")).toMatchObject({ fit: "unknown", label: "Fit unverified" });
  });

  it("prefers a suitable fresh entry to the upper edge of an older overlapping range", () => {
    const ranked = rankZoneSuggestions(input({ level: 30 }), [
      fixture("old-wide-bracket", 10, 30), fixture("fresh-bracket", 30, 40),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual(["fresh-bracket", "old-wide-bracket"]);
    expect(ranked[0].score).toBe(0);
    expect(ranked[1].score).toBe(18);
    expect(ranked.every((item) => item.fit === "good")).toBe(true);
  });

  it("uses middle-insertion bounds to distinguish near-future options", () => {
    let planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 12, max: 25 });
    planner = addZone(planner, zoneId("duskwood"), { min: 27, max: 35 });
    const query = input({ planner, level: 12, insertionIndex: 1 });
    // Existing zone IDs let all candidates use the same actual travel graph.
    const near = zone("redridge-mountains", { min: 27, max: 35 });
    const justAfter = zone("elwynn-forest", { min: 28, max: 35 });
    const ranked = rankZoneSuggestions(query, [justAfter, near]);
    expect(ranked[0].zone.id).toBe(near.id);
    expect(ranked[0].reasons).toContain("Fits the next few planning levels");
    expect(ranked[1].reasons).toContain("Suitable from level 28");
  });

  it("lets nearby travel outrank a small recommended-entry advantage", () => {
    const planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    const ranked = rankZoneSuggestions(input({ planner, level: 14, insertionIndex: 1 }), [
      zone("darkshore", { min: 14, max: 24 }), zone("westfall", { min: 10, max: 20 }),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("westfall"), zoneId("darkshore")]);
    expect(ranked[0].travel.incoming.difficulty).toBe("easy");
    expect(ranked[1]).toMatchObject({ fit: "awkward", label: "Longer travel" });
    expect(ranked[1].travel.incoming.difficulty).toBe("long");
  });

  it("scores onward travel to the following stop, even when incoming costs tie", () => {
    let planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 12 });
    planner = addZone(planner, zoneId("burning-steppes"), { min: 50, max: 55 });
    const ranked = rankZoneSuggestions(input({ planner, level: 14, insertionIndex: 1 }), [
      zone("westfall", { min: 14, max: 25 }), zone("redridge-mountains", { min: 14, max: 25 }),
    ]);
    expect(ranked.map((item) => item.zone.id)).toEqual([zoneId("redridge-mountains"), zoneId("westfall")]);
    expect(ranked[0].travel.incoming.score).toBe(ranked[1].travel.incoming.score);
    expect(ranked[0].travel.outgoing!.score).toBeLessThan(ranked[1].travel.outgoing!.score!);
    expect(ranked[0].travel).toEqual(getInsertionTravel(planner, ranked[0].zone.id, 1, "Alliance"));
  });

  it("demotes a known faction mismatch but retains the full catalogue for explicit filters", () => {
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

  it("uses soft repeated-visit costs and still allows a return visit", () => {
    const planner = addZone(createBlankPlanner(), zoneId("westfall"), { min: 10, max: 18 });
    const catalogue = [zone("westfall", { min: 25, max: 35 }), zone("redridge-mountains", { min: 25, max: 35 })];
    const query = input({ planner, insertionIndex: 0 });
    const planned = rankZoneSuggestions(query, catalogue);
    expect(planned.map((item) => item.zone.id)).toEqual([zoneId("redridge-mountains"), zoneId("westfall")]);
    expect(planned[1]).toMatchObject({ fit: "awkward", label: "Already in route" });
    const completed = setEntryStatus(planner, planner.entries[0].id, "completed");
    const returnVisit = rankZoneSuggestions({ ...query, planner: completed }, catalogue).find((item) => item.zone.id === zoneId("westfall"))!;
    expect(returnVisit.label).toBe("Return visit");
    const skipped = setEntryStatus(planner, planner.entries[0].id, "skipped");
    const skippedSuggestion = rankZoneSuggestions({ ...query, planner: skipped }, catalogue).find((item) => item.zone.id === zoneId("westfall"))!;
    expect(skippedSuggestion.label).toBe("Good next fit");
    expect(addZone(planner, zoneId("westfall"), { min: 25, max: 40 }).entries).toHaveLength(2);
  });

  it("resolves legacy name-only visits and recomputes from changed route order/status", () => {
    let planner = addEntry(createBlankPlanner(), {
      kind: "zone", title: "Westfall", targetLevel: { min: 10, max: 18 },
    });
    planner = addZone(planner, zoneId("redridge-mountains"), { min: 18, max: 25 });
    const catalogue = [zone("westfall"), zone("darkshore")];
    const query = input({ planner, level: 12, insertionIndex: 2 });
    expect(rankZoneSuggestions(query, catalogue).find((item) => item.zone.id === zoneId("westfall"))?.reasons)
      .toContain("Already planned elsewhere in this route");
    expect(getSuggestionContext(query).planningLevel).toBe(25);
    const moved = moveEntry(planner, planner.entries[1].id, 0);
    expect(getSuggestionContext({ ...query, planner: moved }).planningLevel).toBe(18);
    const skipped = setEntryStatus(planner, planner.entries[1].id, "skipped");
    expect(getSuggestionContext({ ...query, planner: skipped }).planningLevel).toBe(18);
  });

  it("uses ASCII IDs for ties independent of input order or display names", () => {
    const catalogue = [fixture("z", 25, 35), fixture("a", 25, 35), fixture("A", 25, 35)];
    catalogue[0].name = "First alphabetically";
    const query = input();
    const expected = ["A", "a", "z"];
    expect(rankZoneSuggestions(query, catalogue).map((item) => item.zone.id)).toEqual(expected);
    expect(rankZoneSuggestions(query, [...catalogue].reverse()).map((item) => item.zone.id)).toEqual(expected);
    expect(rankZoneSuggestions(query, catalogue)).toEqual(rankZoneSuggestions(query, catalogue));
  });

  it("keeps unknown levels and travel explicit, with bounded nonzero uncertainty", () => {
    const blank = input();
    expect(rankZoneSuggestions(blank, [fixture("unknown")])[0]).toMatchObject({ score: 120, fit: "unknown" });
    const planner = addEntry(blank.planner, { kind: "dungeon", title: "Unverified milestone" });
    const query = { ...blank, planner, insertionIndex: 1 };
    const candidate = rankZoneSuggestions(query, [zone("duskwood", { min: 25, max: 35 })])[0];
    expect(candidate.score).toBe(30);
    expect(candidate.travel.incoming.score).toBeNull();
    const extreme = rankZoneSuggestions(input({ level: 60 }), [fixture("old", 1, 1)])[0];
    expect(extreme.score).toBe(266);
  });

  it("retains every catalogue destination and never rewrites plans or records", () => {
    const planner = addZone(createBlankPlanner(), zoneId("elwynn-forest"), { min: 1, max: 45 });
    const query = input({ planner, insertionIndex: 1 });
    const planSnapshot = JSON.stringify(planner);
    const catalogueSnapshot = JSON.stringify(zoneCatalogue);
    const ranked = rankZoneSuggestions(query);
    expect(ranked).toHaveLength(zoneCatalogue.length);
    expect(new Set(ranked.map((item) => item.zone.id)).size).toBe(zoneCatalogue.length);
    expect(JSON.stringify(planner)).toBe(planSnapshot);
    expect(JSON.stringify(zoneCatalogue)).toBe(catalogueSnapshot);
    expect(ranked.every((item) => Number.isFinite(item.score) && item.reasons.length > 0)).toBe(true);
  });

  it("treats the updated Riverglades range as a 35–45 planning fit", () => {
    const riverglades = getZone(zoneId("riverglades"))!;
    expect(riverglades.recommendedLevel).toEqual({ min: 35, max: 45 });
    const before = rankZoneSuggestions(input({ level: 34 }), [riverglades])[0];
    expect(before.reasons).toContain("Fits the next few planning levels");
    const atEntry = rankZoneSuggestions(input({ level: 35 }), [riverglades])[0];
    expect(atEntry.reasons).toContain("Fits the level 35 planning point");
    expect(atEntry.score).toBeLessThan(before.score);
    expect(rankZoneSuggestions(input({ level: 46 }), [riverglades])[0].label).toBe("Past suitable range");
  });
});

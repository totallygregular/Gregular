import { describe, expect, it } from "vitest";
import type { AcquisitionDataset, ItemRecord } from "./acquisitionTypes";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { createBlankAcquisition, addManualSource, addWishlistItem, resolveAcquisition, getQuestGoals, getDungeonGoals, updateWishlistEntry, validateAcquisition } from "./acquisition";
import { createGearSearchIndex, getGearLevelRange, searchGear, sortGearResults, type GearSearchOptions } from "./gearSearch";

// All test-only items below are deliberately synthetic, never shipped Forever records.
const evidence = { kind: "user-supplied" as const, note: "Synthetic test fixture only; not game content." };
const character = { level: 20, className: "Priest" };
function item(id: string, values: Partial<Record<"intellect" | "spirit" | "stamina", number>>, patch: Partial<ItemRecord> = {}): ItemRecord {
  return { id, name: id, quality: "rare", requiredLevel: 20, slot: "Hands", equipmentType: "Cloth", stats: [], numericStats: { values, completeness: "complete" }, classRestrictions: [], sourceIds: [], evidence, ...patch };
}
function dataset(items: ItemRecord[]): AcquisitionDataset {
  return { version: "synthetic-only-v1", reviewedAt: "2026-10-14", items, sources: [], quests: [], dungeons: [], npcs: [] };
}
const ids = (data: AcquisitionDataset, options: GearSearchOptions = {}) => searchGear(data, character, options).map((result) => result.item.id);
const selected = [{ key: "intellect" as const }, { key: "spirit" as const }];

describe("gear discovery", () => {
  const data = dataset([
    item("both", { intellect: 5, spirit: 8 }), item("intellect", { intellect: 6 }), item("spirit", { spirit: 9 }),
    item("zero", { intellect: 0 }), item("neither", { stamina: 10 }),
    item("partial", {}, { numericStats: { values: { intellect: 4 }, completeness: "partial" } }),
    item("unknown", {}, { numericStats: undefined }),
  ]);

  it("finds reviewed items by structured stat regardless of name", () => {
    expect(searchGear(acquisitionDataset, { ...character, level: 30 }, { stats: [{ key: "intellect" }] }).map((result) => result.item.gameId)).toEqual([250482, 273052]);
    const orb = searchGear(acquisitionDataset, character, { stats: selected, statMode: "all" })[0];
    expect(orb.item.gameId).toBe(273052);
    expect(orb.statMatch.matched).toEqual([{ key: "intellect", value: 2 }, { key: "spirit", value: 8 }]);
    expect(orb.reasons).toContain("2 of 2 selected stats meet the filters");
  });

  it("implements single, ANY and ALL criteria with explainable matching counts", () => {
    expect(ids(data, { stats: [{ key: "intellect" }] })).toEqual(["both", "intellect", "partial"]);
    expect(ids(data, { stats: selected, statMode: "any" })).toEqual(["both", "intellect", "spirit", "partial"]);
    expect(ids(data, { stats: selected, statMode: "all" })).toEqual(["both"]);
  });

  it("applies each numeric minimum to its own stat and treats zero as confirmed non-presence", () => {
    expect(ids(data, { stats: [{ key: "intellect", minimum: 5 }, { key: "spirit", minimum: 8 }], statMode: "all" })).toEqual(["both"]);
    expect(ids(data, { stats: [{ key: "intellect", minimum: 6 }, { key: "spirit", minimum: 9 }], statMode: "any" })).toEqual(["intellect", "spirit"]);
    expect(ids(data, { stats: [{ key: "intellect", minimum: 0 }] })).not.toContain("zero");
  });

  it("separates indeterminate records and never upgrades unknown data into a confirmed match", () => {
    const results = searchGear(data, character, { stats: selected, statMode: "all", includeIncomplete: true });
    expect(results.map((result) => [result.item.id, result.status])).toEqual([["both", "match"], ["partial", "unknown"], ["unknown", "unknown"]]);
    expect(results.find((result) => result.item.id === "partial")!.statMatch.unknownKeys).toEqual(["spirit"]);
    // A known failure makes ALL false even when a second field is unknown.
    expect(ids(data, { stats: [{ key: "intellect", minimum: 5 }, { key: "spirit" }], statMode: "all", includeIncomplete: true })).not.toContain("partial");
    // One known qualifying stat is enough to confirm ANY despite another unknown field.
    expect(searchGear(data, character, { stats: selected }).find((result) => result.item.id === "partial")?.status).toBe("match");
  });

  it("preserves conventional name, slot, rarity, method and manual type filters", () => {
    expect(ids(data, { name: "  INTELLECT  ", slot: "Hands", quality: "rare", equipmentTypes: ["Cloth"], method: "unknown" })).toEqual(["intellect"]);
    expect(ids(data, { equipmentTypes: ["Mail"] })).toEqual([]);
    const missing = dataset([item("missing-fields", { intellect: 5 }, { slot: undefined, equipmentType: undefined })]);
    expect(ids(missing, { equipmentTypes: ["Cloth"] })).toEqual([]);
    expect(searchGear(missing, character, { equipmentTypes: ["Cloth"], includeIncomplete: true })[0].status).toBe("unknown");
  });

  it("uses required level independently from source activity or incidental item level", () => {
    const levels = dataset([item("now", {}, { requiredLevel: 20 }), item("plus5", {}, { requiredLevel: 25 }), item("plus10", {}, { requiredLevel: 30 }), item("unknown", {}, { requiredLevel: undefined })]);
    expect(ids(levels, { level: { mode: "current" } })).toEqual(["now"]);
    expect(ids(levels, { level: { mode: "plus5" } })).toEqual(["now", "plus5"]);
    expect(ids(levels, { level: { mode: "plus10" } })).toEqual(["now", "plus10", "plus5"]);
    expect(ids(levels, { level: { mode: "custom", min: 21, max: 29 } })).toEqual(["plus5"]);
    expect(ids(levels, { level: { mode: "all" } })).toHaveLength(4);
    expect(searchGear(levels, character, { level: { mode: "current" }, includeIncomplete: true }).find((result) => result.item.id === "unknown")?.suitability.level).toBe("unknown");
    expect(getGearLevelRange(character, { level: { mode: "plus10" }, maxLevel: 22 })).toEqual({ max: 22 });
    expect(getGearLevelRange({ ...character, level: 58 }, { level: { mode: "plus5" } })).toEqual({ max: 60 });
    expect(getGearLevelRange({ ...character, level: 55 }, { level: { mode: "plus10" } })).toEqual({ max: 60 });
  });

  it("filters only established class restrictions without inventing armor/weapon proficiency", () => {
    const classes = dataset([
      item("priest", {}, { classRestrictions: ["Priest"], equipmentType: "Mail" }),
      item("warrior", {}, { classRestrictions: ["Warrior"] }), item("unknown", {}),
    ]);
    expect(ids(classes)).toEqual(["priest", "unknown"]);
    expect(ids(classes, { classMode: "confirmed-only" })).toEqual(["priest"]);
    expect(ids(classes, { classMode: "all" })).toEqual(["priest", "unknown", "warrior"]);
    expect(searchGear(classes, { level: 20, className: "Warrior" }).map((result) => result.item.id)).toEqual(["unknown", "warrior"]);
    const priest = searchGear(classes, character)[0];
    expect(priest.suitability.equipmentRules).toBe("unknown");
    expect(searchGear(classes, character).find((result) => result.item.id === "unknown")?.suitability.classRestriction).toBe("unknown");
  });

  it("sorts deterministically without adding arbitrary stats into a power score", () => {
    const sorting = dataset([item("b", { intellect: 100 }, { name: "Same", quality: "epic", requiredLevel: 19 }), item("a", { intellect: 1, spirit: 1 }, { name: "Same", requiredLevel: 12 }), item("c", {}, { name: "Alpha", requiredLevel: undefined, quality: "unknown", numericStats: undefined })]);
    const options: GearSearchOptions = { stats: selected, statMode: "any", includeIncomplete: true };
    expect(ids(sorting, options)).toEqual(["a", "b", "c"]); // Two desired stats outrank a huge unrelated sum.
    expect(ids(sorting, { sort: "name" })).toEqual(["c", "a", "b"]);
    expect(ids(sorting, { sort: "level" })).toEqual(["a", "b", "c"]);
    expect(ids(sorting, { sort: "quality" })).toEqual(["b", "a", "c"]);
    expect(ids(sorting, { sort: "stat", sortStat: "intellect" })).toEqual(["b", "a", "c"]);
    const forward = searchGear(sorting, character, options).map((result) => result.item.id);
    expect(searchGear({ ...sorting, items: [...sorting.items].reverse() }, character, options).map((result) => result.item.id)).toEqual(forward);
    expect(searchGear(sorting, character, { sort: "route" }, new Map([["a", 1], ["b", 0]])).map((result) => result.item.id)).toEqual(["b", "a", "c"]);
  });

  it("prefers fewer unresolved selected stats when confirmed ANY matches have the same count", () => {
    const coverage = dataset([
      item("a-unknown", { intellect: 5 }, { numericStats: { values: { intellect: 5 }, completeness: "partial" } }),
      item("z-known", { intellect: 5, spirit: 0 }),
    ]);
    const results = searchGear(coverage, character, { stats: selected, statMode: "any", sort: "match" }, new Map([["a-unknown", 0], ["z-known", 2]]));
    expect(results.map((result) => result.item.id)).toEqual(["z-known", "a-unknown"]);
    expect(results.map((result) => result.status)).toEqual(["match", "match"]);
    expect(results.map((result) => result.statMatch.matched.length)).toEqual([1, 1]);
    expect(results.map((result) => result.statMatch.unknownKeys.length)).toEqual([0, 1]);
  });

  it("reuses the index without profile mutation and resolves catalogue/source changes explicitly", () => {
    const state = addWishlistItem(createBlankAcquisition(), "forever:item:273052", "forever:source:273052-shade");
    const before = structuredClone(state);
    const resolved = resolveAcquisition(state, acquisitionDataset);
    const index = createGearSearchIndex(resolved);
    const result = searchGear(index, character, { stats: [{ key: "healingPower", minimum: 10 }], method: "dungeon" });
    expect(result.map((result) => result.item.gameId)).toEqual([273052]);
    expect(getDungeonGoals(state, resolved)[0].items[0].item?.id).toBe(result[0].item.id);
    const questState = addWishlistItem(state, "forever:item:270030", "forever:source:270030-book-of-ur");
    expect(getQuestGoals(questState, acquisitionDataset, character.level)[0].desiredItems.map((item) => item.gameId)).toContain(270030);
    const changed = updateWishlistEntry(questState, state.wishlist[0].id, { status: "acquired" });
    expect(changed.dungeonProgress).toEqual([]);
    expect(state).toEqual(before);
    const altered = { ...resolved, sources: resolved.sources.map((source) => source.id === "forever:source:273052-shade" ? { ...source, method: "unknown" as const } : source) };
    expect(searchGear(createGearSearchIndex(altered), character, { name: "Ponderous", method: "dungeon" })).toEqual([]);
  });

  it("rejects invalid numeric filters instead of silently satisfying them", () => {
    expect(() => searchGear(data, character, { stats: [{ key: "intellect", minimum: NaN }] })).toThrow();
    expect(() => searchGear(data, character, { stats: [{ key: "intellect", minimum: -1 }] })).toThrow();
    expect(() => searchGear(data, character, { level: { mode: "custom", min: 30, max: 10 } })).toThrow();
  });

  it("preserves optional personal source-location roles through validation and JSON round trips", () => {
    const state = addManualSource(createBlankAcquisition(), "forever:item:273052", { method: "vendor", label: "Synthetic personal vendor", zoneId: "westfall", locationRole: "vendor", availability: "unknown" });
    expect(state.manualSources[0].locationRole).toBe("vendor");
    expect(state.manualSources[0].evidence.kind).toBe("user-supplied");
    expect(validateAcquisition(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const legacy = { ...state, manualSources: state.manualSources.map(({ locationRole: _role, ...source }) => source) };
    expect(validateAcquisition(legacy).manualSources[0].locationRole).toBeUndefined();
    expect(() => addManualSource(createBlankAcquisition(), "forever:item:273052", { method: "vendor", label: "Wrong relationship", locationRole: "dungeon-entrance", availability: "unknown" })).toThrow(/does not match/);
    expect(() => validateAcquisition({ ...state, manualSources: [{ ...state.manualSources[0], locationRole: "guessed-location" }] })).toThrow(/location role/);
  });

  it("measures a deterministic 30,000-record synthetic index without a fragile timing limit", () => {
    const synthetic = dataset(Array.from({ length: 30_000 }, (_, index) => item(`synthetic:${String(index).padStart(5, "0")}`, { intellect: index % 12, spirit: index % 15 }, { requiredLevel: 1 + index % 60 })));
    const start = performance.now();
    const index = createGearSearchIndex(synthetic);
    const indexed = performance.now();
    const any = searchGear(index, character, { stats: [{ key: "intellect", minimum: 5 }, { key: "spirit", minimum: 8 }], statMode: "any" });
    const anyDone = performance.now();
    const all = searchGear(index, character, { stats: [{ key: "intellect", minimum: 5 }, { key: "spirit", minimum: 8 }], statMode: "all" });
    const allDone = performance.now();
    const sorted = sortGearResults(any, { sort: "stat", sortStat: "intellect" });
    const sortDone = performance.now();
    expect(index.entries).toHaveLength(30_000);
    expect(any).toHaveLength(23_000);
    expect(all).toHaveLength(8_500);
    expect(sorted[0].stats.values.intellect).toBe(11);
    console.info("SYNTHETIC_GEAR_BENCHMARK", JSON.stringify({ items: 30_000, indexMs: +(indexed - start).toFixed(1), anyMs: +(anyDone - indexed).toFixed(1), allMs: +(allDone - anyDone).toFixed(1), sortMs: +(sortDone - allDone).toFixed(1), anyMatches: any.length, allMatches: all.length }));
  });
});

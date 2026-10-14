import { describe, expect, it } from "vitest";
import type { ItemRecord } from "./acquisitionTypes";
import { addManualSource, addWishlistItem, createBlankAcquisition, validateAcquisition, validateAcquisitionDataset } from "./acquisition";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { getStatValue, normaliseItemStats, statPresets } from "./itemStats";
import { addCharacter, createProfile, setCharacterAcquisition, setCharacterPlanner, setNotes } from "./domain";
import { addEntry } from "./planner";
import { BrowserProfileRepository, profileStorageKey, type StorageLike } from "./profileRepository";
import { parseProfileTransfer } from "./profileTransfer";

// Synthetic local test records only. These are never distributed as Forever content.
function fixture(stats: ItemRecord["stats"] = []): ItemRecord {
  return {
    id: "user:test-stats", name: "Synthetic test item", quality: "unknown", stats,
    sourceIds: [], classRestrictions: [], evidence: { kind: "user-supplied", note: "Synthetic test fixture only." },
  };
}

describe("numeric item stat contract", () => {
  it("normalises deliberate basic aliases and spelling without changing display or provenance", () => {
    const item = fixture([{ label: "  INTELLECT ", value: "+5" }, { label: "Armour", value: "23" }, { label: "mp5", value: "2" }]);
    const original = structuredClone(item);
    const stats = normaliseItemStats(item);
    expect(stats.values).toEqual({ intellect: 5, armor: 23, manaPer5: 2 });
    expect(stats.completeness).toBe("partial");
    expect(stats.evidence).toBe(item.evidence);
    expect(item).toEqual(original);
  });

  it("distinguishes explicit zero, missing partial data, and complete absence", () => {
    const partial = normaliseItemStats({ ...fixture(), numericStats: { values: { intellect: 0 }, completeness: "partial" } });
    expect(getStatValue(partial, "intellect")).toBe(0);
    expect(getStatValue(partial, "spirit")).toBeUndefined();
    const complete = normaliseItemStats({ ...fixture(), numericStats: { values: {}, completeness: "complete" } });
    expect(getStatValue(complete, "spirit")).toBe(0);
    expect(normaliseItemStats(fixture()).completeness).toBe("unknown");
  });

  it("does not double-count equivalent labels and rejects conflicting aliases", () => {
    expect(normaliseItemStats(fixture([{ label: "Intellect", value: "+5" }, { label: "INT", value: "5" }])).values.intellect).toBe(5);
    const disputed = normaliseItemStats(fixture([{ label: "Intellect", value: "+5" }, { label: "int", value: "+6" }]));
    expect(disputed.values.intellect).toBeUndefined();
    expect(disputed.conflictingKeys).toEqual(["intellect"]);
    expect(disputed.unmapped).toHaveLength(2);
  });

  it("retains unsupported descriptive effects, combined bonuses, proc text and ambiguous healing", () => {
    const effects = [
      { label: "Healing", value: "+11" },
      { label: "+healing done", value: "+11" },
      { label: "Spell power", value: "+7" },
      { label: "Intellect", value: "5 to 10" },
      { label: "Intellect", value: "+5 while casting" },
      { label: "Health regeneration", value: "2" },
      { label: "Chance on hit", value: "Restores 20 mana" },
    ];
    const stats = normaliseItemStats(fixture(effects));
    expect(stats.values).toEqual({});
    expect(stats.unmapped).toEqual(effects);
    expect(stats.completeness).toBe("unknown");
  });

  it("keeps spell percentages distinct from unsupported unitless ratings", () => {
    const stats = normaliseItemStats(fixture([
      { label: "Spell hit", value: "+1%" },
      { label: "Spell crit", value: "2.5%" },
      { label: "Spell hit rating", value: "5" },
      { label: "Spell critical strike chance", value: "3" },
    ]));
    expect(stats.values).toEqual({ spellHitPercent: 1, spellCritPercent: 2.5 });
    expect(stats.unmapped).toHaveLength(2);
  });

  it("uses explicit reviewed fields without merging an alternative tooltip/display value", () => {
    const item = { ...fixture([{ label: "Intellect", value: "+99" }]), numericStats: { values: { intellect: 5 }, completeness: "partial" as const } };
    expect(normaliseItemStats(item).values.intellect).toBe(5);
    const orb = acquisitionDataset.items.find((item) => item.gameId === 273052)!;
    expect(orb.stats).toContainEqual({ label: "Healing", value: "+11" });
    expect(normaliseItemStats(orb).values.healingPower).toBe(11);
    expect(orb.numericStats?.mappingNote).toContain("for this reviewed item only");
    expect(normaliseItemStats(orb).evidence.fields?.stats).toContain("https://foreverdb.net/item/273052");
  });

  it("preserves validated numeric profiles in manual imports with user provenance", () => {
    const item = { ...fixture(), numericStats: { values: { intellect: 0, spirit: 8 }, completeness: "partial" as const, mappingNote: "Recorded by the player." } };
    const state = validateAcquisition({ ...createBlankAcquisition(), manualItems: [item] });
    expect(state.manualItems[0]).toEqual(item);
    expect(validateAcquisition(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(() => validateAcquisition({ ...state, manualItems: [{ ...item, evidence: { kind: "reviewed-forever", note: "Impersonation" } }] })).toThrow(/user-supplied/);
  });

  it("rejects unsupported numeric fields, nonfinite values and invalid completeness", () => {
    const data = (numericStats: unknown) => ({ ...acquisitionDataset, items: [{ ...acquisitionDataset.items[0], numericStats, sourceIds: [] }], sources: [] });
    for (const profile of [
      { values: { retailRating: 5 }, completeness: "partial" },
      { values: { intellect: NaN }, completeness: "partial" },
      { values: { intellect: Infinity }, completeness: "partial" },
      { values: { intellect: "5" }, completeness: "partial" },
      { values: {}, completeness: "assumed" },
    ]) expect(() => validateAcquisitionDataset(data(profile))).toThrow();
  });

  it("keeps editable presets independent without suggesting weights or priorities", () => {
    const preset = statPresets.find((preset) => preset.id === "healing")!;
    const selection = [...preset.stats];
    selection.splice(selection.indexOf("spirit"), 1);
    expect(selection).not.toContain("spirit");
    expect(preset.stats).toContain("spirit");
    expect(preset).not.toHaveProperty("weights");
  });

  it("retains additive fields through character isolation, import, reload, exact backup restore and stale-tab protection", async () => {
    let profile = addCharacter(createProfile("Synthetic discovery persistence"), {
      name: "Fixture character", className: "Priest", race: "Human", faction: "Alliance", plannedSpec: "", level: 20, status: "planned",
    });
    profile = addCharacter(profile, { ...profile.characters[0], name: "Independent fixture" });
    const firstId = profile.characters[0].id;
    const untouched = profile.characters[1];
    let state = validateAcquisition({ ...createBlankAcquisition(), manualItems: [{ ...fixture(), numericStats: { values: { intellect: 0, spirit: 8 }, completeness: "partial" } }] });
    state = addManualSource(state, state.manualItems[0].id, { method: "vendor", label: "Synthetic personal vendor", zoneId: "westfall", locationRole: "vendor", availability: "unknown" });
    state = addWishlistItem(state, state.manualItems[0].id, state.manualSources[0].id);
    profile = setCharacterAcquisition(profile, firstId, state);
    profile = setCharacterPlanner(profile, firstId, addEntry(profile.characters[0].planner, { kind: "zone", title: "Westfall", recordId: "westfall", status: "planned" }));
    expect(profile.characters[1]).toBe(untouched);
    const exported = JSON.stringify(profile);
    expect(parseProfileTransfer(exported).profile).toEqual(profile);
    const values = new Map<string, string>();
    const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    const repository = new BrowserProfileRepository(storage);
    const preview = await repository.prepareImport(exported);
    expect(preview.ok).toBe(true);
    expect((await repository.applyTransfer(preview.preparation!.token)).ok).toBe(true);
    const loaded = (await repository.load(profile.username)).profile!;
    expect(loaded.characters).toEqual(profile.characters);
    const staleTab = new BrowserProfileRepository(storage);
    const stale = (await staleTab.load(profile.username)).profile!;
    expect((await repository.save(setNotes(loaded, firstId, "Preserved backup note"))).ok).toBe(true);
    const rawBeforeReplacement = storage.getItem(profileStorageKey(profile.username));
    const replacement = await repository.prepareImport(exported);
    expect((await repository.applyTransfer(replacement.preparation!.token)).ok).toBe(true);
    expect((await staleTab.save(stale)).ok).toBe(false);
    const backup = await repository.readBackup(profile.username);
    expect(backup.raw).toBe(rawBeforeReplacement);
    expect(backup.profile?.characters[0].acquisition).toEqual(state);
    const restore = await repository.prepareRestore(profile.username);
    expect((await repository.applyTransfer(restore.preparation!.token)).ok).toBe(true);
    const restored = (await new BrowserProfileRepository(storage).load(profile.username)).profile!;
    expect(restored.characters[0].notes).toBe("Preserved backup note");
    expect(restored.characters[0].acquisition).toEqual(state);
    expect(restored.characters[0].planner).toEqual(profile.characters[0].planner);
    expect(restored.characters[1]).toEqual(untouched);
  });
});

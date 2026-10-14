import { describe, expect, it } from "vitest";
import {
  addIdentifiedWishlistItem, addManualItem, addManualSource, addWishlistItem,
  createBlankAcquisition, getDungeonGoals, getQuestGoals, getSelectedSource, resolveAcquisition, searchItems,
  updateManualItem, updateWishlistEntry, validateAcquisition, validateAcquisitionDataset,
} from "./acquisition";
import type { AcquisitionDataset, CraftingRecipe, ItemRecord } from "./acquisitionTypes";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { getCraftingGoals, setCraftingGoal } from "./crafting";
import { addCharacter, createCharacter, createProfile, migrateProfile, setCharacterAcquisition, validateProfile } from "./domain";
import { FOREVER_VARIANT, parseItemIdentity, type ItemIdentity } from "./itemIdentity";
import { BrowserProfileRepository, type StorageLike } from "./profileRepository";
import { parseProfileTransfer } from "./profileTransfer";

const identity: ItemIdentity = { gameVariant: FOREVER_VARIANT, gameId: 999991 };
const emptyData: AcquisitionDataset = { version: "test-only-empty", reviewedAt: "2026-10-14", items: [], sources: [], quests: [], dungeons: [], npcs: [] };
// Synthetic snapshot record tests resolution only; never added to shipped data.
const reviewed: ItemRecord = {
  id: "forever:item:999991", gameId: 999991, gameVariant: FOREVER_VARIANT,
  name: "Synthetic reviewed record", quality: "rare", requiredLevel: 20,
  stats: [], numericStats: { values: { intellect: 8 }, completeness: "partial" },
  classRestrictions: [], sourceIds: ["test-reviewed-source"],
  evidence: { kind: "reviewed-forever", note: "Synthetic unit-test fixture only." },
};
const futureData: AcquisitionDataset = {
  ...emptyData, version: "test-only-future", items: [reviewed],
  sources: [{ id: "test-reviewed-source", itemIds: [reviewed.id], method: "quest", label: "Synthetic reward", questId: "test-quest", availability: "unknown", evidence: reviewed.evidence }],
  quests: [{ id: "test-quest", name: "Synthetic quest", prerequisiteIds: [], prerequisiteStatus: "unknown", followUpIds: [], rewardItemIds: [reviewed.id], availability: "unknown", evidence: reviewed.evidence }],
  recipes: [{ id: "test-recipe", name: "Synthetic recipe", itemId: reviewed.id, sourceIds: [], materials: [], materialCompleteness: "unknown", evidence: reviewed.evidence }],
};

describe("personal game item identities", () => {
  it("wishlists an unknown game ID without inventing metadata or acquisition", () => {
    const state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity);
    expect(state.manualItems[0]).toMatchObject({ id: "user:item:forever:999991", ...identity, name: "Forever item #999991", quality: "unknown", stats: [], sourceIds: [], classRestrictions: [], evidence: { kind: "user-supplied" } });
    expect(state.manualItems[0].requiredLevel).toBeUndefined();
    expect(state.manualItems[0].numericStats).toBeUndefined();
    expect(state.manualItems[0].slot).toBeUndefined();
    expect(state.wishlist[0]).toMatchObject({ itemId: state.manualItems[0].id, ...identity, status: "wanted" });
    expect(searchItems(state, emptyData)).toHaveLength(1);
    expect(searchItems(state, emptyData, { maxLevel: 60 })).toEqual([]);
    expect(getSelectedSource(state.wishlist[0], resolveAcquisition(state, emptyData))).toBeUndefined();
  });
  it("reuses a reviewed record without copying facts into the character", () => {
    const parsed = parseItemIdentity("https://www.wowhead.com/forever/item=273052/ponderous-orb");
    const state = addIdentifiedWishlistItem(createBlankAcquisition(), acquisitionDataset, parsed, { notes: "Personal note" });
    expect(state.manualItems).toEqual([]);
    expect(state.wishlist[0]).toMatchObject({ itemId: "forever:item:273052", gameId: 273052, gameVariant: FOREVER_VARIANT, notes: "Personal note" });
    expect(resolveAcquisition(state, acquisitionDataset).items.find((entry) => entry.id === state.wishlist[0].itemId)?.name).toBe("Ponderous Orb");
  });
  it("stores explicit missing-field observations separately for a reviewed identity", () => {
    const before = JSON.stringify(futureData);
    const state = addIdentifiedWishlistItem(createBlankAcquisition(), futureData, identity, {
      name: "", slot: "Hands", equipmentType: "Cloth",
      numericStats: { values: { stamina: 0 }, completeness: "partial" },
      stats: [{ label: "Personal effect", value: "Observed effect" }], notes: "My observation",
    });
    expect(state.wishlist[0].itemId).toBe(reviewed.id);
    expect(state.manualItems).toHaveLength(1);
    expect(state.manualItems[0]).toMatchObject({ ...identity, name: "Forever item #999991", slot: "Hands", equipmentType: "Cloth", quality: "unknown", numericStats: { values: { stamina: 0 } }, evidence: { kind: "user-supplied" }, sourceIds: [] });
    expect(state.manualItems[0].requiredLevel).toBeUndefined();
    expect(state.manualItems[0].numericStats?.values.intellect).toBeUndefined();
    const resolved = resolveAcquisition(state, futureData);
    expect(resolved.items).toHaveLength(1);
    expect(resolved.items[0]).toMatchObject({ id: reviewed.id, catalogueReferenceId: reviewed.id, name: reviewed.name, numericStats: reviewed.numericStats, evidence: reviewed.evidence });
    expect(resolved.items[0].slot).toBeUndefined();
    expect(JSON.stringify(futureData)).toBe(before);
    expect(validateAcquisition(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it("rejects numeric/link duplicates, existing personal aliases, and catalogue aliases", () => {
    const state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity);
    expect(() => addIdentifiedWishlistItem(state, emptyData, parseItemIdentity("https://foreverdb.net/item/999991"))).toThrow("already");
    const legacy = validateAcquisition({ ...createBlankAcquisition(), manualItems: [{ ...state.manualItems[0], id: "user:item:legacy" }] });
    const reused = addIdentifiedWishlistItem(legacy, emptyData, identity);
    expect(reused.manualItems).toHaveLength(1);
    expect(reused.wishlist[0].itemId).toBe("user:item:legacy");
    const future = addIdentifiedWishlistItem(legacy, futureData, identity);
    expect(future.wishlist[0].itemId).toBe("user:item:legacy");
    expect(() => addWishlistItem(future, reviewed.id, undefined, futureData)).toThrow("already");
    expect(() => validateAcquisition({ ...state, manualItems: [...state.manualItems, { ...state.manualItems[0], id: "user:item:alias" }] })).toThrow("duplicate game");
    expect(() => validateAcquisition({ ...state, wishlist: [...state.wishlist, { ...state.wishlist[0], id: "another-entry", itemId: reviewed.id }] })).toThrow("duplicate game");
  });
  it("validates variant and identity consistency on import", () => {
    const state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity);
    expect(() => validateAcquisition({ ...state, manualItems: [{ ...state.manualItems[0], gameVariant: "wow-retail" }] })).toThrow("Only WoW Forever");
    expect(() => validateAcquisition({ ...state, wishlist: [{ ...state.wishlist[0], gameId: 999992 }] })).toThrow("conflicts");
    expect(() => validateAcquisition({ ...state, manualItems: [{ ...state.manualItems[0], gameId: undefined }] })).toThrow("requires");
    expect(() => addIdentifiedWishlistItem(state, emptyData, { gameVariant: "wow-classic", gameId: 123 } as unknown as ItemIdentity)).toThrow("Only WoW Forever");
    expect(() => validateAcquisitionDataset({ ...futureData, items: [reviewed, { ...reviewed, id: "different-local-id" }] })).toThrow("duplicate game");
  });
  it("preserves explicit zero and unknown numeric facts separately from descriptive effects", () => {
    let state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity, {
      name: "My observed item", slot: "Hands", quality: "uncommon", requiredLevel: 12,
      numericStats: { values: { intellect: 0, spirit: 3 }, completeness: "partial" },
      stats: [{ label: "Personal effect", value: "My observed effect" }], classRestrictions: ["Priest"],
      referenceUrl: "https://foreverdb.net/item/999991", notes: "Verify with friends",
    });
    expect(state.manualItems[0].numericStats?.values.intellect).toBe(0);
    expect(state.manualItems[0].numericStats?.values.stamina).toBeUndefined();
    expect(state.manualItems[0].evidence.kind).toBe("user-supplied");
    const id = state.manualItems[0].id;
    state = updateManualItem(state, id, { name: "Edited personal name", numericStats: { values: { spirit: 4 }, completeness: "partial" } });
    expect(state.manualItems[0]).toMatchObject({ id, ...identity, name: "Edited personal name", classRestrictions: ["Priest"], stats: [{ label: "Personal effect", value: "My observed effect" }] });
    expect(state.manualItems[0].requiredLevel).toBeUndefined();
    expect(state.wishlist[0].notes).toBe("Verify with friends");
    expect(() => updateManualItem(state, id, { name: "Invalid reidentity", gameId: 999992 })).toThrow("cannot be changed");
    expect(() => updateManualItem(state, id, { name: "Bad statistic", numericStats: { values: { intellect: Infinity }, completeness: "partial" } })).toThrow("unsupported");
    const legacy = addManualItem(createBlankAcquisition(), { name: "ID-less personal item" });
    expect(updateManualItem(legacy, legacy.manualItems[0].id, { name: "Still editable" }).manualItems[0].name).toBe("Still editable");
  });
  it("keeps personal acquisition explicit and location role unknown", () => {
    let state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity);
    state = addManualSource(state, state.manualItems[0].id, { method: "dungeon", label: "Ask about this source", dungeonId: "removed-dungeon", zoneName: "Personal region", availability: "unknown" });
    state = updateWishlistEntry(state, state.wishlist[0].id, { preferredSourceId: state.manualSources[0].id });
    const selected = getSelectedSource(state.wishlist[0], resolveAcquisition(state, emptyData));
    expect(selected).toMatchObject({ method: "dungeon", dungeonId: "removed-dungeon", evidence: { kind: "user-supplied" }, availability: "unknown" });
    expect(selected?.locationRole).toBeUndefined();
  });
  it("preserves bounded descriptive effects without converting them into statistics", () => {
    for (const length of [101, 1000]) {
      const effect = "A".repeat(length);
      const state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity, { stats: [{ label: "Personal effect", value: effect }] });
      expect(state.manualItems[0].stats[0].value).toBe(effect);
      expect(state.manualItems[0].numericStats).toBeUndefined();
      expect(validateAcquisition(JSON.parse(JSON.stringify(state)))).toEqual(state);
    }
    expect(() => addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity, { stats: [{ label: "Personal effect", value: "A".repeat(1001) }] })).toThrow("1000");
  });
  it("coalesces later reviewed identities while preserving personal facts and source links", () => {
    let state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity, { name: "Personal remembered name", numericStats: { values: { intellect: 3 }, completeness: "partial" } });
    const personalId = state.manualItems[0].id;
    state = addManualSource(state, personalId, { method: "world", label: "Personal theory", availability: "unknown" });
    state = updateWishlistEntry(state, state.wishlist[0].id, { preferredSourceId: state.manualSources[0].id });
    const before = JSON.stringify(state), resolved = resolveAcquisition(state, futureData);
    expect(resolved.items).toHaveLength(1);
    expect(resolved.items[0]).toMatchObject({ id: personalId, catalogueReferenceId: reviewed.id, name: reviewed.name, numericStats: reviewed.numericStats, evidence: { kind: "reviewed-forever" } });
    expect(state.manualItems[0].name).toBe("Personal remembered name");
    expect(state.manualItems[0].numericStats?.values.intellect).toBe(3);
    expect(resolved.items[0].sourceIds).toContain(state.manualSources[0].id);
    expect(resolved.sources[0].itemIds).toEqual([personalId]);
    expect(resolved.quests[0].rewardItemIds).toEqual([personalId]);
    expect(resolved.recipes?.[0].itemId).toBe(personalId);
    expect(getSelectedSource(state.wishlist[0], resolved)?.id).toBe(state.manualSources[0].id);
    expect(JSON.stringify(state)).toBe(before);
  });
  it("retains presentation identity when a reviewed snapshot disappears or changes local IDs", () => {
    const state = addIdentifiedWishlistItem(createBlankAcquisition(), futureData, identity);
    const absent = resolveAcquisition(state, emptyData).items[0];
    expect(absent).toMatchObject({ id: reviewed.id, ...identity, name: "Forever item #999991", quality: "unknown" });
    expect(absent.numericStats).toBeUndefined();
    const newer = resolveAcquisition(state, { ...futureData, version: "test-next", items: [{ ...reviewed, id: "snapshot-v2-item" }] });
    expect(newer.items[0].id).toBe(reviewed.id);
    expect(newer.items[0].catalogueReferenceId).toBe("snapshot-v2-item");
  });
  it("keeps quest, dungeon and crafting goals connected after reviewed snapshot coalescing", () => {
    let state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity);
    state = updateWishlistEntry(state, state.wishlist[0].id, { preferredSourceId: "test-reviewed-source" });
    const personalId = state.manualItems[0].id;
    expect(getQuestGoals(state, futureData)[0].desiredItems[0].id).toBe(personalId);
    const dungeonData: AcquisitionDataset = {
      ...futureData,
      sources: [{ ...futureData.sources[0], method: "dungeon", questId: undefined, dungeonId: "test-dungeon" }],
      dungeons: [{ id: "test-dungeon", name: "Synthetic dungeon", evidence: reviewed.evidence }],
    };
    expect(getDungeonGoals(state, dungeonData)[0].items[0].item?.id).toBe(personalId);
    const craftData: AcquisitionDataset = { ...futureData, sources: [{ ...futureData.sources[0], method: "craft", questId: undefined, recipeId: "test-recipe" }] };
    const character = createCharacter({ name: "Crafter", race: "Troll", className: "Priest", faction: "Horde", plannedSpec: "", level: 20, status: "leveling" });
    const goals = getCraftingGoals({ ...character, acquisition: state }, craftData);
    expect(goals).toHaveLength(1);
    expect(goals[0].item?.id).toBe(personalId);
    expect(goals[0].recipe?.itemId).toBe(personalId);
    expect(goals[0].wishlistEntry?.id).toBe(state.wishlist[0].id);
  });
  it("prefers a saved reviewed wishlist reference when a legacy personal alias also exists", () => {
    let state = addManualItem(createBlankAcquisition(), { name: "Older personal alias", ...identity });
    const personalId = state.manualItems[0].id;
    state = addManualSource(state, personalId, { method: "world", label: "Personal source", availability: "unknown" });
    state = addWishlistItem(state, reviewed.id, state.manualSources[0].id, futureData);
    const resolved = resolveAcquisition(state, futureData);
    expect(resolved.items).toHaveLength(1);
    expect(resolved.items[0]).toMatchObject({ id: reviewed.id, catalogueReferenceId: reviewed.id, name: reviewed.name });
    expect(getSelectedSource(state.wishlist[0], resolved)?.id).toBe(state.manualSources[0].id);
    expect(state.manualItems[0]).toMatchObject({ id: personalId, name: "Older personal alias" });
    const missingSnapshot = resolveAcquisition(state, emptyData);
    expect(missingSnapshot.items[0]).toMatchObject({ id: reviewed.id, name: "Older personal alias", evidence: { kind: "user-supplied" } });
    expect(getSelectedSource(state.wishlist[0], missingSnapshot)?.id).toBe(state.manualSources[0].id);
  });
  it("resolves personal recipe outputs through a legacy personal identity alias without rewriting saved recipes", () => {
    let state = addManualItem(createBlankAcquisition(), { name: "Older crafted item", ...identity });
    const personalId = state.manualItems[0].id;
    const personalRecipe: CraftingRecipe = {
      id: "user:recipe:legacy", name: "Personal recipe", itemId: personalId,
      sourceIds: [], materials: [], materialCompleteness: "unknown",
      evidence: { kind: "user-supplied", note: "Personal recipe fixture" },
    };
    state = addManualSource(state, personalId, { method: "craft", label: "Personal craft", recipeId: personalRecipe.id, availability: "unknown" });
    state = addWishlistItem(state, reviewed.id, state.manualSources[0].id, futureData);
    const base = createCharacter({ name: "Crafter", race: "Troll", className: "Priest", faction: "Horde", plannedSpec: "", level: 20, status: "leveling" });
    const character = { ...base, acquisition: state, crafting: { ...base.crafting, manualRecipes: [personalRecipe] } };
    const before = JSON.stringify(character);
    for (const data of [futureData, emptyData]) {
      const derived = getCraftingGoals(character, data);
      expect(derived).toHaveLength(1);
      expect(derived[0]).toMatchObject({ derived: true, recipe: { id: personalRecipe.id, itemId: reviewed.id }, item: { id: reviewed.id }, wishlistEntry: { itemId: reviewed.id } });
      const explicit = getCraftingGoals(setCraftingGoal(character, personalRecipe.id, { notes: "Preserve goal", recipeStatus: "learned" }), data);
      expect(explicit[0]).toMatchObject({ derived: false, item: { id: reviewed.id }, wishlistEntry: { itemId: reviewed.id }, goal: { notes: "Preserve goal", recipeStatus: "learned" } });
    }
    expect(character.crafting.manualRecipes[0].itemId).toBe(personalId);
    expect(JSON.stringify(character)).toBe(before);
  });
});

describe("portable personal item records", () => {
  it("round-trips identity, notes, numeric zero and sources through save/reload and JSON", async () => {
    let profile = addCharacter(createProfile("Identity persistence"), { name: "Planner", race: "Troll", className: "Priest", faction: "Horde", plannedSpec: "Holy", level: 24, status: "leveling" });
    let state = addIdentifiedWishlistItem(createBlankAcquisition(), emptyData, identity, { name: "Personal item", numericStats: { values: { intellect: 0 }, completeness: "partial" }, notes: "Keep notes" });
    state = addManualSource(state, state.manualItems[0].id, { method: "craft", label: "Ask a crafter", recipeId: "unknown-recipe", availability: "unknown" });
    profile = setCharacterAcquisition(profile, profile.characters[0].id, state);
    const values = new Map<string, string>();
    const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    const repository = new BrowserProfileRepository(storage);
    expect((await repository.save(profile)).ok).toBe(true);
    const loaded = (await repository.load(profile.username)).profile!;
    expect(loaded.characters[0].acquisition).toEqual(state);
    expect(parseProfileTransfer(JSON.stringify(loaded)).profile).toEqual(loaded);
    expect(validateProfile(loaded)).toEqual(loaded);
    expect(migrateProfile(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
    // Older schema-4 records omitted additive identity fields; preserve that shape.
    const older = structuredClone(profile);
    delete older.characters[0].acquisition.manualItems[0].gameVariant;
    delete older.characters[0].acquisition.wishlist[0].gameVariant;
    delete older.characters[0].acquisition.wishlist[0].gameId;
    expect(migrateProfile(older)).toEqual(older);
  });
});

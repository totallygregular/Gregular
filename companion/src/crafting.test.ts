import { describe, expect, it } from "vitest";
import { addCharacter, createCharacter, createProfile, validateProfile } from "./domain";
import { addWishlistItem, removeWishlistItem, updateWishlistEntry, validateAcquisitionDataset } from "./acquisition";
import { addManualCraftingGoal, createBlankCrafting, getCraftingGoals, removeProfession, setCraftingGoal, setCraftingMaterial, setProfession, validateCrafting, validateCraftingRecipe } from "./crafting";
import type { AcquisitionDataset, AcquisitionEvidence, CraftingRecipe } from "./acquisitionTypes";

const evidence: AcquisitionEvidence = { kind: "reviewed-forever", note: "Synthetic relationship fixture, never presented as game data." };
const recipe: CraftingRecipe = { id: "fixture:recipe:boots", itemId: "fixture:item:boots", name: "Fixture boots recipe", profession: "Blacksmithing", requiredSkill: 35, sourceIds: [], materials: [{ materialId: "fixture:material:copper", quantity: 2 }], materialCompleteness: "complete", evidence };
const dataset: AcquisitionDataset = { version: "fixture", reviewedAt: "2026-10-14", items: [{ id: recipe.itemId, name: "Fixture boots", quality: "rare", sourceIds: ["fixture:source:craft", "fixture:source:quest"], stats: [], classRestrictions: [], evidence }], sources: [{ id: "fixture:source:craft", method: "craft", label: "Fixture craft", recipeId: recipe.id, availability: "unknown", evidence }, { id: "fixture:source:quest", method: "quest", questId: "fixture:quest", label: "Fixture quest", availability: "unknown", evidence }], quests: [], dungeons: [], npcs: [], recipes: [recipe], materials: [{ id: "fixture:material:copper", name: "Fixture copper", evidence }] };
function character() { return createCharacter({ name: "Crafter", race: "Troll", className: "Priest", faction: "Horde", plannedSpec: "", level: 12, status: "leveling" }); }
function wishlisted() { const result = character(); return { ...result, acquisition: addWishlistItem(result.acquisition, recipe.itemId, "fixture:source:craft") }; }

describe("shared crafting reference records", () => {
  it("keeps recipe/item/material/source relationships through dataset validation", () => {
    const checked = validateAcquisitionDataset(dataset);
    expect(checked.recipes).toEqual([recipe]);
    expect(checked.materials).toEqual(dataset.materials);
    expect(checked.sources[0].recipeId).toBe(recipe.id);
  });
  it("does not turn missing recipe facts into verified absence", () => {
    const { profession: _profession, requiredSkill: _skill, ...partial } = recipe;
    const checked = validateCraftingRecipe({ ...partial, materials: [], materialCompleteness: "unknown" });
    expect(checked.profession).toBeUndefined();
    expect(checked.requiredSkill).toBeUndefined();
    expect(checked.materialCompleteness).toBe("unknown");
    expect(checked.sourceIds).toEqual([]);
  });
  it.each([0, -1, 1.5, 1000001, Number.MAX_SAFE_INTEGER])("rejects invalid material quantities %s", (quantity) => {
    expect(() => validateCraftingRecipe({ ...recipe, materials: [{ materialId: "fixture:material:copper", quantity }] })).toThrow("whole number");
  });
  it("rejects duplicate material identities and unsafe provenance URLs", () => {
    expect(() => validateCraftingRecipe({ ...recipe, materials: [...recipe.materials, recipe.materials[0]] })).toThrow("duplicate");
    expect(() => validateCraftingRecipe({ ...recipe, evidence: { ...evidence, url: "javascript:alert(1)" } })).toThrow("HTTP");
  });
});

describe("character crafting planning", () => {
  it("derives one goal from a selected source without writing duplicate personal state", () => {
    const initial = wishlisted();
    const first = getCraftingGoals(initial, dataset);
    const repeated = getCraftingGoals(initial, dataset);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ derived: true, recipe, wishlistEntry: { status: "wanted" }, goal: { recipeStatus: "unknown", crafted: false, crafter: "undecided" } });
    expect(repeated).toEqual(first);
    expect(initial.crafting).toEqual(createBlankCrafting());
    expect(initial.crafting.professions).toEqual([]);
  });
  it("allows alternative source selection while preserving all source relationships", () => {
    const initial = wishlisted();
    const changed = { ...initial, acquisition: updateWishlistEntry(initial.acquisition, initial.acquisition.wishlist[0].id, { preferredSourceId: "fixture:source:quest" }) };
    expect(getCraftingGoals(changed, dataset)).toHaveLength(0);
    expect(dataset.items[0].sourceIds).toEqual(["fixture:source:craft", "fixture:source:quest"]);
  });
  it("never derives a goal from a source belonging to another item or a conflicting recipe", () => {
    const initial = character();
    const unrelated = { ...initial, acquisition: addWishlistItem(initial.acquisition, "fixture:item:unrelated", "fixture:source:craft") };
    const extraItem = { ...dataset.items[0], id: "fixture:item:unrelated", sourceIds: [] };
    expect(getCraftingGoals(unrelated, { ...dataset, items: [...dataset.items, extraItem] })).toEqual([]);
    expect(unrelated.acquisition.wishlist[0].preferredSourceId).toBe("fixture:source:craft");
    expect(getCraftingGoals(wishlisted(), { ...dataset, recipes: [{ ...recipe, itemId: "fixture:item:unrelated" }] })).toEqual([]);
  });
  it("keeps recipe learning, material preparation, crafting and item acquisition independent", () => {
    const initial = wishlisted();
    let changed = setCraftingGoal(initial, recipe.id, { recipeStatus: "learned", crafter: "other", crafterName: "Friend" });
    expect(getCraftingGoals(changed, dataset)[0].goal.crafted).toBe(false);
    changed = setCraftingMaterial(changed, recipe.id, "fixture:material:copper", 2);
    expect(getCraftingGoals(changed, dataset)[0]).toMatchObject({ goal: { crafted: false, recipeStatus: "learned" }, wishlistEntry: { status: "wanted" }, materials: [{ collected: 2 }] });
    changed = setCraftingGoal(changed, recipe.id, { crafted: true });
    expect(changed.acquisition.wishlist[0].status).toBe("wanted");
    changed = { ...changed, acquisition: updateWishlistEntry(changed.acquisition, changed.acquisition.wishlist[0].id, { status: "acquired" }) };
    expect(getCraftingGoals(changed, dataset)[0]).toMatchObject({ goal: { crafted: true, crafter: "other", crafterName: "Friend" }, wishlistEntry: { status: "acquired" } });
    expect(initial.crafting.goals).toEqual([]);
  });
  it("persists only one goal when material and recipe progress are edited repeatedly", () => {
    let changed = setCraftingGoal(wishlisted(), recipe.id, { recipeStatus: "needed" });
    changed = setCraftingMaterial(changed, recipe.id, "fixture:material:copper", 1);
    changed = setCraftingMaterial(changed, recipe.id, "fixture:material:copper", 2);
    expect(changed.crafting.goals).toHaveLength(1);
    expect(getCraftingGoals(changed, dataset)).toHaveLength(1);
    expect(changed.crafting.goals[0].materialsCollected).toEqual([{ materialId: "fixture:material:copper", quantity: 2 }]);
  });
  it("retains personal progress after wishlist removal or reference catalogue churn", () => {
    let changed = setCraftingMaterial(wishlisted(), recipe.id, "fixture:material:copper", 1);
    changed = setCraftingGoal(changed, recipe.id, { notes: "Keep this plan", crafter: "self" });
    changed = { ...changed, acquisition: removeWishlistItem(changed.acquisition, changed.acquisition.wishlist[0].id) };
    expect(getCraftingGoals(changed, dataset)[0]).toMatchObject({ wishlistEntry: undefined, goal: { notes: "Keep this plan" } });
    const removed = { ...dataset, recipes: [], materials: [], items: [], sources: [] };
    expect(getCraftingGoals(changed, removed)[0]).toMatchObject({ recipe: undefined, item: undefined, goal: { recipeId: recipe.id, materialsCollected: [{ quantity: 1 }] } });
    expect(validateCrafting(changed.crafting)).toEqual(changed.crafting);
  });
  it("shows missing recipe/material references without inventing known facts", () => {
    const missingRecipe = getCraftingGoals(wishlisted(), { ...dataset, recipes: [] })[0];
    expect(missingRecipe.recipe).toBeUndefined();
    expect(missingRecipe.item?.id).toBe(recipe.itemId);
    const missingMaterial = getCraftingGoals(wishlisted(), { ...dataset, materials: [] })[0];
    expect(missingMaterial.materials[0]).toEqual({ requirement: recipe.materials[0], material: undefined, collected: 0 });
  });
  it("records professions without asserting a game cap or requiring one to plan another crafter", () => {
    const initial = wishlisted();
    let changed = setProfession(initial, { id: "blacksmithing", name: "Blacksmithing", category: "primary", skill: 35 });
    changed = setProfession(changed, { id: "blacksmithing", name: "Blacksmithing", category: "primary", skill: 0 });
    changed = setProfession(changed, { id: "fishing", name: "Fishing", category: "secondary" });
    expect(changed.crafting.professions).toHaveLength(2);
    expect(changed.crafting.professions[1].skill).toBeUndefined();
    changed = removeProfession(changed, "blacksmithing");
    expect(changed.acquisition.wishlist).toEqual(initial.acquisition.wishlist);
    expect(() => setProfession(changed, { id: "bad", name: "Bad", category: "primary", skill: -1 })).toThrow("whole number");
  });
  it.each([-1, 0.1, 1000001])("rejects invalid collected counts %s", (count) => {
    expect(() => setCraftingMaterial(wishlisted(), recipe.id, "fixture:material:copper", count)).toThrow("whole number");
  });
});

describe("manual crafting fallback", () => {
  it("accepts maximum-length item and profession labels without producing an unsavable source", () => {
    const profile = addCharacter(createProfile("Boundary"), { name: "Planner", race: "Troll", className: "Priest", faction: "Horde", plannedSpec: "", level: 12, status: "leveling" });
    const updated = addManualCraftingGoal(profile.characters[0], { name: "I".repeat(200), profession: "P".repeat(80) });
    expect(updated.acquisition.manualSources[0].label).toHaveLength(200);
    expect(validateProfile({ ...profile, characters: [updated] }).characters[0]).toEqual(updated);
  });
  it("creates user-authored shared graph records and preserves unspecified fields as unknown", () => {
    const changed = addManualCraftingGoal(character(), { name: "My future crafted item", notes: "Ask a friend" });
    const [display] = getCraftingGoals(changed, dataset);
    expect(display).toMatchObject({ goal: { tracked: true, notes: "Ask a friend", crafter: "undecided", crafted: false }, wishlistEntry: { status: "wanted" }, recipe: { materials: [], materialCompleteness: "unknown", evidence: { kind: "user-supplied" } } });
    expect(display.recipe?.profession).toBeUndefined();
    expect(display.recipe?.requiredSkill).toBeUndefined();
    expect(changed.acquisition.manualSources[0].recipeId).toBe(display.recipe?.id);
    expect(changed.acquisition.wishlist[0].itemId).toBe(display.recipe?.itemId);
  });
  it("shares material identities while keeping collected quantities per goal", () => {
    let changed = addManualCraftingGoal(character(), { name: "First personal goal", profession: "Tailoring", materials: [{ name: "My material", quantity: 20 }], materialCompleteness: "complete" });
    changed = addManualCraftingGoal(changed, { name: "Second personal goal", materials: [{ name: "My material", quantity: 5 }] });
    expect(changed.crafting.manualMaterials).toHaveLength(1);
    const materialId = changed.crafting.manualMaterials[0].id;
    changed = setCraftingMaterial(changed, changed.crafting.manualRecipes[0].id, materialId, 12);
    const goals = getCraftingGoals(changed, dataset);
    expect(goals[0].materials[0]).toMatchObject({ collected: 12, requirement: { quantity: 20 } });
    expect(goals[1].materials[0]).toMatchObject({ collected: 0, requirement: { quantity: 5 } });
    expect(goals[0].recipe?.materialCompleteness).toBe("complete");
    expect(goals[1].recipe?.materialCompleteness).toBe("partial");
  });
  it("rejects duplicate manual material rows and unsafe URLs before modifying original state", () => {
    const initial = character();
    expect(() => addManualCraftingGoal(initial, { name: "Goal", materials: [{ name: "Cloth", quantity: 2 }, { name: "cloth", quantity: 3 }] })).toThrow("duplicate");
    expect(() => addManualCraftingGoal(initial, { name: "Goal", referenceUrl: "https://name:password@example.org" })).toThrow("credentials");
    expect(initial.crafting).toEqual(createBlankCrafting());
    expect(initial.acquisition.wishlist).toEqual([]);
  });
});

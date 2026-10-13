import { describe, expect, it } from "vitest";
import { addCharacter, addObjective, createProfile, migrateProfile, setCharacterCrafting, setCharacterPlanner, setNotes, validateProfile } from "./domain";
import { addManualCraftingGoal, createBlankCrafting, getCraftingGoals, setCraftingGoal, setCraftingMaterial, setProfession } from "./crafting";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { addEntry } from "./planner";
import { recordDungeonRun, setQuestComplete } from "./acquisition";
import { BrowserProfileRepository, profileReplacementBackupKey, profileStorageKey, profileV1BackupKey, profileV2BackupKey, profileV3BackupKey, type StorageLike } from "./profileRepository";
import { parseProfileTransfer } from "./profileTransfer";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
function originalProfile() {
  let profile = addCharacter(createProfile("Crafting keeper"), { name: "Planner", race: "Troll", className: "Priest", faction: "Horde", plannedSpec: "Holy", level: 24, status: "leveling" });
  const id = profile.characters[0].id;
  profile = addObjective(profile, id, "Keep previous objective");
  profile = setNotes(profile, id, "Keep notes\n  exact spacing.  ");
  profile = setCharacterPlanner(profile, id, addEntry(profile.characters[0].planner, { kind: "custom", title: "Keep route", status: "completed", notes: "Route note" }));
  const character = profile.characters[0];
  return { ...profile, characters: [{ ...character, acquisition: recordDungeonRun(setQuestComplete(character.acquisition, "unresolved:quest", true), "unresolved:dungeon") }] };
}
function oldProfile(version: 1 | 2 | 3) {
  const profile = originalProfile();
  return { ...profile, schemaVersion: version, characters: profile.characters.map(({ crafting: _crafting, acquisition, planner, ...character }) => ({ ...character, ...(version >= 2 ? { planner } : {}), ...(version >= 3 ? { acquisition } : {}) })) };
}
function richProfile() {
  const profile = originalProfile();
  let character = addManualCraftingGoal(profile.characters[0], { name: "Personal tailoring plan", recipeName: "My personal recipe", profession: "Tailoring", requiredSkill: 40, materials: [{ name: "User-authored cloth", quantity: 20 }, { name: "User-authored thread", quantity: 5 }], notes: "Preserve goal note", referenceUrl: "https://example.org/my-notes", materialCompleteness: "complete", specialRequirements: "Ask about a workbench" });
  const recipe = character.crafting.manualRecipes[0];
  character = setProfession(character, { id: "tailoring", name: "Tailoring", category: "primary", skill: 42 });
  character = setProfession(character, { id: "fishing", name: "Fishing", category: "secondary" });
  character = setCraftingGoal(character, recipe.id, { recipeStatus: "learned", crafter: "other", crafterName: "Friend", crafted: true });
  character = setCraftingMaterial(character, recipe.id, recipe.materials[0].materialId, 12);
  return { ...profile, characters: [character] };
}

describe("schema 4 crafting migration", () => {
  it.each([1, 2, 3] as const)("migrates v%s read-only without losing IDs, notes or supported progress", (version) => {
    const previous = oldProfile(version), raw = JSON.stringify(previous, null, 2);
    const migrated = migrateProfile(JSON.parse(raw));
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.characters[0].crafting).toEqual(createBlankCrafting());
    expect(migrated.characters[0]).toMatchObject({ id: previous.characters[0].id, notes: previous.characters[0].notes, objectives: previous.characters[0].objectives });
    if (version >= 2) expect(migrated.characters[0].planner).toEqual(previous.characters[0].planner);
    if (version >= 3) expect(migrated.characters[0].acquisition).toEqual(previous.characters[0].acquisition);
    expect(JSON.stringify(previous, null, 2)).toBe(raw);
    expect(parseProfileTransfer(raw).sourceSchemaVersion).toBe(version);
    expect(validateProfile(migrated)).toEqual(migrated);
  });
  it.each([1, 2, 3] as const)("retains the exact v%s JSON once before its first migrated save", async (version) => {
    const previous = oldProfile(version), raw = JSON.stringify(previous, null, 2), storage = new MemoryStorage();
    storage.setItem(profileStorageKey(previous.username), raw);
    const repository = new BrowserProfileRepository(storage), loaded = await repository.load(previous.username);
    expect(loaded.mode).toBe("ready");
    expect(loaded.message).toContain("backed up");
    expect(storage.values.size).toBe(1);
    expect((await repository.save(loaded.profile!)).ok).toBe(true);
    const backupKey = [profileV1BackupKey, profileV2BackupKey, profileV3BackupKey][version - 1](previous.username);
    expect(storage.getItem(backupKey)).toBe(raw);
    const saved = (await repository.load(previous.username)).profile!;
    expect((await repository.save(setNotes(saved, saved.characters[0].id, "Later note"))).ok).toBe(true);
    expect(storage.getItem(backupKey)).toBe(raw);
  });
  it("refuses v3 replacement when its migration backup fails and preserves an existing backup", async () => {
    const previous = oldProfile(3), raw = JSON.stringify(previous), storage = new MemoryStorage();
    storage.setItem(profileStorageKey(previous.username), raw);
    let repository = new BrowserProfileRepository(storage);
    let loaded = (await repository.load(previous.username)).profile!;
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => { if (key === profileV3BackupKey(previous.username)) throw new Error("quota"); write(key, value); };
    expect((await repository.save(loaded)).ok).toBe(false);
    expect(storage.getItem(profileStorageKey(previous.username))).toBe(raw);
    storage.setItem = write;
    storage.setItem(profileV3BackupKey(previous.username), "Earlier exact backup");
    repository = new BrowserProfileRepository(storage);
    loaded = (await repository.load(previous.username)).profile!;
    expect((await repository.save(loaded)).ok).toBe(true);
    expect(storage.getItem(profileV3BackupKey(previous.username))).toBe("Earlier exact backup");
  });
});

describe("portable and isolated crafting progress", () => {
  it("round-trips all recipe/material/crafter state and keeps finished item ownership separate", async () => {
    const profile = richProfile(), parsed = parseProfileTransfer(JSON.stringify(profile));
    expect(parsed.sourceSchemaVersion).toBe(4);
    expect(parsed.profile).toEqual(profile);
    expect(parsed.summary).toMatchObject({ professions: 2, craftingGoals: 1, wishlistEntries: 1, questGoals: 1, dungeonGoals: 1 });
    const repository = new BrowserProfileRepository(new MemoryStorage());
    const preview = await repository.prepareImport(JSON.stringify(profile));
    expect(preview.ok).toBe(true);
    expect((await repository.applyTransfer(preview.preparation!.token)).ok).toBe(true);
    const restored = (await repository.load(profile.username)).profile!;
    expect(restored.characters).toEqual(profile.characters);
    const [goal] = getCraftingGoals(restored.characters[0], acquisitionDataset);
    expect(goal).toMatchObject({ goal: { crafted: true, crafter: "other", crafterName: "Friend", recipeStatus: "learned" }, wishlistEntry: { status: "wanted" }, materials: [{ collected: 12 }, { collected: 0 }] });
    expect(restored.characters[0].acquisition.manualSources[0].recipeId).toBe(goal.recipe?.id);
  });
  it("preserves crafting progress when restoring the reviewed replacement backup", async () => {
    const profile = richProfile(), storage = new MemoryStorage(), repository = new BrowserProfileRepository(storage);
    const saved = await repository.save(profile);
    const before = storage.getItem(profileStorageKey(profile.username));
    const replacement = { ...saved.profile!, characters: [] };
    const preview = await repository.prepareImport(JSON.stringify(replacement));
    expect((await repository.applyTransfer(preview.preparation!.token)).ok).toBe(true);
    expect(storage.getItem(profileReplacementBackupKey(profile.username))).toBe(before);
    const restore = await repository.prepareRestore(profile.username);
    expect(restore.preparation?.summary.craftingGoals).toBe(1);
    expect((await repository.applyTransfer(restore.preparation!.token)).ok).toBe(true);
    expect((await repository.load(profile.username)).profile?.characters).toEqual(profile.characters);
  });
  it("rejects stale tabs during v3 migration and normal v4 crafting edits", async () => {
    const previous = oldProfile(3), storage = new MemoryStorage();
    storage.setItem(profileStorageKey(previous.username), JSON.stringify(previous));
    const first = new BrowserProfileRepository(storage), second = new BrowserProfileRepository(storage);
    const one = (await first.load(previous.username)).profile!, two = (await second.load(previous.username)).profile!;
    const crafting = richProfile().characters[0].crafting;
    expect((await first.save(setCharacterCrafting(one, one.characters[0].id, crafting))).ok).toBe(true);
    const rejected = await second.save(setCharacterCrafting(two, two.characters[0].id, crafting));
    expect(rejected.ok).toBe(false);
    expect(rejected.message).toContain("another tab");
    const a = (await first.load(previous.username)).profile!, b = (await second.load(previous.username)).profile!;
    expect((await first.save(setCharacterCrafting(a, a.characters[0].id, createBlankCrafting()))).ok).toBe(true);
    expect((await second.save(b)).ok).toBe(false);
  });
  it("keeps professions and material counts isolated between characters", () => {
    let profile = addCharacter(richProfile(), { name: "Other", race: "Human", className: "Mage", faction: "Alliance", plannedSpec: "", level: 1, status: "planned" });
    const other = profile.characters[1];
    profile = setCharacterCrafting(profile, profile.characters[0].id, createBlankCrafting());
    expect(profile.characters[1]).toBe(other);
    expect(other.crafting).toEqual(createBlankCrafting());
    expect(other.acquisition.wishlist).toEqual([]);
  });
  it("preserves unresolved recipes and material progress even without a receiving catalogue", () => {
    const profile = richProfile(), goal = profile.characters[0].crafting.goals[0];
    const state = { ...profile.characters[0].crafting, manualRecipes: [], manualMaterials: [], goals: [{ ...goal, recipeId: "removed:recipe" }] };
    const changed = setCharacterCrafting(profile, profile.characters[0].id, state);
    const parsed = parseProfileTransfer(JSON.stringify(changed));
    expect(parsed.profile.characters[0].crafting).toEqual(state);
  });
  it("rejects malformed duplicate goals and negative counts without changing storage or backup", async () => {
    const profile = richProfile(), character = profile.characters[0], storage = new MemoryStorage(), repository = new BrowserProfileRepository(storage);
    await repository.save(profile);
    const before = new Map(storage.values);
    for (const crafting of [{ ...character.crafting, goals: [...character.crafting.goals, character.crafting.goals[0]] }, { ...character.crafting, goals: [{ ...character.crafting.goals[0], materialsCollected: [{ materialId: "missing:material", quantity: -1 }] }] }]) {
      const prepared = await repository.prepareImport(JSON.stringify({ ...profile, characters: [{ ...character, crafting }] }));
      expect(prepared.ok).toBe(false);
      expect(storage.values).toEqual(before);
    }
  });
});

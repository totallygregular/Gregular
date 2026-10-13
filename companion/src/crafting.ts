import type { Character } from "./domain";
import { resolveAcquisition, validateReferenceUrl } from "./acquisition";
import type {
  AcquisitionDataset, AcquisitionEvidence, CharacterCrafting,
  CharacterCraftingGoal, CharacterProfession, CraftingGoal, CraftingMaterial,
  CraftingRecipe, ManualCraftingDraft, RecipeMaterialRequirement,
} from "./acquisitionTypes";

export class CraftingValidationError extends Error {
  constructor(message: string) { super(message); this.name = "CraftingValidationError"; }
}
const invalid = (message: string): never => { throw new CraftingValidationError(message); };
const ID = /^[a-zA-Z0-9][a-zA-Z0-9:._/\-]{0,159}$/;
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 200, empty = false): string {
  if (typeof value !== "string" || (!empty && !value.trim()) || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) return invalid(`${label} must contain ${empty ? "at most" : "1 to"} ${max} characters without control characters.`);
  return empty ? value : value.trim();
}
function ref(value: unknown): string {
  if (typeof value !== "string" || !ID.test(value) || ["__proto__", "constructor", "prototype"].includes(value)) return invalid("Crafting record ID is invalid.");
  return value;
}
function integer(value: unknown, label: string, min = 0): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > 1000000) return invalid(`${label} must be a whole number from ${min} to 1000000.`);
  return value as number;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") return invalid(`${label} must be true or false.`);
  return value;
}
function choice<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) return invalid(`${label} is invalid.`);
  return value as T;
}
function array(value: unknown, label: string, max = 1000): unknown[] {
  if (!Array.isArray(value) || value.length > max) return invalid(`${label} must be a list of at most ${max} entries.`);
  return value;
}
function unique<T>(values: T[], key: (value: T) => string, label: string): T[] {
  if (new Set(values.map((value) => key(value).toLowerCase())).size !== values.length) return invalid(`${label} contains duplicate IDs.`);
  return values;
}
function evidence(value: unknown): AcquisitionEvidence {
  const entry = object(value, "Crafting provenance");
  const fields = entry.fields === undefined ? undefined : Object.entries(object(entry.fields, "Field provenance"));
  if (fields && fields.length > 40) return invalid("Too many field provenance entries.");
  return {
    kind: choice(entry.kind, ["reviewed-forever", "user-supplied"], "Provenance kind"),
    note: text(entry.note, "Provenance note", 5000, true),
    ...(entry.url === undefined ? {} : { url: validateReferenceUrl(entry.url) }),
    ...(entry.reviewedAt === undefined ? {} : { reviewedAt: text(entry.reviewedAt, "Review date", 40) }),
    ...(fields === undefined ? {} : { fields: Object.fromEntries(fields.map(([key, value]) => [ref(key), text(value, "Field provenance", 2000)])) }),
  };
}
function requirement(value: unknown, collected = false): RecipeMaterialRequirement {
  const entry = object(value, "Material requirement");
  return { materialId: ref(entry.materialId), quantity: integer(entry.quantity, collected ? "Materials collected" : "Material quantity", collected ? 0 : 1) };
}
export function validateCraftingMaterial(value: unknown): CraftingMaterial {
  const entry = object(value, "Crafting material");
  return { id: ref(entry.id), name: text(entry.name, "Material name"), ...(entry.gameId === undefined ? {} : { gameId: integer(entry.gameId, "Material game ID", 1) }), evidence: evidence(entry.evidence) };
}
export function validateCraftingRecipe(value: unknown): CraftingRecipe {
  const entry = object(value, "Crafting recipe");
  return {
    id: ref(entry.id), name: text(entry.name, "Recipe name"), itemId: ref(entry.itemId), ...(entry.profession === undefined ? {} : { profession: text(entry.profession, "Profession", 80) }),
    ...(entry.requiredSkill === undefined ? {} : { requiredSkill: integer(entry.requiredSkill, "Required skill") }),
    ...(entry.recipeItemId === undefined ? {} : { recipeItemId: ref(entry.recipeItemId) }),
    sourceIds: unique(array(entry.sourceIds, "Recipe sources", 200).map(ref), (value) => value, "Recipe sources"),
    materials: unique(array(entry.materials, "Recipe materials", 100).map((value) => requirement(value)), (value) => value.materialId, "Recipe materials"),
    materialCompleteness: choice(entry.materialCompleteness, ["complete", "partial", "unknown"], "Material completeness"),
    ...(entry.specialRequirements === undefined ? {} : { specialRequirements: text(entry.specialRequirements, "Special requirements", 2000) }),
    evidence: evidence(entry.evidence),
  };
}
/** An empty unknown requirement list never claims that a recipe requires no materials. */
export function validateCraftingCatalogue(value: Record<string, unknown>): Pick<AcquisitionDataset, "recipes" | "materials"> {
  return {
    ...(value.recipes === undefined ? {} : { recipes: unique(array(value.recipes, "Recipes", 20000).map(validateCraftingRecipe), (entry) => entry.id, "Recipes") }),
    ...(value.materials === undefined ? {} : { materials: unique(array(value.materials, "Materials", 20000).map(validateCraftingMaterial), (entry) => entry.id, "Materials") }),
  };
}
function profession(value: unknown): CharacterProfession {
  const entry = object(value, "Profession");
  return { id: ref(entry.id), name: text(entry.name, "Profession name", 80), category: choice(entry.category, ["primary", "secondary"], "Profession category"), ...(entry.skill === undefined ? {} : { skill: integer(entry.skill, "Profession skill") }) };
}
function goal(value: unknown): CharacterCraftingGoal {
  const entry = object(value, "Crafting goal");
  return {
    id: ref(entry.id), recipeId: ref(entry.recipeId), recipeStatus: choice(entry.recipeStatus, ["unknown", "needed", "learned"], "Recipe status"),
    materialsCollected: unique(array(entry.materialsCollected, "Collected materials", 100).map((value) => requirement(value, true)), (value) => value.materialId, "Collected materials"),
    crafted: boolean(entry.crafted, "Crafting completion"), crafter: choice(entry.crafter, ["self", "other", "undecided"], "Crafter choice"),
    crafterName: text(entry.crafterName, "Crafter name", 100, true), notes: text(entry.notes, "Crafting notes", 5000, true), tracked: boolean(entry.tracked, "Crafting tracking"),
  };
}
function manual<T extends { id: string; evidence: AcquisitionEvidence }>(entry: T): T {
  if (!entry.id.startsWith("user:") || entry.evidence.kind !== "user-supplied") return invalid("Personal crafting records must have a user ID and user-supplied provenance.");
  return entry;
}
export function createBlankCrafting(): CharacterCrafting {
  return { professions: [], goals: [], manualRecipes: [], manualMaterials: [] };
}
/** Unknown references survive catalogue removal and profile transfer. */
export function validateCrafting(value: unknown): CharacterCrafting {
  const entry = object(value, "Character crafting plan");
  const goals = unique(array(entry.goals, "Crafting goals").map(goal), (value) => value.recipeId, "Crafting goals");
  unique(goals, (value) => value.id, "Crafting goal entries");
  return {
    professions: unique(array(entry.professions, "Professions", 40).map(profession), (value) => value.id, "Professions"),
    goals,
    manualRecipes: unique(array(entry.manualRecipes, "Personal recipes").map((value) => manual(validateCraftingRecipe(value))), (value) => value.id, "Personal recipes"),
    manualMaterials: unique(array(entry.manualMaterials, "Personal materials").map((value) => manual(validateCraftingMaterial(value))), (value) => value.id, "Personal materials"),
  };
}
function withCrafting(character: Character, state: CharacterCrafting): Character {
  return { ...character, crafting: validateCrafting(state) };
}
export function setProfession(character: Character, value: CharacterProfession): Character {
  const checked = profession(value);
  return withCrafting(character, { ...character.crafting, professions: character.crafting.professions.some((entry) => entry.id === checked.id) ? character.crafting.professions.map((entry) => entry.id === checked.id ? checked : entry) : [...character.crafting.professions, checked] });
}
export function removeProfession(character: Character, professionId: string): Character {
  return withCrafting(character, { ...character.crafting, professions: character.crafting.professions.filter((entry) => entry.id !== professionId) });
}
function blankGoal(recipeId: string): CharacterCraftingGoal {
  return { id: ref(recipeId), recipeId, recipeStatus: "unknown", materialsCollected: [], crafted: false, crafter: "undecided", crafterName: "", notes: "", tracked: false };
}
export type CraftingGoalPatch = Partial<Pick<CharacterCraftingGoal, "recipeStatus" | "crafted" | "crafter" | "crafterName" | "notes" | "tracked">>;
export function setCraftingGoal(character: Character, recipeId: string, patch: CraftingGoalPatch): Character {
  const existing = character.crafting.goals.find((entry) => entry.recipeId === recipeId) ?? blankGoal(recipeId);
  const checked = goal({ ...existing, tracked: true, ...patch, id: existing.id, recipeId: existing.recipeId, materialsCollected: existing.materialsCollected });
  return withCrafting(character, { ...character.crafting, goals: character.crafting.goals.some((entry) => entry.recipeId === recipeId) ? character.crafting.goals.map((entry) => entry.recipeId === recipeId ? checked : entry) : [...character.crafting.goals, checked] });
}
export function setCraftingMaterial(character: Character, recipeId: string, materialId: string, count: number): Character {
  const updated = setCraftingGoal(character, recipeId, {});
  return withCrafting(updated, { ...updated.crafting, goals: updated.crafting.goals.map((entry) => entry.recipeId === recipeId ? { ...entry, materialsCollected: [...entry.materialsCollected.filter((material) => material.materialId !== materialId), requirement({ materialId, quantity: count }, true)] } : entry) });
}
export function untrackCraftingGoal(character: Character, recipeId: string): Character {
  return setCraftingGoal(character, recipeId, { tracked: false });
}
/** References and per-goal progress are merged for display; no persistent goals are duplicated. */
export function getCraftingGoals(character: Character, dataset: AcquisitionDataset): CraftingGoal[] {
  const resolved = resolveAcquisition(character.acquisition, dataset);
  const recipes = new Map([...(dataset.recipes ?? []), ...character.crafting.manualRecipes].map((entry) => [entry.id, entry]));
  const materials = new Map([...(dataset.materials ?? []), ...character.crafting.manualMaterials].map((entry) => [entry.id, entry]));
  const items = new Map(resolved.items.map((entry) => [entry.id, entry]));
  const sources = new Map(resolved.sources.map((entry) => [entry.id, entry]));
  const goals = new Map(character.crafting.goals.map((entry) => [entry.recipeId, entry]));
  for (const entry of character.acquisition.wishlist) {
    if (entry.status === "dismissed") continue;
    const item = items.get(entry.itemId);
    // Keep unresolved saved choices, but never turn another item's source into
    // this item's plan after an import or catalogue relationship change.
    if (entry.preferredSourceId && !item?.sourceIds.includes(entry.preferredSourceId)) continue;
    const sourceIds = entry.preferredSourceId ? [entry.preferredSourceId] : item?.sourceIds ?? [];
    for (const id of sourceIds) {
      const source = sources.get(id);
      const recipe = source?.recipeId ? recipes.get(source.recipeId) : undefined;
      if (source?.method === "craft" && source.recipeId && (!recipe || recipe.itemId === entry.itemId) && !goals.has(source.recipeId)) goals.set(source.recipeId, blankGoal(source.recipeId));
    }
  }
  return [...goals.values()].map((goal): CraftingGoal => {
    const recipe = recipes.get(goal.recipeId);
    const recipeSource = resolved.sources.find((source) => source.recipeId === goal.recipeId);
    const sourceItemId = recipeSource?.itemIds?.[0] ?? resolved.items.find((item) => recipeSource && item.sourceIds.includes(recipeSource.id))?.id;
    const itemId = recipe?.itemId ?? sourceItemId;
    return { goal, recipe, item: itemId ? items.get(itemId) : undefined, wishlistEntry: character.acquisition.wishlist.find((entry) => entry.itemId === itemId), materials: (recipe?.materials ?? []).map((requirement) => ({ requirement, material: materials.get(requirement.materialId), collected: goal.materialsCollected.find((entry) => entry.materialId === requirement.materialId)?.quantity ?? 0 })), derived: !character.crafting.goals.some((entry) => entry.recipeId === goal.recipeId) };
  });
}
/** User-authored goals use the same item/source/wishlist graph as reviewed recipes. */
export function addManualCraftingGoal(character: Character, draft: ManualCraftingDraft): Character {
  const name = text(draft.name, "Crafted item name");
  const professionName = draft.profession === undefined || draft.profession === "" ? undefined : text(draft.profession, "Profession", 80);
  const notes = text(draft.notes ?? "", "Crafting notes", 5000, true);
  const provenance: AcquisitionEvidence = { kind: "user-supplied", note: notes, ...(draft.referenceUrl === undefined || draft.referenceUrl === "" ? {} : { url: validateReferenceUrl(draft.referenceUrl) }) };
  const itemId = `user:item:${crypto.randomUUID()}`, recipeId = `user:recipe:${crypto.randomUUID()}`, sourceId = `user:source:${crypto.randomUUID()}`;
  const rows = array(draft.materials ?? [], "Manual material requirements", 100).map((value) => {
    const entry = object(value, "Manual material");
    return { name: text(entry.name, "Material name"), quantity: integer(entry.quantity, "Material quantity", 1) };
  });
  if (new Set(rows.map((entry) => entry.name.toLowerCase())).size !== rows.length) return invalid("Manual materials contain duplicate names. Combine their quantities.");
  const manualMaterials = [...character.crafting.manualMaterials];
  const materials = rows.map((entry) => {
    // Reusing a reference never shares any goal's collected quantity.
    let material = manualMaterials.find((value) => value.name.toLowerCase() === entry.name.toLowerCase());
    if (!material) { material = { id: `user:material:${crypto.randomUUID()}`, name: entry.name, evidence: provenance }; manualMaterials.push(material); }
    return { materialId: material.id, quantity: entry.quantity };
  });
  const recipe = validateCraftingRecipe({ id: recipeId, name: draft.recipeName ? text(draft.recipeName, "Recipe name") : name, itemId, ...(professionName ? { profession: professionName } : {}), ...(draft.requiredSkill === undefined ? {} : { requiredSkill: draft.requiredSkill }), sourceIds: [], materials, materialCompleteness: draft.materialCompleteness ?? (materials.length ? "partial" : "unknown"), ...(draft.specialRequirements ? { specialRequirements: draft.specialRequirements } : {}), evidence: provenance });
  return withCrafting({ ...character, acquisition: { ...character.acquisition, manualItems: [...character.acquisition.manualItems, { id: itemId, name, quality: "unknown", stats: [], classRestrictions: [], sourceIds: [sourceId], evidence: provenance }], manualSources: [...character.acquisition.manualSources, { id: sourceId, itemIds: [itemId], method: "craft", label: name, recipeId, availability: "unknown", evidence: provenance }], wishlist: [...character.acquisition.wishlist, { id: `user:wishlist:${crypto.randomUUID()}`, itemId, preferredSourceId: sourceId, status: "wanted", notes }] } }, { ...character.crafting, manualMaterials, manualRecipes: [...character.crafting.manualRecipes, recipe], goals: [...character.crafting.goals, { ...blankGoal(recipeId), tracked: true, notes }] });
}

import type { ItemStatProfile } from "./itemStats";

/** Reference facts are shared; personal state never lives in the catalogue. */
export type AcquisitionMethod =
  "quest" | "dungeon" | "vendor" | "craft" | "world" | "unknown";
export type ItemQuality =
  "poor" | "common" | "uncommon" | "rare" | "epic" | "legendary" | "unknown";
export type SourceLocationRole =
  "quest-pickup" | "quest-objective" | "quest-turn-in" |
  "dungeon-entrance" | "dungeon-region" | "boss-location" |
  "vendor" | "world-enemy" | "recipe-learning" | "material-source" |
  "crafting-requirement" | "unspecified";
export type WishlistStatus = "wanted" | "acquired" | "dismissed";
export interface AcquisitionEvidence {
  kind: "reviewed-forever" | "user-supplied";
  note: string;
  url?: string;
  reviewedAt?: string;
  /** Optional evidence for individual fields, without implying other fields are verified. */
  fields?: Record<string, string>;
}
export interface ItemRecord {
  id: string;
  gameId?: number;
  name: string;
  quality: ItemQuality;
  slot?: string;
  equipmentType?: string;
  requiredLevel?: number;
  stats: { label: string; value: string }[];
  /** Optional versioned numeric facts; display stats/effects and provenance remain intact. */
  numericStats?: ItemStatProfile;
  classRestrictions: string[];
  sourceIds: string[];
  evidence: AcquisitionEvidence;
}
export interface AcquisitionSource {
  id: string;
  /** Personal source links can extend a catalogue item without changing reference facts. */
  itemIds?: string[];
  method: AcquisitionMethod;
  label: string;
  questId?: string;
  dungeonId?: string;
  npcId?: string;
  /** Recipe references share the same acquisition graph as quest/dungeon links. */
  recipeId?: string;
  zoneId?: string;
  /** A generic zone label alone does not establish an acquisition/access location. */
  locationRole?: SourceLocationRole;
  zoneName?: string;
  bossName?: string;
  requiredLevel?: number;
  availability: "available" | "unavailable" | "unknown";
  evidence: AcquisitionEvidence;
}
export interface QuestRecord {
  id: string;
  gameId?: number;
  name: string;
  zoneId?: string;
  zoneName?: string;
  startingNpc?: string;
  startingLocation?: string;
  requiredLevel?: number;
  recommendedLevel?: number;
  prerequisiteIds: string[];
  /** Empty prerequisites establish readiness only when completeness is known. */
  prerequisiteStatus: "complete" | "partial" | "unknown";
  followUpIds: string[];
  rewardItemIds: string[];
  dungeonId?: string;
  availability: "available" | "unavailable" | "unknown";
  evidence: AcquisitionEvidence;
}
export interface AcquisitionDungeon {
  id: string;
  name: string;
  zoneId?: string;
  zoneName?: string;
  evidence: AcquisitionEvidence;
}
export interface AcquisitionNpc {
  id: string;
  name: string;
  gameId?: number;
  evidence: AcquisitionEvidence;
}
export interface AcquisitionDataset {
  version: string;
  reviewedAt: string;
  items: ItemRecord[];
  sources: AcquisitionSource[];
  quests: QuestRecord[];
  dungeons: AcquisitionDungeon[];
  npcs: AcquisitionNpc[];
  /** Optional so older editorial snapshots remain readable. */
  recipes?: CraftingRecipe[];
  materials?: CraftingMaterial[];
}

export interface CraftingMaterial {
  id: string;
  gameId?: number;
  name: string;
  evidence: AcquisitionEvidence;
}
export interface RecipeMaterialRequirement {
  materialId: string;
  quantity: number;
}
export interface CraftingRecipe {
  id: string;
  name: string;
  itemId: string;
  profession?: string;
  requiredSkill?: number;
  /** Optional recipe item; never infer a spell/recipe ID from the finished item ID. */
  recipeItemId?: string;
  /** How the recipe is learned, separate from the finished item's craft source. */
  sourceIds: string[];
  materials: RecipeMaterialRequirement[];
  materialCompleteness: "complete" | "partial" | "unknown";
  specialRequirements?: string;
  evidence: AcquisitionEvidence;
}
export interface CharacterProfession {
  id: string;
  name: string;
  category: "primary" | "secondary";
  /** A recorded planning value, not an asserted Forever cap. */
  skill?: number;
}
export interface CharacterCraftingGoal {
  id: string;
  recipeId: string;
  recipeStatus: "unknown" | "needed" | "learned";
  /** Counts belong to this goal; they never represent shared inventory. */
  materialsCollected: RecipeMaterialRequirement[];
  crafted: boolean;
  crafter: "self" | "other" | "undecided";
  crafterName: string;
  notes: string;
  tracked: boolean;
}
export interface CharacterCrafting {
  professions: CharacterProfession[];
  goals: CharacterCraftingGoal[];
  manualRecipes: CraftingRecipe[];
  manualMaterials: CraftingMaterial[];
}
export interface CraftingGoal {
  goal: CharacterCraftingGoal;
  recipe?: CraftingRecipe;
  item?: ItemRecord;
  /** Finished-item ownership stays solely in the existing wishlist. */
  wishlistEntry?: WishlistEntry;
  materials: {
    requirement: RecipeMaterialRequirement;
    material?: CraftingMaterial;
    collected: number;
  }[];
  derived: boolean;
}
export interface ManualCraftingDraft {
  name: string;
  profession?: string;
  recipeName?: string;
  requiredSkill?: number;
  materials?: { name: string; quantity: number }[];
  materialCompleteness?: "complete" | "partial" | "unknown";
  notes?: string;
  referenceUrl?: string;
  specialRequirements?: string;
}
export interface WishlistEntry {
  id: string;
  itemId: string;
  /** Never choose an arbitrary source for the player. */
  preferredSourceId?: string;
  status: WishlistStatus;
  notes: string;
}
export interface CharacterQuestProgress {
  questId: string;
  /** Planned here never means accepted in the game client. */
  status: "planned" | "completed";
  notes: string;
  /** Explicit planning survives removal of a linked wishlist item. */
  tracked: boolean;
}
export interface ManualQuestChain {
  id: string;
  name: string;
  questIds: string[];
  notes: string;
  referenceUrl?: string;
}
export interface CharacterDungeonProgress {
  dungeonId: string;
  runsCompleted: number;
  notes: string;
  tracked: boolean;
}
export interface CharacterAcquisition {
  wishlist: WishlistEntry[];
  questProgress: CharacterQuestProgress[];
  manualItems: ItemRecord[];
  manualSources: AcquisitionSource[];
  manualDungeons: AcquisitionDungeon[];
  manualQuests: QuestRecord[];
  manualChains: ManualQuestChain[];
  dungeonProgress: CharacterDungeonProgress[];
}
export type ManualQuestDraft = Pick<QuestRecord, "name"> &
  Partial<
    Pick<
      QuestRecord,
      | "zoneId"
      | "zoneName"
      | "requiredLevel"
      | "recommendedLevel"
      | "dungeonId"
      | "startingNpc"
      | "startingLocation"
      | "prerequisiteIds"
      | "prerequisiteStatus"
      | "availability"
    >
  > & { notes?: string; referenceUrl?: string };
export type ManualItemDraft = Pick<ItemRecord, "name"> &
  Partial<
    Pick<ItemRecord, "quality" | "slot" | "equipmentType" | "requiredLevel">
  > & { referenceUrl?: string; notes?: string };
export interface QuestGoal {
  questId: string;
  quest?: QuestRecord;
  progress: CharacterQuestProgress;
  desiredItems: ItemRecord[];
  /** Equipment goals supported by this prerequisite; these are not this quest's rewards. */
  supportingItems: ItemRecord[];
  chainIds: string[];
  prerequisiteIds: string[];
  unresolvedPrerequisiteIds: string[];
  blockedReasons: string[];
  /** References with incomplete availability, levels or dependencies stay out of urgent Next Up. */
  ready: boolean;
}
export interface DungeonGoal {
  dungeonId: string;
  dungeon?: AcquisitionDungeon;
  items: {
    entry: WishlistEntry;
    item?: ItemRecord;
    source: AcquisitionSource;
  }[];
  progress: CharacterDungeonProgress;
}

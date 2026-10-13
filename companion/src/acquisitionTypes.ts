/** Reference facts are shared; personal state never lives in the catalogue. */
export type AcquisitionMethod =
  "quest" | "dungeon" | "vendor" | "craft" | "world" | "unknown";
export type ItemQuality =
  "poor" | "common" | "uncommon" | "rare" | "epic" | "legendary" | "unknown";
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
  zoneId?: string;
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

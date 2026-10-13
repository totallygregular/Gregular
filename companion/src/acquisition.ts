import { validateCraftingCatalogue } from "./crafting";
import { isItemStatKey, type ItemStatProfile } from "./itemStats";
import type {
  AcquisitionDataset,
  AcquisitionDungeon,
  AcquisitionEvidence,
  AcquisitionSource,
  CharacterAcquisition,
  CharacterQuestProgress,
  DungeonGoal,
  ItemRecord,
  ManualItemDraft,
  ManualQuestChain,
  ManualQuestDraft,
  QuestGoal,
  QuestRecord,
  SourceLocationRole,
  WishlistEntry,
} from "./acquisitionTypes";

export class AcquisitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcquisitionValidationError";
  }
}
const invalid = (message: string): never => {
  throw new AcquisitionValidationError(message);
};
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9:._/\-]{0,159}$/;
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 200, empty = false): string {
  if (
    typeof value !== "string" ||
    (!empty && !value.trim()) ||
    value.length > max ||
    CONTROL.test(value)
  )
    return invalid(
      `${label} must contain ${empty ? "at most" : "1 to"} ${max} characters without control characters.`,
    );
  return empty ? value : value.trim();
}
function ref(value: unknown): string {
  if (
    typeof value !== "string" ||
    !ID.test(value) ||
    ["__proto__", "constructor", "prototype"].includes(value)
  )
    return invalid("Acquisition record ID is invalid.");
  return value;
}
function choice<T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !options.includes(value as T))
    return invalid(`${label} is invalid.`);
  return value as T;
}
function array(value: unknown, label: string, max = 1000): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    return invalid(`${label} must be a list of at most ${max} entries.`);
  return value;
}
function unique<T>(values: T[], key: (entry: T) => string, label: string): T[] {
  if (
    new Set(values.map((entry) => key(entry).toLowerCase())).size !==
    values.length
  )
    return invalid(`${label} contains duplicate IDs.`);
  return values;
}
function refs(value: unknown): string[] {
  return unique(
    array(value, "References", 200).map(ref),
    (entry) => entry,
    "References",
  );
}
function optionalText(
  value: unknown,
  key: string,
  max = 200,
): Record<string, string> {
  return value === undefined ? {} : { [key]: text(value, key, max) };
}
function optionalRef(value: unknown, key: string): Record<string, string> {
  return value === undefined ? {} : { [key]: ref(value) };
}
function positive(value: unknown, label: string, max = 1000000): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > max)
    return invalid(`${label} must be a whole number from 1 to ${max}.`);
  return value as number;
}
function optionalLevel(value: unknown, key: string): Record<string, number> {
  return value === undefined ? {} : { [key]: positive(value, "Level", 60) };
}
export function validateReferenceUrl(value: unknown): string {
  const checked = text(value, "Reference URL", 2000);
  let url: URL;
  try {
    url = new URL(checked);
  } catch {
    return invalid("Reference URL must be an absolute HTTP or HTTPS link.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    return invalid(
      "Reference URL must be an absolute HTTP or HTTPS link without credentials.",
    );
  return url.href;
}
function evidence(value: unknown): AcquisitionEvidence {
  const candidate = object(value, "Provenance");
  let fields: Record<string, string> | undefined;
  if (candidate.fields !== undefined) {
    const values = Object.entries(object(candidate.fields, "Field provenance"));
    if (values.length > 40)
      return invalid("Too many field provenance entries.");
    fields = Object.fromEntries(
      values.map(([key, value]) => [
        ref(key),
        text(value, "Field provenance", 2000),
      ]),
    );
  }
  return {
    kind: choice(
      candidate.kind,
      ["reviewed-forever", "user-supplied"],
      "Provenance kind",
    ),
    note: text(candidate.note, "Provenance note", 5000, true),
    ...(candidate.url === undefined
      ? {}
      : { url: validateReferenceUrl(candidate.url) }),
    ...optionalText(candidate.reviewedAt, "reviewedAt", 40),
    ...(fields ? { fields } : {}),
  };
}
function numericStats(value: unknown): ItemStatProfile {
  const candidate = object(value, "Numeric statistics");
  const entries = Object.entries(object(candidate.values, "Numeric statistic values"));
  const values: ItemStatProfile["values"] = {};
  for (const [key, amount] of entries) {
    if (!isItemStatKey(key) || typeof amount !== "number" || !Number.isFinite(amount) || Math.abs(amount) > 1_000_000)
      return invalid("Numeric statistics contain an unsupported field or value.");
    values[key] = amount;
  }
  return {
    values,
    completeness: choice(candidate.completeness, ["complete", "partial", "unknown"], "Statistic completeness"),
    ...optionalText(candidate.mappingNote, "mappingNote", 2000),
  };
}
function item(value: unknown): ItemRecord {
  const candidate = object(value, "Item");
  return {
    id: ref(candidate.id),
    name: text(candidate.name, "Item name"),
    quality: choice(
      candidate.quality,
      ["poor", "common", "uncommon", "rare", "epic", "legendary", "unknown"],
      "Item quality",
    ),
    ...optionalText(candidate.slot, "slot", 80),
    ...optionalText(candidate.equipmentType, "equipmentType", 80),
    ...optionalLevel(candidate.requiredLevel, "requiredLevel"),
    ...(candidate.gameId === undefined
      ? {}
      : { gameId: positive(candidate.gameId, "Game ID") }),
    stats: array(candidate.stats, "Item statistics", 40).map((value) => {
      const stat = object(value, "Statistic");
      return {
        label: text(stat.label, "Statistic label", 80),
        value: text(stat.value, "Statistic value", 100),
      };
    }),
    ...(candidate.numericStats === undefined ? {} : { numericStats: numericStats(candidate.numericStats) }),
    classRestrictions: unique(
      array(candidate.classRestrictions, "Class restrictions", 20).map(
        (value) => text(value, "Class", 60),
      ),
      (entry) => entry,
      "Class restrictions",
    ),
    sourceIds: refs(candidate.sourceIds),
    evidence: evidence(candidate.evidence),
  };
}
function source(value: unknown): AcquisitionSource {
  const candidate = object(value, "Acquisition source");
  const method = choice(candidate.method, ["quest", "dungeon", "vendor", "craft", "world", "unknown"], "Acquisition method");
  const roleMethods: Record<SourceLocationRole, string | undefined> = {
    "quest-pickup": "quest", "quest-objective": "quest", "quest-turn-in": "quest",
    "dungeon-entrance": "dungeon", "dungeon-region": "dungeon", "boss-location": "dungeon",
    vendor: "vendor", "world-enemy": "world", "recipe-learning": "craft",
    "material-source": "craft", "crafting-requirement": "craft", unspecified: undefined,
  };
  const locationRole = candidate.locationRole === undefined ? undefined
    : choice(candidate.locationRole, Object.keys(roleMethods) as SourceLocationRole[], "Source location role");
  if (locationRole && roleMethods[locationRole] && roleMethods[locationRole] !== method)
    return invalid("Source location role does not match its acquisition method.");
  return {
    id: ref(candidate.id),
    method,
    label: text(candidate.label, "Source name"),
    ...optionalRef(candidate.questId, "questId"),
    ...optionalRef(candidate.dungeonId, "dungeonId"),
    ...optionalRef(candidate.npcId, "npcId"),
    ...optionalRef(candidate.recipeId, "recipeId"),
    ...optionalRef(candidate.zoneId, "zoneId"),
    ...(locationRole === undefined ? {} : { locationRole }),
    ...optionalText(candidate.zoneName, "zoneName"),
    ...optionalText(candidate.bossName, "bossName"),
    ...optionalLevel(candidate.requiredLevel, "requiredLevel"),
    ...(candidate.itemIds === undefined
      ? {}
      : { itemIds: refs(candidate.itemIds) }),
    availability: choice(
      candidate.availability,
      ["available", "unavailable", "unknown"],
      "Source availability",
    ),
    evidence: evidence(candidate.evidence),
  };
}
function quest(value: unknown): QuestRecord {
  const candidate = object(value, "Quest");
  return {
    id: ref(candidate.id),
    name: text(candidate.name, "Quest name"),
    ...(candidate.gameId === undefined
      ? {}
      : { gameId: positive(candidate.gameId, "Game ID") }),
    ...optionalRef(candidate.zoneId, "zoneId"),
    ...optionalText(candidate.zoneName, "zoneName"),
    ...optionalText(candidate.startingNpc, "startingNpc"),
    ...optionalText(candidate.startingLocation, "startingLocation"),
    ...optionalLevel(candidate.requiredLevel, "requiredLevel"),
    ...optionalLevel(candidate.recommendedLevel, "recommendedLevel"),
    ...optionalRef(candidate.dungeonId, "dungeonId"),
    prerequisiteIds: refs(candidate.prerequisiteIds),
    prerequisiteStatus: choice(
      candidate.prerequisiteStatus,
      ["complete", "partial", "unknown"],
      "Prerequisite completeness",
    ),
    followUpIds: refs(candidate.followUpIds),
    rewardItemIds: refs(candidate.rewardItemIds),
    availability: choice(
      candidate.availability,
      ["available", "unavailable", "unknown"],
      "Quest availability",
    ),
    evidence: evidence(candidate.evidence),
  };
}
function manual<T extends { id: string; evidence: AcquisitionEvidence }>(
  entry: T,
): T {
  if (!entry.id.startsWith("user:") || entry.evidence.kind !== "user-supplied")
    return invalid(
      "Personal records must have a user ID and user-supplied provenance.",
    );
  return entry;
}
function progress(value: unknown): CharacterQuestProgress {
  const candidate = object(value, "Quest progress");
  if (typeof candidate.tracked !== "boolean")
    return invalid("Quest tracking must be true or false.");
  return {
    questId: ref(candidate.questId),
    status: choice(candidate.status, ["planned", "completed"], "Quest status"),
    notes: text(candidate.notes, "Quest notes", 5000, true),
    tracked: candidate.tracked,
  };
}
function chain(value: unknown): ManualQuestChain {
  const candidate = object(value, "Manual chain");
  const id = ref(candidate.id);
  if (!id.startsWith("user:"))
    return invalid("Personal chains must have a user ID.");
  return {
    id,
    name: text(candidate.name, "Chain name"),
    questIds: refs(candidate.questIds),
    notes: text(candidate.notes, "Chain notes", 5000, true),
    ...(candidate.referenceUrl === undefined
      ? {}
      : { referenceUrl: validateReferenceUrl(candidate.referenceUrl) }),
  };
}
export function createBlankAcquisition(): CharacterAcquisition {
  return {
    wishlist: [],
    questProgress: [],
    manualItems: [],
    manualSources: [],
    manualDungeons: [],
    manualQuests: [],
    manualChains: [],
    dungeonProgress: [],
  };
}
/** Removed references and malformed dependency graphs stay saved for visible review. */
export function validateAcquisition(value: unknown): CharacterAcquisition {
  const candidate = object(value, "Character acquisition plan");
  return {
    wishlist: unique(
      array(candidate.wishlist, "Wishlist").map((value): WishlistEntry => {
        const entry = object(value, "Wishlist item");
        return {
          id: ref(entry.id),
          itemId: ref(entry.itemId),
          status: choice(
            entry.status,
            ["wanted", "acquired", "dismissed"],
            "Wishlist status",
          ),
          notes: text(entry.notes, "Item notes", 5000, true),
          ...optionalRef(entry.preferredSourceId, "preferredSourceId"),
        };
      }),
      (entry) => entry.itemId,
      "Wishlist items",
    ).map((entry, _, all) => {
      if (
        all.filter((other) => other.id.toLowerCase() === entry.id.toLowerCase())
          .length > 1
      )
        return invalid("Wishlist contains duplicate entry IDs.");
      return entry;
    }),
    questProgress: unique(
      array(candidate.questProgress, "Quest progress").map(progress),
      (entry) => entry.questId,
      "Quest progress",
    ),
    manualItems: unique(
      array(candidate.manualItems, "Personal items").map((value) =>
        manual(item(value)),
      ),
      (entry) => entry.id,
      "Personal items",
    ),
    manualSources: unique(
      array(candidate.manualSources, "Personal sources").map((value) =>
        manual(source(value)),
      ),
      (entry) => entry.id,
      "Personal sources",
    ),
    manualDungeons: unique(
      array(candidate.manualDungeons, "Personal dungeons").map((value) => {
        const entry = object(value, "Personal dungeon");
        return manual({
          id: ref(entry.id),
          name: text(entry.name, "Dungeon name"),
          ...optionalRef(entry.zoneId, "zoneId"),
          ...optionalText(entry.zoneName, "zoneName"),
          evidence: evidence(entry.evidence),
        });
      }),
      (entry) => entry.id,
      "Personal dungeons",
    ),
    manualQuests: unique(
      array(candidate.manualQuests, "Personal quests").map((value) =>
        manual(quest(value)),
      ),
      (entry) => entry.id,
      "Personal quests",
    ),
    manualChains: unique(
      array(candidate.manualChains, "Personal chains", 200).map(chain),
      (entry) => entry.id,
      "Personal chains",
    ),
    dungeonProgress: unique(
      array(candidate.dungeonProgress, "Dungeon progress").map((value) => {
        const entry = object(value, "Dungeon progress");
        if (
          !Number.isSafeInteger(entry.runsCompleted) ||
          Number(entry.runsCompleted) < 0 ||
          Number(entry.runsCompleted) > 1000000 ||
          typeof entry.tracked !== "boolean"
        )
          return invalid("Dungeon progress is invalid.");
        return {
          dungeonId: ref(entry.dungeonId),
          runsCompleted: entry.runsCompleted as number,
          notes: text(entry.notes, "Dungeon notes", 5000, true),
          tracked: entry.tracked,
        };
      }),
      (entry) => entry.dungeonId,
      "Dungeon progress",
    ),
  };
}
export function validateAcquisitionDataset(value: unknown): AcquisitionDataset {
  const candidate = object(value, "Acquisition catalogue");
  const dataset: AcquisitionDataset = {
    ...validateCraftingCatalogue(candidate),
    version: text(candidate.version, "Catalogue version", 100),
    reviewedAt: text(candidate.reviewedAt, "Catalogue review date", 40),
    items: unique(
      array(candidate.items, "Items", 20000).map(item),
      (entry) => entry.id,
      "Items",
    ),
    sources: unique(
      array(candidate.sources, "Sources", 40000).map(source),
      (entry) => entry.id,
      "Sources",
    ),
    quests: unique(
      array(candidate.quests, "Quests", 20000).map(quest),
      (entry) => entry.id,
      "Quests",
    ),
    dungeons: unique(
      array(candidate.dungeons, "Dungeons", 1000).map((value) => {
        const entry = object(value, "Dungeon");
        return {
          id: ref(entry.id),
          name: text(entry.name, "Dungeon name"),
          ...optionalRef(entry.zoneId, "zoneId"),
          ...optionalText(entry.zoneName, "zoneName"),
          evidence: evidence(entry.evidence),
        };
      }),
      (entry) => entry.id,
      "Dungeons",
    ),
    npcs: unique(
      array(candidate.npcs, "NPCs", 20000).map((value) => {
        const entry = object(value, "NPC");
        return {
          id: ref(entry.id),
          name: text(entry.name, "NPC name"),
          ...(entry.gameId === undefined
            ? {}
            : { gameId: positive(entry.gameId, "Game ID") }),
          evidence: evidence(entry.evidence),
        };
      }),
      (entry) => entry.id,
      "NPCs",
    ),
  };
  if (
    getQuestDependencyIssues(dataset.quests).some(
      (issue) => issue.kind === "cycle",
    )
  )
    return invalid("Catalogue quest dependencies contain a cycle.");
  return dataset;
}
export function resolveAcquisition(
  state: CharacterAcquisition,
  dataset: AcquisitionDataset,
): AcquisitionDataset {
  const sources = [...dataset.sources, ...state.manualSources];
  return {
    ...dataset,
    sources,
    quests: [...dataset.quests, ...state.manualQuests],
    dungeons: [...dataset.dungeons, ...state.manualDungeons],
    items: [...dataset.items, ...state.manualItems].map((entry) => ({
      ...entry,
      sourceIds: [
        ...new Set([
          ...entry.sourceIds,
          ...state.manualSources
            .filter((source) => source.itemIds?.includes(entry.id))
            .map((source) => source.id),
        ]),
      ],
    })),
  };
}
export interface ItemSearchFilter {
  name?: string;
  slot?: string;
  quality?: string;
  equipmentType?: string;
  method?: string;
  maxLevel?: number;
}
export function searchItems(
  state: CharacterAcquisition,
  dataset: AcquisitionDataset,
  filter: ItemSearchFilter = {},
): ItemRecord[] {
  const resolved = resolveAcquisition(state, dataset);
  return resolved.items.filter(
    (item) =>
      (!filter.name ||
        item.name.toLowerCase().includes(filter.name.trim().toLowerCase())) &&
      (!filter.slot || item.slot === filter.slot) &&
      (!filter.quality || item.quality === filter.quality) &&
      (!filter.equipmentType || item.equipmentType === filter.equipmentType) &&
      (filter.maxLevel === undefined ||
        (item.requiredLevel !== undefined &&
          item.requiredLevel <= filter.maxLevel)) &&
      (!filter.method ||
        (filter.method === "unknown" && item.sourceIds.length === 0) ||
        item.sourceIds.some(
          (id) =>
            (resolved.sources.find((source) => source.id === id)?.method ??
              "unknown") === filter.method,
        )),
  );
}
export function addWishlistItem(
  state: CharacterAcquisition,
  itemId: string,
  preferredSourceId?: string,
): CharacterAcquisition {
  if (state.wishlist.some((entry) => entry.itemId === itemId))
    return invalid("This item is already on this character's wishlist.");
  return validateAcquisition({
    ...state,
    wishlist: [
      ...state.wishlist,
      {
        id: crypto.randomUUID(),
        itemId,
        status: "wanted",
        notes: "",
        ...(preferredSourceId ? { preferredSourceId } : {}),
      },
    ],
  });
}
export function updateWishlistEntry(
  state: CharacterAcquisition,
  id: string,
  patch: Partial<Pick<WishlistEntry, "status" | "notes" | "preferredSourceId">>,
): CharacterAcquisition {
  if (!state.wishlist.some((entry) => entry.id === id))
    return invalid("Wishlist item could not be found.");
  return validateAcquisition({
    ...state,
    wishlist: state.wishlist.map((entry) =>
      entry.id === id ? { ...entry, ...patch } : entry,
    ),
  });
}
export function removeWishlistItem(
  state: CharacterAcquisition,
  id: string,
): CharacterAcquisition {
  if (!state.wishlist.some((entry) => entry.id === id))
    return invalid("Wishlist item could not be found.");
  return {
    ...state,
    wishlist: state.wishlist.filter((entry) => entry.id !== id),
  };
}
function userEvidence(referenceUrl?: string): AcquisitionEvidence {
  return {
    kind: "user-supplied",
    note: "Personal entry; game details have not been independently verified.",
    ...(referenceUrl ? { url: validateReferenceUrl(referenceUrl) } : {}),
  };
}
export function addManualItem(
  state: CharacterAcquisition,
  draft: ManualItemDraft,
): CharacterAcquisition {
  const entry = item({
    id: `user:item:${crypto.randomUUID()}`,
    name: draft.name,
    quality: draft.quality ?? "unknown",
    stats: [],
    classRestrictions: [],
    sourceIds: [],
    ...optionalText(draft.slot, "slot", 80),
    ...optionalText(draft.equipmentType, "equipmentType", 80),
    ...optionalLevel(draft.requiredLevel, "requiredLevel"),
    evidence: userEvidence(draft.referenceUrl),
  });
  return validateAcquisition({
    ...state,
    manualItems: [...state.manualItems, entry],
  });
}
export type ManualSourceDraft = Omit<
  AcquisitionSource,
  "id" | "evidence" | "itemIds"
> & { referenceUrl?: string };
export function addManualSource(
  state: CharacterAcquisition,
  itemId: string,
  draft: ManualSourceDraft,
): CharacterAcquisition {
  const entry = source({
    ...draft,
    id: `user:source:${crypto.randomUUID()}`,
    itemIds: [itemId],
    evidence: userEvidence(draft.referenceUrl),
  });
  return validateAcquisition({
    ...state,
    manualSources: [...state.manualSources, entry],
  });
}
export function addManualDungeon(
  state: CharacterAcquisition,
  draft: Pick<AcquisitionDungeon, "name" | "zoneId" | "zoneName"> & {
    referenceUrl?: string;
  },
): CharacterAcquisition {
  const entry: AcquisitionDungeon = {
    id: `user:dungeon:${crypto.randomUUID()}`,
    name: draft.name,
    ...optionalRef(draft.zoneId, "zoneId"),
    ...optionalText(draft.zoneName, "zoneName"),
    evidence: userEvidence(draft.referenceUrl),
  };
  return validateAcquisition({
    ...state,
    manualDungeons: [...state.manualDungeons, entry],
  });
}
export function addManualQuest(
  state: CharacterAcquisition,
  draft: ManualQuestDraft,
): CharacterAcquisition {
  const entry = quest({
    id: `user:quest:${crypto.randomUUID()}`,
    name: draft.name,
    ...optionalRef(draft.zoneId, "zoneId"),
    ...optionalText(draft.zoneName, "zoneName"),
    ...optionalRef(draft.dungeonId, "dungeonId"),
    ...optionalText(draft.startingNpc, "startingNpc"),
    ...optionalText(draft.startingLocation, "startingLocation"),
    ...optionalLevel(draft.requiredLevel, "requiredLevel"),
    ...optionalLevel(draft.recommendedLevel, "recommendedLevel"),
    prerequisiteIds: draft.prerequisiteIds ?? [],
    prerequisiteStatus: draft.prerequisiteStatus ?? "unknown",
    followUpIds: [],
    rewardItemIds: [],
    availability: draft.availability ?? "unknown",
    evidence: userEvidence(draft.referenceUrl),
  });
  return validateAcquisition({
    ...state,
    manualQuests: [...state.manualQuests, entry],
    questProgress: [
      ...state.questProgress,
      {
        questId: entry.id,
        status: "planned",
        notes: draft.notes ?? "",
        tracked: true,
      },
    ],
  });
}
export function updateManualQuest(
  state: CharacterAcquisition,
  id: string,
  draft: ManualQuestDraft,
): CharacterAcquisition {
  if (!state.manualQuests.some((entry) => entry.id === id))
    return invalid("Personal quest could not be found.");
  let result = validateAcquisition({
    ...state,
    manualQuests: state.manualQuests.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            name: draft.name,
            zoneId: draft.zoneId,
            zoneName: draft.zoneName,
            dungeonId: draft.dungeonId,
            requiredLevel: draft.requiredLevel,
            recommendedLevel: draft.recommendedLevel,
            startingNpc: draft.startingNpc,
            startingLocation: draft.startingLocation,
            prerequisiteIds: draft.prerequisiteIds ?? entry.prerequisiteIds,
            prerequisiteStatus:
              draft.prerequisiteStatus ?? entry.prerequisiteStatus,
            availability: draft.availability ?? entry.availability,
            evidence: userEvidence(draft.referenceUrl),
          }
        : entry,
    ),
  });
  if (draft.notes !== undefined)
    result = setQuestNotes(result, id, draft.notes);
  return result;
}
export function removeManualQuest(
  state: CharacterAcquisition,
  id: string,
): CharacterAcquisition {
  if (!state.manualQuests.some((entry) => entry.id === id))
    return invalid("Personal quest could not be found.");
  // Preserve progress and references; the journal visibly asks for review.
  return {
    ...state,
    manualQuests: state.manualQuests.filter((entry) => entry.id !== id),
  };
}
function questState(
  state: CharacterAcquisition,
  id: string,
): CharacterQuestProgress {
  return (
    state.questProgress.find((entry) => entry.questId === id) ?? {
      questId: id,
      status: "planned",
      notes: "",
      tracked: false,
    }
  );
}
function putQuestState(
  state: CharacterAcquisition,
  next: CharacterQuestProgress,
): CharacterAcquisition {
  return validateAcquisition({
    ...state,
    questProgress: [
      ...state.questProgress.filter((entry) => entry.questId !== next.questId),
      next,
    ],
  });
}
export function trackQuest(
  state: CharacterAcquisition,
  id: string,
): CharacterAcquisition {
  return putQuestState(state, { ...questState(state, id), tracked: true });
}
export function setQuestComplete(
  state: CharacterAcquisition,
  id: string,
  completed: boolean,
): CharacterAcquisition {
  if (typeof completed !== "boolean")
    return invalid("Quest completion must be true or false.");
  return putQuestState(state, {
    ...questState(state, id),
    status: completed ? "completed" : "planned",
  });
}
export function setQuestNotes(
  state: CharacterAcquisition,
  id: string,
  notes: string,
): CharacterAcquisition {
  return putQuestState(state, { ...questState(state, id), notes });
}
export function addManualChain(
  state: CharacterAcquisition,
  draft: { name: string; notes?: string; referenceUrl?: string },
): CharacterAcquisition {
  return validateAcquisition({
    ...state,
    manualChains: [
      ...state.manualChains,
      {
        ...draft,
        id: `user:chain:${crypto.randomUUID()}`,
        questIds: [],
        notes: draft.notes ?? "",
      },
    ],
  });
}
export function updateManualChain(
  state: CharacterAcquisition,
  id: string,
  patch: Partial<Pick<ManualQuestChain, "name" | "notes" | "referenceUrl">>,
): CharacterAcquisition {
  if (!state.manualChains.some((entry) => entry.id === id))
    return invalid("Quest chain could not be found.");
  return validateAcquisition({
    ...state,
    manualChains: state.manualChains.map((entry) =>
      entry.id === id ? { ...entry, ...patch } : entry,
    ),
  });
}
export function removeManualChain(
  state: CharacterAcquisition,
  id: string,
): CharacterAcquisition {
  if (!state.manualChains.some((entry) => entry.id === id))
    return invalid("Quest chain could not be found.");
  return {
    ...state,
    manualChains: state.manualChains.filter((entry) => entry.id !== id),
  };
}
export function addChainStep(
  state: CharacterAcquisition,
  chainId: string,
  draft: ManualQuestDraft,
): CharacterAcquisition {
  if (!state.manualChains.some((entry) => entry.id === chainId))
    return invalid("Quest chain could not be found.");
  const result = addManualQuest(state, draft),
    questId = result.manualQuests[result.manualQuests.length - 1].id;
  return validateAcquisition({
    ...result,
    manualChains: result.manualChains.map((entry) =>
      entry.id === chainId
        ? { ...entry, questIds: [...entry.questIds, questId] }
        : entry,
    ),
  });
}
export function removeChainStep(
  state: CharacterAcquisition,
  chainId: string,
  questId: string,
): CharacterAcquisition {
  if (
    !state.manualChains.some(
      (entry) => entry.id === chainId && entry.questIds.includes(questId),
    )
  )
    return invalid("Chain step could not be found.");
  return {
    ...state,
    manualChains: state.manualChains.map((entry) =>
      entry.id === chainId
        ? { ...entry, questIds: entry.questIds.filter((id) => id !== questId) }
        : entry,
    ),
  };
}
export function moveChainStep(
  state: CharacterAcquisition,
  chainId: string,
  questId: string,
  direction: "up" | "down",
): CharacterAcquisition {
  const entry = state.manualChains.find((entry) => entry.id === chainId),
    index = entry?.questIds.indexOf(questId) ?? -1;
  if (!entry || index < 0) return invalid("Chain step could not be found.");
  if (!["up", "down"].includes(direction))
    return invalid("Chain direction is invalid.");
  const target = Math.max(
      0,
      Math.min(
        entry.questIds.length - 1,
        index + (direction === "up" ? -1 : 1),
      ),
    ),
    questIds = [...entry.questIds];
  [questIds[index], questIds[target]] = [questIds[target], questIds[index]];
  return {
    ...state,
    manualChains: state.manualChains.map((candidate) =>
      candidate.id === chainId ? { ...candidate, questIds } : candidate,
    ),
  };
}
export function setChainComplete(
  state: CharacterAcquisition,
  chainId: string,
  completed: boolean,
): CharacterAcquisition {
  const entry = state.manualChains.find((entry) => entry.id === chainId);
  if (!entry) return invalid("Quest chain could not be found.");
  return entry.questIds.reduce(
    (result, id) => setQuestComplete(result, id, completed),
    state,
  );
}
export function getChainProgress(
  state: CharacterAcquisition,
  chainId: string,
): { completed: number; total: number } {
  const entry = state.manualChains.find((entry) => entry.id === chainId);
  return {
    completed:
      entry?.questIds.filter(
        (id) => questState(state, id).status === "completed",
      ).length ?? 0,
    total: entry?.questIds.length ?? 0,
  };
}
export function recordDungeonRun(
  state: CharacterAcquisition,
  dungeonId: string,
): CharacterAcquisition {
  const current = state.dungeonProgress.find(
    (entry) => entry.dungeonId === dungeonId,
  ) ?? { dungeonId, runsCompleted: 0, notes: "", tracked: true };
  return validateAcquisition({
    ...state,
    dungeonProgress: [
      ...state.dungeonProgress.filter((entry) => entry.dungeonId !== dungeonId),
      { ...current, runsCompleted: current.runsCompleted + 1 },
    ],
  });
}
export function setDungeonNotes(
  state: CharacterAcquisition,
  dungeonId: string,
  notes: string,
): CharacterAcquisition {
  const current = state.dungeonProgress.find(
    (entry) => entry.dungeonId === dungeonId,
  ) ?? { dungeonId, runsCompleted: 0, notes: "", tracked: true };
  return validateAcquisition({
    ...state,
    dungeonProgress: [
      ...state.dungeonProgress.filter((entry) => entry.dungeonId !== dungeonId),
      { ...current, notes },
    ],
  });
}
export function getQuestDependencyIssues(
  quests: QuestRecord[],
): {
  questId: string;
  kind: "missing" | "cycle" | "unknown";
  referenceId?: string;
}[] {
  const records = new Map(quests.map((entry) => [entry.id, entry]));
  const issues: ReturnType<typeof getQuestDependencyIssues> = [],
    colors = new Map<string, number>(),
    cycleIds = new Set<string>();
  for (const quest of quests) {
    if (quest.prerequisiteStatus !== "complete")
      issues.push({ questId: quest.id, kind: "unknown" });
    for (const id of quest.prerequisiteIds)
      if (!records.has(id))
        issues.push({ questId: quest.id, kind: "missing", referenceId: id });
    if (colors.has(quest.id)) continue;
    const stack = [{ id: quest.id, next: 0 }],
      pathPositions = new Map<string, number>([[quest.id, 0]]);
    colors.set(quest.id, 1);
    while (stack.length) {
      const frame = stack[stack.length - 1],
        dependencies = records.get(frame.id)!.prerequisiteIds;
      if (frame.next >= dependencies.length) {
        colors.set(frame.id, 2);
        pathPositions.delete(frame.id);
        stack.pop();
        continue;
      }
      const id = dependencies[frame.next++];
      if (!records.has(id) || colors.get(id) === 2) continue;
      if (colors.get(id) === 1) {
        const start = pathPositions.get(id);
        if (start !== undefined)
          for (let index = start; index < stack.length; index++)
            cycleIds.add(stack[index].id);
      } else {
        colors.set(id, 1);
        pathPositions.set(id, stack.length);
        stack.push({ id, next: 0 });
      }
    }
  }
  cycleIds.forEach((questId) => issues.push({ questId, kind: "cycle" }));
  return issues;
}
export function getSelectedSource(
  entry: WishlistEntry,
  resolved: AcquisitionDataset,
): AcquisitionSource | undefined {
  const item = resolved.items.find((item) => item.id === entry.itemId);
  if (
    !entry.preferredSourceId ||
    !item?.sourceIds.includes(entry.preferredSourceId)
  )
    return undefined;
  return resolved.sources.find(
    (source) => source.id === entry.preferredSourceId,
  );
}
export function getQuestGoals(
  state: CharacterAcquisition,
  dataset: AcquisitionDataset,
  level?: number,
): QuestGoal[] {
  const resolved = resolveAcquisition(state, dataset),
    records = new Map(resolved.quests.map((entry) => [entry.id, entry]));
  const goals = new Map<string, Set<string>>();
  const propagated = new Set<string>();
  function include(id: string, itemIds: string[] = []): void {
    const queue = (itemIds.length ? itemIds : [""]).map((itemId) => ({
      id,
      itemId,
    }));
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index],
        key = `${current.id}\u0000${current.itemId}`;
      if (propagated.has(key)) continue;
      propagated.add(key);
      const desired = goals.get(current.id) ?? new Set<string>();
      if (current.itemId) desired.add(current.itemId);
      goals.set(current.id, desired);
      records
        .get(current.id)
        ?.prerequisiteIds.forEach((dependency) =>
          queue.push({ id: dependency, itemId: current.itemId }),
        );
    }
  }
  state.questProgress.forEach((entry) => include(entry.questId));
  state.manualQuests.forEach((entry) => include(entry.id));
  state.manualChains.forEach((entry) =>
    entry.questIds.forEach((id) => include(id)),
  );
  for (const entry of state.wishlist.filter(
    (entry) => entry.status === "wanted",
  )) {
    const source = getSelectedSource(entry, resolved);
    if (source?.method === "quest" && source.questId)
      include(source.questId, [entry.itemId]);
  }
  // Ordered chain edges participate in the same graph as explicit prerequisites.
  const effectiveQuests = resolved.quests.map((quest) => ({
    ...quest,
    prerequisiteIds: [
      ...new Set([
        ...quest.prerequisiteIds,
        ...state.manualChains.flatMap((chain) => {
          const index = chain.questIds.indexOf(quest.id);
          return index < 0 ? [] : chain.questIds.slice(0, index);
        }),
      ]),
    ],
  }));
  const issues = getQuestDependencyIssues(effectiveQuests);
  const cycleAffected = new Set(
    issues
      .filter((issue) => issue.kind === "cycle")
      .map((issue) => issue.questId),
  );
  const dependants = new Map<string, string[]>();
  effectiveQuests.forEach((quest) =>
    quest.prerequisiteIds.forEach((id) =>
      dependants.set(id, [...(dependants.get(id) ?? []), quest.id]),
    ),
  );
  const cycleQueue = [...cycleAffected];
  for (let index = 0; index < cycleQueue.length; index++)
    for (const id of dependants.get(cycleQueue[index]) ?? [])
      if (!cycleAffected.has(id)) {
        cycleAffected.add(id);
        cycleQueue.push(id);
      }
  return [...goals].map(([id, itemIds]) => {
    const quest = records.get(id),
      progress = questState(state, id),
      blockedReasons: string[] = [],
      prerequisiteIds = [...(quest?.prerequisiteIds ?? [])];
    const chains = state.manualChains.filter((chain) =>
      chain.questIds.includes(id),
    );
    for (const chain of chains)
      prerequisiteIds.push(
        ...chain.questIds.slice(0, chain.questIds.indexOf(id)),
      );
    const uniquePrerequisites = [...new Set(prerequisiteIds)],
      unresolvedPrerequisiteIds = uniquePrerequisites.filter(
        (id) => !records.has(id),
      );
    if (!quest)
      blockedReasons.push(
        "Quest reference is missing. Saved progress has been retained.",
      );
    if (quest?.availability !== "available")
      blockedReasons.push(
        quest?.availability === "unavailable"
          ? "Quest is marked unavailable."
          : "Quest availability is unknown.",
      );
    if (quest?.prerequisiteStatus !== "complete")
      blockedReasons.push("Prerequisite information is incomplete or unknown.");
    if (unresolvedPrerequisiteIds.length)
      blockedReasons.push("One or more prerequisite records are missing.");
    if (
      uniquePrerequisites.some(
        (id) => questState(state, id).status !== "completed",
      )
    )
      blockedReasons.push(
        "Complete the preceding or prerequisite quests first.",
      );
    if (cycleAffected.has(id))
      blockedReasons.push("Quest dependency cycle requires review.");
    const knownLevels = [quest?.requiredLevel, quest?.recommendedLevel].filter(
      (value): value is number => value !== undefined,
    );
    const minimumLevel = knownLevels.length
      ? Math.max(...knownLevels)
      : undefined;
    if (minimumLevel === undefined)
      blockedReasons.push("Quest level requirement is unknown.");
    else if (level !== undefined && level < minimumLevel)
      blockedReasons.push(`Planned from level ${minimumLevel}.`);
    for (const itemId of itemIds) {
      const wishlistEntry = state.wishlist.find(
          (entry) => entry.itemId === itemId,
        ),
        source = wishlistEntry
          ? getSelectedSource(wishlistEntry, resolved)
          : undefined;
      // A later reward's restrictions must not suppress independently available preparation.
      if (source?.questId !== id) continue;
      if (source?.availability !== "available")
        blockedReasons.push(
          "Desired reward source availability requires review.",
        );
      if (
        source?.requiredLevel !== undefined &&
        level !== undefined &&
        level < source.requiredLevel
      )
        blockedReasons.push(
          `Reward source requires level ${source.requiredLevel}.`,
        );
    }
    // Keep unknown ancestor relationships visible even after a known prerequisite is completed.
    if (
      quest &&
      issues.some((issue) => issue.questId === id && issue.kind === "cycle")
    )
      blockedReasons.push("Malformed prerequisite data requires review.");
    const relatedItems = [...itemIds].flatMap((itemId) => {
      const item = resolved.items.find((entry) => entry.id === itemId);
      return item ? [item] : [];
    });
    const isDirectReward = (item: ItemRecord) => {
      const entry = state.wishlist.find((entry) => entry.itemId === item.id);
      return Boolean(
        entry && getSelectedSource(entry, resolved)?.questId === id,
      );
    };
    return {
      questId: id,
      quest,
      progress,
      desiredItems: relatedItems.filter(isDirectReward),
      supportingItems: relatedItems.filter((item) => !isDirectReward(item)),
      chainIds: chains.map((entry) => entry.id),
      prerequisiteIds: uniquePrerequisites,
      unresolvedPrerequisiteIds,
      blockedReasons: [...new Set(blockedReasons)],
      ready: progress.status !== "completed" && blockedReasons.length === 0,
    };
  });
}
export function getDungeonGoals(
  state: CharacterAcquisition,
  dataset: AcquisitionDataset,
): DungeonGoal[] {
  const resolved = resolveAcquisition(state, dataset),
    goals = new Map<string, DungeonGoal>();
  function include(id: string): DungeonGoal {
    const existing = goals.get(id);
    if (existing) return existing;
    const goal: DungeonGoal = {
      dungeonId: id,
      dungeon: resolved.dungeons.find((entry) => entry.id === id),
      items: [],
      progress: state.dungeonProgress.find(
        (entry) => entry.dungeonId === id,
      ) ?? { dungeonId: id, runsCompleted: 0, notes: "", tracked: false },
    };
    goals.set(id, goal);
    return goal;
  }
  state.dungeonProgress
    .filter((entry) => entry.tracked || entry.runsCompleted > 0 || entry.notes)
    .forEach((entry) => include(entry.dungeonId));
  for (const entry of state.wishlist.filter(
    (entry) => entry.status === "wanted",
  )) {
    const source = getSelectedSource(entry, resolved);
    if (source?.method === "dungeon" && source.dungeonId)
      include(source.dungeonId).items.push({
        entry,
        source,
        item: resolved.items.find((item) => item.id === entry.itemId),
      });
  }
  return [...goals.values()];
}
export function getAcquisitionSummary(
  state: CharacterAcquisition,
  dataset: AcquisitionDataset,
  level?: number,
) {
  const quests = getQuestGoals(state, dataset, level),
    dungeons = getDungeonGoals(state, dataset),
    resolved = resolveAcquisition(state, dataset);
  return {
    wantedItems: state.wishlist.filter((entry) => entry.status === "wanted")
      .length,
    acquiredItems: state.wishlist.filter((entry) => entry.status === "acquired")
      .length,
    pendingQuests: quests.filter(
      (entry) => entry.progress.status !== "completed",
    ).length,
    completedQuests: quests.filter(
      (entry) => entry.progress.status === "completed",
    ).length,
    activeChains: state.manualChains.filter((chain) => {
      const progress = getChainProgress(state, chain.id);
      return progress.total > 0 && progress.completed < progress.total;
    }).length,
    dungeonGoals: dungeons.length,
    linkedItems: state.wishlist.filter(
      (entry) =>
        entry.status === "wanted" && getSelectedSource(entry, resolved),
    ).length,
    readyQuests: quests.filter((entry) => entry.ready).slice(0, 3),
    unresolvedItems: state.wishlist.filter(
      (entry) =>
        entry.status === "wanted" && !getSelectedSource(entry, resolved),
    ).length,
  };
}
/** Read-only route context: this never inserts, completes or reorders a route stop. */
export function getZoneAcquisitionGoals(
  state: CharacterAcquisition,
  dataset: AcquisitionDataset,
  zoneId: string,
  zoneName?: string,
): { quests: number; desiredItems: number; dungeonGoals: number } {
  const resolved = resolveAcquisition(state, dataset),
    matches = (entry: { zoneId?: string; zoneName?: string }) =>
      entry.zoneId === zoneId ||
      (!entry.zoneId &&
        Boolean(zoneName) &&
        entry.zoneName?.trim().toLowerCase() ===
          zoneName!.trim().toLowerCase());
  return {
    quests: getQuestGoals(state, dataset).filter(
      (entry) =>
        entry.quest &&
        entry.progress.status !== "completed" &&
        matches(entry.quest),
    ).length,
    desiredItems: state.wishlist.filter((entry) => {
      const source = getSelectedSource(entry, resolved);
      const quest = source?.questId
        ? resolved.quests.find((entry) => entry.id === source.questId)
        : undefined;
      const dungeon = source?.dungeonId
        ? resolved.dungeons.find((entry) => entry.id === source.dungeonId)
        : undefined;
      return (
        entry.status === "wanted" &&
        source &&
        (matches(source) ||
          Boolean(quest && matches(quest)) ||
          Boolean(dungeon && matches(dungeon)))
      );
    }).length,
    dungeonGoals: getDungeonGoals(state, dataset).filter(
      (entry) => entry.dungeon && matches(entry.dungeon),
    ).length,
  };
}

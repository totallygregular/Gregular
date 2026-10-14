import type { AcquisitionDataset, AcquisitionMethod, ItemQuality, ItemRecord } from "./acquisitionTypes";
import { getStatValue, isItemStatKey, normaliseItemStats, statLabel, type ItemStatKey, type NormalisedItemStats } from "./itemStats";

export type MatchStatus = "match" | "no-match" | "unknown";
export type GearLevelMode = "all" | "current" | "plus5" | "plus10" | "custom";
export type GearSort = "match" | "route" | "level" | "quality" | "name" | "stat";
export interface GearStatCriterion { key: ItemStatKey; minimum?: number }
export interface GearSearchOptions {
  name?: string;
  slot?: string;
  quality?: ItemQuality | string;
  equipmentType?: string;
  equipmentTypes?: string[];
  method?: AcquisitionMethod | string;
  stats?: GearStatCriterion[];
  statMode?: "any" | "all";
  includeIncomplete?: boolean;
  level?: { mode: GearLevelMode; min?: number; max?: number };
  /** Compatibility with the existing equipment filter; this is item-required level. */
  maxLevel?: number;
  classMode?: "all" | "exclude-known-incompatible" | "confirmed-only";
  sort?: GearSort;
  sortStat?: ItemStatKey;
}
export interface GearCharacterContext { level: number; className: string }
export interface StatMatch {
  status: MatchStatus;
  matched: { key: ItemStatKey; value: number; minimum?: number }[];
  unknownKeys: ItemStatKey[];
  missingKeys: ItemStatKey[];
}
export interface GearSearchResult {
  item: ItemRecord;
  /** Search-filter confirmation, not a claim that the character can equip the item. */
  status: "match" | "unknown";
  statMatch: StatMatch;
  stats: NormalisedItemStats;
  suitability: {
    level: MatchStatus;
    classRestriction: MatchStatus;
    /** No Forever armor/weapon proficiency matrix has been established. */
    equipmentRules: "unknown";
  };
  reasons: string[];
}
export interface GearSearchIndex {
  kind: "gear-search-index-v1";
  version: string;
  entries: {
    item: ItemRecord;
    stats: NormalisedItemStats;
    methods: ReadonlySet<AcquisitionMethod>;
  }[];
}

/** Build once per resolved reference snapshot; no provider/network calls or profile writes. */
export function createGearSearchIndex(data: AcquisitionDataset): GearSearchIndex {
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  return {
    kind: "gear-search-index-v1",
    version: data.version,
    entries: data.items.map((item) => ({
      item,
      stats: normaliseItemStats(item),
      methods: new Set(item.sourceIds.length
        ? item.sourceIds.map((id) => sources.get(id)?.method ?? "unknown")
        : ["unknown"]),
    })),
  };
}

function criteria(options: GearSearchOptions): GearStatCriterion[] {
  const unique = new Map<ItemStatKey, GearStatCriterion>();
  for (const criterion of options.stats ?? []) {
    if (!isItemStatKey(criterion.key) || (criterion.minimum !== undefined &&
      (!Number.isFinite(criterion.minimum) || criterion.minimum < 0 || criterion.minimum > 1_000_000)))
      throw new RangeError("Choose a supported statistic and a nonnegative numeric minimum.");
    const previous = unique.get(criterion.key);
    if (!previous || (criterion.minimum ?? 0) > (previous.minimum ?? 0)) unique.set(criterion.key, { ...criterion });
  }
  return [...unique.values()];
}

export function matchItemStats(stats: NormalisedItemStats, selected: GearStatCriterion[], mode: "any" | "all" = "any"): StatMatch {
  const matched: StatMatch["matched"] = [];
  const unknownKeys: ItemStatKey[] = [];
  const missingKeys: ItemStatKey[] = [];
  for (const criterion of selected) {
    const value = getStatValue(stats, criterion.key);
    if (value === undefined) unknownKeys.push(criterion.key);
    // A zero/negative bonus is not positive presence, including when the entered minimum is zero.
    else if (value > 0 && (criterion.minimum === undefined || value >= criterion.minimum))
      matched.push({ ...criterion, value });
    else missingKeys.push(criterion.key);
  }
  const status: MatchStatus = selected.length === 0 ? "match" : mode === "all"
    ? missingKeys.length ? "no-match" : unknownKeys.length ? "unknown" : "match"
    : matched.length ? "match" : unknownKeys.length ? "unknown" : "no-match";
  return { status, matched, unknownKeys, missingKeys };
}

export function getGearLevelRange(character: GearCharacterContext, options: GearSearchOptions): { min?: number; max?: number } {
  const setting = options.level ?? { mode: "all" };
  const range = setting.mode === "current" ? { max: character.level }
    : setting.mode === "plus5" ? { max: Math.min(60, character.level + 5) }
    : setting.mode === "plus10" ? { max: Math.min(60, character.level + 10) }
    : setting.mode === "custom" ? { min: setting.min, max: setting.max }
    : {};
  const max = options.maxLevel === undefined ? range.max
    : range.max === undefined ? options.maxLevel : Math.min(range.max, options.maxLevel);
  const result = { ...range, max };
  if ([result.min, result.max].some((value) => value !== undefined && (!Number.isInteger(value) || value < 1)) ||
    (result.min !== undefined && result.max !== undefined && result.min > result.max))
    throw new RangeError("Choose a valid required-level range.");
  return result;
}

function matchLevel(item: ItemRecord, range: { min?: number; max?: number }): MatchStatus {
  if (range.min === undefined && range.max === undefined) return "match";
  if (item.requiredLevel === undefined) return "unknown";
  return (range.min === undefined || item.requiredLevel >= range.min) &&
    (range.max === undefined || item.requiredLevel <= range.max) ? "match" : "no-match";
}
function matchClass(item: ItemRecord, character: GearCharacterContext): MatchStatus {
  if (!item.classRestrictions.length || !character.className.trim()) return "unknown";
  return item.classRestrictions.some((name) => name.trim().toLowerCase() === character.className.trim().toLowerCase())
    ? "match" : "no-match";
}
const ascii = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const qualityRank: Record<ItemQuality, number> = { poor: 0, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, unknown: -1 };
const knownNumber = (a: number | undefined, b: number | undefined, descending = false) =>
  a === undefined ? b === undefined ? 0 : 1 : b === undefined ? -1 : descending ? b - a : a - b;
function tie(a: GearSearchResult, b: GearSearchResult): number {
  return ascii(a.item.name.toLowerCase(), b.item.name.toLowerCase()) ||
    ascii(a.item.name, b.item.name) || ascii(a.item.id, b.item.id);
}

/** Matching count is explainable; unlike stats are never added into a power score. */
export function sortGearResults(results: GearSearchResult[], options: GearSearchOptions, routeRanks: ReadonlyMap<string, number> = new Map()): GearSearchResult[] {
  const selectedKey = options.sortStat ?? options.stats?.[0]?.key;
  const route = (a: GearSearchResult, b: GearSearchResult) =>
    (routeRanks.get(a.item.id) ?? 3) - (routeRanks.get(b.item.id) ?? 3);
  const matched = (a: GearSearchResult, b: GearSearchResult) => b.statMatch.matched.length - a.statMatch.matched.length;
  return [...results].sort((a, b) => {
    const confirmation = Number(a.status === "unknown") - Number(b.status === "unknown");
    if (confirmation) return confirmation;
    switch (options.sort ?? "match") {
      case "route": return route(a, b) || matched(a, b) || tie(a, b);
      case "level": return knownNumber(a.item.requiredLevel, b.item.requiredLevel) || tie(a, b);
      case "quality": return qualityRank[b.item.quality] - qualityRank[a.item.quality] || tie(a, b);
      case "name": return tie(a, b);
      case "stat": return (selectedKey ? knownNumber(getStatValue(a.stats, selectedKey), getStatValue(b.stats, selectedKey), true) : 0) || tie(a, b);
      default: return matched(a, b) || a.statMatch.unknownKeys.length - b.statMatch.unknownKeys.length || route(a, b) || tie(a, b);
    }
  });
}

export function searchGear(data: AcquisitionDataset | GearSearchIndex, character: GearCharacterContext, options: GearSearchOptions = {}, routeRanks?: ReadonlyMap<string, number>): GearSearchResult[] {
  const index = "kind" in data ? data : createGearSearchIndex(data);
  const selected = criteria(options);
  const name = options.name?.trim().toLowerCase();
  const types = options.equipmentTypes?.length ? options.equipmentTypes : options.equipmentType ? [options.equipmentType] : [];
  const range = getGearLevelRange(character, options);
  const results: GearSearchResult[] = [];
  for (const entry of index.entries) {
    const { item, stats, methods } = entry;
    if ((name && !item.name.toLowerCase().includes(name)) ||
      (options.slot && item.slot !== options.slot) ||
      (options.quality && item.quality !== options.quality) ||
      (options.method && !methods.has(options.method as AcquisitionMethod))) continue;
    const typeMatch: MatchStatus = types.length === 0 ? "match" : !item.equipmentType ? "unknown"
      : types.includes(item.equipmentType) ? "match" : "no-match";
    const statMatch = matchItemStats(stats, selected, options.statMode);
    const level = matchLevel(item, range);
    const classRestriction = matchClass(item, character);
    const classMode = options.classMode ?? "exclude-known-incompatible";
    const classFilter: MatchStatus = classMode === "all" ? "match" : classMode === "confirmed-only"
      ? classRestriction : classRestriction === "no-match" ? "no-match" : "match";
    const matches = [typeMatch, statMatch.status, level, classFilter];
    if (matches.includes("no-match")) continue;
    const status = matches.includes("unknown") ? "unknown" : "match";
    if (status === "unknown" && !options.includeIncomplete) continue;
    const reasons: string[] = [];
    if (selected.length) reasons.push(`${statMatch.matched.length} of ${selected.length} selected stats meet the filters`);
    if (statMatch.unknownKeys.length) reasons.push(`Stat data incomplete: ${statMatch.unknownKeys.map(statLabel).join(", ")}`);
    if (level === "unknown") reasons.push("Item required level unknown");
    else if (range.min !== undefined || range.max !== undefined) reasons.push(`Required level ${item.requiredLevel} is within the selected window`);
    if (typeMatch === "unknown") reasons.push("Equipment type unknown");
    if (classRestriction === "unknown") reasons.push("Class restrictions and Forever equipment rules are not established");
    else if (classRestriction === "match") reasons.push(`Listed class restriction includes ${character.className}; equipment proficiency still needs checking`);
    else reasons.push(`Listed class restriction excludes ${character.className}`);
    results.push({ item, stats, status, statMatch, suitability: { level, classRestriction, equipmentRules: "unknown" }, reasons });
  }
  return sortGearResults(results, options, routeRanks);
}

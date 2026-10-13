import type { AcquisitionEvidence, ItemRecord } from "./acquisitionTypes";

/** Units are part of the field identity: percentages are never treated as ratings. */
export const statDefinitions = [
  { key: "strength", label: "Strength", unit: "points" },
  { key: "agility", label: "Agility", unit: "points" },
  { key: "stamina", label: "Stamina", unit: "points" },
  { key: "intellect", label: "Intellect", unit: "points" },
  { key: "spirit", label: "Spirit", unit: "points" },
  { key: "armor", label: "Armor", unit: "points" },
  { key: "attackPower", label: "Attack power", unit: "points" },
  { key: "spellDamage", label: "Spell damage", unit: "points" },
  { key: "healingPower", label: "Healing power", unit: "points" },
  { key: "spellHitPercent", label: "Spell hit", unit: "%" },
  { key: "spellCritPercent", label: "Spell crit", unit: "%" },
  { key: "manaPer5", label: "Mana per 5 seconds", unit: "per 5 seconds" },
  { key: "healthPer5", label: "Health per 5 seconds", unit: "per 5 seconds" },
] as const;

export type ItemStatKey = (typeof statDefinitions)[number]["key"];
export type StatCompleteness = "complete" | "partial" | "unknown";
export interface ItemStatProfile {
  values: Partial<Record<ItemStatKey, number>>;
  /** Missing fields are confirmed zero only for an explicitly complete stat set. */
  completeness: StatCompleteness;
  /** Records a reviewed field/label conversion; provenance remains on the item. */
  mappingNote?: string;
}
export interface NormalisedItemStats extends ItemStatProfile {
  evidence: AcquisitionEvidence;
  origin: "structured" | "display-compatibility";
  unmapped: ItemRecord["stats"];
  conflictingKeys: ItemStatKey[];
}

/** Broad editable search aids, not class priorities or an item-power calculation. */
export const statPresets: { id: string; label: string; stats: ItemStatKey[] }[] = [
  { id: "caster", label: "Caster damage", stats: ["intellect", "spellDamage"] },
  { id: "healing", label: "Healing", stats: ["intellect", "spirit", "healingPower", "manaPer5"] },
  { id: "physical", label: "Physical damage", stats: ["strength", "agility", "attackPower"] },
  { id: "tank", label: "Tank survivability", stats: ["stamina", "armor"] },
];

const aliases: Readonly<Record<string, ItemStatKey>> = {
  strength: "strength", str: "strength",
  agility: "agility", agi: "agility",
  stamina: "stamina", sta: "stamina",
  intellect: "intellect", int: "intellect",
  spirit: "spirit", spi: "spirit",
  armor: "armor", armour: "armor",
  "attack power": "attackPower",
  "spell damage": "spellDamage",
  "healing power": "healingPower",
  "spell hit": "spellHitPercent", "spell hit chance": "spellHitPercent",
  "spell crit": "spellCritPercent", "spell critical strike chance": "spellCritPercent",
  mp5: "manaPer5", "mana per 5 seconds": "manaPer5", "mana per five seconds": "manaPer5",
  "health per 5 seconds": "healthPer5", "health per five seconds": "healthPer5",
};
const normaliseLabel = (label: string) => label.trim().toLowerCase().replace(/\s+/g, " ");

export function isItemStatKey(value: string): value is ItemStatKey {
  return statDefinitions.some((definition) => definition.key === value);
}
export function statLabel(key: ItemStatKey): string {
  return statDefinitions.find((definition) => definition.key === key)!.label;
}
export function formatStat(key: ItemStatKey, value: number): string {
  const suffix = statDefinitions.find((definition) => definition.key === key)!.unit === "%" ? "%" : "";
  return `${value > 0 ? "+" : ""}${value}${suffix} ${statLabel(key)}`;
}

/** Strict compatibility parser; no effect text, ranges, procs or ambiguous healing aliases. */
function parseDisplayStat(stat: ItemRecord["stats"][number]): { key: ItemStatKey; value: number } | undefined {
  const key = aliases[normaliseLabel(stat.label)];
  if (!key) return undefined;
  const percent = key === "spellHitPercent" || key === "spellCritPercent";
  const pattern = percent ? /^[+-]?\d+(?:\.\d+)?\s*%$/ : /^[+-]?\d+(?:\.\d+)?$/;
  if (!pattern.test(stat.value.trim())) return undefined;
  const value = Number(stat.value.replace(/%\s*$/, "").trim());
  return Number.isFinite(value) && Math.abs(value) <= 1_000_000 ? { key, value } : undefined;
}

export function normaliseItemStats(item: ItemRecord): NormalisedItemStats {
  const parsed = item.stats.map((stat) => ({ stat, parsed: parseDisplayStat(stat) }));
  if (item.numericStats) {
    return {
      ...item.numericStats,
      values: { ...item.numericStats.values },
      evidence: item.evidence,
      origin: "structured",
      // Display-only bonuses remain available even when a reviewed numeric set exists.
      unmapped: parsed.filter(({ parsed }) => !parsed).map(({ stat }) => ({ ...stat })),
      conflictingKeys: [],
    };
  }
  const values: ItemStatProfile["values"] = {};
  const conflicts = new Set<ItemStatKey>();
  for (const entry of parsed) {
    if (!entry.parsed) continue;
    const { key, value } = entry.parsed;
    if (conflicts.has(key)) continue;
    if (values[key] !== undefined && values[key] !== value) {
      delete values[key];
      conflicts.add(key);
    } else values[key] = value; // Identical aliases describe one effect, not two bonuses.
  }
  return {
    values,
    completeness: Object.keys(values).length ? "partial" : "unknown",
    evidence: item.evidence,
    origin: "display-compatibility",
    unmapped: parsed.filter(({ parsed }) => !parsed || conflicts.has(parsed.key)).map(({ stat }) => ({ ...stat })),
    conflictingKeys: [...conflicts].sort(),
  };
}

/** Undefined is unknown; a confirmed numeric zero is returned as zero. */
export function getStatValue(stats: ItemStatProfile, key: ItemStatKey): number | undefined {
  return stats.values[key] ?? (stats.completeness === "complete" ? 0 : undefined);
}

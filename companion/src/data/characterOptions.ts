/** Manually reviewed Forever choices; no retail or inferred race/class combinations. */
export interface RaceOption {
  id: string;
  label: string;
  /** Canonical profile value; Skyborne affiliation stays in the existing faction field. */
  race: string;
  faction: "Alliance" | "Horde";
  classNames: string[];
}

const REVIEWED = "2026-10-13";
const HERO = "blizzard-forever-race-classes";
const HUNTER_DRUID = "blizzard-forever-hunter-druid";
const MAGE_SHAMAN = "blizzard-forever-mage-shaman";
const PRIEST_WARRIOR = "blizzard-forever-priest-warrior";
const ROGUE_WARLOCK = "blizzard-forever-rogue-warlock";
const PALADIN = "blizzard-forever-panel-paladin";

export const characterOptionsReview = {
  edition: "WoW Forever",
  reviewedAt: REVIEWED,
  confidence: "forever-confirmed",
  gameRevision: null,
  raceClassesSourceId: HERO,
  note: "Official published beta choices, reviewed on this date; later game updates may change availability.",
} as const;

export const characterOptionSources = [
  {
    id: HERO,
    title: "Create the Hero You Want to Be in World of Warcraft: Forever",
    url: "https://news.blizzard.com/en-us/article/24304075/create-the-hero-you-want-to-be-in-world-of-warcraft-forever",
  },
  {
    id: HUNTER_DRUID,
    title: "World of Warcraft: Forever Class Deep Dives — Hunter and Druid",
    url: "https://news.blizzard.com/en-us/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid",
  },
  {
    id: MAGE_SHAMAN,
    title: "World of Warcraft: Forever Class Deep Dives — Mage and Shaman",
    url: "https://news.blizzard.com/en-us/article/24302097/world-of-warcraft-forever-class-deep-dives-mage-and-shaman",
  },
  {
    id: PRIEST_WARRIOR,
    title: "World of Warcraft: Forever Class Deep Dives — Priest and Warrior",
    url: "https://news.blizzard.com/en-us/article/24301514/world-of-warcraft-forever-class-deep-dives-priest-and-warrior",
  },
  {
    id: ROGUE_WARLOCK,
    title: "World of Warcraft: Forever Class Deep Dives — Rogue and Warlock",
    url: "https://news.blizzard.com/en-us/article/24310968/world-of-warcraft-forever-class-deep-dives-rogue-and-warlock",
  },
  {
    id: PALADIN,
    title: "World of Warcraft: Forever Deep Dive Panel Recap",
    url: "https://news.blizzard.com/en-us/article/24303313/world-of-warcraft-forever-deep-dive-panel-recap",
  },
].map((source) => ({
  ...source,
  publisher: "Blizzard Entertainment",
  reviewedAt: REVIEWED,
  confidence: "forever-confirmed" as const,
}));

export const raceOptions: RaceOption[] = [
  { id: "dwarf", label: "Dwarf", race: "Dwarf", faction: "Alliance", classNames: ["Hunter", "Paladin", "Priest", "Rogue", "Shaman", "Warrior"] },
  { id: "gnome", label: "Gnome", race: "Gnome", faction: "Alliance", classNames: ["Mage", "Priest", "Rogue", "Warlock", "Warrior"] },
  { id: "human", label: "Human", race: "Human", faction: "Alliance", classNames: ["Hunter", "Mage", "Paladin", "Priest", "Rogue", "Warlock", "Warrior"] },
  { id: "night-elf", label: "Night Elf", race: "Night Elf", faction: "Alliance", classNames: ["Druid", "Hunter", "Priest", "Rogue", "Warrior"] },
  { id: "skyborne-alliance", label: "High Order Skyborne (Alliance)", race: "Skyborne", faction: "Alliance", classNames: ["Druid", "Hunter", "Mage", "Rogue", "Warrior"] },
  { id: "orc", label: "Orc", race: "Orc", faction: "Horde", classNames: ["Hunter", "Mage", "Rogue", "Shaman", "Warlock", "Warrior"] },
  { id: "tauren", label: "Tauren", race: "Tauren", faction: "Horde", classNames: ["Druid", "Hunter", "Shaman", "Warrior"] },
  { id: "troll", label: "Troll", race: "Troll", faction: "Horde", classNames: ["Hunter", "Mage", "Priest", "Rogue", "Shaman", "Warlock", "Warrior"] },
  { id: "undead", label: "Undead", race: "Undead", faction: "Horde", classNames: ["Mage", "Paladin", "Priest", "Rogue", "Warlock", "Warrior"] },
  { id: "skyborne-horde", label: "Windshaper Skyborne (Horde)", race: "Skyborne", faction: "Horde", classNames: ["Druid", "Hunter", "Rogue", "Shaman", "Warrior"] },
];

export const classSpecialisations: Record<string, { names: string[]; sourceId: string }> = {
  Druid: { names: ["Balance", "Feral Combat", "Restoration"], sourceId: HUNTER_DRUID },
  Hunter: { names: ["Beast Mastery", "Marksmanship", "Survival"], sourceId: HUNTER_DRUID },
  Mage: { names: ["Arcane", "Fire", "Frost"], sourceId: MAGE_SHAMAN },
  Paladin: { names: ["Holy", "Protection", "Retribution"], sourceId: PALADIN },
  Priest: { names: ["Discipline", "Holy", "Shadow"], sourceId: PRIEST_WARRIOR },
  Rogue: { names: ["Assassination", "Combat", "Subtlety"], sourceId: ROGUE_WARLOCK },
  Shaman: { names: ["Elemental Combat", "Enhancement", "Restoration"], sourceId: MAGE_SHAMAN },
  Warlock: { names: ["Affliction", "Demonology", "Destruction"], sourceId: ROGUE_WARLOCK },
  Warrior: { names: ["Arms", "Fury", "Protection"], sourceId: PRIEST_WARRIOR },
};

/** Return copies so form code cannot mutate the reviewed availability table. */
export function classesForRace(raceOptionId: string): string[] {
  return [...(raceOptions.find(({ id }) => id === raceOptionId)?.classNames ?? [])];
}

export function specialisationsForClass(className: string): string[] {
  return Object.hasOwn(classSpecialisations, className)
    ? [...classSpecialisations[className].names]
    : [];
}

/** Unknown or contradictory legacy values remain unknown; never guess an affiliation. */
export function raceOptionFor(race: string, faction: string): RaceOption | undefined {
  const normalizedRace = race.trim().toLowerCase();
  const normalizedFaction = faction.trim().toLowerCase();
  return raceOptions.find((option) =>
    option.race.toLowerCase() === normalizedRace &&
    option.faction.toLowerCase() === normalizedFaction,
  );
}

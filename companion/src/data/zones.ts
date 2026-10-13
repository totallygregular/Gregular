/** Reviewed facts and explicitly provisional guidance; personal ranges live in profiles. */
export type EvidenceKind =
  | "forever-confirmed"
  | "client-derived"
  | "classic-derived"
  | "editorial"
  | "unknown";
export type ZoneFaction = "Alliance" | "Horde" | "Both" | "Unknown";
export interface FieldEvidence {
  kind: EvidenceKind;
  confidence: "high" | "medium" | "low" | "unknown";
  sourceIds: string[];
  note: string;
}
export interface CatalogueSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  reviewedAt: string;
  gameRevision: string | null;
  reuse: string;
}
export interface ZoneRecord {
  id: string;
  name: string;
  continent: "Eastern Kingdoms" | "Kalimdor" | "Skywall";
  region: string;
  /** Recommended questing audience, independent from territory and hard entry restrictions. */
  faction: ZoneFaction;
  accessFactions?: string[];
  recommendedLevel?: { min: number; max: number };
  startingRaces: string[];
  adjoiningZoneIds: string[];
  sourceUrls: string[];
  reviewedAt: string;
  gameRevision: string | null;
  evidence: {
    identity: FieldEvidence;
    levels: FieldEvidence;
    faction: FieldEvidence;
    startingRaces: FieldEvidence;
    geography: FieldEvidence;
  };
}

const REVIEWED = "2026-10-13";
export const catalogueSources: CatalogueSource[] = [
  {
    id: "blizzard-found-photos",
    title: "World of Warcraft: Forever Found Photos Panel Recap",
    publisher: "Blizzard Entertainment",
    url: "https://news.blizzard.com/en-gb/article/24304071/world-of-warcraft-forever-found-photos-panel-recap",
    publishedAt: "2026-09-13",
    reviewedAt: REVIEWED,
    gameRevision: null,
    reuse: "Concise factual attribution only; no prose, images or maps copied.",
  },
  {
    id: "blizzard-skyborne",
    title: "WoW: Forever Meet the New Skyborne",
    publisher: "Blizzard Entertainment",
    url: "https://news.blizzard.com/en-gb/article/24302071/wow-forever-meet-the-new-skyborne",
    publishedAt: "2026-09-22",
    reviewedAt: REVIEWED,
    gameRevision: null,
    reuse: "Concise factual attribution only.",
  },
  {
    id: "foreverdb-leveling",
    title: "Leveling to 30: where to go",
    publisher: "ForeverDB",
    url: "https://foreverdb.net/guide/leveling",
    publishedAt: "2026-10-02",
    reviewedAt: REVIEWED,
    gameRevision: "1.60.1.70170 (guide); 1.60.1.70291 (review footer)",
    reuse:
      "Selected numerical facts and race associations, manually curated; no guide prose copied. Ranges use Classic quest levels.",
  },
  {
    id: "foreverdb-maps",
    title: "WoW Forever world map index (extracted 2026-10-12)",
    publisher: "ForeverDB",
    url: "https://foreverdb.net/maps",
    publishedAt: null,
    reviewedAt: REVIEWED,
    gameRevision: "1.60.1.70338 (reported extraction)",
    reuse:
      "Names and client-presence attribution only. No map images or database dump imported.",
  },
  {
    id: "foreverdb-travel",
    title: "Travel planner: flight paths and ships",
    publisher: "ForeverDB",
    url: "https://foreverdb.net/travel",
    publishedAt: null,
    reviewedAt: REVIEWED,
    gameRevision: null,
    reuse:
      "Selected transport endpoint/type/faction facts; no prose or wholesale graph import.",
  },
  {
    id: "libtourist-classic",
    title:
      "LibTourist Classic Era 1.15.9 — d2380757a8fe2b1cb2d341817e36e1cd0bccee3a",
    publisher: "Odica / LibTourist contributors",
    url: "https://www.curseforge.com/wow/addons/libtourist-classic-era/files/8865898",
    publishedAt: "2026-09-12",
    reviewedAt: REVIEWED,
    gameRevision: "Classic Era 1.15.9; not Forever",
    reuse:
      "MIT-licensed zone range and explicit road-connection facts. Notice retained in docs/zone-provenance.md.",
  },
];

export const catalogueMetadata = {
  version: "forever-zones-2026-10-13.1",
  reviewedAt: REVIEWED,
  gameRevision: "1.60.1.70338 (community-reported client snapshot)",
  sources: catalogueSources,
};

export function evidence(
  kind: EvidenceKind,
  sourceIds: string[],
  note: string,
): FieldEvidence {
  return {
    kind,
    sourceIds,
    note,
    confidence:
      kind === "forever-confirmed"
        ? "high"
        : kind === "client-derived"
          ? "medium"
          : kind === "unknown"
            ? "unknown"
            : "low",
  };
}
export function confidenceLabel(field: FieldEvidence): string {
  return {
    "forever-confirmed": "Forever confirmed",
    "client-derived": "Client-derived · provisional",
    "classic-derived": "Classic-derived · provisional",
    editorial: "Editorial estimate",
    unknown: "Unknown",
  }[field.kind];
}

type ZoneSeed = [
  slug: string,
  name: string,
  continent: ZoneRecord["continent"],
  region: string,
  faction: ZoneFaction,
  min?: number,
  max?: number,
  races?: string[],
  rangeSource?:
    | "foreverdb-leveling"
    | "libtourist-classic"
    | "blizzard-skyborne",
];
const seeds: ZoneSeed[] = [
  [
    "elwynn-forest",
    "Elwynn Forest",
    "Eastern Kingdoms",
    "Kingdom of Stormwind",
    "Alliance",
    1,
    12,
    ["Human"],
  ],
  [
    "dun-morogh",
    "Dun Morogh",
    "Eastern Kingdoms",
    "Khaz Modan",
    "Alliance",
    1,
    12,
    ["Dwarf", "Gnome"],
  ],
  [
    "teldrassil",
    "Teldrassil",
    "Kalimdor",
    "Northern Kalimdor",
    "Alliance",
    1,
    12,
    ["Night Elf"],
  ],
  [
    "durotar",
    "Durotar",
    "Kalimdor",
    "Central Kalimdor",
    "Horde",
    1,
    12,
    ["Orc", "Troll"],
  ],
  [
    "mulgore",
    "Mulgore",
    "Kalimdor",
    "Central Kalimdor",
    "Horde",
    1,
    12,
    ["Tauren"],
  ],
  [
    "tirisfal-glades",
    "Tirisfal Glades",
    "Eastern Kingdoms",
    "Lordaeron",
    "Horde",
    1,
    12,
    ["Undead", "Forsaken"],
  ],
  [
    "zephras-isle",
    "Zephras Isle",
    "Skywall",
    "Skywall",
    "Both",
    1,
    12,
    ["Skyborne", "High Order Skyborne", "Windshaper Skyborne"],
    "blizzard-skyborne",
  ],
  [
    "westfall",
    "Westfall",
    "Eastern Kingdoms",
    "Kingdom of Stormwind",
    "Alliance",
    10,
    18,
    [],
    "foreverdb-leveling",
  ],
  [
    "loch-modan",
    "Loch Modan",
    "Eastern Kingdoms",
    "Khaz Modan",
    "Alliance",
    10,
    20,
    [],
    "foreverdb-leveling",
  ],
  [
    "darkshore",
    "Darkshore",
    "Kalimdor",
    "Northern Kalimdor",
    "Alliance",
    12,
    20,
    [],
    "foreverdb-leveling",
  ],
  [
    "silverpine-forest",
    "Silverpine Forest",
    "Eastern Kingdoms",
    "Lordaeron",
    "Horde",
    10,
    18,
    [],
    "foreverdb-leveling",
  ],
  [
    "the-barrens",
    "The Barrens",
    "Kalimdor",
    "Central Kalimdor",
    "Horde",
    10,
    25,
    [],
    "foreverdb-leveling",
  ],
  [
    "redridge-mountains",
    "Redridge Mountains",
    "Eastern Kingdoms",
    "Kingdom of Stormwind",
    "Alliance",
    14,
    25,
    [],
    "foreverdb-leveling",
  ],
  [
    "stonetalon-mountains",
    "Stonetalon Mountains",
    "Kalimdor",
    "Central Kalimdor",
    "Both",
    18,
    28,
    [],
    "foreverdb-leveling",
  ],
  [
    "ashenvale",
    "Ashenvale",
    "Kalimdor",
    "Northern Kalimdor",
    "Both",
    20,
    30,
    [],
    "foreverdb-leveling",
  ],
  [
    "wetlands",
    "Wetlands",
    "Eastern Kingdoms",
    "Khaz Modan",
    "Alliance",
    21,
    31,
    [],
    "foreverdb-leveling",
  ],
  [
    "duskwood",
    "Duskwood",
    "Eastern Kingdoms",
    "Kingdom of Stormwind",
    "Alliance",
    24,
    32,
    [],
    "foreverdb-leveling",
  ],
  [
    "hillsbrad-foothills",
    "Hillsbrad Foothills",
    "Eastern Kingdoms",
    "Lordaeron",
    "Both",
    24,
    37,
    [],
    "foreverdb-leveling",
  ],
  [
    "thousand-needles",
    "Thousand Needles",
    "Kalimdor",
    "Southern Kalimdor",
    "Both",
    28,
    41,
    [],
    "foreverdb-leveling",
  ],
  [
    "alterac-mountains",
    "Alterac Mountains",
    "Eastern Kingdoms",
    "Lordaeron",
    "Both",
    30,
    40,
  ],
  [
    "arathi-highlands",
    "Arathi Highlands",
    "Eastern Kingdoms",
    "Lordaeron",
    "Both",
    30,
    40,
  ],
  [
    "stranglethorn-vale",
    "Stranglethorn Vale",
    "Eastern Kingdoms",
    "Southern Eastern Kingdoms",
    "Both",
    30,
    45,
  ],
  ["desolace", "Desolace", "Kalimdor", "Central Kalimdor", "Both", 30, 40],
  [
    "dustwallow-marsh",
    "Dustwallow Marsh",
    "Kalimdor",
    "Southern Kalimdor",
    "Both",
    35,
    45,
  ],
  ["badlands", "Badlands", "Eastern Kingdoms", "Khaz Modan", "Both", 35, 45],
  [
    "swamp-of-sorrows",
    "Swamp of Sorrows",
    "Eastern Kingdoms",
    "Southern Eastern Kingdoms",
    "Both",
    35,
    45,
  ],
  [
    "the-hinterlands",
    "The Hinterlands",
    "Eastern Kingdoms",
    "Lordaeron",
    "Both",
    40,
    50,
  ],
  ["feralas", "Feralas", "Kalimdor", "Southern Kalimdor", "Both", 40, 50],
  ["tanaris", "Tanaris", "Kalimdor", "Southern Kalimdor", "Both", 40, 50],
  [
    "searing-gorge",
    "Searing Gorge",
    "Eastern Kingdoms",
    "Khaz Modan",
    "Both",
    43,
    50,
  ],
  [
    "blasted-lands",
    "Blasted Lands",
    "Eastern Kingdoms",
    "Southern Eastern Kingdoms",
    "Both",
    47,
    55,
  ],
  ["azshara", "Azshara", "Kalimdor", "Northern Kalimdor", "Both", 48, 55],
  ["felwood", "Felwood", "Kalimdor", "Northern Kalimdor", "Both", 48, 55],
  [
    "ungoro-crater",
    "Un'Goro Crater",
    "Kalimdor",
    "Southern Kalimdor",
    "Both",
    48,
    55,
  ],
  [
    "western-plaguelands",
    "Western Plaguelands",
    "Eastern Kingdoms",
    "Lordaeron",
    "Both",
    50,
    60,
  ],
  [
    "burning-steppes",
    "Burning Steppes",
    "Eastern Kingdoms",
    "Khaz Modan",
    "Both",
    50,
    60,
  ],
  [
    "eastern-plaguelands",
    "Eastern Plaguelands",
    "Eastern Kingdoms",
    "Lordaeron",
    "Both",
    55,
    60,
  ],
  [
    "winterspring",
    "Winterspring",
    "Kalimdor",
    "Northern Kalimdor",
    "Both",
    55,
    60,
  ],
  ["silithus", "Silithus", "Kalimdor", "Southern Kalimdor", "Both", 55, 60],
  [
    "deadwind-pass",
    "Deadwind Pass",
    "Eastern Kingdoms",
    "Kingdom of Stormwind",
    "Both",
  ],
  ["moonglade", "Moonglade", "Kalimdor", "Northern Kalimdor", "Both"],
  [
    "riverglades",
    "Riverglades",
    "Eastern Kingdoms",
    "Eastern Kingdoms",
    "Both",
  ],
  ["mount-hyjal", "Mount Hyjal", "Kalimdor", "Northern Kalimdor", "Unknown"],
  ["shendralas", "Shen'dralas", "Kalimdor", "South of Desolace", "Unknown"],
  ["darkspear-islands", "Darkspear Islands", "Kalimdor", "Kalimdor", "Unknown"],
];

/** Explicit Classic road facts only; transport edges are in travel.ts. */
export const classicRoadPairs: [string, string][] = [
  ["elwynn-forest", "westfall"],
  ["elwynn-forest", "redridge-mountains"],
  ["elwynn-forest", "duskwood"],
  ["westfall", "duskwood"],
  ["redridge-mountains", "duskwood"],
  ["redridge-mountains", "burning-steppes"],
  ["duskwood", "stranglethorn-vale"],
  ["duskwood", "deadwind-pass"],
  ["deadwind-pass", "swamp-of-sorrows"],
  ["swamp-of-sorrows", "blasted-lands"],
  ["dun-morogh", "loch-modan"],
  ["loch-modan", "wetlands"],
  ["loch-modan", "badlands"],
  ["badlands", "searing-gorge"],
  ["wetlands", "arathi-highlands"],
  ["arathi-highlands", "hillsbrad-foothills"],
  ["hillsbrad-foothills", "silverpine-forest"],
  ["silverpine-forest", "tirisfal-glades"],
  ["hillsbrad-foothills", "alterac-mountains"],
  ["hillsbrad-foothills", "the-hinterlands"],
  ["alterac-mountains", "western-plaguelands"],
  ["the-hinterlands", "western-plaguelands"],
  ["tirisfal-glades", "western-plaguelands"],
  ["western-plaguelands", "eastern-plaguelands"],
  ["durotar", "the-barrens"],
  ["mulgore", "the-barrens"],
  ["the-barrens", "ashenvale"],
  ["the-barrens", "stonetalon-mountains"],
  ["the-barrens", "dustwallow-marsh"],
  ["the-barrens", "thousand-needles"],
  ["darkshore", "ashenvale"],
  ["ashenvale", "stonetalon-mountains"],
  ["ashenvale", "azshara"],
  ["ashenvale", "felwood"],
  ["stonetalon-mountains", "desolace"],
  ["desolace", "feralas"],
  ["feralas", "thousand-needles"],
  ["thousand-needles", "tanaris"],
  ["tanaris", "ungoro-crater"],
  ["ungoro-crater", "silithus"],
];
export const zoneId = (slug: string) => `forever:zone:${slug}`;

export const zoneCatalogue: ZoneRecord[] = seeds.map(
  ([
    slug,
    name,
    continent,
    region,
    faction,
    min,
    max,
    startingRaces = [],
    rangeSource = "libtourist-classic",
  ]) => {
    const newZone = [
      "zephras-isle",
      "riverglades",
      "mount-hyjal",
      "shendralas",
    ].includes(slug);
    const rangeEvidence =
      min !== undefined && max !== undefined
        ? evidence(
            rangeSource === "blizzard-skyborne"
              ? "forever-confirmed"
              : "classic-derived",
            [rangeSource],
            rangeSource === "foreverdb-leveling"
              ? "Approximate Classic quest-level percentiles for quests present in the Forever client; new Forever quests are not included."
              : rangeSource === "blizzard-skyborne"
                ? "Blizzard announced a level 1–12 starting experience."
                : "Classic Era guidance; Forever questing suitability is not verified.",
          )
        : evidence(
            "unknown",
            [],
            "No reliable general questing range established; choose a personal range.",
          );
    const identity = evidence(
      newZone ? "forever-confirmed" : "client-derived",
      [
        newZone
          ? slug === "zephras-isle"
            ? "blizzard-skyborne"
            : "blizzard-found-photos"
          : "foreverdb-maps",
      ],
      newZone
        ? "Zone announced by Blizzard for Forever."
        : "Zone presence reported in the Forever client; not independently checked in gameplay.",
    );
    const guideAudience =
      rangeSource === "foreverdb-leveling" || startingRaces.length > 0;
    const factionEvidence =
      faction === "Unknown"
        ? evidence("unknown", [], "Questing audience is unresolved.")
        : slug === "zephras-isle" || slug === "riverglades"
          ? evidence(
              "forever-confirmed",
              [
                slug === "zephras-isle"
                  ? "blizzard-skyborne"
                  : "blizzard-found-photos",
              ],
              "Both factions have announced content. This does not establish transport access.",
            )
          : guideAudience
            ? evidence(
                "editorial",
                ["foreverdb-leveling"],
                "Questing audience curated from the guide's faction routes, not a territorial access rule. Redridge, Duskwood and Wetlands are recommended to Alliance; their contested territory does not imply a useful Horde quest route.",
              )
            : evidence(
                "editorial",
                ["libtourist-classic"],
                "Broad Classic contested-zone questing estimate for both factions. Individual quest availability varies and Forever content is not verified.",
              );
    const sources = [
      ...new Set([
        ...identity.sourceIds,
        ...rangeEvidence.sourceIds,
        ...factionEvidence.sourceIds,
        "foreverdb-maps",
        ...(startingRaces.length
          ? [
              slug === "zephras-isle"
                ? "blizzard-skyborne"
                : "foreverdb-leveling",
            ]
          : []),
      ]),
    ];
    return {
      id: zoneId(slug),
      name,
      continent,
      region,
      faction,
      recommendedLevel:
        min !== undefined && max !== undefined ? { min, max } : undefined,
      startingRaces,
      adjoiningZoneIds: classicRoadPairs.flatMap(([a, b]) =>
        a === slug ? [zoneId(b)] : b === slug ? [zoneId(a)] : [],
      ),
      sourceUrls: sources.map(
        (id) => catalogueSources.find((source) => source.id === id)!.url,
      ),
      reviewedAt: REVIEWED,
      gameRevision: "1.60.1.70338 (reported client presence)",
      evidence: {
        identity,
        levels: rangeEvidence,
        faction: factionEvidence,
        startingRaces: startingRaces.length
          ? evidence(
              slug === "zephras-isle" ? "forever-confirmed" : "classic-derived",
              [
                slug === "zephras-isle"
                  ? "blizzard-skyborne"
                  : "foreverdb-leveling",
              ],
              "Optional starting suggestion; class legality is not inferred.",
            )
          : evidence("unknown", [], "No race starting association recorded."),
        geography: evidence(
          "editorial",
          ["foreverdb-maps"],
          "Broad geographical grouping for browsing. Does not imply a traversable connection.",
        ),
      },
    };
  },
);

export function getZone(
  id: string,
  catalogue: readonly ZoneRecord[] = zoneCatalogue,
): ZoneRecord | undefined {
  return catalogue.find((zone) => zone.id === id);
}
export function startingZoneFor(
  race: string,
  faction: string,
  catalogue: readonly ZoneRecord[] = zoneCatalogue,
): ZoneRecord | undefined {
  if (faction !== "Alliance" && faction !== "Horde") return undefined;
  const normalized = race.trim().toLowerCase().replace(/[-_]+/g, " ");
  if (normalized === "high order skyborne" && faction !== "Alliance")
    return undefined;
  if (normalized === "windshaper skyborne" && faction !== "Horde")
    return undefined;
  return catalogue.find(
    (zone) =>
      (zone.faction === faction || zone.faction === "Both") &&
      zone.startingRaces.some(
        (candidate) => candidate.toLowerCase() === normalized,
      ),
  );
}
export interface ZoneFilters {
  search?: string;
  faction?: string;
  continent?: string;
  level?: number;
  suitability?: "now" | "later" | "all";
  minLevel?: number;
  maxLevel?: number;
}
export function filterZones(
  filters: ZoneFilters = {},
  catalogue: readonly ZoneRecord[] = zoneCatalogue,
): ZoneRecord[] {
  const query = filters.search?.trim().toLowerCase();
  return catalogue
    .filter((zone) => {
      if (query && !`${zone.name} ${zone.region}`.toLowerCase().includes(query))
        return false;
      if (
        filters.faction &&
        filters.faction !== "Both" &&
        zone.faction !== "Both" &&
        zone.faction !== "Unknown" &&
        zone.faction !== filters.faction
      )
        return false;
      if (filters.continent && zone.continent !== filters.continent)
        return false;
      const range = zone.recommendedLevel;
      if (
        filters.minLevel !== undefined &&
        range &&
        range.max < filters.minLevel
      )
        return false;
      if (
        filters.maxLevel !== undefined &&
        range &&
        range.min > filters.maxLevel
      )
        return false;
      if (
        filters.level !== undefined &&
        filters.suitability === "now" &&
        (!range || filters.level < range.min || filters.level > range.max)
      )
        return false;
      if (
        filters.level !== undefined &&
        filters.suitability === "later" &&
        (!range || range.min <= filters.level)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      const distance = (zone: ZoneRecord) =>
        !zone.recommendedLevel || filters.level === undefined
          ? 100
          : Math.max(
              zone.recommendedLevel.min - filters.level,
              filters.level - zone.recommendedLevel.max,
              0,
            );
      return distance(a) - distance(b) || a.name.localeCompare(b.name, "en");
    });
}

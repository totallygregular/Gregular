import type {
  ProgressionDataset,
  ProgressionRecord,
} from "../progressionTypes";

const OCTOBER_1 = "forever-beta-2026-10-01";
const unknown = { confidence: "unknown" as const };
const confirmed = { confidence: "confirmed" as const, sourceId: OCTOBER_1 };

function zone(id: string, name: string): ProgressionRecord {
  return {
    id: `forever:zone:${id}`,
    kind: "zone",
    name,
    description:
      "Confirmed in the beta notes. Choose your own level window and goals.",
    faction: "Unknown",
    availability: "confirmed",
    relatedRecordIds: [],
    prerequisiteRecordIds: [],
    milestoneSuggestions: [
      "Plan a session in this zone",
      "Review unfinished personal goals",
    ],
    evidence: {
      identity: confirmed,
      availability: confirmed,
      faction: unknown,
      levels: unknown,
      prerequisites: unknown,
      relationships: unknown,
    },
  };
}

function dungeon(
  id: string,
  name: string,
  announcedLevel: { min: number; max?: number },
): ProgressionRecord {
  return {
    id: `forever:dungeon:${id}`,
    kind: "dungeon",
    name,
    description:
      "Available for beta testing. Published testing levels do not establish entry requirements.",
    faction: "Unknown",
    availability: "confirmed",
    announcedLevel,
    relatedRecordIds: [],
    prerequisiteRecordIds: [],
    milestoneSuggestions: [
      "Check access and quests",
      "Arrange a group",
      "Record the run",
    ],
    evidence: {
      identity: confirmed,
      availability: confirmed,
      faction: unknown,
      levels: {
        ...confirmed,
        note: "Announced beta testing band; entry minimum unknown.",
      },
      prerequisites: unknown,
      relationships: unknown,
    },
  };
}

/**
 * Sparse, manually reviewed facts. No imported quest text, maps, icons or database
 * dumps. Editorial route windows below are personal planning suggestions only.
 */
export const progressionDataset: ProgressionDataset = {
  version: "forever-progression-2026-10-13.1",
  edition: "WoW Forever",
  reviewedAt: "2026-10-13",
  gameRevision: null,
  currentLevelCap: 30,
  levelCapEvidence: {
    ...confirmed,
    note: "Beta level cap announced in the October 1 development notes. Personal plans above this remain editable.",
  },
  reuseNote:
    "Manually recorded names and sparse facts with source links; original planning labels. No blanket reuse grant found for source prose or datasets.",
  sources: [
    {
      id: OCTOBER_1,
      title: "WoW Forever Beta Development Notes — October 1",
      publisher: "Blizzard Entertainment / Kaivax",
      url: "https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-8/2360696/4",
      publishedAt: "2026-10-01",
      reviewedAt: "2026-10-13",
    },
  ],
  records: [
    zone("stonetalon-mountains", "Stonetalon Mountains"),
    zone("ashenvale", "Ashenvale"),
    zone("hillsbrad-foothills", "Hillsbrad Foothills"),
    zone("redridge-mountains", "Redridge Mountains"),
    zone("duskwood", "Duskwood"),
    zone("wetlands", "Wetlands"),
    dungeon("excavation-site-wetlands", "Excavation Site: Wetlands", {
      min: 26,
      max: 31,
    }),
    dungeon("razorfen-downs", "Razorfen Downs", { min: 25 }),
    dungeon("uldaman", "Uldaman", { min: 30 }),
  ],
  templates: [
    {
      id: "editorial-horde-20-30",
      name: "Horde starter · 20–30",
      faction: "Horde",
      description:
        "Editable personal windows. Zone names are beta-confirmed; order, faction grouping and levels are editorial, not verified recommendations.",
      sourceIds: [OCTOBER_1],
      entries: [
        {
          id: "stonetalon",
          recordId: "forever:zone:stonetalon-mountains",
          targetLevel: { min: 20, max: 24 },
          notes:
            "Editorial planning window. Check current beta content and travel before your session.",
        },
        {
          id: "ashenvale",
          recordId: "forever:zone:ashenvale",
          targetLevel: { min: 24, max: 27 },
          notes: "Editorial planning window; adjust to your available quests.",
        },
        {
          id: "hillsbrad",
          recordId: "forever:zone:hillsbrad-foothills",
          targetLevel: { min: 27, max: 30 },
          notes:
            "Editorial planning window; no travel or quest prerequisites are established here.",
        },
      ],
    },
    {
      id: "editorial-alliance-20-30",
      name: "Alliance starter · 20–30",
      faction: "Alliance",
      description:
        "Editable personal windows. Zone names are beta-confirmed; order, faction grouping and levels are editorial, not verified recommendations.",
      sourceIds: [OCTOBER_1],
      entries: [
        {
          id: "redridge",
          recordId: "forever:zone:redridge-mountains",
          targetLevel: { min: 20, max: 24 },
          notes:
            "Editorial planning window. Check current beta content and travel before your session.",
        },
        {
          id: "duskwood",
          recordId: "forever:zone:duskwood",
          targetLevel: { min: 24, max: 27 },
          notes: "Editorial planning window; adjust to your available quests.",
        },
        {
          id: "wetlands",
          recordId: "forever:zone:wetlands",
          targetLevel: { min: 27, max: 30 },
          notes:
            "Editorial planning window; no travel or quest prerequisites are established here.",
        },
      ],
    },
  ],
};

export const routeTemplates = progressionDataset.templates;
export const progressionRecords = progressionDataset.records;

export function getProgressionRecord(
  id: string,
  dataset = progressionDataset,
): ProgressionRecord | undefined {
  return dataset.records.find((record) => record.id === id);
}

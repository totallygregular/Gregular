/** Personal plans and reviewed game facts are separate, serialisable models. */
export type PlannerKind = "zone" | "dungeon" | "custom";
export type PlannerStatus = "planned" | "active" | "completed" | "skipped";
export type PlannerOrigin = "reference" | "editorial" | "user" | "illustrative";
export type PlannerAccess = "confirmed" | "unknown" | "unavailable";
export type PlannerPriority = "high" | "normal";
export interface LevelRange {
  min: number;
  max: number;
}

export interface PlannerEntry {
  id: string;
  kind: PlannerKind;
  title: string;
  notes: string;
  priority: PlannerPriority;
  status: PlannerStatus;
  targetLevel?: LevelRange;
  targetLevelSource?: "user" | "editorial" | "announced";
  recordId?: string;
  association?: { kind: "zone" | "dungeon"; recordId?: string; name: string };
  templateEntryId?: string;
  prerequisiteEntryIds: string[];
  origin: PlannerOrigin;
  access: PlannerAccess;
}

export interface CharacterPlanner {
  id: string;
  name: string;
  templateId?: string;
  datasetVersion: string;
  entries: PlannerEntry[];
}

export interface PlannerEntryDraft {
  kind: PlannerKind;
  title: string;
  notes?: string;
  priority?: PlannerPriority;
  status?: PlannerStatus;
  targetLevel?: LevelRange;
  targetLevelSource?: PlannerEntry["targetLevelSource"];
  recordId?: string;
  association?: PlannerEntry["association"];
  templateEntryId?: string;
  prerequisiteEntryIds?: string[];
  origin?: PlannerOrigin;
  access?: PlannerAccess;
}

export interface ProgressionSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
  reviewedAt: string;
}

export interface FieldEvidence {
  confidence: "confirmed" | "unknown";
  sourceId?: string;
  note?: string;
}

export interface ProgressionRecord {
  /** App-owned catalogue key; not claimed to be a Blizzard game ID. */
  id: string;
  gameId?: number;
  kind: "zone" | "dungeon";
  name: string;
  description: string;
  /** Unknown means no verified restriction; it does not establish open access. */
  faction: "Horde" | "Alliance" | "Both" | "Unknown";
  availability: PlannerAccess;
  /** A published beta testing band, not a dungeon entry minimum or optimal route. */
  announcedLevel?: { min: number; max?: number };
  minimumLevel?: number;
  relatedRecordIds: string[];
  prerequisiteRecordIds: string[];
  milestoneSuggestions: string[];
  evidence: {
    identity: FieldEvidence;
    availability: FieldEvidence;
    faction: FieldEvidence;
    levels: FieldEvidence;
    prerequisites: FieldEvidence;
    relationships: FieldEvidence;
  };
}

export interface RouteTemplate {
  id: string;
  name: string;
  faction: "Horde" | "Alliance";
  description: string;
  sourceIds: string[];
  entries: {
    id: string;
    recordId: string;
    targetLevel: LevelRange;
    notes: string;
  }[];
}

export interface ProgressionDataset {
  version: string;
  edition: "WoW Forever";
  reviewedAt: string;
  gameRevision: string | null;
  currentLevelCap: number;
  levelCapEvidence: FieldEvidence;
  reuseNote: string;
  sources: ProgressionSource[];
  records: ProgressionRecord[];
  templates: RouteTemplate[];
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  source: "planner" | "journal";
  kind: PlannerKind;
  origin: PlannerOrigin;
}

export interface NextUpResult {
  recommendations: Recommendation[];
  upcoming: Recommendation[];
  blocked: Recommendation[];
}

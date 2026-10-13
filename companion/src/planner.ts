import { getProgressionRecord, progressionDataset } from "./data/progression";
import { getRouteProgress, resolveEntryZone } from "./routeProgress";
import { findTravel } from "./travel";
import type {
  CharacterPlanner,
  LevelRange,
  NextUpResult,
  PlannerEntry,
  PlannerEntryDraft,
  PlannerStatus,
  ProgressionDataset,
  Recommendation,
} from "./progressionTypes";

export class PlannerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerValidationError";
  }
}
const invalid = (message: string): never => {
  throw new PlannerValidationError(message);
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  label: string,
  max: number,
  empty = false,
  trim = true,
): string {
  if (typeof value !== "string") return invalid(`${label} must be text.`);
  const checked = trim ? value.trim() : value;
  if ((!empty && !checked) || checked.length > max || CONTROL.test(checked)) {
    return invalid(
      `${label} must ${empty ? "" : "not be empty and "}contain at most ${max} characters without control characters.`,
    );
  }
  return checked;
}
function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID.test(value))
    return invalid(`${label} is invalid.`);
  return value;
}
function choice<T extends string>(
  value: unknown,
  choices: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !choices.includes(value as T))
    return invalid(`${label} is invalid.`);
  return value as T;
}
function level(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 60)
    return invalid("Planned levels must be whole numbers from 1 to 60.");
  return value as number;
}
function range(value: unknown): LevelRange {
  const candidate = object(value, "Level range");
  const min = level(candidate.min),
    max = level(candidate.max);
  if (max < min)
    return invalid("The end level must not be below the start level.");
  return { min, max };
}

function validateEntry(value: unknown): PlannerEntry {
  const entry = object(value, "Route entry");
  const id = uuid(entry.id, "Route entry ID");
  const kind = choice(
    entry.kind,
    ["zone", "dungeon", "custom"],
    "Objective type",
  );
  if (
    !Array.isArray(entry.prerequisiteEntryIds) ||
    entry.prerequisiteEntryIds.length > 100
  )
    return invalid("Objective prerequisites are invalid.");
  const prerequisiteEntryIds = entry.prerequisiteEntryIds.map((value) =>
    uuid(value, "Prerequisite ID"),
  );
  if (
    new Set(prerequisiteEntryIds.map((id) => id.toLowerCase())).size !==
      prerequisiteEntryIds.length ||
    prerequisiteEntryIds.some(
      (candidate) => candidate.toLowerCase() === id.toLowerCase(),
    )
  )
    return invalid(
      "Objective prerequisites must be unique and cannot refer to the same objective.",
    );
  let association: PlannerEntry["association"];
  if (entry.association !== undefined) {
    const candidate = object(entry.association, "Objective association");
    association = {
      kind: choice(candidate.kind, ["zone", "dungeon"], "Association type"),
      name: text(candidate.name, "Association name", 200),
      ...(candidate.recordId === undefined
        ? {}
        : { recordId: text(candidate.recordId, "Associated record ID", 200) }),
    };
  }
  if (kind === "custom" && entry.recordId !== undefined)
    return invalid(
      "Personal objectives must use an association instead of a game record ID.",
    );
  if (entry.targetLevel === undefined && entry.targetLevelSource !== undefined)
    return invalid("A level source requires a level range.");
  return {
    id,
    kind,
    title: text(entry.title, "Objective title", 200),
    notes: text(entry.notes, "Objective notes", 5000, true, false),
    priority: choice(entry.priority, ["high", "normal"], "Objective priority"),
    status: choice(
      entry.status,
      ["planned", "active", "completed", "skipped"],
      "Objective status",
    ),
    origin: choice(
      entry.origin,
      ["reference", "editorial", "user", "illustrative"],
      "Objective origin",
    ),
    access: choice(
      entry.access,
      ["confirmed", "unknown", "unavailable"],
      "Objective access",
    ),
    prerequisiteEntryIds,
    ...(entry.targetLevel === undefined
      ? {}
      : {
          targetLevel: range(entry.targetLevel),
          targetLevelSource:
            entry.targetLevelSource === undefined
              ? ("user" as const)
              : choice(
                  entry.targetLevelSource,
                  ["user", "editorial", "announced"] as const,
                  "Level source",
                ),
        }),
    ...(entry.recordId === undefined
      ? {}
      : { recordId: text(entry.recordId, "Game record ID", 200) }),
    ...(entry.templateEntryId === undefined
      ? {}
      : {
          templateEntryId: text(
            entry.templateEntryId,
            "Template entry ID",
            200,
          ),
        }),
    ...(association ? { association } : {}),
  };
}

/** Checks untrusted saves without deleting missing reference or prerequisite IDs. */
export function validatePlanner(value: unknown): CharacterPlanner {
  const planner = object(value, "Route");
  if (!Array.isArray(planner.entries) || planner.entries.length > 500)
    return invalid("A route must contain at most 500 entries.");
  const entries = planner.entries.map(validateEntry);
  if (
    new Set(entries.map((entry) => entry.id.toLowerCase())).size !==
    entries.length
  )
    return invalid("The route contains duplicate entry IDs.");
  const templateIds = entries.flatMap((entry) =>
    entry.templateEntryId ? [entry.templateEntryId] : [],
  );
  if (new Set(templateIds).size !== templateIds.length)
    return invalid("The route contains duplicate template entry IDs.");
  return {
    id: uuid(planner.id, "Route ID"),
    name: text(planner.name, "Route name", 100),
    datasetVersion: text(planner.datasetVersion, "Dataset version", 100),
    entries,
    ...(planner.templateId === undefined
      ? {}
      : { templateId: text(planner.templateId, "Template ID", 200) }),
  };
}

export function createBlankPlanner(
  name = "My route",
  id: string = crypto.randomUUID(),
): CharacterPlanner {
  return validatePlanner({
    id,
    name,
    datasetVersion: progressionDataset.version,
    entries: [],
  });
}

function entryIndex(planner: CharacterPlanner, id: string): number {
  const index = planner.entries.findIndex((entry) => entry.id === id);
  if (index < 0) return invalid("This route entry could not be found.");
  return index;
}

export function addEntry(
  planner: CharacterPlanner,
  draft: PlannerEntryDraft,
): CharacterPlanner {
  const entry = validateEntry({
    notes: "",
    priority: "normal",
    status: "planned",
    origin: "user",
    access: draft.kind === "custom" ? "confirmed" : "unknown",
    prerequisiteEntryIds: [],
    ...draft,
    id: crypto.randomUUID(),
  });
  return validatePlanner({ ...planner, entries: [...planner.entries, entry] });
}

export function updateEntry(
  planner: CharacterPlanner,
  id: string,
  patch: Partial<PlannerEntryDraft>,
): CharacterPlanner {
  const index = entryIndex(planner, id);
  const merged = {
    ...planner.entries[index],
    ...patch,
    id: planner.entries[index].id,
  };
  // Clearing a range also clears its provenance; a subsequent new range is a personal plan.
  if ("targetLevel" in patch && patch.targetLevel === undefined)
    delete merged.targetLevelSource;
  if (patch.targetLevel && patch.targetLevelSource === undefined)
    merged.targetLevelSource = "user";
  const changed = validateEntry(merged);
  return validatePlanner({
    ...planner,
    entries: planner.entries.map((entry, position) =>
      position === index ? changed : entry,
    ),
  });
}

export function removeEntry(
  planner: CharacterPlanner,
  id: string,
): CharacterPlanner {
  entryIndex(planner, id);
  // Dependants retain the missing ID and are blocked until the player edits them.
  return {
    ...planner,
    entries: planner.entries.filter((entry) => entry.id !== id),
  };
}

export function moveEntry(
  planner: CharacterPlanner,
  id: string,
  direction: "up" | "down" | number,
): CharacterPlanner {
  const index = entryIndex(planner, id);
  const target =
    direction === "up"
      ? index - 1
      : direction === "down"
        ? index + 1
        : direction;
  if (!Number.isInteger(target))
    return invalid("The route position must be a whole number.");
  const clamped = Math.min(Math.max(target, 0), planner.entries.length - 1);
  if (index === clamped) return planner;
  const entries = [...planner.entries];
  const [entry] = entries.splice(index, 1);
  entries.splice(clamped, 0, entry);
  return { ...planner, entries };
}

export function setEntryStatus(
  planner: CharacterPlanner,
  id: string,
  status: PlannerStatus,
): CharacterPlanner {
  return updateEntry(planner, id, { status });
}

/** A reference is a link to facts. Access still requires the player's confirmation. */
export function entryFromRecord(
  recordId: string,
  dataset = progressionDataset,
): PlannerEntryDraft {
  const record = getProgressionRecord(recordId, dataset);
  if (!record) return invalid("This game reference could not be found.");
  return {
    kind: record.kind,
    title: record.name,
    notes: "",
    recordId,
    origin: "reference",
    access: "unknown",
    ...(record.announcedLevel?.max !== undefined
      ? {
          targetLevel: {
            min: record.announcedLevel.min,
            max: record.announcedLevel.max,
          },
          targetLevelSource: "announced" as const,
        }
      : {}),
  };
}
export const createReferenceEntryDraft = entryFromRecord;

/** Restore means merge missing template entries, never reset a player's work. */
export function applyTemplate(
  planner: CharacterPlanner,
  templateId: string,
  faction: string,
  dataset = progressionDataset,
): CharacterPlanner {
  const template = dataset.templates.find(
    (candidate) => candidate.id === templateId,
  );
  if (!template) return invalid("This route template could not be found.");
  if (template.faction.toLowerCase() !== faction.trim().toLowerCase())
    return invalid("This starter template is for another faction.");
  let result: CharacterPlanner = {
    ...planner,
    templateId,
    datasetVersion: dataset.version,
    name: planner.entries.length ? planner.name : template.name,
  };
  for (const candidate of template.entries) {
    const templateEntryId = `${template.id}/${candidate.id}`;
    if (
      result.entries.some((entry) => entry.templateEntryId === templateEntryId)
    )
      continue;
    const record = getProgressionRecord(candidate.recordId, dataset);
    if (!record) continue; // A removed record is never turned into an invented recommendation.
    result = addEntry(result, {
      ...entryFromRecord(candidate.recordId, dataset),
      targetLevel: candidate.targetLevel,
      targetLevelSource: "editorial",
      notes: candidate.notes,
      origin: "editorial",
      templateEntryId,
    });
  }
  return result;
}

export interface PlannerCharacter {
  level: number;
  faction: string;
  planner: CharacterPlanner;
  objectives?: {
    id: string;
    title: string;
    completed: boolean;
    priority: "high" | "normal";
  }[];
}

function blockedReason(
  entry: PlannerEntry,
  character: PlannerCharacter,
  dataset: ProgressionDataset,
): string | undefined {
  const zone = resolveEntryZone(entry);
  const personalZone = Boolean(zone && entry.origin === "user");
  const knownRecord = entry.recordId
    ? getProgressionRecord(entry.recordId, dataset)
    : undefined;
  const record = entry.recordId
    ? personalZone
      ? undefined
      : knownRecord
    : undefined;
  if (entry.recordId && !record && !personalZone)
    return "Reference missing from the current snapshot. Review or replace this entry.";
  if (
    zone?.accessFactions &&
    !zone.accessFactions.some(
      (faction) =>
        faction.toLowerCase() === character.faction.trim().toLowerCase(),
    )
  )
    return "This zone has a known faction access restriction. Review the catalogue source.";
  if (personalZone && knownRecord?.availability === "unavailable")
    return "Unavailable in the reviewed beta snapshot.";
  if (
    personalZone &&
    knownRecord &&
    ["Alliance", "Horde"].includes(knownRecord.faction) &&
    knownRecord.faction.toLowerCase() !== character.faction.trim().toLowerCase()
  )
    return `This reference is restricted to ${knownRecord.faction}.`;
  if (record && record.kind !== entry.kind)
    return "The reference type changed. Review this entry.";
  if (record && character.level > dataset.currentLevelCap)
    return `Level ${character.level} is above the reviewed beta cap of ${dataset.currentLevelCap}. Keep this as a future plan; current eligibility is unsupported.`;
  if (
    record &&
    Math.max(entry.targetLevel?.min ?? 1, record.minimumLevel ?? 1) >
      dataset.currentLevelCap
  )
    return `This target is above the reviewed beta cap of ${dataset.currentLevelCap}. Keep it as a future plan.`;
  if (
    record?.minimumLevel &&
    entry.targetLevel &&
    entry.targetLevel.max < record.minimumLevel
  )
    return `Your planned range ends before the verified minimum level ${record.minimumLevel}. Adjust the target level.`;
  if (
    record &&
    ["Horde", "Alliance"].includes(record.faction) &&
    record.faction.toLowerCase() !== character.faction.trim().toLowerCase()
  )
    return `This reference is restricted to ${record.faction}.`;
  if (record?.availability === "unavailable")
    return "Unavailable in the reviewed beta snapshot.";
  if (record?.availability === "unknown")
    return "Beta availability is unverified. Check the source before planning a run.";
  if (entry.access === "unavailable") return "Marked unavailable in your plan.";
  if (entry.access === "unknown" && !personalZone)
    return "Confirm access before this becomes actionable.";
  for (const id of entry.prerequisiteEntryIds) {
    const prerequisite = character.planner.entries.find(
      (candidate) => candidate.id === id,
    );
    if (!prerequisite)
      return "A required objective was removed. Edit the prerequisite.";
    if (prerequisite.status !== "completed")
      return `Complete “${prerequisite.title}” first${prerequisite.status === "skipped" ? " (currently skipped)" : ""}.`;
  }
  if (record) {
    for (const recordId of record.prerequisiteRecordIds) {
      if (
        !character.planner.entries.some(
          (candidate) =>
            candidate.recordId === recordId && candidate.status === "completed",
        )
      ) {
        return `Complete ${getProgressionRecord(recordId, dataset)?.name ?? "the required reference objective"} first.`;
      }
    }
  }
  return undefined;
}

/** Deterministic, local-only suggestions. No generated tasks or implicit quest chains. */
export function getNextUp(
  character: PlannerCharacter,
  dataset = progressionDataset,
): NextUpResult {
  const currentLevel = level(character.level);
  const result: NextUpResult = {
    recommendations: [],
    upcoming: [],
    blocked: [],
  };
  const ranked: { item: Recommendation; score: number; index: number }[] = [];
  const route = getRouteProgress(character.planner, currentLevel);
  const earlierIds = new Set(route.earlierUnfinished.map((entry) => entry.id));
  const futureIds = new Set(route.upcoming.map((entry) => entry.id));
  const anchor = route.current ?? route.next;
  const earlierVisits = character.planner.entries
    .slice(
      0,
      anchor
        ? character.planner.entries.indexOf(anchor)
        : character.planner.entries.length,
    )
    .filter((entry) => entry.kind !== "custom");
  const unfinished: Recommendation[] = [];
  character.planner.entries.forEach((entry, index) => {
    if (
      entry.status === "completed" ||
      entry.status === "skipped" ||
      entry.origin === "illustrative"
    )
      return;
    const item: Recommendation = {
      id: entry.id,
      title: entry.title,
      reason: "",
      source: "planner",
      kind: entry.kind,
      origin: entry.origin,
    };
    const zone = resolveEntryZone(entry);
    const blocked = blockedReason(entry, character, dataset);
    if (blocked) {
      result.blocked.push({ ...item, reason: blocked });
      return;
    }
    if (zone && earlierIds.has(entry.id)) {
      unfinished.push({
        ...item,
        reason:
          "Earlier route visit remains unfinished. Complete, skip or reactivate it yourself.",
      });
      return;
    }
    if (entry.kind === "custom" && entry.association?.kind === "zone") {
      const currentZone = route.current
        ? resolveEntryZone(route.current)
        : undefined;
      const matchesCurrent =
        currentZone &&
        (entry.association.recordId === currentZone.id ||
          (!entry.association.recordId &&
            entry.association.name.trim().toLowerCase() ===
              currentZone.name.toLowerCase()));
      const earlierZone =
        !matchesCurrent &&
        earlierVisits.some((previous) => {
          const previousZone = resolveEntryZone(previous);
          return (
            previousZone &&
            (entry.association!.recordId === previousZone.id ||
              (!entry.association!.recordId &&
                entry.association!.name.trim().toLowerCase() ===
                  previousZone.name.toLowerCase()))
          );
        });
      if (earlierZone) {
        unfinished.push({
          ...item,
          reason: "Unfinished objective from an earlier route visit.",
        });
        return;
      }
    }
    const record = entry.recordId
      ? getProgressionRecord(entry.recordId, dataset)
      : undefined;
    const earliest = Math.max(
      entry.targetLevel?.min ?? 1,
      record?.minimumLevel ?? 1,
    );
    if (zone && futureIds.has(entry.id)) {
      result.upcoming.push({
        ...item,
        reason: `Next in your saved route order${entry.targetLevel ? `; your plan ${entry.targetLevel.min}–${entry.targetLevel.max}` : ""}.`,
      });
      return;
    }
    if (currentLevel < earliest) {
      if (earliest <= currentLevel + 8)
        result.upcoming.push({
          ...item,
          reason:
            record?.minimumLevel && currentLevel < record.minimumLevel
              ? `Verified minimum level ${record.minimumLevel}; you are level ${currentLevel}.`
              : `Planned for level ${earliest}; you are level ${currentLevel}.`,
        });
      return;
    }
    const overdue =
      entry.targetLevel !== undefined && currentLevel > entry.targetLevel.max;
    // Old, unfinished zones stay in the roadmap; they do not displace current work.
    if (
      overdue &&
      entry.kind !== "custom" &&
      entry.status !== "active" &&
      !zone
    )
      return;
    let score = entry.kind === "custom" ? 30 : entry.kind === "zone" ? 40 : 50;
    let reason = entry.targetLevel
      ? `Your level ${entry.targetLevel.min}–${entry.targetLevel.max} plan.`
      : "In your personal plan.";
    if (entry.kind === "custom" && entry.priority === "high" && overdue) {
      score = 0;
      reason = `High priority; planned by level ${entry.targetLevel!.max}.`;
    } else if (entry.kind === "zone" && entry.status === "active") {
      score = 10;
      reason = overdue
        ? "Your active zone; above its planned window."
        : "Your active zone.";
    } else if (entry.priority === "high") {
      score = 20;
      reason = overdue
        ? "High-priority unfinished goal."
        : "High-priority goal for your current plan.";
    } else if (entry.status === "active") {
      score = 25;
      reason = "Marked active in your plan.";
    } else if (overdue) {
      score = 60;
      reason = `Unfinished personal goal; planned by level ${entry.targetLevel!.max}.`;
    }
    if (entry.targetLevelSource === "editorial" && !reason.includes("active"))
      reason += " Editable editorial window.";
    if (entry.targetLevelSource === "announced")
      reason += " Published beta testing band; entry requirements unverified.";
    if (zone && entry.origin === "user") {
      score = entry.status === "active" ? 10 : 15;
      reason = `Current route stop${entry.targetLevel ? `; your plan ${entry.targetLevel.min}–${entry.targetLevel.max}` : ""}.`;
      const previous = character.planner.entries
        .slice(0, index)
        .reverse()
        .find(
          (candidate) =>
            candidate.kind !== "custom" && candidate.status !== "skipped",
        );
      const previousZone = previous ? resolveEntryZone(previous) : undefined;
      if (previousZone) {
        const travel = findTravel(previousZone.id, zone.id, character.faction);
        reason += ` ${travel.label}: ${travel.explanation}`;
      }
      if (entry.access === "unknown")
        reason += " Zone guidance is provisional; confirm current beta access.";
    }
    ranked.push({ item: { ...item, reason }, score, index });
  });
  for (const [index, objective] of (character.objectives ?? []).entries()) {
    // V1 fixtures lack an origin field; the explicit Sample prefix is their marker.
    if (objective.completed || /^Sample:/i.test(objective.title)) continue;
    ranked.push({
      item: {
        id: objective.id,
        title: objective.title,
        reason:
          objective.priority === "high"
            ? "High-priority journal objective."
            : "Unfinished journal objective.",
        source: "journal",
        kind: "custom",
        origin: "user",
      },
      score: objective.priority === "high" ? 22 : 80,
      index: character.planner.entries.length + index,
    });
  }
  result.recommendations = ranked
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, 4)
    .map(({ item }) => item);
  result.upcoming.sort((a, b) => {
    const first = character.planner.entries.find((entry) => entry.id === a.id)!;
    const second = character.planner.entries.find(
      (entry) => entry.id === b.id,
    )!;
    if (resolveEntryZone(first) || resolveEntryZone(second))
      return (
        character.planner.entries.indexOf(first) -
        character.planner.entries.indexOf(second)
      );
    return (
      (first.targetLevel?.min ??
        getProgressionRecord(first.recordId ?? "", dataset)?.minimumLevel ??
        1) -
      (second.targetLevel?.min ??
        getProgressionRecord(second.recordId ?? "", dataset)?.minimumLevel ??
        1)
    );
  });
  if (unfinished.length) result.unfinished = unfinished;
  return result;
}

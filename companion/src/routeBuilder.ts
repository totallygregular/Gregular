import {
  catalogueMetadata,
  getZone,
  startingZoneFor,
  type ZoneRecord,
} from "./data/zones";
import {
  addEntry,
  createBlankPlanner,
  moveEntry,
  PlannerValidationError,
  validatePlanner,
} from "./planner";
import { resolveEntryZone } from "./routeProgress";
import { findTravel, type TravelResult } from "./travel";
import type {
  CharacterPlanner,
  LevelRange,
  PlannerEntry,
} from "./progressionTypes";

export { getRouteProgress, resolveEntryZone } from "./routeProgress";

/** Personal ranges are explicit; recommended data is never copied over a save. */
export function addZone(
  planner: CharacterPlanner,
  zoneId: string,
  plannedRange: LevelRange,
  insertionIndex = planner.entries.length,
): CharacterPlanner {
  const zone = getZone(zoneId);
  if (!zone)
    throw new PlannerValidationError(
      "This zone could not be found in the catalogue.",
    );
  if (
    !Number.isInteger(insertionIndex) ||
    insertionIndex < 0 ||
    insertionIndex > planner.entries.length
  )
    throw new PlannerValidationError("Choose a valid insertion position.");
  const appended = addEntry(planner, {
    kind: "zone",
    title: zone.name,
    recordId: zone.id,
    targetLevel: plannedRange,
    targetLevelSource: "user",
    origin: "user",
    // This is a personal route suggestion, not confirmation of beta access.
    access: "unknown",
  });
  return moveEntry(
    { ...appended, datasetVersion: catalogueMetadata.version },
    appended.entries.at(-1)!.id,
    insertionIndex,
  );
}

export function renameRoute(
  planner: CharacterPlanner,
  name: string,
): CharacterPlanner {
  return validatePlanner({ ...planner, name });
}

/** Clearing zone visits keeps old dungeon milestones and personal objectives. */
export function startBlankRoute(
  planner: CharacterPlanner,
  name = "My route",
): CharacterPlanner {
  return validatePlanner({
    ...planner,
    name,
    templateId: undefined,
    entries: planner.entries.filter((entry) => entry.kind !== "zone"),
  });
}

/** A single optional start, never an automatically imposed race route. */
export function addSuggestedStart(
  planner: CharacterPlanner,
  race: string,
  faction: string,
  plannedRange?: LevelRange,
): CharacterPlanner {
  const zone = startingZoneFor(race, faction);
  if (!zone)
    throw new PlannerValidationError(
      "No sourced starting-zone suggestion is available for this race and faction.",
    );
  const range = plannedRange ?? zone.recommendedLevel;
  if (!range)
    throw new PlannerValidationError(
      "Choose your own planned entry and exit levels for this starting zone.",
    );
  return addZone(planner, zone.id, range, 0);
}

export function createStarterRoute(
  race: string,
  faction: string,
  plannedRange?: LevelRange,
): CharacterPlanner {
  return addSuggestedStart(createBlankPlanner(), race, faction, plannedRange);
}

export function plannedRangeWarning(
  entry: PlannerEntry,
  zone = resolveEntryZone(entry),
): string | undefined {
  if (!zone?.recommendedLevel || !entry.targetLevel) return undefined;
  const { min, max } = zone.recommendedLevel;
  const plan = entry.targetLevel;
  if (
    plan.min < min - 3 ||
    plan.max > max + 3 ||
    plan.max < min ||
    plan.min > max
  ) {
    return `Your plan is outside the recommended ${min}–${max} range. You can keep this choice.`;
  }
  return undefined;
}

export interface RouteTransition {
  entryId: string;
  previousEntryId?: string;
  zone?: ZoneRecord;
  travel: TravelResult;
}

function unknownTravel(message: string): TravelResult {
  return {
    ...findTravel(undefined, "unresolved", "Unknown"),
    explanation: message,
  };
}

/** Customs do not move the player. An unresolved dungeon breaks location knowledge. */
function transitionFrom(
  previous: PlannerEntry | undefined,
  zone: ZoneRecord | undefined,
  faction: string,
): TravelResult {
  if (!zone)
    return unknownTravel("This stop's travel location is not verified.");
  if (!previous)
    return {
      ...findTravel(undefined, zone.id, faction),
      explanation: "First zone; choose your own starting location.",
    };
  const from = resolveEntryZone(previous);
  if (!from)
    return unknownTravel(
      "The preceding stop's travel location is not verified.",
    );
  return findTravel(from.id, zone.id, faction);
}

export function getRouteTransitions(
  planner: CharacterPlanner,
  faction: string,
): RouteTransition[] {
  let previous: PlannerEntry | undefined;
  return planner.entries
    .filter((entry) => entry.kind !== "custom" && entry.status !== "skipped")
    .map((entry) => {
      const zone = resolveEntryZone(entry);
      const transition: RouteTransition = {
        entryId: entry.id,
        ...(previous ? { previousEntryId: previous.id } : {}),
        ...(zone ? { zone } : {}),
        travel: transitionFrom(previous, zone, faction),
      };
      previous = entry;
      return transition;
    });
}

export interface InsertionTravel {
  before?: PlannerEntry;
  after?: PlannerEntry;
  incoming: TravelResult;
  outgoing?: TravelResult;
}

/** Both sides of an insertion are derived fresh from saved order and status. */
export function getInsertionTravel(
  planner: CharacterPlanner,
  zoneId: string,
  insertionIndex: number,
  faction: string,
): InsertionTravel {
  if (
    !Number.isInteger(insertionIndex) ||
    insertionIndex < 0 ||
    insertionIndex > planner.entries.length
  )
    throw new PlannerValidationError("Choose a valid insertion position.");
  const zone = getZone(zoneId);
  const before = planner.entries
    .slice(0, insertionIndex)
    .reverse()
    .find((entry) => entry.kind !== "custom" && entry.status !== "skipped");
  const after = planner.entries
    .slice(insertionIndex)
    .find((entry) => entry.kind !== "custom" && entry.status !== "skipped");
  const afterZone = after ? resolveEntryZone(after) : undefined;
  return {
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    incoming: transitionFrom(before, zone, faction),
    ...(after
      ? {
          outgoing:
            zone && afterZone
              ? findTravel(zone.id, afterZone.id, faction)
              : unknownTravel(
                  "The following stop's travel location is not verified.",
                ),
        }
      : {}),
  };
}

/** Association remains optional; it never duplicates or migrates a personal goal. */
export function outstandingZoneObjectives(
  planner: CharacterPlanner,
  zone: ZoneRecord,
): PlannerEntry[] {
  return planner.entries.filter(
    (entry) =>
      entry.kind === "custom" &&
      entry.status !== "completed" &&
      entry.status !== "skipped" &&
      entry.association?.kind === "zone" &&
      (entry.association.recordId === zone.id ||
        (!entry.association.recordId &&
          entry.association.name.trim().toLowerCase() ===
            zone.name.toLowerCase())),
  );
}

import { getZone, zoneCatalogue, type ZoneRecord } from "./data/zones";
import type { CharacterPlanner, PlannerEntry } from "./progressionTypes";

/** Resolve references at read time. A catalogue update never rewrites a saved visit. */
export function resolveEntryZone(entry: PlannerEntry): ZoneRecord | undefined {
  if (entry.kind !== "zone") return undefined;
  if (entry.recordId) return getZone(entry.recordId);
  // Older personal zones did not always have a record ID. Match only exact names.
  const name = entry.title.trim().toLocaleLowerCase("en-US");
  return zoneCatalogue.find(
    (zone) => zone.name.toLocaleLowerCase("en-US") === name,
  );
}

export interface RouteProgress {
  /** Suggested route focus, never a mutation of the saved active/completed state. */
  current?: PlannerEntry;
  next?: PlannerEntry;
  upcoming: PlannerEntry[];
  earlierUnfinished: PlannerEntry[];
  /** The personal exit of an earlier unresolved stop has been reached. */
  readyToTransition: boolean;
  completed: number;
  skipped: number;
}

/**
 * Saved order is authoritative when personal windows overlap. Reaching an exit
 * level can suggest the following stop, but never changes any saved status.
 * Dungeon milestones occupy a position in the same sequence; custom objectives
 * are tracked separately and do not imply a geographic location.
 */
export function getRouteProgress(
  planner: CharacterPlanner,
  level: number,
): RouteProgress {
  const segments = planner.entries.filter(
    (entry) => entry.kind !== "custom" && entry.origin !== "illustrative",
  );
  const pending = segments.filter(
    (entry) => entry.status !== "completed" && entry.status !== "skipped",
  );
  const activeIndex = pending.findIndex((entry) => entry.status === "active");
  let position = activeIndex >= 0 ? activeIndex : 0;
  const anchorPosition = position;

  // An explicit active stop anchors the sequence. Only advance the suggestion
  // once its personal exit is reached and the following stop is ready.
  if (activeIndex >= 0) {
    while (position + 1 < pending.length) {
      const current = pending[position];
      const next = pending[position + 1];
      if (
        !current.targetLevel ||
        level < current.targetLevel.max ||
        (next.targetLevel && level < next.targetLevel.min)
      )
        break;
      position += 1;
    }
  } else {
    while (
      position + 1 < pending.length &&
      pending[position].targetLevel &&
      level >= pending[position].targetLevel!.max
    )
      position += 1;
  }

  const candidate = pending[position];
  const current =
    candidate && (!candidate.targetLevel || level >= candidate.targetLevel.min)
      ? candidate
      : undefined;
  const next = current ? pending[position + 1] : candidate;
  const earlierUnfinished = pending.slice(0, position);
  const upcoming = current
    ? pending.slice(position + 1)
    : pending.slice(position);
  return {
    ...(current ? { current } : {}),
    ...(next ? { next } : {}),
    upcoming,
    earlierUnfinished,
    readyToTransition: Boolean(current && position > anchorPosition),
    completed: segments.filter((entry) => entry.status === "completed").length,
    skipped: segments.filter((entry) => entry.status === "skipped").length,
  };
}

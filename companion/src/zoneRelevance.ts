import { zoneCatalogue, type ZoneRecord } from "./data/zones";
import type { CharacterPlanner, LevelRange, PlannerEntry } from "./progressionTypes";
import { getInsertionTravel, type InsertionTravel } from "./routeBuilder";
import { resolveEntryZone } from "./routeProgress";
import type { TravelResult } from "./travel";

export interface SuggestionInput {
  planner: CharacterPlanner;
  /** The browser level defaults to the character's level; it is not saved here. */
  level: number;
  insertionIndex: number;
  /** The character faction, independent of the browser's optional faction filter. */
  faction: string;
}

export interface SuggestionContext {
  planningLevel: number;
  planningWindow: LevelRange;
  before?: PlannerEntry;
  after?: PlannerEntry;
  basedOnPreviousPlan: boolean;
  nextEntryLevel?: number;
  /** Overlapping personal plans remain allowed; this never changes their values. */
  hasLevelConflict: boolean;
}

export type SuggestionFit = "good" | "later" | "awkward" | "unknown";
export interface ZoneSuggestion {
  zone: ZoneRecord;
  travel: InsertionTravel;
  fit: SuggestionFit;
  label: string;
  reasons: string[];
  /** A relative, bounded planning cost. Lower sorts first; never a gameplay rating. */
  score: number;
}

/** Derive the insertion's personal planning point without predicting XP or a stay. */
export function getSuggestionContext(input: SuggestionInput): SuggestionContext {
  // Reuse the route's neighbour/status rules and insertion validation. The chosen
  // destination cannot affect before/after; this travel result is not scored.
  const { before, after } = getInsertionTravel(
    input.planner,
    zoneCatalogue[0].id,
    input.insertionIndex,
    input.faction,
  );
  const browserLevel = Number.isFinite(input.level)
    ? Math.max(1, Math.min(60, Math.round(input.level)))
    : 1;
  const previousExit = before?.targetLevel?.max;
  const planningLevel = Math.max(browserLevel, previousExit ?? browserLevel);
  const nextEntryLevel = after?.status !== "completed"
    ? after?.targetLevel?.min
    : undefined;
  return {
    planningLevel,
    planningWindow: {
      min: planningLevel,
      max: Math.max(
        planningLevel,
        Math.min(60, planningLevel + 3, nextEntryLevel ?? 60),
      ),
    },
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    basedOnPreviousPlan: previousExit !== undefined && previousExit > browserLevel,
    ...(nextEntryLevel !== undefined ? { nextEntryLevel } : {}),
    hasLevelConflict: nextEntryLevel !== undefined && nextEntryLevel < planningLevel,
  };
}

/** Unknown is a bounded uncertainty cost, never free or a claimed route time. */
function travelCost(travel: TravelResult): number {
  const difficulty = { easy: 0, moderate: 6, long: 18, unknown: 30 };
  return difficulty[travel.difficulty] + Math.min(8, (travel.score ?? 0) / 2);
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Rank a full catalogue without filtering, randomness, locale-dependent ordering,
 * route mutations or progression assumptions. See docs/route-relevance.md.
 */
export function rankZoneSuggestions(
  input: SuggestionInput,
  catalogue: readonly ZoneRecord[] = zoneCatalogue,
): ZoneSuggestion[] {
  const context = getSuggestionContext(input);
  return catalogue.map((zone): ZoneSuggestion => {
    const travel = getInsertionTravel(
      input.planner,
      zone.id,
      input.insertionIndex,
      input.faction,
    );
    const range = zone.recommendedLevel;
    const level = context.planningLevel;
    const later = range !== undefined && level < range.min;
    const earlier = range !== undefined && level > range.max;
    const factionKnown = input.faction === "Alliance" || input.faction === "Horde";
    const factionMismatch = factionKnown && zone.faction !== "Both"
      && zone.faction !== "Unknown" && zone.faction !== input.faction;
    const factionUnknown = !factionKnown || zone.faction === "Unknown";
    const visits = input.planner.entries.filter((entry) =>
      entry.status !== "skipped" && resolveEntryZone(entry)?.id === zone.id,
    );
    const pendingVisit = visits.some((entry) => entry.status !== "completed");
    const incomingApplies = Boolean(travel.before);
    const unknownTravel = (incomingApplies && travel.incoming.difficulty === "unknown")
      || travel.outgoing?.difficulty === "unknown";
    const longTravel = (incomingApplies && travel.incoming.difficulty === "long")
      || travel.outgoing?.difficulty === "long";
    const reasons: string[] = [];

    let score = 0;
    if (!range) {
      score += 120;
      reasons.push("Suitable levels are unverified");
    } else {
      // Starting near a range's lower bound is preferred to exhausting a broad
      // old bracket. This term is small so travel can still decide close fits.
      score += Math.min(18, Math.abs(level - range.min) * 1.5);
      if (later) {
        score += 24 + Math.min(200, (range.min - level) * 14);
        const near = range.min <= context.planningWindow.max;
        if (near) score -= 8;
        reasons.push(near ? "Fits the next few planning levels" : `Suitable from level ${range.min}`);
      } else if (earlier) {
        score += 48 + Math.min(200, (level - range.max) * 16);
        reasons.push(`Earlier than the level ${level} planning point`);
      } else {
        reasons.push(`Fits the level ${level} planning point`);
      }
    }

    if (incomingApplies) {
      score += travelCost(travel.incoming);
      reasons.push(`${travel.incoming.label} from the previous stop`);
    }
    if (travel.outgoing) {
      score += travelCost(travel.outgoing);
      reasons.push(`${travel.outgoing.label} to the following stop`);
    }
    if (factionMismatch) {
      score += 160;
      reasons.push("Recommended for the other faction");
    } else if (factionUnknown) {
      score += 18;
      reasons.push("Faction fit is unverified");
    }
    if (visits.length) {
      score += Math.min(48, visits.reduce(
        (cost, entry) => cost + (entry.status === "completed" ? 12 : 28), 0,
      ));
      reasons.push(pendingVisit ? "Already planned elsewhere in this route" : "Previously completed in this route");
    }

    let fit: SuggestionFit;
    let label: string;
    if (factionMismatch || earlier || visits.length || longTravel) {
      fit = "awkward";
      label = factionMismatch ? "Other faction" : earlier ? "Past suitable range"
        : visits.length ? (pendingVisit ? "Already in route" : "Return visit") : "Longer travel";
    } else if (!range || factionUnknown) {
      fit = "unknown";
      label = "Fit unverified";
    } else if (later) {
      fit = "later";
      label = "Later option";
    } else if (unknownTravel) {
      fit = "unknown";
      label = "Travel unverified";
    } else {
      fit = "good";
      label = "Good next fit";
    }
    return { zone, travel, fit, label, reasons, score };
  }).sort((a, b) => a.score - b.score || compareId(a.zone.id, b.zone.id));
}

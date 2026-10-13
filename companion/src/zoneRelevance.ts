import { startingZoneFor, zoneCatalogue, type ZoneRecord } from "./data/zones";
import type { CharacterPlanner, LevelRange, PlannerEntry } from "./progressionTypes";
import { getInsertionTravel, type InsertionTravel } from "./routeBuilder";
import { resolveEntryZone } from "./routeProgress";

export interface SuggestionInput {
  planner: CharacterPlanner;
  /** Defaults to the character level; a higher browser level explores a later bracket. */
  level: number;
  insertionIndex: number;
  /** Character faction, independent of the browser's optional catalogue filter. */
  faction: string;
  race?: string;
}

export interface SuggestionContext {
  planningLevel: number;
  planningWindow: LevelRange;
  before?: PlannerEntry;
  after?: PlannerEntry;
  sourceZone?: ZoneRecord;
  sourceRange?: LevelRange;
  suggestedStart?: ZoneRecord;
  /** Uses the upper end of the preceding zone's reviewed suitable range. */
  basedOnPreviousZone: boolean;
  /** Personal bounds are only a fallback for a stop without a reviewed zone range. */
  basedOnPreviousPlan: boolean;
  nextEntryLevel?: number;
  /** Advisory only; overlapping personal plans remain unchanged. */
  hasLevelConflict: boolean;
}

export type SuggestionFit = "good" | "later" | "awkward" | "unknown";
export type SuggestionGroup = "next" | "alternative" | "later" | "repeat" | "earlier" | "unknown";
export interface ZoneSuggestion {
  zone: ZoneRecord;
  travel: InsertionTravel;
  fit: SuggestionFit;
  label: string;
  reasons: string[];
  /** Explicit bracket category; no blended relevance score or gameplay rating. */
  group: SuggestionGroup;
}

/** A route's reviewed bracket is a planning anchor, never an XP or coverage forecast. */
export function getSuggestionContext(input: SuggestionInput): SuggestionContext {
  const { before, after } = getInsertionTravel(
    input.planner,
    zoneCatalogue[0].id,
    input.insertionIndex,
    input.faction,
  );
  const browserLevel = Number.isFinite(input.level)
    ? Math.max(1, Math.min(60, Math.round(input.level)))
    : 1;
  const sourceZone = before ? resolveEntryZone(before) : undefined;
  const sourceRange = sourceZone?.recommendedLevel;
  const basedOnPreviousZone = sourceRange !== undefined && browserLevel <= sourceRange.max;
  const previousExit = sourceRange ? undefined : before?.targetLevel?.max;
  const basedOnPreviousPlan = previousExit !== undefined && previousExit > browserLevel;
  const planningLevel = basedOnPreviousZone
    ? Math.max(browserLevel, sourceRange.max - 2, sourceRange.min)
    : Math.max(browserLevel, previousExit ?? browserLevel);
  const nextEntryLevel = after?.status !== "completed" ? after?.targetLevel?.min : undefined;
  const windowEnd = basedOnPreviousZone ? sourceRange.max : Math.min(60, planningLevel + 3);
  const raceStart = !before && input.race ? startingZoneFor(input.race, input.faction) : undefined;
  const suggestedStart = raceStart?.recommendedLevel && browserLevel >= raceStart.recommendedLevel.min
    && browserLevel <= raceStart.recommendedLevel.max ? raceStart : undefined;
  return {
    planningLevel,
    planningWindow: {
      min: planningLevel,
      max: Math.max(planningLevel, Math.min(windowEnd, nextEntryLevel ?? 60)),
    },
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    ...(sourceZone ? { sourceZone } : {}),
    ...(sourceRange ? { sourceRange } : {}),
    ...(suggestedStart ? { suggestedStart } : {}),
    basedOnPreviousZone,
    basedOnPreviousPlan,
    ...(nextEntryLevel !== undefined ? { nextEntryLevel } : {}),
    hasLevelConflict: nextEntryLevel !== undefined && nextEntryLevel < planningLevel,
  };
}

const groupOrder: Record<SuggestionGroup, number> = {
  next: 0, alternative: 1, later: 2, repeat: 3, earlier: 4, unknown: 5,
};

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Unknown legs follow known travel; graph cost is relative overhead, never minutes. */
function travelKey(travel: InsertionTravel): readonly [number, number] {
  const legs = [...(travel.before ? [travel.incoming] : []), ...(travel.outgoing ? [travel.outgoing] : [])];
  return [
    legs.filter((leg) => leg.score === null).length,
    legs.reduce((sum, leg) => sum + (leg.score ?? 0), 0),
  ];
}

/**
 * Compare faction, bracket group, then travel within the next bracket. Later
 * options compare their entry gap before travel. See docs/route-relevance.md.
 * The entire catalogue remains available, including repeats and other factions.
 */
export function rankZoneSuggestions(
  input: SuggestionInput,
  catalogue: readonly ZoneRecord[] = zoneCatalogue,
): ZoneSuggestion[] {
  const context = getSuggestionContext(input);
  const window = context.planningWindow;
  const ranked = catalogue.map((zone) => {
    const travel = getInsertionTravel(input.planner, zone.id, input.insertionIndex, input.faction);
    const range = zone.recommendedLevel;
    const later = range !== undefined && range.min > window.max;
    const earlier = range !== undefined && range.max < window.min;
    const factionKnown = input.faction === "Alliance" || input.faction === "Horde";
    const factionMismatch = factionKnown && zone.faction !== "Both"
      && zone.faction !== "Unknown" && zone.faction !== input.faction;
    const factionUnknown = !factionKnown || zone.faction === "Unknown";
    const visits = input.planner.entries.filter((entry) => resolveEntryZone(entry)?.id === zone.id);
    const pendingVisit = visits.some((entry) => entry.status !== "completed" && entry.status !== "skipped");
    const completedVisit = visits.some((entry) => entry.status === "completed");
    const forward = range !== undefined && (context.basedOnPreviousZone && context.sourceRange
      ? range.max > context.sourceRange.max
      : range.max > context.planningLevel);
    const group: SuggestionGroup = !range ? "unknown"
      : earlier ? "earlier"
      : visits.length ? "repeat"
      : later ? "later"
      : forward ? "next" : "alternative";
    const raceStart = context.suggestedStart?.id === zone.id && visits.length === 0;
    const reasons: string[] = [];
    if (raceStart) reasons.push(`Suggested starting zone for ${input.race}`);
    if (!range) reasons.push("Suitable levels are unverified");
    else if (later) reasons.push(`Suitable from level ${range.min}`);
    else if (earlier) reasons.push(`Earlier than the level ${window.min} planning bracket`);
    else if (forward) reasons.push(`Overlaps the next bracket, levels ${window.min}–${window.max}`);
    else reasons.push(`Overlaps levels ${window.min}–${window.max}; limited onward progression`);
    if (travel.before) reasons.push(`${travel.incoming.label} from the previous stop`);
    if (travel.outgoing) reasons.push(`${travel.outgoing.label} to the following stop`);
    if (factionMismatch) reasons.push("Recommended for the other faction");
    else if (factionUnknown) reasons.push("Faction fit is unverified");
    if (visits.length) reasons.push(pendingVisit ? "Already planned elsewhere in this route"
      : completedVisit ? "Previously completed in this route" : "Previously skipped in this route");

    const [unknownLegs, travelOverhead] = travelKey(travel);
    let fit: SuggestionFit;
    let label: string;
    if (factionMismatch || visits.length || earlier) {
      fit = "awkward";
      label = factionMismatch ? "Other faction" : visits.length
        ? pendingVisit ? "Already in route" : completedVisit ? "Return visit" : "Previously skipped"
        : "Past suitable range";
    } else if (!range || factionUnknown) {
      fit = "unknown";
      label = "Fit unverified";
    } else if (later) {
      fit = "later";
      label = "Later option";
    } else if (unknownLegs > 0) {
      fit = "unknown";
      label = "Travel unverified";
    } else {
      fit = "good";
      label = raceStart ? "Suggested starting zone" : forward ? "Next suggested zone" : "Suitable alternative";
    }

    // The next bracket compares travel before level distance. Outside that
    // bracket, the nearest later/earlier range must precede distant ranges.
    const levelGap = !range ? 0 : later ? range.min - window.max
      : earlier ? window.min - range.max : 0;
    const entryDistance = range ? Math.abs(range.min - window.min) : 0;
    const key = [
      factionMismatch ? 2 : factionUnknown ? 1 : 0,
      raceStart ? -1 : groupOrder[group],
      levelGap,
      unknownLegs,
      travelOverhead,
      entryDistance,
    ];
    return { suggestion: { zone, travel, fit, label, reasons, group }, key };
  });
  ranked.sort((a, b) => {
    for (let index = 0; index < a.key.length; index += 1) {
      const difference = a.key[index] - b.key[index];
      if (difference) return difference;
    }
    return compareId(a.suggestion.zone.id, b.suggestion.zone.id);
  });
  return ranked.map(({ suggestion }) => suggestion);
}

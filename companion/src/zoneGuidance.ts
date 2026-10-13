import type { ZoneRecord } from "./data/zones";
import type { LevelRange } from "./progressionTypes";

export interface ZoneGuidance {
  label: string;
  note: string;
  kind: "editorial" | "unknown";
}

/** A review prompt, not an estimate of quest XP or how long a zone lasts. */
export const LONG_STAY_REVIEW_LEVELS = 8;

const pairingGuidance: ZoneGuidance = {
  label: "Plan alongside other stops",
  note: "Suitable levels describe relevant content, not levels gained. Pair with other stops as needed.",
  kind: "editorial",
};

/** Planning advice is deliberately separate from field-specific range evidence. */
export function getZoneGuidance(zone: ZoneRecord | undefined): ZoneGuidance {
  if (!zone?.recommendedLevel)
    return {
      label: "Guidance unknown",
      note: "Coverage is not established. Choose your own planned range.",
      kind: "unknown",
    };
  if (zone.startingRaces.length)
    return {
      label: "Starting route segment",
      note: "Suitable levels describe relevant content, not levels gained. Plan a follow-up stop as needed.",
      kind: "editorial",
    };
  return { ...pairingGuidance };
}

/** Advisory only; never changes, clamps, or validates a saved personal range. */
export function longStayWarning(
  range: LevelRange | undefined,
  zone: ZoneRecord | undefined,
): string | undefined {
  if (
    !range ||
    getZoneGuidance(zone).kind === "unknown" ||
    !Number.isInteger(range.min) ||
    !Number.isInteger(range.max) ||
    range.min < 1 ||
    range.max > 60 ||
    range.max < range.min
  )
    return undefined;
  return range.max - range.min >= LONG_STAY_REVIEW_LEVELS
    ? "This plan expects a long stay here. Consider another stop nearby."
    : undefined;
}

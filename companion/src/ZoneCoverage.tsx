import type { ZoneRecord } from "./data/zones";
import { getZoneGuidance } from "./zoneGuidance";

export function ZoneCoverage({ zone }: { zone?: ZoneRecord }) {
  const guidance = getZoneGuidance(zone);
  return <div className="zone-guidance" data-guidance={guidance.kind}>
    <span className="coverage-label">{guidance.label}</span>
    <small>{guidance.note}</small>
  </div>;
}

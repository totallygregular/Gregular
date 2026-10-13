import type { LevelRange } from "./progressionTypes";
import { catalogueMetadata, type ZoneRecord } from "./data/zones";
import { travelPathNames, type TravelResult } from "./travel";

export const rangeText = (range?: LevelRange) =>
  range ? `${range.min}–${range.max}` : "Unknown";

/** Presentation only: the selected graph edges are the authority for transport. */
export function travelAppearance(travel: TravelResult, first = false) {
  if (first) return { mode: "start", description: "Choose your starting location" };
  if (travel.difficulty === "unknown")
    return { mode: "unknown", description: "Travel route unknown" };
  const modes = new Set(travel.edges.map((edge) => edge.transport));
  if (modes.has("boat")) return { mode: "boat", description: "Boat required" };
  if (modes.has("zeppelin")) return { mode: "zeppelin", description: "Zeppelin required" };
  if (modes.has("airship")) return { mode: "airship", description: "Airship required" };
  if (modes.has("tram")) return { mode: "tram", description: "Tram required" };
  if (modes.has("flight")) return { mode: "flight", description: "Discovered flight points required" };
  if (modes.has("other")) return { mode: "other", description: "Transport connection" };
  if (!travel.edges.length) return { mode: "walking", description: "Same zone · return visit" };
  if (travel.edges.length === 1)
    return { mode: "walking", description: "Adjacent zone" };
  return { mode: "road", description: "Road journey" };
}

export function JourneyIcon({ mode }: { mode: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {mode === "boat" ? <>
        <path d="M5 20h22l-4 6H10l-5-6ZM16 5v15M18 7l7 10h-7M13 10l-5 7h5M3 28q3-3 6 0t6 0t6 0t8 0" />
      </> : mode === "zeppelin" || mode === "airship" ? <>
        <ellipse cx="16" cy="12" rx="12" ry="6" /><path d="M7 12h18M16 6c-5 3-5 9 0 12 5-3 5-9 0-12ZM12 18l1 6h7l1-6M5 9 2 5v14l3-4" />
      </> : mode === "tram" ? <>
        <rect x="8" y="4" width="16" height="20" rx="4" /><path d="M8 14h16M12 8h8M10 29l3-5m9 5-3-5M13 19h.01M19 19h.01" />
      </> : mode === "flight" ? <>
        <path d="m4 10 12 6 12-6-5 10-7-2-7 2-5-10ZM16 5v13m-3 9 3-9 3 9" />
      </> : mode === "unknown" ? <>
        <path d="M11 11a5 5 0 1 1 8 4c-2 1-3 2-3 5M16 25h.01" /><circle cx="16" cy="16" r="14" strokeDasharray="2 5" />
      </> : mode === "start" ? <>
        <circle cx="16" cy="16" r="11" /><path d="m16 6 4 10-4 10-4-10 4-10ZM6 16h6m8 0h6" />
      </> : mode === "walking" ? <>
        <ellipse cx="11" cy="11" rx="3" ry="6" transform="rotate(-25 11 11)" />
        <ellipse cx="22" cy="20" rx="3" ry="6" transform="rotate(-25 22 20)" /><path d="m14 20 2 4m-9-5 2 4" />
      </> : <>
        <circle cx="7" cy="25" r="3" /><circle cx="25" cy="7" r="3" />
        <path d="M10 25h9a5 5 0 0 0 0-10h-6a5 5 0 0 1 0-10h9" />
      </>}
    </svg>
  );
}

/** Original cartographic ornament. Continent changes colour, never invented terrain. */
export function LocationMark({ continent }: { continent?: string }) {
  return (
    <span className="location-mark" data-region={continent === "Kalimdor" ? "west" : "east"} aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor">
        <circle cx="32" cy="32" r="23" opacity=".35" />
        <circle cx="32" cy="32" r="16" opacity=".25" strokeDasharray="2 5" />
        <path d="m32 5 6 21 21 6-21 6-6 21-6-21-21-6 21-6 6-21Z" opacity=".5" />
        <path d="m32 18 5 14-5 14-5-14 5-14Z" fill="currentColor" fillOpacity=".18" />
        <path d="M32 1v7m0 48v7M1 32h7m48 0h7" />
      </svg>
    </span>
  );
}

export function LevelRangeBadge({ range, personal = false }: { range?: LevelRange; personal?: boolean }) {
  return <span className={personal ? "level-range personal-range" : "level-range recommended-range"}>
    <small>{personal ? "Your plan" : "Recommended"}</small>
    <strong>{range ? rangeText(range) : personal ? "Not set" : "Unknown"}</strong>
    {personal && range && <span className="range-unit">LEVELS</span>}
  </span>;
}

export function TravelLabel({ travel, first = false }: { travel: TravelResult; first?: boolean }) {
  const appearance = travelAppearance(travel, first);
  return (
    <div className="travel-summary" data-difficulty={first ? "start" : travel.difficulty} data-transport={appearance.mode}>
      <span className={`travel-symbol travel-${first ? "start" : travel.difficulty}`}><JourneyIcon mode={appearance.mode} /></span>
      <div className="travel-copy">
        <span className={`travel-label travel-${first ? "start" : travel.difficulty}`}>
          {first ? "Starting point" : travel.label}
        </span>
        <span className="travel-description">{appearance.description}</span>
        {!first && travel.provisional && travel.difficulty !== "unknown" &&
          <span className="travel-confidence">Provisional connection</span>}
        <details className="travel-path">
          <summary>View travel route</summary>
          <p>{travel.explanation}</p>
          {!!travel.path.length && <p>{travelPathNames(travel).join(" → ")}</p>}
          {!!travel.edges.length && <ul>{travel.edges.map((edge) => <li key={edge.id}>
            {travelPathNames({ ...travel, path: [edge.from, edge.to] }).join(" → ")} · {edge.transport} · {edge.evidence.kind}
            {edge.note && <span> · {edge.note}</span>}
          </li>)}</ul>}
          <ul>{travel.sourceIds.map((id) => {
            const source = catalogueMetadata.sources.find((s) => s.id === id);
            return source ? <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li> : null;
          })}</ul>
          {!first && <p>Relative travel overhead; no exact time, safety or verified shortest path is implied.</p>}
        </details>
      </div>
    </div>
  );
}

export function ZoneEvidence({ zone, compact = false }: { zone: ZoneRecord; compact?: boolean }) {
  const evidence = zone.evidence.levels;
  const label = evidence.kind === "forever-confirmed" ? "Forever confirmed"
    : evidence.kind === "client-derived" ? "Client-derived · provisional"
    : evidence.kind === "classic-derived" ? "Classic-derived · provisional"
    : evidence.kind === "editorial" ? "Editorial estimate" : "Range unresolved";
  if (compact) return <span className={`zone-evidence evidence-${evidence.kind}`}>{label}</span>;
  const sources = [...new Set(Object.values(zone.evidence).flatMap((field) => field.sourceIds))];
  return <details className="zone-source">
    <summary>Sources &amp; confidence</summary>
    <p>{evidence.note}</p>
    <p>{evidence.confidence} range confidence · reviewed {zone.reviewedAt}{zone.gameRevision ? ` · ${zone.gameRevision}` : " · build not established"}</p>
    <p>Faction: {zone.evidence.faction.note}</p>
    {!!zone.startingRaces.length && <p>Starting association: {zone.evidence.startingRaces.note}</p>}
    <ul>{sources.map((id) => {
      const source = catalogueMetadata.sources.find((s) => s.id === id);
      return source ? <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li> : null;
    })}</ul>
    <p>{zone.region}</p>
  </details>;
}

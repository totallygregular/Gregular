import { useEffect, useMemo, useState, type RefObject } from "react";
import type { Character } from "./domain";
import { Icon } from "./components";
import { zoneCatalogue, type ZoneRecord } from "./data/zones";
import { getInsertionTravel } from "./routeBuilder";
import { rangeText, TravelLabel, ZoneEvidence } from "./routePresentation";
import { rankZoneSuggestions, getSuggestionContext } from "./zoneRelevance";
import { ZoneCoverage } from "./ZoneCoverage";
import { ZoneMotif } from "./ZoneMotif";
import "./zoneBrowser.css";

function suitabilityFor(zone: ZoneRecord, level: number) {
  const range = zone.recommendedLevel;
  if (!range) return { key: "unknown", text: "Range unknown" };
  if (level < range.min) return { key: "later", text: "Suitable later" };
  if (level > range.max) return { key: "earlier", text: "Earlier levels" };
  return { key: "now", text: "Suitable now" };
}

export function ZoneBrowser({
  character,
  insertionIndex,
  insertAt,
  setInsertAt,
  plan,
  saving,
  browserRef,
  searchRef,
}: {
  character: Character;
  insertionIndex: number;
  insertAt: number | null;
  setInsertAt: (index: number | null) => void;
  plan: (zone: ZoneRecord) => void;
  saving: boolean;
  browserRef: RefObject<HTMLElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState(character.faction);
  const [continent, setContinent] = useState("");
  const [suitability, setSuitability] = useState("");
  const [travelFilter, setTravelFilter] = useState("");
  const [level, setLevel] = useState(character.level);
  useEffect(() => setLevel(character.level), [character.level]);
  useEffect(() => setFaction(character.faction), [character.faction]);
  const candidates = useMemo(
    () =>
      rankZoneSuggestions({
        planner: character.planner, level, insertionIndex, faction: character.faction,
      })
        .filter(({ zone, travel }) => {
          if (
            search &&
            !`${zone.name} ${zone.region} ${zone.continent}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())
          )
            return false;
          if (
            faction &&
            zone.faction !== "Both" &&
            zone.faction !== "Unknown" &&
            zone.faction !== faction
          )
            return false;
          if (continent && zone.continent !== continent) return false;
          if (travelFilter && travel.incoming.difficulty !== travelFilter)
            return false;
          const r = zone.recommendedLevel;
          if (suitability === "now" && (!r || level < r.min || level > r.max))
            return false;
          if (suitability === "later" && (!r || r.min <= level)) return false;
          if (suitability === "unknown" && r) return false;
          return true;
        }),
    [
      search,
      faction,
      continent,
      suitability,
      travelFilter,
      level,
      insertionIndex,
      character.planner,
      character.faction,
    ],
  );
  const stops = character.planner.entries.filter((e) => e.kind !== "custom");
  const relevanceContext = getSuggestionContext({
    planner: character.planner, level, insertionIndex, faction: character.faction,
  });
  const context = getInsertionTravel(
    character.planner,
    zoneCatalogue[0].id,
    insertionIndex,
    character.faction,
  );
  const hasFilters = Boolean(
    search || continent || suitability || travelFilter || faction !== character.faction,
  );
  function resetFilters() {
    setSearch("");
    setSuitability("");
    setContinent("");
    setTravelFilter("");
    setFaction(character.faction);
  }

  return (
    <section className="zone-browser" aria-label="Zone Browser" ref={browserRef}>
      <div className="zone-section-heading">
        <div>
          <p className="eyebrow">02 / EXPLORE AZEROTH</p>
          <h3>Zone Browser</h3>
        </div>
        <span>{zoneCatalogue.length} destinations</span>
      </div>
      <div className="zone-browser-tools panel">
        <label className="zone-search">
          Search zones
          <span className="zone-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={search}
              placeholder="Find your next destination…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </span>
        </label>
        <div className="zone-filter-grid">
          <label>
            Browser level
            <input
              type="number"
              min={1}
              max={60}
              value={level}
              onChange={(e) =>
                setLevel(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
              }
            />
          </label>
          <label>
            Level suitability
            <select value={suitability} onChange={(e) => setSuitability(e.target.value)}>
              <option value="">All levels</option>
              <option value="now">Suitable now</option>
              <option value="later">Suitable later</option>
              <option value="unknown">Range unknown</option>
            </select>
          </label>
          <label>
            Zone faction
            <select value={faction} onChange={(e) => setFaction(e.target.value)}>
              <option value="">All factions</option>
              <option>Alliance</option>
              <option>Horde</option>
            </select>
          </label>
          <label>
            Continent
            <select value={continent} onChange={(e) => setContinent(e.target.value)}>
              <option value="">All continents</option>
              {[...new Set(zoneCatalogue.map((z) => z.continent))].sort().map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="full-filter">
            Travel difficulty
            <select value={travelFilter} onChange={(e) => setTravelFilter(e.target.value)}>
              <option value="">Any travel</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="long">Long</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </div>
        <div className="zone-insertion-box">
          <div className="zone-insertion-icon" aria-hidden="true"><Icon name="route" size={21} /></div>
          <label className="zone-insert">
            Insert at
            <select
              value={insertAt === null ? "end" : String(insertionIndex)}
              onChange={(e) => setInsertAt(e.target.value === "end" ? null : Number(e.target.value))}
            >
              <option value="end">End of route</option>
              <option value="0">Beginning of route</option>
              {stops.map((entry) => (
                <option
                  key={entry.id}
                  value={character.planner.entries.findIndex((e) => e.id === entry.id) + 1}
                >
                  After {entry.title}
                </option>
              ))}
            </select>
          </label>
          <p className="insertion-context" aria-live="polite">
            {context.before ? <>Travel from <strong>{context.before.title}</strong></> : "Choose your starting location"}
            {context.after && <> · then to <strong>{context.after.title}</strong></>}
          </p>
        </div>
        <p className="suggestion-context" aria-live="polite">
          Finding fits around level <strong>{relevanceContext.planningLevel}</strong>
          {relevanceContext.basedOnPreviousPlan ? " · uses the previous stop’s planned exit" : " · uses your browser level"}.
          {relevanceContext.hasLevelConflict && " The surrounding planned levels overlap or run backwards; review the fit."}
        </p>
        <details className="suggestion-explanation">
          <summary>How suggestions are sorted</summary>
          <p>Best route relevance first: suitable levels and entry fit, then travel on both sides, faction suitability and repeat visits. Later and awkward options remain available. Unknown travel never counts as easy.</p>
          <p>Recommended ranges describe relevant content, not how many levels you will gain. Coverage notes are broad editorial prompts, not quest or XP estimates.</p>
        </details>
      </div>
      <div className="zone-results-bar">
        <p className="zone-results" role="status">
          <strong>{candidates.length}</strong> zones <span>· best route relevance first</span>
        </p>
        {hasFilters && <button className="text-button" onClick={resetFilters}>Reset filters</button>}
      </div>
      <div className="zone-candidates">
        {candidates.map(({ zone, travel, fit, label, reasons }) => {
          const suitable = suitabilityFor(zone, level);
          return (
            <article
              className="zone-candidate"
              data-continent={zone.continent}
              data-suitability={suitable.key}
              data-fit={fit}
              aria-label={`Zone: ${zone.name}`}
              key={zone.id}
            >
              <div className="candidate-heading">
                <div>
                  <span className="candidate-region">{zone.continent}</span>
                  <h4>{zone.name}</h4>
                </div>
                <ZoneMotif zone={zone} />
              </div>
              <div className={`candidate-fit fit-${fit}`}>
                <strong>{label}</strong>
                <span>{reasons.join(" · ")}</span>
              </div>
              <div className="candidate-level">
                <div className="candidate-level-range">
                  <span>Recommended levels</span>
                  <strong>{rangeText(zone.recommendedLevel)}</strong>
                </div>
                <span className={`candidate-suitability suitability-${suitable.key}`}>
                  <span aria-hidden="true">{suitable.key === "now" ? "✓" : suitable.key === "later" ? "↗" : suitable.key === "unknown" ? "?" : "↶"}</span>
                  <span>{suitable.text}<small>Browser level {level}</small></span>
                </span>
              </div>
              <div className="candidate-qualifiers">
                <span className="candidate-faction" data-faction={zone.faction}>
                  <Icon name="shield" size={14} />
                  {zone.faction === "Both" ? "Both factions" : zone.faction === "Unknown" ? "Faction unverified" : zone.faction}
                </span>
                <ZoneEvidence zone={zone} compact />
              </div>
              <ZoneCoverage zone={zone} />
              <div className="candidate-travel">
                <TravelLabel travel={travel.incoming} first={!travel.before} />
                {travel.outgoing && (
                  <div className="outgoing-travel">
                    <small>Then to {travel.after!.title}</small>
                    <TravelLabel travel={travel.outgoing} />
                  </div>
                )}
              </div>
              <ZoneEvidence zone={zone} />
              <div className="candidate-footer">
                <span>{insertAt === null ? "Add as your next stop" : "Add at selected position"}</span>
                <button
                  className="primary"
                  disabled={saving}
                  aria-label={`Plan ${zone.name}`}
                  onClick={() => plan(zone)}
                >
                  <Icon name="plus" size={17} /> Add to route
                </button>
              </div>
            </article>
          );
        })}
        {!candidates.length && (
          <div className="panel route-empty zone-browser-empty">
            <Icon name="route" size={40} />
            <h4>No matching zones</h4>
            <p>Change a filter to see more destinations.</p>
            <button className="secondary" onClick={resetFilters}>Reset filters</button>
          </div>
        )}
      </div>
    </section>
  );
}

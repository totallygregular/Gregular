import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Character } from "./domain";
import type {
  CharacterPlanner,
  LevelRange,
  PlannerEntry,
  PlannerStatus,
} from "./progressionTypes";
import { Icon, Modal } from "./components";
import { LegacyObjectives } from "./LevelingPlanner";
import {
  zoneCatalogue,
  startingZoneFor,
  catalogueMetadata,
  type ZoneRecord,
} from "./data/zones";
import {
  addZone,
  getInsertionTravel,
  getRouteProgress,
  getRouteTransitions,
  outstandingZoneObjectives,
  plannedRangeWarning,
  renameRoute,
  resolveEntryZone,
  startBlankRoute,
} from "./routeBuilder";
import { moveEntry, removeEntry, setEntryStatus, updateEntry } from "./planner";
import { travelPathNames, type TravelResult } from "./travel";
import "./zoneRoute.css";

type ChangePlanner = (
  change: (planner: CharacterPlanner) => CharacterPlanner,
) => Promise<boolean>;
const rangeText = (range?: LevelRange) =>
  range ? `${range.min}–${range.max}` : "Unknown";
const statusNames: Record<PlannerStatus, string> = {
  planned: "Planned",
  active: "Current",
  completed: "Completed",
  skipped: "Skipped",
};
const difficultyRank = { easy: 0, moderate: 1, long: 2, unknown: 3 };

export function TravelLabel({
  travel,
  first = false,
}: {
  travel: TravelResult;
  first?: boolean;
}) {
  return (
    <div className="travel-summary" data-difficulty={travel.difficulty}>
      <span className={`travel-label travel-${travel.difficulty}`}>
        <span aria-hidden="true">
          {first ? "◎" : travel.difficulty === "unknown" ? "?" : "↳"}
        </span>
        {first
          ? "Starting point"
          : travel.difficulty === "easy"
            ? "Easy travel"
            : travel.difficulty === "moderate"
              ? "Moderate travel"
              : travel.difficulty === "long"
                ? "Long travel"
                : "Travel unknown"}
      </span>
      <small>{travel.explanation}</small>
      {!!travel.edges.length && (
        <details className="travel-path">
          <summary>View travel route</summary>
          <p>{travelPathNames(travel).join(" → ")}</p>
          <ul>
            {travel.sourceIds.map((id) => {
              const source = catalogueMetadata.sources.find((s) => s.id === id);
              return source ? (
                <li key={id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title} ↗
                  </a>
                </li>
              ) : null;
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

export function LevelingPlanner({
  character,
  saving,
  change,
  editLevel,
}: {
  character: Character;
  saving: boolean;
  change: ChangePlanner;
  editLevel: () => void;
}) {
  const planner = character.planner;
  const stops = planner.entries.filter((entry) => entry.kind !== "custom");
  const progress = getRouteProgress(planner, character.level);
  const transitions = new Map(
    getRouteTransitions(planner, character.faction).map((item) => [
      item.entryId,
      item,
    ]),
  );
  const suggestion = startingZoneFor(character.race, character.faction);
  const [planning, setPlanning] = useState<ZoneRecord | null>(null);
  const [editing, setEditing] = useState<PlannerEntry | null>(null);
  const [removing, setRemoving] = useState<PlannerEntry | null>(null);
  const [blanking, setBlanking] = useState(false);
  const [routeName, setRouteName] = useState(planner.name);
  const [notice, setNotice] = useState("");
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const insertionIndex = Math.min(
    insertAt ?? planner.entries.length,
    planner.entries.length,
  );
  const browserRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => setRouteName(planner.name), [planner.name]);
  function browse(position: number | null = null) {
    setInsertAt(position);
    browserRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    searchRef.current?.focus({ preventScroll: true });
  }
  async function mutate(
    fn: (p: CharacterPlanner) => CharacterPlanner,
    message: string,
  ) {
    if (await change(fn)) setNotice(message);
  }
  const activeIndex = progress.current
    ? stops.findIndex((s) => s.id === progress.current!.id)
    : -1;
  return (
    <div className="zone-planner">
      <div className="dashboard-title zone-title">
        <div>
          <p className="eyebrow">LEVELING / ROUTE BUILDER</p>
          <h2>Your roadmap</h2>
          <p>Plan zones and level ranges.</p>
        </div>
        <div className="zone-level">
          <span>LEVEL</span>
          <strong>{character.level}</strong>
          <button className="text-button" onClick={editLevel}>
            Update level
          </button>
        </div>
      </div>
      <div className="route-overview panel">
        <div>
          <span className="eyebrow">
            {progress.current?.status === "active"
              ? "CURRENT ZONE"
              : progress.current
                ? "NEXT ZONE"
                : "YOUR ROUTE"}
          </span>
          <strong>
            {progress.current?.title ||
              progress.next?.title ||
              "No zone selected"}
          </strong>
          <small>
            {progress.current?.targetLevel
              ? `Your plan ${rangeText(progress.current.targetLevel)}`
              : "Build a personal route from the zone browser."}
          </small>
        </div>
        <div className="route-count">
          <strong>
            {progress.completed}
            <span> / {stops.length}</span>
          </strong>
          <small>stops completed · {progress.skipped} skipped</small>
        </div>
        <button className="primary" onClick={() => browse()}>
          <Icon name="plus" size={17} />
          Add zone
        </button>
      </div>
      {!!progress.earlierUnfinished.length && (
        <p className="route-unfinished">
          {progress.earlierUnfinished.length} earlier{" "}
          {progress.earlierUnfinished.length === 1 ? "stop is" : "stops are"}{" "}
          unfinished. Level changes leave completion in your hands.
        </p>
      )}
      <p className="zone-announcement" role="status" aria-live="polite">
        {notice}
      </p>
      <div className="zone-workspace">
        <section className="my-route" aria-label="My Route">
          <div className="zone-section-heading">
            <div>
              <p className="eyebrow">01 / YOUR PLAN</p>
              <h3>My Route</h3>
            </div>
            <span>{stops.length} stops</span>
          </div>
          <form
            className="zone-route-name"
            onSubmit={async (e) => {
              e.preventDefault();
              await mutate((p) => renameRoute(p, routeName), "Route renamed.");
            }}
          >
            <label htmlFor="zone-route-title">Route title</label>
            <div>
              <input
                id="zone-route-title"
                value={routeName}
                maxLength={100}
                required
                onChange={(e) => setRouteName(e.target.value)}
              />
              <button
                className="icon-button"
                aria-label="Save route title"
                disabled={saving || routeName === planner.name}
              >
                <Icon name="check" size={17} />
              </button>
            </div>
          </form>
          {!stops.length ? (
            <div className="route-empty panel">
              <span className="empty-route-symbol" aria-hidden="true">
                ◎<span>┊</span>◇
              </span>
              <h4>Build your route</h4>
              <p>
                Add zones in the order you want to visit. Planned levels can
                overlap or leave gaps.
              </p>
              {suggestion && (
                <div className="race-suggestion">
                  <span className="eyebrow">
                    {character.race.toUpperCase()} STARTING SUGGESTION
                  </span>
                  <strong>{suggestion.name}</strong>
                  <small>
                    Recommended {rangeText(suggestion.recommendedLevel)} ·
                    provisional starting guidance
                  </small>
                  <button
                    className="primary"
                    disabled={saving}
                    onClick={() => setPlanning(suggestion)}
                  >
                    Plan {suggestion.name}
                  </button>
                </div>
              )}
              <button className="secondary" onClick={() => browse()}>
                Browse zones
              </button>
              <small>Start anywhere, or leave your route blank.</small>
            </div>
          ) : (
            <>
              <ol className="zone-route-timeline">
                {stops.map((entry, index) => {
                  const zone = resolveEntryZone(entry);
                  const transition = transitions.get(entry.id);
                  const warning = plannedRangeWarning(entry, zone);
                  const goals = zone
                    ? outstandingZoneObjectives(planner, zone)
                    : [];
                  const actualIndex = planner.entries.findIndex(
                    (e) => e.id === entry.id,
                  );
                  const current = progress.current?.id === entry.id;
                  return (
                    <li
                      className={`zone-stop stop-${entry.status}${current ? " stop-current" : ""}`}
                      key={entry.id}
                    >
                      <span className="zone-stop-number" aria-hidden="true">
                        {entry.status === "completed"
                          ? "✓"
                          : entry.status === "skipped"
                            ? "—"
                            : String(index + 1).padStart(2, "0")}
                      </span>
                      <article aria-label={`Route stop: ${entry.title}`}>
                        <div className="stop-topline">
                          <span>
                            {entry.kind === "dungeon"
                              ? "DUNGEON MILESTONE"
                              : zone?.continent || "PERSONAL ZONE"}
                          </span>
                          <span className={`stop-state state-${entry.status}`}>
                            {entry.status === "planned" && current
                              ? "Next zone"
                              : statusNames[entry.status]}
                          </span>
                        </div>
                        <h4>{entry.title}</h4>
                        <div className="stop-ranges">
                          <span>
                            <small>Recommended</small>
                            <strong>{rangeText(zone?.recommendedLevel)}</strong>
                          </span>
                          <span className="personal-range">
                            <small>Your plan</small>
                            <strong>
                              {entry.targetLevel
                                ? rangeText(entry.targetLevel)
                                : "Not set"}
                            </strong>
                          </span>
                        </div>
                        {zone && <ZoneEvidence zone={zone} compact />}
                        {warning && (
                          <p className="range-warning">△ {warning}</p>
                        )}
                        {entry.status === "skipped" ? (
                          <p className="planner-help">
                            Skipped · travel continues from the previous stop.
                          </p>
                        ) : (
                          transition && (
                            <TravelLabel
                              travel={transition.travel}
                              first={!transition.previousEntryId}
                            />
                          )
                        )}
                        {entry.notes && (
                          <p className="stop-notes">{entry.notes}</p>
                        )}
                        {!!goals.length && (
                          <div className="stop-objectives">
                            <strong>
                              {goals.length} outstanding{" "}
                              {goals.length === 1 ? "objective" : "objectives"}
                            </strong>
                            <ul>
                              {goals.map((goal) => (
                                <li key={goal.id}>{goal.title}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="stop-controls">
                          <label>
                            <span className="sr-only">
                              Route status for {entry.title}
                            </span>
                            <select
                              value={entry.status}
                              disabled={saving}
                              onChange={(e) =>
                                void mutate(
                                  (p) =>
                                    setEntryStatus(
                                      p,
                                      entry.id,
                                      e.target.value as PlannerStatus,
                                    ),
                                  `${entry.title}: ${statusNames[e.target.value as PlannerStatus]}.`,
                                )
                              }
                            >
                              {Object.entries(statusNames).map(
                                ([value, label]) => (
                                  <option value={value} key={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          <button
                            className="text-button"
                            aria-label={`Edit planned levels for ${entry.title}`}
                            onClick={() => setEditing(entry)}
                          >
                            Edit plan
                          </button>
                          <div className="stop-order">
                            <button
                              className="icon-button"
                              aria-label={`Move stop ${entry.title} up`}
                              disabled={saving || index === 0}
                              onClick={() =>
                                void mutate(
                                  (p) =>
                                    moveEntry(
                                      p,
                                      entry.id,
                                      p.entries.findIndex(
                                        (e) => e.id === stops[index - 1].id,
                                      ),
                                    ),
                                  "Stop moved. Travel updated.",
                                )
                              }
                            >
                              ↑
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Move stop ${entry.title} down`}
                              disabled={saving || index === stops.length - 1}
                              onClick={() =>
                                void mutate(
                                  (p) =>
                                    moveEntry(
                                      p,
                                      entry.id,
                                      p.entries.findIndex(
                                        (e) => e.id === stops[index + 1].id,
                                      ),
                                    ),
                                  "Stop moved. Travel updated.",
                                )
                              }
                            >
                              ↓
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Remove stop ${entry.title}`}
                              disabled={saving}
                              onClick={() => setRemoving(entry)}
                            >
                              <Icon name="close" size={15} />
                            </button>
                          </div>
                        </div>
                      </article>
                      <button
                        className="insert-zone text-button"
                        aria-label={`Insert zone after ${entry.title}`}
                        onClick={() => browse(actualIndex + 1)}
                      >
                        + Insert zone
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="route-bottom-actions">
                <button className="secondary" onClick={() => browse()}>
                  + Add next zone
                </button>
                <button
                  className="text-button"
                  disabled={saving}
                  onClick={() => setBlanking(true)}
                >
                  Start blank
                </button>
              </div>
            </>
          )}
          {activeIndex >= 0 && (
            <p className="planner-help">
              Saved order guides overlapping plans. Complete or skip stops when
              you are ready.
            </p>
          )}
        </section>
        <ZoneBrowser
          character={character}
          insertionIndex={insertionIndex}
          insertAt={insertAt}
          setInsertAt={setInsertAt}
          plan={setPlanning}
          saving={saving}
          browserRef={browserRef}
          searchRef={searchRef}
        />
      </div>
      <details className="legacy-planner panel">
        <summary>
          Objectives &amp; dungeons{" "}
          <span>Personal goals, existing plans and starter templates</span>
        </summary>
        <div className="legacy-planner-content">
          <LegacyObjectives
            character={character}
            saving={saving}
            change={change}
            editLevel={editLevel}
          />
        </div>
      </details>
      <details className="zone-data-note panel">
        <summary>About zone and travel guidance</summary>
        <p>
          Recommended levels and connections carry their own evidence.
          Provisional guidance may differ in the Forever beta. Your planned
          levels are saved independently and never replaced by catalogue
          updates.
        </p>
        <p>
          Travel uses supported connections and relative weights, with no flight
          paths assumed unlocked. Difficulty describes travel overhead, not
          safety or precise minutes. Unknown connections keep the route
          editable.
        </p>
        <p>
          Dungeon milestones and personal objectives remain in your profile. Use
          Objectives &amp; dungeons to manage them.
        </p>
        <p>
          Catalogue {catalogueMetadata.version} · reviewed{" "}
          {catalogueMetadata.reviewedAt}.
        </p>
      </details>
      {planning && (
        <PlanEditor
          key={planning.id}
          zone={planning}
          character={character}
          insertionIndex={insertionIndex}
          saving={saving}
          close={() => setPlanning(null)}
          save={async (range) => {
            const ok = await change((p) =>
              addZone(
                p,
                planning.id,
                range,
                Math.min(insertionIndex, p.entries.length),
              ),
            );
            if (ok) {
              setPlanning(null);
              setInsertAt(null);
              setNotice(`${planning.name} added. Travel updated.`);
            }
            return ok;
          }}
        />
      )}
      {editing && (
        <PlanEditor
          key={editing.id}
          zone={resolveEntryZone(editing)}
          entry={editing}
          character={character}
          insertionIndex={planner.entries.findIndex((e) => e.id === editing.id)}
          saving={saving}
          close={() => setEditing(null)}
          save={async (range) => {
            const ok = await change((p) =>
              updateEntry(p, editing.id, {
                targetLevel: range,
                targetLevelSource: "user",
              }),
            );
            if (ok) {
              setEditing(null);
              setNotice("Planned levels updated.");
            }
            return ok;
          }}
        />
      )}
      {removing && (
        <Modal
          title={`Remove ${removing.title}?`}
          close={() => setRemoving(null)}
        >
          <p className="dialog-description">
            Remove this visit from your route. Associated objectives stay in
            your profile.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </button>
            <button
              className="danger"
              disabled={saving}
              onClick={async () => {
                if (await change((p) => removeEntry(p, removing.id))) {
                  setRemoving(null);
                  setNotice("Stop removed. Travel updated.");
                }
              }}
            >
              Remove stop
            </button>
          </div>
        </Modal>
      )}
      {blanking && (
        <Modal title="Start a blank route?" close={() => setBlanking(false)}>
          <p className="dialog-description">
            Clear your zone visits. Dungeon milestones, personal objectives and
            character notes stay saved. Export your profile first if you want to
            keep a copy of this route.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setBlanking(false)}>
              Cancel
            </button>
            <button
              className="danger"
              disabled={saving}
              onClick={async () => {
                if (await change((p) => startBlankRoute(p))) {
                  setBlanking(false);
                  setInsertAt(null);
                  setNotice("Zone visits cleared. Other plans kept.");
                }
              }}
            >
              Clear zone visits
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ZoneBrowser({
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
  browserRef: React.RefObject<HTMLElement | null>;
  searchRef: React.RefObject<HTMLInputElement | null>;
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
      zoneCatalogue
        .map((zone) => ({
          zone,
          travel: getInsertionTravel(
            character.planner,
            zone.id,
            insertionIndex,
            character.faction,
          ),
        }))
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
        })
        .sort((a, b) => {
          const distance = (z: ZoneRecord) =>
            !z.recommendedLevel
              ? 100
              : level < z.recommendedLevel.min
                ? z.recommendedLevel.min - level
                : level > z.recommendedLevel.max
                  ? level - z.recommendedLevel.max
                  : 0;
          return (
            distance(a.zone) - distance(b.zone) ||
            difficultyRank[a.travel.incoming.difficulty] -
              difficultyRank[b.travel.incoming.difficulty] ||
            a.zone.name.localeCompare(b.zone.name, "en")
          );
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
  const context = getInsertionTravel(
    character.planner,
    zoneCatalogue[0].id,
    insertionIndex,
    character.faction,
  );
  return (
    <section
      className="zone-browser"
      aria-label="Zone Browser"
      ref={browserRef}
    >
      <div className="zone-section-heading">
        <div>
          <p className="eyebrow">02 / EXPLORE AZEROTH</p>
          <h3>Zone Browser</h3>
        </div>
        <span>{zoneCatalogue.length} zones</span>
      </div>
      <div className="zone-browser-tools panel">
        <label className="zone-search">
          Search zones
          <input
            ref={searchRef}
            type="search"
            value={search}
            placeholder="Zone or region…"
            onChange={(e) => setSearch(e.target.value)}
          />
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
            <select
              value={suitability}
              onChange={(e) => setSuitability(e.target.value)}
            >
              <option value="">All levels</option>
              <option value="now">Suitable now</option>
              <option value="later">Suitable later</option>
              <option value="unknown">Range unknown</option>
            </select>
          </label>
          <label>
            Zone faction
            <select
              value={faction}
              onChange={(e) => setFaction(e.target.value)}
            >
              <option value="">All factions</option>
              <option>Alliance</option>
              <option>Horde</option>
            </select>
          </label>
          <label>
            Continent
            <select
              value={continent}
              onChange={(e) => setContinent(e.target.value)}
            >
              <option value="">All continents</option>
              {[...new Set(zoneCatalogue.map((z) => z.continent))]
                .sort()
                .map((name) => (
                  <option key={name}>{name}</option>
                ))}
            </select>
          </label>
          <label className="full-filter">
            Travel difficulty
            <select
              value={travelFilter}
              onChange={(e) => setTravelFilter(e.target.value)}
            >
              <option value="">Any travel</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="long">Long</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </div>
        <label className="zone-insert">
          Insert at
          <select
            value={insertAt === null ? "end" : String(insertionIndex)}
            onChange={(e) =>
              setInsertAt(
                e.target.value === "end" ? null : Number(e.target.value),
              )
            }
          >
            <option value="end">End of route</option>
            <option value="0">Beginning of route</option>
            {stops.map((entry) => (
              <option
                key={entry.id}
                value={
                  character.planner.entries.findIndex(
                    (e) => e.id === entry.id,
                  ) + 1
                }
              >
                After {entry.title}
              </option>
            ))}
          </select>
        </label>
        <p className="insertion-context">
          {context.before ? (
            <>
              Travel from <strong>{context.before.title}</strong>
            </>
          ) : (
            "Choose your starting location"
          )}
          {context.after && (
            <>
              {" "}
              · then to <strong>{context.after.title}</strong>
            </>
          )}
        </p>
      </div>
      <p className="zone-results" role="status">
        {candidates.length} zones · closest level ranges first
      </p>
      <div className="zone-candidates">
        {candidates.map(({ zone, travel }) => (
          <article
            className="zone-candidate"
            aria-label={`Zone: ${zone.name}`}
            key={zone.id}
          >
            <div className="candidate-heading">
              <span
                className={`continent-mark continent-${zone.continent === "Kalimdor" ? "west" : "east"}`}
                aria-hidden="true"
              >
                ◇
              </span>
              <div>
                <span className="candidate-region">
                  {zone.continent} ·{" "}
                  {zone.faction === "Both"
                    ? "Both factions"
                    : zone.faction === "Unknown"
                      ? "Faction unverified"
                      : zone.faction}
                </span>
                <h4>{zone.name}</h4>
              </div>
            </div>
            <div className="candidate-level">
              <strong>Recommended {rangeText(zone.recommendedLevel)}</strong>
              {zone.recommendedLevel &&
                level >= zone.recommendedLevel.min &&
                level <= zone.recommendedLevel.max && <span>Suitable now</span>}
            </div>
            <ZoneEvidence zone={zone} compact />
            <TravelLabel travel={travel.incoming} first={!travel.before} />
            {travel.outgoing && (
              <div className="outgoing-travel">
                <small>Then to {travel.after!.title}</small>
                <TravelLabel travel={travel.outgoing} />
              </div>
            )}
            <div className="candidate-footer">
              <ZoneEvidence zone={zone} />
              <button
                className="secondary"
                disabled={saving}
                aria-label={`Plan ${zone.name}`}
                onClick={() => plan(zone)}
              >
                Add to route <span aria-hidden="true">+</span>
              </button>
            </div>
          </article>
        ))}
        {!candidates.length && (
          <div className="panel route-empty">
            <h4>No matching zones</h4>
            <p>Change a filter to see more zones.</p>
            <button
              className="secondary"
              onClick={() => {
                setSearch("");
                setSuitability("");
                setContinent("");
                setTravelFilter("");
                setFaction(character.faction);
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ZoneEvidence({
  zone,
  compact = false,
}: {
  zone: ZoneRecord;
  compact?: boolean;
}) {
  const evidence = zone.evidence.levels;
  const label =
    evidence.kind === "forever-confirmed"
      ? "Forever confirmed"
      : evidence.kind === "client-derived"
        ? "Client-derived · provisional"
        : evidence.kind === "classic-derived"
          ? "Classic-derived · provisional"
          : evidence.kind === "editorial"
            ? "Editorial estimate"
            : "Range unresolved";
  if (compact)
    return (
      <span className={`zone-evidence evidence-${evidence.kind}`}>{label}</span>
    );
  const sources = [
    ...new Set(
      Object.values(zone.evidence).flatMap((field) => field.sourceIds),
    ),
  ];
  return (
    <details className="zone-source">
      <summary>Sources &amp; confidence</summary>
      <p>{evidence.note}</p>
      <p>
        {evidence.confidence} range confidence · reviewed {zone.reviewedAt}
        {zone.gameRevision
          ? ` · ${zone.gameRevision}`
          : " · build not established"}
      </p>
      <p>Faction: {zone.evidence.faction.note}</p>
      {!!zone.startingRaces.length && (
        <p>Starting association: {zone.evidence.startingRaces.note}</p>
      )}
      <ul>
        {sources.map((id) => {
          const source = catalogueMetadata.sources.find((s) => s.id === id);
          return source ? (
            <li key={id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title} ↗
              </a>
            </li>
          ) : null;
        })}
      </ul>
      <p>{zone.region}</p>
    </details>
  );
}

function PlanEditor({
  zone,
  entry,
  character,
  insertionIndex,
  saving,
  close,
  save,
}: {
  zone?: ZoneRecord;
  entry?: PlannerEntry;
  character: Character;
  insertionIndex: number;
  saving: boolean;
  close: () => void;
  save: (range: LevelRange) => Promise<boolean>;
}) {
  const initial = entry?.targetLevel ||
    zone?.recommendedLevel || {
      min: character.level,
      max: Math.min(60, character.level + 5),
    };
  const [min, setMin] = useState(String(initial.min));
  const [max, setMax] = useState(String(initial.max));
  const [error, setError] = useState("");
  const title = entry?.title || zone!.name;
  const travel =
    zone && !entry
      ? getInsertionTravel(
          character.planner,
          zone.id,
          insertionIndex,
          character.faction,
        )
      : undefined;
  const warning = zone
    ? plannedRangeWarning(
        {
          ...entry,
          targetLevel: { min: Number(min), max: Number(max) },
        } as PlannerEntry,
        zone,
      )
    : undefined;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const range = { min: Number(min), max: Number(max) };
    if (
      !min ||
      !max ||
      !Number.isInteger(range.min) ||
      !Number.isInteger(range.max) ||
      range.min < 1 ||
      range.max > 60 ||
      range.max < range.min
    ) {
      setError(
        "Planned levels must be whole numbers from 1 to 60, with exit at or above entry.",
      );
      return;
    }
    try {
      await save(range);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this plan.");
    }
  }
  return (
    <Modal
      title={entry ? `Edit plan: ${title}` : `Plan ${title}`}
      close={close}
    >
      <form className="zone-plan-editor" onSubmit={submit}>
        <div className="plan-recommendation">
          <span>RECOMMENDED LEVELS</span>
          <strong>{rangeText(zone?.recommendedLevel)}</strong>
          {zone && <ZoneEvidence zone={zone} />}
        </div>
        <p className="dialog-description">
          Choose your planned levels. You can return to the same zone later.
        </p>
        <div className="plan-level-fields">
          <label>
            Planned entry level
            <input
              type="number"
              min="1"
              max="60"
              required
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>
          <span aria-hidden="true">→</span>
          <label>
            Planned exit level
            <input
              type="number"
              min="1"
              max="60"
              required
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
        </div>
        {warning && <p className="range-warning">△ {warning}</p>}
        {zone &&
          zone.faction !== "Both" &&
          zone.faction !== "Unknown" &&
          zone.faction !== character.faction && (
            <p className="range-warning">
              This zone is listed for {zone.faction}. Your saved choice will
              need an access review.
            </p>
          )}
        {travel && (
          <div className="plan-transitions">
            <h3>Affected transitions</h3>
            <p>
              {travel.before
                ? `${travel.before.title} → ${title}`
                : `Start in ${title}`}
            </p>
            <TravelLabel travel={travel.incoming} first={!travel.before} />
            {travel.outgoing && (
              <>
                <p>
                  {title} → {travel.after!.title}
                </p>
                <TravelLabel travel={travel.outgoing} />
              </>
            )}
          </div>
        )}
        <p className="planner-help">
          Planning a visit does not confirm beta access or transport unlocks.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary" type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={saving}>
            {entry ? "Save plan" : "Add to route"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { ZoneBrowser } from "./ZoneBrowser";
import { LevelRangeBadge, LocationMark, TravelLabel, ZoneEvidence, rangeText } from "./routePresentation";
import "./zoneRoute.css";

type ChangePlanner = (
  change: (planner: CharacterPlanner) => CharacterPlanner,
) => Promise<boolean>;
const statusNames: Record<PlannerStatus, string> = {
  planned: "Planned",
  active: "Current",
  completed: "Completed",
  skipped: "Skipped",
};
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
  const focus = progress.current || progress.next;
  const next = progress.current
    ? progress.next
    : progress.upcoming.find((stop) => stop.id !== focus?.id);
  const finished = stops.length > 0 && !focus;
  return (
    <div className="zone-planner">
      <div className="dashboard-title zone-title">
        <div>
          <p className="eyebrow">AZEROTH / LEVELING JOURNAL</p>
          <h2>Your roadmap</h2>
          <p>A route of your own. One zone at a time.</p>
        </div>
        <div className="zone-level">
          <span>LEVEL</span>
          <strong>{character.level}</strong>
          <button className="text-button" onClick={editLevel}>
            Update level
          </button>
        </div>
      </div>
      <section className="route-overview panel" aria-label="Journey overview">
        <div className="overview-location">
          <LocationMark continent={focus ? resolveEntryZone(focus)?.continent : undefined} />
          <div>
          <span className="eyebrow">
            {progress.current?.status === "active"
              ? "CURRENT ZONE"
              : progress.current
                ? "NEXT ZONE"
                : progress.next ? "NEXT ZONE" : finished ? "JOURNEY PLANNED & RECORDED" : "YOUR ADVENTURE STARTS HERE"}
          </span>
          <strong>
            {focus?.title || (finished ? "Route finished" : "Choose your first zone")}
          </strong>
          <small>
            {focus?.targetLevel
              ? <>Your plan <b>{rangeText(focus.targetLevel)}</b></>
              : finished ? "Add another destination whenever you’re ready." : "Discover destinations below."}
          </small>
          </div>
        </div>
        <div className="overview-next">
          <span className="eyebrow">UP NEXT</span>
          <strong>{next?.title || (finished ? "Open horizons" : focus ? "Choose the next stop" : "Your first destination")}</strong>
          {next?.targetLevel && <small>Planned {rangeText(next.targetLevel)}</small>}
          {next && <span className={`overview-travel travel-${transitions.get(next.id)?.travel.difficulty || "unknown"}`}>
            {transitions.get(next.id)?.travel.label || "Travel unknown"}
          </span>}
        </div>
        <div className="route-count">
          <strong>
            {progress.completed}
            <span> / {stops.length}</span>
          </strong>
          <small>stops completed{progress.skipped > 0 && <> · {progress.skipped} skipped</>}</small>
          <div className="route-progress-track" role="img" aria-label={`${progress.completed} of ${stops.length} route stops completed; ${progress.skipped} skipped. Stop count, not XP progress.`}>
            {stops.map((stop) => <span key={stop.id} data-state={stop.status} />)}
          </div>
        </div>
        <button className="primary" onClick={() => browse()}>
          <Icon name="plus" size={17} />
          Add zone
        </button>
      </section>
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
            <button className="text-button route-discover" onClick={() => browse()}><Icon name="plus" size={16} /> Add zone</button>
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
              <LocationMark />
              <h4>Build your route</h4>
              <p>
                Pick a starting point. Set your levels. Make the journey yours.
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
                  const earlier = progress.earlierUnfinished.some((stop) => stop.id === entry.id);
                  return (
                    <li
                      className={`zone-stop stop-${entry.status}${current ? " stop-current" : ""}`}
                      key={entry.id}
                    >
                      <article aria-label={`Route stop: ${entry.title}`} data-route-state={entry.status === "planned" ? earlier ? "earlier" : "upcoming" : entry.status === "active" ? "current" : entry.status}>
                        {transition && <div className="route-connector" aria-label={`Travel into ${entry.title}`}>
                          <TravelLabel travel={transition.travel} first={!transition.previousEntryId} />
                        </div>}
                        <div className="stop-card">
                      <span className="zone-stop-number" aria-hidden="true">
                        {entry.status === "completed"
                          ? "✓"
                          : entry.status === "skipped"
                            ? "—"
                            : String(index + 1).padStart(2, "0")}
                      </span>
                        <div className="stop-topline">
                          <span>
                            {entry.kind === "dungeon"
                              ? "DUNGEON MILESTONE"
                              : zone?.continent || "PERSONAL ZONE"}
                          </span>
                          <span className={`stop-state state-${earlier && entry.status === "planned" ? "earlier" : entry.status}`}>
                            {entry.status === "planned" && current
                              ? "Next zone"
                              : entry.status === "planned" ? earlier ? "Earlier unfinished" : "Upcoming" : entry.status === "active" ? "Current zone" : statusNames[entry.status]}
                          </span>
                        </div>
                        <div className="stop-destination">
                          <div><h4>{entry.title}</h4>
                            <span className="stop-region">{entry.kind === "dungeon" ? "Dungeon milestone" : "Zone stop"} · {String(index + 1).padStart(2, "0")} / {String(stops.length).padStart(2, "0")}</span>
                          </div>
                          <LocationMark continent={zone?.continent} />
                        </div>
                        <div className="stop-ranges">
                          <LevelRangeBadge range={entry.targetLevel} personal />
                          <div className="stop-recommendation">
                            <LevelRangeBadge range={zone?.recommendedLevel} />
                            {zone && <ZoneEvidence zone={zone} compact />}
                          </div>
                        </div>
                        {warning && (
                          <p className="range-warning">△ {warning}</p>
                        )}
                        {entry.status === "skipped" ? (
                          <p className="planner-help">
                            Skipped · travel continues from the previous stop.
                          </p>
                        ) : null}
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
                          <div className="stop-primary-actions">
                            <button className={entry.status === "active" || current ? "primary" : "secondary"}
                              disabled={saving}
                              aria-label={`${entry.status === "completed" || entry.status === "skipped" ? "Reactivate zone" : "Complete zone"}: ${entry.title}`}
                              onClick={() => void mutate((p) => setEntryStatus(p, entry.id,
                                entry.status === "completed" || entry.status === "skipped" ? "active" : "completed"),
                                entry.status === "completed" || entry.status === "skipped" ? `${entry.title}: Current.` : `${entry.title}: Completed.`)}>
                              <Icon name={entry.status === "completed" || entry.status === "skipped" ? "route" : "check"} size={17} />
                              {entry.status === "completed" || entry.status === "skipped" ? "Reactivate zone" : "Complete zone"}
                            </button>
                            <button className="secondary" aria-label={`Edit planned levels for ${entry.title}`} onClick={() => setEditing(entry)}>
                              <Icon name="edit" size={16} /> Edit plan
                            </button>
                          </div>
                          <div className="stop-management">
                          <label>
                            <span className="stop-status-label" aria-hidden="true">Status</span>
                            <select
                              aria-label={`Route status for ${entry.title}`}
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
                              <Icon name="close" size={18} />
                            </button>
                          </div>
                          </div>
                        </div>
                        {zone && <ZoneEvidence zone={zone} />}
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
          {zone && <ZoneEvidence zone={zone} compact />}
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

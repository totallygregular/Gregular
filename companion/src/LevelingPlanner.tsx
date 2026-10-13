import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Character } from "./domain";
import { Icon, Modal } from "./components";
import {
  progressionDataset,
  routeTemplates,
  getProgressionRecord,
} from "./data/progression";
import {
  addEntry,
  applyTemplate,
  entryFromRecord,
  getNextUp,
  moveEntry,
  removeEntry,
  setEntryStatus,
  updateEntry,
} from "./planner";
import type {
  CharacterPlanner,
  PlannerEntry,
  PlannerEntryDraft,
  PlannerKind,
  PlannerStatus,
  Recommendation,
} from "./progressionTypes";

type ChangePlanner = (
  change: (planner: CharacterPlanner) => CharacterPlanner,
) => Promise<boolean>;
const statusNames: Record<PlannerStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  skipped: "Skipped",
};
const kindNames: Record<PlannerKind, string> = {
  zone: "Zone",
  dungeon: "Dungeon",
  custom: "Personal",
};
const rangeLabel = (entry: PlannerEntry) =>
  entry.targetLevel
    ? `${entry.targetLevel.min}${entry.targetLevel.max === entry.targetLevel.min ? "" : `–${entry.targetLevel.max}`}`
    : "Any level";

export function NextUpPanel({
  character,
  saving,
  complete,
  openPlanner,
}: {
  character: Character;
  saving: boolean;
  complete: (recommendation: Recommendation) => void;
  openPlanner: () => void;
}) {
  const result = getNextUp(character);
  const panelRef = useRef<HTMLElement>(null);
  const completing = useRef(false);
  useEffect(() => {
    if (!completing.current || saving) return;
    completing.current = false;
    const frame = requestAnimationFrame(() =>
      (
        panelRef.current?.querySelector<HTMLElement>("[data-next-complete]") ||
        panelRef.current
      )?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [character.planner, character.objectives, saving]);
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className="next-up panel planner-next"
      aria-label="Next Up"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">NEXT UP</p>
          <h3>Level {character.level}</h3>
        </div>
        <button className="text-button" onClick={openPlanner}>
          Open roadmap →
        </button>
      </div>
      {result.recommendations.length ? (
        <ul className="next-list">
          {result.recommendations.map((item) => (
            <li key={`${item.source}-${item.id}`}>
              <div>
                <strong>{item.title}</strong>
                <small>{item.reason}</small>
              </div>
              <button
                data-next-complete
                className="icon-button"
                disabled={saving}
                aria-label={`Complete ${item.title}`}
                onClick={() => {
                  completing.current = true;
                  complete(item);
                }}
              >
                <Icon name="check" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="planner-empty">
          <p>No actionable objectives at this level.</p>
          <button className="secondary" onClick={openPlanner}>
            Plan your next activity
          </button>
        </div>
      )}
      {!!result.blocked.length && (
        <p className="planner-help">
          {result.blocked.length} unfinished{" "}
          {result.blocked.length === 1 ? "entry needs" : "entries need"} review
          in your roadmap.
        </p>
      )}
      {!!result.upcoming.length && (
        <p className="planner-help">Coming up: {result.upcoming[0].title}</p>
      )}
    </section>
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
  const [editing, setEditing] = useState<
    PlannerEntry | PlannerEntryDraft | null
  >(null);
  const [removing, setRemoving] = useState<PlannerEntry | null>(null);
  const [template, setTemplate] = useState("");
  const [routeName, setRouteName] = useState(planner.name);
  const [notice, setNotice] = useState("");
  useEffect(() => setRouteName(planner.name), [planner.name]);
  const result = getNextUp(character);
  const reasons = new Map(
    [...result.blocked, ...result.upcoming, ...result.recommendations]
      .filter((r) => r.source === "planner")
      .map((r) => [r.id, r.reason]),
  );
  const done = planner.entries.filter((e) => e.status === "completed").length;
  const skipped = planner.entries.filter((e) => e.status === "skipped").length;
  const currentEnd = Math.min(60, character.level + 8);
  const earlier = planner.entries.filter(
    (e) => e.targetLevel && e.targetLevel.max < character.level,
  );
  const current = planner.entries.filter(
    (e) =>
      e.targetLevel &&
      e.targetLevel.max >= character.level &&
      e.targetLevel.min <= currentEnd,
  );
  const later = planner.entries.filter(
    (e) => e.targetLevel && e.targetLevel.min > currentEnd,
  );
  const untimed = planner.entries.filter((e) => !e.targetLevel);
  const templates = routeTemplates.filter(
    (t) => t.faction === character.faction,
  );
  async function saveEntry(draft: PlannerEntryDraft) {
    const existingId = editing && "id" in editing ? editing.id : undefined;
    const ok = await change((p) =>
      existingId ? updateEntry(p, existingId, draft) : addEntry(p, draft),
    );
    if (ok) {
      setEditing(null);
      setNotice(existingId ? "Objective updated." : "Objective added.");
    }
    return ok;
  }
  function rows(entries: PlannerEntry[]) {
    return (
      <ol className="roadmap-list">
        {entries.map((entry, index) => {
          const previousIndex =
            index > 0
              ? planner.entries.findIndex((e) => e.id === entries[index - 1].id)
              : -1;
          const nextIndex =
            index < entries.length - 1
              ? planner.entries.findIndex((e) => e.id === entries[index + 1].id)
              : -1;
          const record = entry.recordId
            ? getProgressionRecord(entry.recordId)
            : undefined;
          return (
            <li
              key={entry.id}
              className={`roadmap-entry entry-${entry.status}`}
              data-entry-id={entry.id}
            >
              <span
                className={`roadmap-node node-${entry.kind}`}
                aria-hidden="true"
              >
                {entry.status === "completed" ? (
                  "✓"
                ) : entry.status === "skipped" ? (
                  "—"
                ) : (
                  <Icon
                    name={
                      entry.kind === "zone"
                        ? "route"
                        : entry.kind === "dungeon"
                          ? "dungeon"
                          : "journal"
                    }
                    size={17}
                  />
                )}
              </span>
              <article aria-label={entry.title}>
                <div className="roadmap-row-head">
                  <div className="entry-tags">
                    <span>{kindNames[entry.kind]}</span>
                    <span>
                      {entry.targetLevel
                        ? `Level ${rangeLabel(entry)}`
                        : "Any level"}
                    </span>
                    {entry.priority === "high" && (
                      <span className="priority-tag">Priority</span>
                    )}
                  </div>
                  <span className={`planner-status status-${entry.status}`}>
                    {statusNames[entry.status]}
                  </span>
                </div>
                <h4>{entry.title}</h4>
                {entry.notes && <p className="entry-notes">{entry.notes}</p>}
                <div className="entry-provenance">
                  <span>
                    {entry.origin === "user"
                      ? "Your plan"
                      : entry.origin === "editorial"
                        ? "Editorial starter"
                        : entry.origin === "illustrative"
                          ? "Illustrative example"
                          : "Forever reference"}
                  </span>
                  {entry.targetLevel && (
                    <span>
                      {entry.targetLevelSource === "editorial"
                        ? "Unverified planning window"
                        : entry.targetLevelSource === "announced"
                          ? "Announced beta band · not entry minimum"
                          : "Your target level"}
                    </span>
                  )}
                  {entry.association && <span>{entry.association.name}</span>}
                </div>
                {entry.status !== "completed" &&
                  entry.status !== "skipped" &&
                  reasons.has(entry.id) && (
                    <p className="entry-reason">{reasons.get(entry.id)}</p>
                  )}
                {entry.access === "confirmed" && (
                  <p className="access-note">
                    {entry.kind === "custom"
                      ? "Ready in your plan"
                      : "Access confirmed by you"}
                  </p>
                )}
                {entry.recordId && !record && (
                  <p className="form-error">
                    Reference no longer in this snapshot. Your progress is
                    preserved; edit to use a personal plan.
                  </p>
                )}
                <div className="entry-actions">
                  <label>
                    <span className="sr-only">Status for {entry.title}</span>
                    <select
                      disabled={saving}
                      value={entry.status}
                      onChange={(e) =>
                        void change((p) =>
                          setEntryStatus(
                            p,
                            entry.id,
                            e.target.value as PlannerStatus,
                          ),
                        )
                      }
                    >
                      {Object.entries(statusNames).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="text-button"
                    disabled={saving}
                    onClick={() => setEditing(entry)}
                    aria-label={`Edit ${entry.title}`}
                  >
                    Edit
                  </button>
                  {entry.kind !== "custom" && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setEditing({
                          kind: "custom",
                          title: "",
                          association: {
                            kind: entry.kind as "zone" | "dungeon",
                            recordId: entry.recordId,
                            name: entry.title,
                          },
                          access: "confirmed",
                          origin: "user",
                        })
                      }
                      aria-label={`Add milestone for ${entry.title}`}
                    >
                      + Milestone
                    </button>
                  )}
                  <span className="entry-spacer" />
                  <button
                    className="icon-button"
                    aria-label={`Move ${entry.title} up`}
                    disabled={saving || previousIndex < 0}
                    onClick={() =>
                      void change((p) => moveEntry(p, entry.id, previousIndex))
                    }
                  >
                    ↑
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${entry.title} down`}
                    disabled={saving || nextIndex < 0}
                    onClick={() =>
                      void change((p) => moveEntry(p, entry.id, nextIndex))
                    }
                  >
                    ↓
                  </button>
                  <button
                    className="icon-button"
                    disabled={saving}
                    aria-label={`Remove ${entry.title}`}
                    onClick={() => setRemoving(entry)}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <>
      <div className="dashboard-title planner-title">
        <p className="eyebrow">LEVELING</p>
        <h2>Your roadmap</h2>
        <p>
          Level {character.level}–{currentEnd} ·{" "}
          {planner.entries.length - done - skipped} unfinished
        </p>
      </div>
      <section className="panel planner-summary">
        <div className="planner-level">
          <span className="eyebrow">CURRENT LEVEL</span>
          <strong>{character.level}</strong>
          <button className="text-button" onClick={editLevel}>
            Update level
          </button>
        </div>
        <div className="planner-progress">
          <span>
            {done} completed <span aria-hidden="true">·</span> {skipped} skipped
          </span>
          <div className="progress-track">
            <span
              style={{
                width: `${planner.entries.length ? (done / planner.entries.length) * 100 : 0}%`,
              }}
            />
          </div>
          <small>
            {planner.entries.length} route entries · every activity is optional
          </small>
        </div>
        <button
          className="primary"
          onClick={() =>
            setEditing({
              kind: "custom",
              title: "",
              access: "confirmed",
              origin: "user",
            })
          }
        >
          <Icon name="plus" size={18} />
          Add objective
        </button>
      </section>
      <section className="panel route-tools" aria-label="Route management">
        <form
          className="route-name"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await change((p) => ({
                ...p,
                name: routeName.trim() || "My route",
              }))
            )
              setNotice("Route renamed.");
          }}
        >
          <label htmlFor="route-name">Route name</label>
          <div>
            <input
              id="route-name"
              value={routeName}
              maxLength={80}
              onChange={(e) => setRouteName(e.target.value)}
              required
            />
            <button
              className="secondary"
              disabled={saving || routeName === planner.name}
            >
              Save name
            </button>
          </div>
        </form>
        <form
          className="route-template"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await change((p) => applyTemplate(p, template, character.faction))
            ) {
              setNotice(
                "Starter merged. Existing IDs, progress, edits and personal entries kept.",
              );
              setTemplate("");
            }
          }}
        >
          <label htmlFor="route-template">Choose starter route</label>
          <div>
            <select
              id="route-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              <option value="">Blank / keep my route</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button className="secondary" disabled={saving || !template}>
              Merge starter
            </button>
          </div>
        </form>
        <div className="route-starter-note">
          {template
            ? routeTemplates.find((t) => t.id === template)?.description
            : "Start blank or merge a starter at any time. Remove or reorder entries to suit your plans."}{" "}
          {templates.length === 0 &&
            "No starter for this faction; add your own entries."}
        </div>
        <div className="route-add-buttons">
          <button
            className="secondary"
            onClick={() =>
              setEditing({
                kind: "zone",
                title: "",
                access: "unknown",
                origin: "user",
              })
            }
          >
            + Zone
          </button>
          <button
            className="secondary"
            onClick={() =>
              setEditing({
                kind: "dungeon",
                title: "",
                access: "unknown",
                origin: "user",
              })
            }
          >
            + Dungeon milestone
          </button>
          <span className="planner-help">
            Arrows change route order within each level view.
          </span>
        </div>
      </section>
      <p className="planner-announcement" role="status">
        {notice}
      </p>
      {!planner.entries.length ? (
        <section className="panel planner-empty">
          <Icon name="route" size={36} />
          <h3>Your route is empty</h3>
          <p>Add a zone, dungeon milestone or personal objective.</p>
          <button
            className="secondary"
            onClick={() =>
              setEditing({
                kind: "custom",
                title: "",
                access: "confirmed",
                origin: "user",
              })
            }
          >
            Add your first objective
          </button>
        </section>
      ) : (
        <div className="roadmap" aria-label="Leveling roadmap">
          <details className="roadmap-bracket">
            <summary>
              <span>Earlier levels</span>
              <small>
                {earlier.length} entries · below {character.level}
              </small>
            </summary>
            {earlier.length ? (
              rows(earlier)
            ) : (
              <p className="planner-help">No earlier entries.</p>
            )}
          </details>
          <section
            className="roadmap-current"
            aria-labelledby="current-bracket"
          >
            <div className="bracket-heading">
              <span className="eyebrow">CURRENT BRACKET</span>
              <h3 id="current-bracket">
                Level {character.level}–{currentEnd}
              </h3>
              <span>{current.length} entries</span>
            </div>
            {current.length ? (
              rows(current)
            ) : (
              <div className="panel planner-empty">
                <p>No entries planned for these levels.</p>
                <button
                  className="text-button"
                  onClick={() =>
                    setEditing({
                      kind: "custom",
                      title: "",
                      targetLevel: { min: character.level, max: currentEnd },
                      access: "confirmed",
                      origin: "user",
                    })
                  }
                >
                  Add an objective for this bracket
                </button>
              </div>
            )}
          </section>
          <details className="roadmap-bracket">
            <summary>
              <span>Later levels</span>
              <small>
                {later.length} entries · above {currentEnd}
              </small>
            </summary>
            {later.length ? (
              rows(later)
            ) : (
              <p className="planner-help">No later entries.</p>
            )}
          </details>
          {!!untimed.length && (
            <section className="roadmap-untimed">
              <div className="bracket-heading">
                <h3>Any level</h3>
                <span>{untimed.length} entries</span>
              </div>
              {rows(untimed)}
            </section>
          )}
        </div>
      )}
      <details className="panel planner-data">
        <summary>Forever references &amp; planning limits</summary>
        <p>
          Reviewed {progressionDataset.reviewedAt} · snapshot{" "}
          {progressionDataset.version}. Starter level windows are editorial
          estimates, not verified zone ranges. Announced dungeon bands are beta
          testing bands, not entry requirements. Access and prerequisites need
          your review.
        </p>
        <p>
          Current reviewed beta content is capped at level{" "}
          {progressionDataset.currentLevelCap}. Higher targets remain personal
          plans. No quest or loot recommendations are inferred.
        </p>
        {planner.datasetVersion !== progressionDataset.version && (
          <p>
            Your route uses snapshot {planner.datasetVersion}. Review linked
            references against the current snapshot; saved targets and progress
            are unchanged.
          </p>
        )}
        <ul>
          {progressionDataset.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title} ↗
              </a>
            </li>
          ))}
        </ul>
      </details>
      {editing && (
        <EntryEditor
          entry={editing}
          entries={planner.entries}
          saving={saving}
          close={() => setEditing(null)}
          save={saveEntry}
        />
      )}
      {removing && (
        <Modal title="Remove route entry?" close={() => setRemoving(null)}>
          <p>
            Remove “{removing.title}” and its progress from this route?
            Dependent objectives will need review.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={saving}
              onClick={async () => {
                if (await change((p) => removeEntry(p, removing.id))) {
                  setRemoving(null);
                  setNotice("Entry removed.");
                }
              }}
            >
              Remove entry
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function EntryEditor({
  entry,
  entries,
  saving,
  close,
  save,
}: {
  entry: PlannerEntry | PlannerEntryDraft;
  entries: PlannerEntry[];
  saving: boolean;
  close: () => void;
  save: (draft: PlannerEntryDraft) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<PlannerEntryDraft>({ ...entry });
  const [min, setMin] = useState(
    entry.targetLevel ? String(entry.targetLevel.min) : "",
  );
  const [max, setMax] = useState(
    entry.targetLevel ? String(entry.targetLevel.max) : "",
  );
  const [error, setError] = useState("");
  const [associationKind, setAssociationKind] = useState<"zone" | "dungeon">(
    entry.association?.kind || "zone",
  );
  const record = draft.recordId
    ? getProgressionRecord(draft.recordId)
    : undefined;
  const records = progressionDataset.records.filter(
    (r) => r.kind === draft.kind,
  );
  const existingId = "id" in entry ? entry.id : undefined;
  function field<K extends keyof PlannerEntryDraft>(
    name: K,
    value: PlannerEntryDraft[K],
  ) {
    setDraft((d) => ({ ...d, [name]: value }));
  }
  function chooseReference(id: string) {
    if (!id) {
      setDraft((d) => ({
        ...d,
        recordId: undefined,
        templateEntryId: undefined,
        origin: "user",
        access: "unknown",
        targetLevelSource: d.targetLevel ? "user" : undefined,
      }));
      return;
    }
    const reference = entryFromRecord(id);
    setDraft((d) => ({
      ...reference,
      title:
        d.title.trim() &&
        (!d.recordId || d.title !== getProgressionRecord(d.recordId)?.name)
          ? d.title
          : reference.title,
      notes: d.notes || "",
      association: d.association,
      status: d.status || "planned",
      priority: d.priority || "normal",
      prerequisiteEntryIds: d.prerequisiteEntryIds || [],
    }));
    setMin(reference.targetLevel ? String(reference.targetLevel.min) : "");
    setMax(reference.targetLevel ? String(reference.targetLevel.max) : "");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const low = Number(min),
      high = Number(max || min);
    if (!!min !== !!max && !min) {
      setError("Set a starting level first.");
      return;
    }
    if (
      min &&
      (!Number.isInteger(low) ||
        !Number.isInteger(high) ||
        low < 1 ||
        high > 60 ||
        low > high)
    ) {
      setError(
        "Target levels must be whole numbers from 1–60, with the start before the end.",
      );
      return;
    }
    const range = min ? { min: low, max: high } : undefined;
    const changedRange =
      range?.min !== draft.targetLevel?.min ||
      range?.max !== draft.targetLevel?.max;
    try {
      const ok = await save({
        ...draft,
        title: draft.title.trim(),
        notes: draft.notes || "",
        targetLevel: range,
        targetLevelSource: range
          ? changedRange
            ? "user"
            : draft.targetLevelSource || "user"
          : undefined,
      });
      if (!ok)
        setError("Could not update this objective. Check the save message.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check objective details.");
    }
  }
  return (
    <Modal
      title={existingId ? "Edit objective" : "Add objective"}
      close={close}
    >
      <form className="planner-editor" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Type
            <select
              value={draft.kind}
              onChange={(e) => {
                setDraft((d) => ({
                  ...d,
                  kind: e.target.value as PlannerKind,
                  recordId: undefined,
                  origin: "user",
                  templateEntryId: undefined,
                  targetLevelSource: d.targetLevel ? "user" : undefined,
                  access: e.target.value === "custom" ? "confirmed" : "unknown",
                }));
              }}
            >
              <option value="custom">Personal objective</option>
              <option value="zone">Zone</option>
              <option value="dungeon">Dungeon milestone</option>
            </select>
          </label>
          <label>
            Priority
            <select
              value={draft.priority || "normal"}
              onChange={(e) =>
                field("priority", e.target.value as "high" | "normal")
              }
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          {draft.kind !== "custom" && (
            <label className="full-field">
              Forever reference (optional)
              <select
                value={draft.recordId || ""}
                onChange={(e) => chooseReference(e.target.value)}
              >
                <option value="">Personal plan / no reference</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
                {draft.recordId && !record && (
                  <option value={draft.recordId}>
                    Missing reference — keep or unlink
                  </option>
                )}
              </select>
            </label>
          )}
          <label className="full-field">
            Title
            <input
              required
              maxLength={160}
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
              placeholder={
                draft.kind === "dungeon"
                  ? "e.g. Prepare for a dungeon run"
                  : "Objective or zone name"
              }
            />
          </label>
          <label>
            Target level from
            <input
              type="number"
              min="1"
              max="60"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Target level to
            <input
              type="number"
              min="1"
              max="60"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="Same as from"
            />
          </label>
          <label className="full-field">
            Notes
            <textarea
              rows={3}
              maxLength={4000}
              value={draft.notes || ""}
              onChange={(e) => field("notes", e.target.value)}
              placeholder="Quests to check, access, rewards or personal goals"
            />
          </label>
          <label>
            Status
            <select
              value={draft.status || "planned"}
              onChange={(e) => field("status", e.target.value as PlannerStatus)}
            >
              {Object.entries(statusNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Access / readiness
            <select
              value={draft.access || "unknown"}
              onChange={(e) =>
                field("access", e.target.value as PlannerEntryDraft["access"])
              }
            >
              <option value="unknown">Needs review</option>
              <option value="confirmed">I confirmed access</option>
              <option value="unavailable">Unavailable to me</option>
            </select>
          </label>
          {draft.kind === "custom" && (
            <>
              <label>
                Association type
                <select
                  value={associationKind}
                  onChange={(e) => {
                    const kind = e.target.value as "zone" | "dungeon";
                    setAssociationKind(kind);
                    if (draft.association)
                      field("association", { ...draft.association, kind });
                  }}
                >
                  <option value="zone">Zone</option>
                  <option value="dungeon">Dungeon</option>
                </select>
              </label>
              <label>
                Associated zone or dungeon
                <input
                  maxLength={160}
                  value={draft.association?.name || ""}
                  onChange={(e) =>
                    field(
                      "association",
                      e.target.value.trim()
                        ? { kind: associationKind, name: e.target.value }
                        : undefined,
                    )
                  }
                  placeholder="Optional name"
                />
              </label>
            </>
          )}
        </div>
        {record && (
          <div className="reference-note">
            <strong>{record.name}</strong>
            <p>{record.description}</p>
            <p>
              {record.announcedLevel
                ? `Announced beta band: ${record.announcedLevel.min}${record.announcedLevel.max ? `–${record.announcedLevel.max}` : "+"}. Entry minimum unknown.`
                : "Zone level range unverified."}{" "}
              Faction restrictions and prerequisites unverified.
            </p>
            {record.evidence.identity.sourceId && (
              <a
                className="text-gold"
                href={
                  progressionDataset.sources.find(
                    (s) => s.id === record.evidence.identity.sourceId,
                  )?.url
                }
                target="_blank"
                rel="noreferrer"
              >
                Official beta notes ↗
              </a>
            )}
          </div>
        )}
        <details className="entry-prerequisites">
          <summary>
            Personal prerequisites ({draft.prerequisiteEntryIds?.length || 0})
          </summary>
          <p className="planner-help">
            Require these entries to be completed. Skipping does not satisfy a
            prerequisite.
          </p>
          {entries
            .filter((e) => e.id !== existingId)
            .map((e) => (
              <label key={e.id} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={draft.prerequisiteEntryIds?.includes(e.id) || false}
                  onChange={(event) =>
                    field(
                      "prerequisiteEntryIds",
                      event.target.checked
                        ? [...(draft.prerequisiteEntryIds || []), e.id]
                        : (draft.prerequisiteEntryIds || []).filter(
                            (id) => id !== e.id,
                          ),
                    )
                  }
                />
                <span>{e.title}</span>
              </label>
            ))}
          {draft.prerequisiteEntryIds
            ?.filter((id) => !entries.some((e) => e.id === id))
            .map((id) => (
              <label key={id} className="checkbox-option">
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    field(
                      "prerequisiteEntryIds",
                      draft.prerequisiteEntryIds?.filter(
                        (value) => value !== id,
                      ),
                    )
                  }
                />
                <span>Removed prerequisite · clear to unblock</span>
              </label>
            ))}
        </details>
        <p className="field-help">
          Access confirmation is your own planning decision. A target level does
          not establish game eligibility.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary" type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={saving} type="submit">
            Save objective
          </button>
        </div>
      </form>
    </Modal>
  );
}

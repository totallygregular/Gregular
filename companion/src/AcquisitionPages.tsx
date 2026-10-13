import { useEffect, useState, type ReactNode } from "react";
import type { Character } from "./domain";
import { Modal } from "./components";
import { acquisitionDataset as acquisitionCatalogue } from "./data/acquisitionCatalogue";
import { progressionDataset } from "./data/progression";
import { zoneCatalogue } from "./data/zones";
import {
  addWishlistItem,
  updateWishlistEntry,
  removeWishlistItem,
  addManualItem,
  addManualSource,
  addManualQuest,
  updateManualQuest,
  removeManualQuest,
  trackQuest,
  setQuestComplete,
  setQuestNotes,
  addManualChain,
  updateManualChain,
  removeManualChain,
  addChainStep,
  removeChainStep,
  moveChainStep,
  setChainComplete,
  getQuestGoals,
  getDungeonGoals,
  recordDungeonRun,
  setDungeonNotes,
  resolveAcquisition,
  addManualDungeon,
  type ManualSourceDraft,
} from "./acquisition";
import type {
  AcquisitionDataset,
  AcquisitionMethod,
  CharacterAcquisition,
  ItemRecord,
  ItemQuality,
  ManualItemDraft,
  ManualQuestChain,
  ManualQuestDraft,
  QuestGoal,
  QuestRecord,
  WishlistEntry,
  WishlistStatus,
} from "./acquisitionTypes";
import "./acquisition.css";
import { ItemPortrait, ProviderInspector, useProviderIcons } from "./ItemPresentation";
import { providerNames, type TooltipProvider } from "./itemProviders";
import { characterHash } from "./navigation";

export interface AcquisitionPageProps {
  character: Character;
  saving: boolean;
  onChange: (state: CharacterAcquisition) => Promise<boolean>;
}
type Change = (
  change: (state: CharacterAcquisition) => CharacterAcquisition,
  message?: string,
) => Promise<boolean>;
const methods: AcquisitionMethod[] = [
  "quest",
  "dungeon",
  "vendor",
  "craft",
  "world",
  "unknown",
];
const methodNames: Record<AcquisitionMethod, string> = {
  quest: "Quest reward",
  dungeon: "Dungeon",
  vendor: "Vendor",
  craft: "Crafting",
  world: "World source",
  unknown: "Unknown source",
};
const qualities: ItemQuality[] = [
  "poor",
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "unknown",
];
const statusNames: Record<WishlistStatus, string> = {
  wanted: "Wanted",
  acquired: "Acquired",
  dismissed: "No longer wanted",
};
const unique = (values: (string | undefined)[]) =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
const safeUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};
function Reference({
  url,
  children = "External reference ↗",
}: {
  url?: string;
  children?: ReactNode;
}) {
  const href = safeUrl(url);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ) : null;
}
function Evidence({
  record,
}: {
  record: { evidence: ItemRecord["evidence"] };
}) {
  return (
    <>
      <div className="acquisition-badges">
        <span
          className={`acquisition-badge ${record.evidence.kind === "user-supplied" ? "is-user" : ""}`}
        >
          {record.evidence.kind === "user-supplied"
            ? "User supplied"
            : "Reviewed Forever record"}
        </span>
        {record.evidence.reviewedAt && (
          <span className="acquisition-muted">
            Reviewed {record.evidence.reviewedAt}
          </span>
        )}
      </div>
      <p className="acquisition-muted">{record.evidence.note}</p>
      <Reference url={record.evidence.url} />
      {record.evidence.fields && (
        <details>
          <summary>Field provenance</summary>
          <dl className="acquisition-stats">
            {Object.entries(record.evidence.fields).map(([field, source]) => (
              <div key={field}>
                <dt>{field}</dt>
                <dd>{source}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </>
  );
}
function Title({ title, description }: { title: string; description: string }) {
  return (
    <div className="dashboard-title">
      <p className="eyebrow">CHARACTER PROGRESSION</p>
      <h2 tabIndex={-1}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="acquisition-empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
function useChanges({ character, onChange }: AcquisitionPageProps) {
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setError("");
    setFeedback("");
  }, [character.id]);
  const change: Change = async (
    update,
    message = "Planning progress updated.",
  ) => {
    setError("");
    const focusedControl = document.activeElement;
    try {
      const ok = await onChange(update(character.acquisition));
      if (ok) {
        setFeedback(message);
        requestAnimationFrame(() => {
          if (
            !focusedControl?.isConnected &&
            document.activeElement === document.body
          ) {
            document
              .querySelector<HTMLElement>(".acquisition-page h2")
              ?.focus({ preventScroll: true });
          }
        });
      } else
        setError(
          "Could not make that change. Review the save message and try again.",
        );
      return ok;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make that change.");
      return false;
    }
  };
  return {
    change,
    status: (
      <>
        <p className="acquisition-feedback" role="status">
          {feedback}
        </p>
        {error && (
          <p className="acquisition-error" role="alert">
            {error}
          </p>
        )}
      </>
    ),
  };
}
function SourceList({
  item,
  data,
}: {
  item: ItemRecord;
  data: AcquisitionDataset;
}) {
  if (!item.sourceIds.length)
    return (
      <p className="acquisition-muted">
        Source unknown — add a personal acquisition note or check an external
        reference.
      </p>
    );
  return (
    <ul className="acquisition-source-list">
      {item.sourceIds.map((id) => {
        const source = data.sources.find((s) => s.id === id);
        if (!source)
          return (
            <li key={id}>
              Unresolved source <code>{id}</code>. The saved reference is
              retained.
            </li>
          );
        const quest = data.quests.find((q) => q.id === source.questId);
        const dungeon = data.dungeons.find((d) => d.id === source.dungeonId);
        return (
          <li key={id}>
            <strong>{source.label}</strong> · {methodNames[source.method]}
            {quest && <small>Quest: {quest.name}</small>}
            {dungeon && <small>Dungeon: {dungeon.name}</small>}
            {source.bossName && <small>Boss: {source.bossName}</small>}
            {source.zoneName && <small>Zone: {source.zoneName}</small>}
            <small>
              Availability: {source.availability}.{" "}
              {source.evidence.kind === "user-supplied"
                ? "User supplied relationship."
                : "Reviewed relationship."}
            </small>
            <small>{source.evidence.note}</small>
            <Reference url={source.evidence.url} />
          </li>
        );
      })}
    </ul>
  );
}
function ItemDetails({
  item,
  data,
  open = false,
}: {
  item: ItemRecord;
  data: AcquisitionDataset;
  open?: boolean;
}) {
  return (
    <details open={open || undefined}>
      <summary>Item details and sources</summary>
      <dl className="acquisition-stats">
        <div>
          <dt>Equipment slot</dt>
          <dd>{item.slot || "Unknown"}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{item.equipmentType || "Unknown"}</dd>
        </div>
        <div>
          <dt>Required level</dt>
          <dd>{item.requiredLevel ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Class restrictions</dt>
          <dd>
            {item.classRestrictions.length
              ? item.classRestrictions.join(", ")
              : "Unknown / not supplied"}
          </dd>
        </div>
        {item.gameId !== undefined && (
          <div>
            <dt>Game item ID</dt>
            <dd>{item.gameId}</dd>
          </div>
        )}
      </dl>
      {item.stats.length ? (
        <ul className="acquisition-source-list">
          {item.stats.map((stat, index) => (
            <li key={index}>
              {stat.label}: {stat.value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="acquisition-muted">
          Item statistics have not been supplied.
        </p>
      )}
      <SourceList item={item} data={data} />
      <Evidence record={item} />
    </details>
  );
}

export function EquipmentPage(props: AcquisitionPageProps) {
  const { character, saving } = props;
  const state = character.acquisition;
  const data = resolveAcquisition(state, acquisitionCatalogue);
  const { change, status } = useChanges(props);
  const [provider, setProvider] = useState<TooltipProvider>(() => { try { return sessionStorage.getItem("gregular.item-provider") === "foreverdb" ? "foreverdb" : "local"; } catch { return "local"; } });
  useEffect(() => { try { sessionStorage.setItem("gregular.item-provider", provider); } catch { /* optional UI preference */ } }, [provider]);
  const [inspected, setInspected] = useState<ItemRecord | null>(null);
  const [view, setView] = useState("grid");
  const { icons, bridge } = useProviderIcons(provider, acquisitionCatalogue.items.flatMap(i => i.gameId ? [i.gameId] : []));
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState("");
  const [quality, setQuality] = useState("");
  const [method, setMethod] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [className, setClassName] = useState("");
  const [maxLevel, setMaxLevel] = useState("");
  const [wishlistStatus, setWishlistStatus] = useState("wanted");
  const [wishlistSlot, setWishlistSlot] = useState("");
  const [wishlistMethod, setWishlistMethod] = useState("");
  const [manualItem, setManualItem] = useState(false);
  const [sourceItem, setSourceItem] = useState<ItemRecord | null>(null);
  const results = data.items.filter(
    (item) =>
      item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
      (!slot || item.slot === slot) &&
      (!quality || item.quality === quality) &&
      (!equipmentType || item.equipmentType === equipmentType) &&
      (!className || item.classRestrictions.includes(className)) &&
      (!maxLevel ||
        (item.requiredLevel !== undefined &&
          item.requiredLevel <= Number(maxLevel))) &&
      (!method ||
        (method === "unknown"
          ? !item.sourceIds.length ||
            item.sourceIds.some(
              (id) =>
                (data.sources.find((s) => s.id === id)?.method ?? "unknown") ===
                "unknown",
            )
          : item.sourceIds.some(
              (id) => data.sources.find((s) => s.id === id)?.method === method,
            ))),
  );
  const wishlist = state.wishlist.filter((entry) => {
    const item = data.items.find((i) => i.id === entry.itemId);
    return (
      (!wishlistStatus || entry.status === wishlistStatus) &&
      (!wishlistSlot || item?.slot === wishlistSlot) &&
      (!wishlistMethod ||
        (entry.preferredSourceId
          ? (data.sources.find((s) => s.id === entry.preferredSourceId)
              ?.method ?? "unknown") === wishlistMethod
          : wishlistMethod === "unknown"))
    );
  });
  return (
    <div className="acquisition-page">
      <Title
        title="Equipment"
        description="Find equipment, choose how to pursue it, and keep a wishlist for this character."
      />
      <p className="acquisition-notice">
        Limited reviewed catalogue · {acquisitionCatalogue.items.length}{" "}
        reviewed {acquisitionCatalogue.items.length === 1 ? "item" : "items"}.
        Missing fields remain unknown. Personal items and source links are
        labelled user supplied. The catalogue works offline.
      </p>
      {bridge}
      <section className="panel">
        <div className="acquisition-heading">
          <h3>Equipment finder</h3>
          <button
            className="secondary"
            onClick={() => setManualItem(true)}
            disabled={saving}
          >
            Add personal item
          </button>
        </div>
        <div className="equipment-controls">
          <label>Item details service<select aria-label="Item details service" value={provider} onChange={e => setProvider(e.target.value as TooltipProvider)}>{Object.entries(providerNames).filter(([id]) => id !== "wow-forever").map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <div className="acquisition-actions" aria-label="Equipment view"><button className="secondary" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button><button className="secondary" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button></div>
        </div>
        <p className="acquisition-muted">Inspect an icon for details. Optional services contact the selected provider; local details always work. {provider === "foreverdb" && <a href="https://foreverdb.net/embed" target="_blank" rel="noreferrer">Icons & tooltips by ForeverDB</a>}{provider === "wow-forever" && <a href="https://wow-forever.gg/developers/#tooltips" target="_blank" rel="noreferrer">Tooltips by wow-forever.gg</a>}</p>
        <div className="acquisition-filters">
          <label>
            Item name
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search available items"
            />
          </label>
          <label>
            Slot
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">All slots</option>
              {unique(data.items.map((i) => i.slot)).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Quality
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              <option value="">All qualities</option>
              {qualities.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>
          <label>
            Acquisition
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">All sources</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {methodNames[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details className="equipment-extra-filters"><summary>More item filters</summary>
        <div className="acquisition-filters secondary-filters">
          <label>
            Equipment type
            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
            >
              <option value="">All types</option>
              {unique(data.items.map((i) => i.equipmentType)).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Known class restriction
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            >
              <option value="">All / unknown restrictions</option>
              {unique(data.items.flatMap((i) => i.classRestrictions)).map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Maximum required level
            <input
              type="number"
              min="1"
              max="60"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              placeholder="Any / unknown"
            />
          </label>
          <p className="acquisition-muted">
            Level and class filters include known matching fields only.
          </p>
        </div>
        </details>
        <p className="acquisition-muted" role="status">
          {results.length} matching {results.length === 1 ? "item" : "items"}
        </p>
        {results.length ? (
          <div className={`acquisition-grid equipment-results ${view === "list" ? "is-list" : ""}`}>
            {results.map((item) => {
              const existing = state.wishlist.find(
                (entry) => entry.itemId === item.id,
              );
              return (
                <article className="acquisition-card" key={item.id}>
                  <div className="equipment-card-heading"><ItemPortrait item={item} icon={item.gameId ? icons[item.gameId] : undefined} inspect={setInspected} /><h4 className={`acquisition-quality-${item.quality}`}>
                    {item.name}
                  </h4></div>
                  <div className="acquisition-badges">
                    <span className="acquisition-badge">
                      {item.quality} quality
                    </span>
                    <span className="acquisition-badge">
                      {item.slot || "Slot unknown"}
                    </span>
                    <span
                      className={`acquisition-badge ${item.evidence.kind === "user-supplied" ? "is-user" : ""}`}
                    >
                      {item.evidence.kind === "user-supplied"
                        ? "User supplied"
                        : "Reviewed"}
                    </span>
                  </div>
                  <p className="acquisition-muted">
                    {item.equipmentType || "Type unknown"} ·{" "}
                    {item.requiredLevel !== undefined
                      ? `Requires level ${item.requiredLevel}`
                      : "Required level unknown"}
                  </p>
                  <p className="equipment-source-summary">{item.sourceIds.length ? [...new Set(item.sourceIds.map(id => methodNames[data.sources.find(s => s.id === id)?.method ?? "unknown"]))].join(" · ") : "Unknown source"}</p>
                  <ItemDetails item={item} data={data} />
                  <div className="acquisition-actions">
                    <button
                      className="primary"
                      disabled={saving || Boolean(existing)}
                      onClick={() =>
                        void change(
                          (s) =>
                            addWishlistItem(
                              s,
                              item.id,
                              item.sourceIds.length === 1
                                ? item.sourceIds[0]
                                : undefined,
                            ),
                          `${item.name} added to the wishlist${item.sourceIds.length === 1 ? " with its listed source" : ""}.`,
                        )
                      }
                    >
                      {existing
                        ? `On wishlist · ${statusNames[existing.status]}`
                        : "Add to wishlist"}
                    </button>
                    <button
                      className="text-button"
                      disabled={saving}
                      onClick={() => setSourceItem(item)}
                    >
                      Add personal source
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty title="No matching items">
            Try fewer filters or add a personal item with your own reference.
          </Empty>
        )}
      </section>
      <section className="panel">
        <div className="acquisition-heading">
          <h3>{character.name}'s wishlist</h3>
          <span className="acquisition-muted">
            {state.wishlist.filter((e) => e.status === "wanted").length} wanted
            · {state.wishlist.filter((e) => e.status === "acquired").length}{" "}
            acquired
          </span>
        </div>
        <div className="acquisition-filters">
          <label>
            Status
            <select
              value={wishlistStatus}
              onChange={(e) => setWishlistStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(statusNames).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Wishlist slot
            <select
              value={wishlistSlot}
              onChange={(e) => setWishlistSlot(e.target.value)}
            >
              <option value="">All slots</option>
              {unique(data.items.map((i) => i.slot)).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Preferred method
            <select
              value={wishlistMethod}
              onChange={(e) => setWishlistMethod(e.target.value)}
            >
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {methodNames[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {wishlist.length ? (
          <div className="acquisition-grid">
            {wishlist.map((entry) => (
              <WishlistCard
                key={entry.id}
                entry={entry}
                item={data.items.find((i) => i.id === entry.itemId)}
                data={data}
                saving={saving}
                change={change}
                addSource={setSourceItem}
                characterId={character.id}
                inspect={setInspected}
                icons={icons}
              />
            ))}
          </div>
        ) : (
          <Empty title="No wishlist items in this view">
            Add an item above, or change the wishlist filters.
          </Empty>
        )}
        <p className="acquisition-muted">
          Acquiring equipment and completing a quest or dungeon are separate
          actions.
        </p>
      </section>
      {status}
      {inspected && <Modal title={inspected.name} close={() => setInspected(null)}><div className="item-inspection"><ProviderInspector item={inspected} provider={provider} /><ItemDetails item={inspected} data={data} open /></div></Modal>}
      {manualItem && (
        <ManualItemForm
          saving={saving}
          close={() => setManualItem(false)}
          save={async (draft) => {
            let addedId = "";
            const ok = await change((s) => {
              const next = addManualItem(s, draft);
              addedId = next.manualItems.at(-1)!.id;
              const wishlisted = addWishlistItem(next, addedId);
              return updateWishlistEntry(
                wishlisted,
                wishlisted.wishlist.at(-1)!.id,
                { notes: draft.notes || "" },
              );
            }, "Personal item added to your wishlist. Add a source link to connect it to your goals.");
            if (ok) setManualItem(false);
            return ok;
          }}
        />
      )}
      {sourceItem && (
        <ManualSourceForm
          item={sourceItem}
          data={data}
          saving={saving}
          close={() => setSourceItem(null)}
          save={async (draft) => {
            const ok = await change((s) => {
              const { manualDungeonName, ...source } = draft;
              if (!manualDungeonName)
                return addManualSource(s, sourceItem.id, source);
              const next = addManualDungeon(s, {
                name: manualDungeonName,
                zoneName: source.zoneName,
                referenceUrl: source.referenceUrl,
              });
              return addManualSource(next, sourceItem.id, {
                ...source,
                dungeonId: next.manualDungeons.at(-1)!.id,
              });
            }, "Personal acquisition source saved. Choose it as the preferred source on your wishlist.");
            if (ok) setSourceItem(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}

function WishlistCard({
  entry,
  item,
  data,
  saving,
  change,
  addSource,
  characterId,
  inspect,
  icons,
}: {
  characterId: string;
  inspect: (item: ItemRecord) => void;
  icons: Record<number, string>;
  entry: WishlistEntry;
  item?: ItemRecord;
  data: AcquisitionDataset;
  saving: boolean;
  change: Change;
  addSource: (item: ItemRecord) => void;
}) {
  const [notes, setNotes] = useState(entry.notes);
  useEffect(() => setNotes(entry.notes), [entry.notes]);
  return (
    <article className="acquisition-card">
      <div className="equipment-card-heading">{item && <ItemPortrait item={item} icon={item.gameId ? icons[item.gameId] : undefined} inspect={inspect} />}<h4 className={`acquisition-quality-${item?.quality || "unknown"}`}>
        {item?.name || `Unavailable item · ${entry.itemId}`}
      </h4></div>
      <div className="acquisition-badges">
        <span
          className={`acquisition-badge ${entry.status === "acquired" ? "is-complete" : ""}`}
        >
          {statusNames[entry.status]}
        </span>
        {item?.evidence.kind === "user-supplied" && (
          <span className="acquisition-badge is-user">User supplied</span>
        )}
      </div>
      {!item && (
        <p className="acquisition-muted">
          The reference record is missing. Your item state and notes have been
          retained.
        </p>
      )}
      <div className="acquisition-form">
        <label>
          Item status
          <select
            value={entry.status}
            disabled={saving}
            onChange={(e) =>
              void change((s) =>
                updateWishlistEntry(s, entry.id, {
                  status: e.target.value as WishlistStatus,
                }),
              )
            }
          >
            {Object.entries(statusNames).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preferred acquisition source
          <select
            value={entry.preferredSourceId || ""}
            disabled={saving}
            onChange={(e) =>
              void change((s) =>
                updateWishlistEntry(s, entry.id, {
                  preferredSourceId: e.target.value || undefined,
                }),
              )
            }
          >
            <option value="">No source chosen</option>
            {entry.preferredSourceId &&
              !item?.sourceIds.includes(entry.preferredSourceId) && (
                <option value={entry.preferredSourceId}>
                  Unresolved saved source · {entry.preferredSourceId}
                </option>
              )}
            {item?.sourceIds.map((id) => (
              <option key={id} value={id}>
                {data.sources.find((s) => s.id === id)?.label ||
                  `Unresolved source · ${id}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!entry.preferredSourceId && item?.sourceIds.length ? (
        <p className="acquisition-muted">
          Choose a source to show the linked quest or dungeon goal.
        </p>
      ) : null}
      {entry.preferredSourceId && (() => { const source = data.sources.find(s => s.id === entry.preferredSourceId); const section = source?.method === "craft" ? "professions" : source?.questId ? "quests" : source?.dungeonId ? "dungeons" : undefined; return section ? <p className="equipment-source-summary"><a href={`#${characterHash(characterId, section)}`}>Open {section === "professions" ? "crafting preparation" : section === "quests" ? "quest goal" : "dungeon goal"}</a></p> : null; })()}
      {item && <ItemDetails item={item} data={data} />}
      <details>
        <summary>Personal notes and management</summary>
        <form
          className="acquisition-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await change(
              (s) => updateWishlistEntry(s, entry.id, { notes }),
              "Wishlist notes saved.",
            );
          }}
        >
          <label>
            Wishlist notes
            <textarea
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </label>
          <div className="acquisition-actions">
            <button
              className="secondary"
              disabled={saving || notes === entry.notes}
            >
              Save notes
            </button>
            {item && (
              <button
                type="button"
                className="text-button"
                disabled={saving}
                onClick={() => addSource(item)}
              >
                Add source link
              </button>
            )}
            <button
              type="button"
              className="text-button"
              disabled={saving}
              onClick={() =>
                void change(
                  (s) => removeWishlistItem(s, entry.id),
                  "Item removed from wishlist. Quest and dungeon progress is retained.",
                )
              }
            >
              Remove from wishlist
            </button>
          </div>
        </form>
      </details>
    </article>
  );
}

function ManualItemForm({
  saving,
  close,
  save,
}: {
  saving: boolean;
  close: () => void;
  save: (draft: ManualItemDraft) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [slot, setSlot] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [level, setLevel] = useState("");
  const [quality, setQuality] = useState<ItemQuality>("unknown");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Add personal item" close={close}>
      <form
        className="acquisition-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await save({
            name,
            slot: slot || undefined,
            equipmentType: equipmentType || undefined,
            requiredLevel: level ? Number(level) : undefined,
            quality,
            referenceUrl: referenceUrl || undefined,
            notes,
          });
        }}
      >
        <p className="acquisition-muted">
          This item and its relationships will be labelled user supplied. Empty
          fields stay unknown.
        </p>
        <label>
          Item name
          <input
            autoFocus
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="acquisition-form-grid">
          <label>
            Equipment slot
            <input
              maxLength={80}
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Equipment type
            <input
              maxLength={80}
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Required level
            <input
              type="number"
              min="1"
              max="60"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </label>
          <label>
            Item quality
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as ItemQuality)}
            >
              {qualities.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          External item reference
          <input
            type="url"
            maxLength={2000}
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Personal acquisition notes
          <textarea
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving || !name.trim()}>
            Add to wishlist
          </button>
        </div>
      </form>
    </Modal>
  );
}

type SourceDraft = ManualSourceDraft & { manualDungeonName?: string };
function ManualSourceForm({
  item,
  data,
  saving,
  close,
  save,
}: {
  item: ItemRecord;
  data: AcquisitionDataset;
  saving: boolean;
  close: () => void;
  save: (draft: SourceDraft) => Promise<boolean>;
}) {
  const [method, setMethod] = useState<AcquisitionMethod>("unknown");
  const [label, setLabel] = useState("");
  const [questId, setQuestId] = useState("");
  const [dungeonId, setDungeonId] = useState("");
  const [manualDungeonName, setManualDungeonName] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [bossName, setBossName] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  return (
    <Modal title="Add personal source link" close={close}>
      <form
        className="acquisition-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const zone = zoneCatalogue.find(
            (z) =>
              z.name.toLocaleLowerCase() ===
              zoneName.trim().toLocaleLowerCase(),
          );
          await save({
            method,
            label,
            availability: "unknown",
            questId: method === "quest" ? questId || undefined : undefined,
            dungeonId:
              method === "dungeon" && dungeonId !== "new"
                ? dungeonId || undefined
                : undefined,
            manualDungeonName:
              method === "dungeon" && dungeonId === "new"
                ? manualDungeonName
                : undefined,
            zoneId: zone?.id,
            zoneName: zoneName || undefined,
            bossName: bossName || undefined,
            referenceUrl: referenceUrl || undefined,
          });
        }}
      >
        <p className="acquisition-muted">
          Source for <strong>{item.name}</strong>. This is your planning
          relationship, not a verified game fact.
        </p>
        <label>
          Acquisition method
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as AcquisitionMethod)}
          >
            {methods.map((m) => (
              <option value={m} key={m}>
                {methodNames[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source label
          <input
            required
            maxLength={160}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Your acquisition plan"
          />
        </label>
        {method === "quest" && (
          <label>
            Reward quest
            <select
              required
              value={questId}
              onChange={(e) => setQuestId(e.target.value)}
            >
              <option value="">Choose a quest</option>
              {data.quests.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                  {q.evidence.kind === "user-supplied"
                    ? " · user supplied"
                    : ""}
                </option>
              ))}
            </select>
            <span className="field-help">
              Create a personal quest in Quests first if it is not listed.
            </span>
          </label>
        )}
        {method === "dungeon" && (
          <>
            <label>
              Dungeon
              <select
                required
                value={dungeonId}
                onChange={(e) => setDungeonId(e.target.value)}
              >
                <option value="">Choose a dungeon</option>
                {data.dungeons.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                <option value="new">Add personal dungeon…</option>
              </select>
            </label>
            {dungeonId === "new" && (
              <label>
                Personal dungeon name
                <input
                  required
                  maxLength={160}
                  value={manualDungeonName}
                  onChange={(e) => setManualDungeonName(e.target.value)}
                />
              </label>
            )}
            <label>
              Boss or encounter (optional)
              <input
                maxLength={120}
                value={bossName}
                onChange={(e) => setBossName(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          Associated zone (optional)
          <input
            list="source-zone-names"
            maxLength={120}
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
          />
          <datalist id="source-zone-names">
            {zoneCatalogue.map((z) => (
              <option key={z.id} value={z.name} />
            ))}
          </datalist>
        </label>
        <label>
          Source reference link
          <input
            type="url"
            maxLength={2000}
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving || !label.trim()}>
            Save source link
          </button>
        </div>
      </form>
    </Modal>
  );
}

type QuestEditor = { quest?: QuestRecord; chainId?: string };
type QuestFilter =
  | "planned"
  | "all"
  | "completed"
  | "chains"
  | "reward"
  | "dungeon"
  | "unresolved";
export function QuestsPage(props: AcquisitionPageProps) {
  const { character, saving } = props;
  const state = character.acquisition;
  const data = resolveAcquisition(state, acquisitionCatalogue);
  const goals = getQuestGoals(state, acquisitionCatalogue, character.level);
  const { change, status } = useChanges(props);
  const [filter, setFilter] = useState<QuestFilter>("planned");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<QuestEditor | null>(null);
  const [chainEditor, setChainEditor] = useState<
    ManualQuestChain | "new" | null
  >(null);
  const [catalogueQuest, setCatalogueQuest] = useState("");
  const visible = goals.filter((goal) => {
    if (
      query &&
      !(goal.quest?.name || goal.questId)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase())
    )
      return false;
    if (filter === "planned") return goal.progress.status !== "completed";
    if (filter === "completed") return goal.progress.status === "completed";
    if (filter === "chains") return goal.chainIds.length > 0;
    if (filter === "reward")
      return goal.desiredItems.length > 0 || goal.supportingItems.length > 0;
    if (filter === "dungeon") return Boolean(goal.quest?.dungeonId);
    if (filter === "unresolved")
      return Boolean(
        goal.unresolvedPrerequisiteIds.length ||
        goal.quest?.prerequisiteStatus !== "complete" ||
        !goal.quest ||
        goal.blockedReasons.some((reason) => /cycle|malformed/.test(reason)),
      );
    return true;
  });
  const visibleChains = state.manualChains.filter(
    (chain) =>
      filter === "all" ||
      filter === "chains" ||
      chain.questIds.some((id) =>
        visible.some((goal) => goal.questId === id),
      ) ||
      (!chain.questIds.length && filter === "planned"),
  );
  const standalone = visible.filter((goal) => !goal.chainIds.length);
  return (
    <div className="acquisition-page">
      <Title
        title="Quests"
        description="Plan specific quests, track desired rewards, and assemble your own quest chains."
      />
      <p className="acquisition-notice">
        Planned in Gregular does not mean accepted in-game. Quest progress is
        recorded by you; there is no game-client synchronisation.
      </p>
      <section className="panel">
        <div className="acquisition-heading">
          <h3>Your quest journal</h3>
          <div className="acquisition-actions">
            <button
              className="secondary"
              disabled={saving}
              onClick={() => setEditor({})}
            >
              Add personal quest
            </button>
            <button
              className="primary"
              disabled={saving}
              onClick={() => setChainEditor("new")}
            >
              Create quest chain
            </button>
          </div>
        </div>
        <div className="acquisition-filters">
          <label>
            Quest name
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your journal"
            />
          </label>
          <label>
            Journal view
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as QuestFilter)}
            >
              <option value="planned">Planned quests</option>
              <option value="all">All quests</option>
              <option value="chains">Quest chains</option>
              <option value="completed">Completed quests</option>
              <option value="reward">Desired equipment rewards</option>
              <option value="dungeon">Dungeon quests</option>
              <option value="unresolved">Unresolved prerequisites</option>
            </select>
          </label>
        </div>
        <p className="acquisition-muted" role="status">
          {goals.filter((goal) => goal.progress.status !== "completed").length}{" "}
          outstanding ·{" "}
          {goals.filter((goal) => goal.progress.status === "completed").length}{" "}
          completed · {state.manualChains.length} personal chains
        </p>
        {acquisitionCatalogue.quests.length > 0 && (
          <details>
            <summary className="text-button">
              Plan a reviewed catalogue quest
            </summary>
            <form
              className="acquisition-toolbar"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await change(
                    (s) => trackQuest(s, catalogueQuest),
                    "Catalogue quest planned in your journal.",
                  )
                )
                  setCatalogueQuest("");
              }}
            >
              <label className="sr-only" htmlFor="catalogue-quest">
                Catalogue quest
              </label>
              <select
                id="catalogue-quest"
                value={catalogueQuest}
                onChange={(e) => setCatalogueQuest(e.target.value)}
                required
                style={{ flex: 1 }}
              >
                <option value="">Choose a reviewed quest</option>
                {acquisitionCatalogue.quests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.name}
                  </option>
                ))}
              </select>
              <button
                className="secondary"
                disabled={saving || !catalogueQuest}
              >
                Plan quest
              </button>
            </form>
          </details>
        )}
        {!visible.length && !visibleChains.length && (
          <Empty title="No quests in this view">
            Add a personal quest or chain. Equipment reward goals appear when
            you choose a quest source on your wishlist.
          </Empty>
        )}
      </section>
      {visibleChains.map((chain) => (
        <ChainCard
          key={chain.id}
          chain={chain}
          goals={goals}
          data={data}
          saving={saving}
          change={change}
          editChain={() => setChainEditor(chain)}
          editQuest={(quest) => setEditor({ quest })}
          addStep={() => setEditor({ chainId: chain.id })}
        />
      ))}
      {standalone.length > 0 && (
        <section className="panel">
          <div className="acquisition-heading">
            <h3>
              {filter === "completed" ? "Completed quests" : "Quest goals"}
            </h3>
            <span className="acquisition-muted">{standalone.length} shown</span>
          </div>
          <div className="acquisition-grid">
            {standalone.map((goal) => (
              <QuestCard
                key={goal.questId}
                goal={goal}
                data={data}
                saving={saving}
                change={change}
                edit={() => setEditor({ quest: goal.quest })}
              />
            ))}
          </div>
        </section>
      )}
      {status}
      {editor && (
        <ManualQuestForm
          data={data}
          quest={editor.quest}
          notes={
            state.questProgress.find((p) => p.questId === editor.quest?.id)
              ?.notes || ""
          }
          saving={saving}
          close={() => setEditor(null)}
          save={async (draft) => {
            const ok = await change(
              (s) =>
                editor.quest
                  ? updateManualQuest(s, editor.quest.id, draft)
                  : editor.chainId
                    ? addChainStep(s, editor.chainId, draft)
                    : addManualQuest(s, draft),
              editor.quest
                ? "Personal quest updated."
                : "Personal quest added.",
            );
            if (ok) setEditor(null);
            return ok;
          }}
        />
      )}
      {chainEditor && (
        <ChainForm
          chain={chainEditor === "new" ? undefined : chainEditor}
          saving={saving}
          close={() => setChainEditor(null)}
          save={async (draft) => {
            const ok = await change(
              (s) =>
                chainEditor === "new"
                  ? addManualChain(s, draft)
                  : updateManualChain(s, chainEditor.id, draft),
              "Quest chain saved. Add steps to assemble your plan.",
            );
            if (ok) setChainEditor(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}

function QuestCard({
  goal,
  data,
  saving,
  change,
  edit,
}: {
  goal: QuestGoal;
  data: AcquisitionDataset;
  saving: boolean;
  change: Change;
  edit: () => void;
}) {
  const [notes, setNotes] = useState(goal.progress.notes);
  useEffect(() => setNotes(goal.progress.notes), [goal.progress.notes]);
  const quest = goal.quest;
  const completed = goal.progress.status === "completed";
  return (
    <article className="acquisition-card">
      <div className="quest-step">
        <label>
          <input
            type="checkbox"
            checked={completed}
            disabled={saving}
            onChange={(e) =>
              void change(
                (s) => setQuestComplete(s, goal.questId, e.target.checked),
                e.target.checked
                  ? "Quest marked completed. Equipment state is unchanged."
                  : "Quest returned to planned.",
              )
            }
          />
          <span>
            <strong
              role="heading"
              aria-level={4}
              className={completed ? "is-complete" : ""}
            >
              {quest?.name || `Unresolved quest · ${goal.questId}`}
            </strong>
            <small>
              {quest?.zoneName || "Zone unknown"} ·{" "}
              {quest?.requiredLevel
                ? `Requires level ${quest.requiredLevel}`
                : quest?.recommendedLevel
                  ? `Target level ${quest.recommendedLevel}`
                  : "Level unknown"}
            </small>
          </span>
        </label>
      </div>
      <div className="acquisition-badges">
        <span className={`acquisition-badge ${completed ? "is-complete" : ""}`}>
          {completed ? "Completed by you" : "Planned in Gregular"}
        </span>
        {goal.desiredItems.length > 0 && (
          <span className="acquisition-badge">Desired reward</span>
        )}
        {goal.supportingItems.length > 0 && (
          <span className="acquisition-badge">Equipment preparation</span>
        )}
        {quest?.dungeonId && (
          <span className="acquisition-badge">Dungeon quest</span>
        )}
        {quest?.evidence.kind === "user-supplied" && (
          <span className="acquisition-badge is-user">User supplied</span>
        )}
        {quest?.prerequisiteStatus !== "complete" && (
          <span className="acquisition-badge is-warning">
            Prerequisites unresolved
          </span>
        )}
      </div>
      {goal.desiredItems.length > 0 && (
        <p className="acquisition-muted">
          Desired equipment:{" "}
          {goal.desiredItems.map((item) => item.name).join(", ")}
        </p>
      )}
      {goal.supportingItems.length > 0 && (
        <p className="acquisition-muted">
          Prerequisite for equipment goal:{" "}
          {goal.supportingItems.map((item) => item.name).join(", ")}
        </p>
      )}
      <QuestDetails goal={goal} data={data} />
      <details>
        <summary>Notes and quest management</summary>
        <form
          className="acquisition-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await change(
              (s) => setQuestNotes(s, goal.questId, notes),
              "Quest notes saved.",
            );
          }}
        >
          <label>
            Quest notes
            <textarea
              maxLength={4000}
              disabled={saving}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="acquisition-actions">
            <button
              className="secondary"
              disabled={saving || notes === goal.progress.notes}
            >
              Save quest notes
            </button>
            {quest?.evidence.kind === "user-supplied" && (
              <>
                <button
                  type="button"
                  className="text-button"
                  disabled={saving}
                  onClick={edit}
                >
                  Edit personal quest
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={saving}
                  onClick={() =>
                    void change(
                      (s) => removeManualQuest(s, goal.questId),
                      "Personal quest record removed. Existing progress and dependent references are retained for review.",
                    )
                  }
                >
                  Remove personal quest
                </button>
              </>
            )}
          </div>
        </form>
      </details>
    </article>
  );
}
function QuestDetails({
  goal,
  data,
}: {
  goal: QuestGoal;
  data: AcquisitionDataset;
}) {
  const quest = goal.quest;
  return (
    <details>
      <summary>Quest details and prerequisites</summary>
      {quest ? (
        <>
          <dl className="acquisition-stats">
            <div>
              <dt>Starting NPC</dt>
              <dd>{quest.startingNpc || "Unknown"}</dd>
            </div>
            <div>
              <dt>Starting location</dt>
              <dd>{quest.startingLocation || "Unknown"}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{quest.availability}</dd>
            </div>
            <div>
              <dt>Prerequisite coverage</dt>
              <dd>{quest.prerequisiteStatus}</dd>
            </div>
            {quest.gameId !== undefined && (
              <div>
                <dt>Game quest ID</dt>
                <dd>{quest.gameId}</dd>
              </div>
            )}
            {quest.dungeonId && (
              <div>
                <dt>Dungeon</dt>
                <dd>
                  {data.dungeons.find((d) => d.id === quest.dungeonId)?.name ||
                    `Unresolved · ${quest.dungeonId}`}
                </dd>
              </div>
            )}
          </dl>
          {goal.prerequisiteIds.length > 0 ? (
            <>
              <strong className="acquisition-muted">
                Known prerequisites / preceding steps
              </strong>
              <ul className="acquisition-source-list">
                {goal.prerequisiteIds.map((id) => (
                  <li key={id}>
                    {data.quests.find((q) => q.id === id)?.name ||
                      `Unresolved reference · ${id}`}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="acquisition-muted">
              {quest.prerequisiteStatus === "complete"
                ? "No prerequisite quests recorded in this personal plan."
                : "Prerequisites are unknown. An empty list does not establish that this quest has none."}
            </p>
          )}
          {quest.followUpIds.length > 0 && (
            <>
              <strong className="acquisition-muted">
                Known follow-up quests
              </strong>
              <ul className="acquisition-source-list">
                {quest.followUpIds.map((id) => (
                  <li key={id}>
                    {data.quests.find((q) => q.id === id)?.name ||
                      `Unresolved reference · ${id}`}
                  </li>
                ))}
              </ul>
            </>
          )}
          {quest.rewardItemIds.length > 0 && (
            <p className="acquisition-muted">
              Known rewards:{" "}
              {quest.rewardItemIds
                .map(
                  (id) =>
                    data.items.find((item) => item.id === id)?.name ||
                    `Unresolved item · ${id}`,
                )
                .join(", ")}
            </p>
          )}
          <Evidence record={quest} />
        </>
      ) : (
        <p className="acquisition-muted">
          The reference record is missing. Your saved progress remains
          available.
        </p>
      )}
      {goal.blockedReasons.length > 0 && (
        <>
          <strong className="acquisition-muted">Planning considerations</strong>
          <ul className="acquisition-source-list">
            {goal.blockedReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
function ChainCard({
  chain,
  goals,
  data,
  saving,
  change,
  editChain,
  editQuest,
  addStep,
}: {
  chain: ManualQuestChain;
  goals: QuestGoal[];
  data: AcquisitionDataset;
  saving: boolean;
  change: Change;
  editChain: () => void;
  editQuest: (quest: QuestRecord) => void;
  addStep: () => void;
}) {
  const completed = chain.questIds.filter(
    (id) =>
      goals.find((goal) => goal.questId === id)?.progress.status ===
      "completed",
  ).length;
  return (
    <details className="panel quest-chain" open>
      <summary>
        <strong>{chain.name}</strong>
        <span className="acquisition-muted">
          {completed}/{chain.questIds.length} quests completed · personal
          ordered chain
        </span>
      </summary>
      <div className="quest-chain-body">
        {chain.notes && <p className="acquisition-muted">{chain.notes}</p>}
        <Reference url={chain.referenceUrl} />
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, chain.questIds.length)}
          aria-valuenow={completed}
          aria-label={`${completed} of ${chain.questIds.length} steps completed`}
        >
          <span
            style={{
              width: `${chain.questIds.length ? (completed / chain.questIds.length) * 100 : 0}%`,
            }}
          />
        </div>
        <ol className="quest-steps">
          {chain.questIds.map((id, index) => {
            const goal = goals.find((q) => q.questId === id);
            const quest = data.quests.find((q) => q.id === id);
            const isComplete = goal?.progress.status === "completed";
            return (
              <li key={id}>
                <div className="quest-step">
                  <label>
                    <input
                      type="checkbox"
                      checked={isComplete}
                      disabled={saving}
                      onChange={(e) =>
                        void change(
                          (s) => setQuestComplete(s, id, e.target.checked),
                          "Quest step progress saved.",
                        )
                      }
                    />
                    <span>
                      <strong className={isComplete ? "is-complete" : ""}>
                        {index + 1}. {quest?.name || `Unresolved step · ${id}`}
                      </strong>
                      <small>
                        {quest?.zoneName || "Zone unknown"}
                        {goal?.desiredItems.length
                          ? ` · Desired reward: ${goal.desiredItems.map((i) => i.name).join(", ")}`
                          : ""}
                        {goal?.supportingItems.length
                          ? ` · Prerequisite for equipment goal: ${goal.supportingItems.map((i) => i.name).join(", ")}`
                          : ""}
                      </small>
                    </span>
                  </label>
                  <div className="acquisition-actions">
                    <button
                      className="text-button"
                      aria-label={`Move ${quest?.name || "step"} up`}
                      disabled={saving || index === 0}
                      onClick={() =>
                        void change((s) => moveChainStep(s, chain.id, id, "up"))
                      }
                    >
                      ↑
                    </button>
                    <button
                      className="text-button"
                      aria-label={`Move ${quest?.name || "step"} down`}
                      disabled={saving || index === chain.questIds.length - 1}
                      onClick={() =>
                        void change((s) =>
                          moveChainStep(s, chain.id, id, "down"),
                        )
                      }
                    >
                      ↓
                    </button>
                    {quest?.evidence.kind === "user-supplied" && (
                      <button
                        className="text-button"
                        disabled={saving}
                        onClick={() => editQuest(quest)}
                      >
                        Edit step
                      </button>
                    )}
                    <button
                      className="text-button"
                      disabled={saving}
                      onClick={() =>
                        void change(
                          (s) => removeChainStep(s, chain.id, id),
                          "Step removed from this chain. Its separate quest progress is retained.",
                        )
                      }
                    >
                      Remove step
                    </button>
                  </div>
                </div>
                {goal && <QuestDetails goal={goal} data={data} />}
                {goal?.progress.notes && (
                  <p className="acquisition-muted">{goal.progress.notes}</p>
                )}
              </li>
            );
          })}
        </ol>
        {!chain.questIds.length && (
          <Empty title="Add the first step">
            Build an ordered plan from your own quest entries.
          </Empty>
        )}
        <div className="acquisition-actions">
          <button className="primary" disabled={saving} onClick={addStep}>
            Add chain step
          </button>
          <button
            className="secondary"
            disabled={
              saving ||
              !chain.questIds.length ||
              completed === chain.questIds.length
            }
            onClick={() =>
              void change(
                (s) => setChainComplete(s, chain.id, true),
                "All steps in this chain marked completed. Equipment state is unchanged.",
              )
            }
          >
            Complete whole chain
          </button>
          <button className="text-button" disabled={saving} onClick={editChain}>
            Edit chain
          </button>
          <button
            className="text-button"
            disabled={saving}
            onClick={() =>
              void change(
                (s) => removeManualChain(s, chain.id),
                "Chain removed. Individual quests and progress are retained.",
              )
            }
          >
            Delete chain
          </button>
        </div>
      </div>
    </details>
  );
}

function ManualQuestForm({
  data,
  quest,
  notes: initialNotes,
  saving,
  close,
  save,
}: {
  data: AcquisitionDataset;
  quest?: QuestRecord;
  notes: string;
  saving: boolean;
  close: () => void;
  save: (draft: ManualQuestDraft) => Promise<boolean>;
}) {
  const [name, setName] = useState(quest?.name || "");
  const [zoneName, setZoneName] = useState(quest?.zoneName || "");
  const [level, setLevel] = useState(String(quest?.recommendedLevel || ""));
  const [requiredLevel, setRequiredLevel] = useState(
    String(quest?.requiredLevel || ""),
  );
  const [npc, setNpc] = useState(quest?.startingNpc || "");
  const [location, setLocation] = useState(quest?.startingLocation || "");
  const [dungeonId, setDungeonId] = useState(quest?.dungeonId || "");
  const [referenceUrl, setReferenceUrl] = useState(quest?.evidence.url || "");
  const [notes, setNotes] = useState(initialNotes);
  const [prerequisites, setPrerequisites] = useState(
    quest?.prerequisiteIds || [],
  );
  const [completePrerequisites, setCompletePrerequisites] = useState(
    quest?.prerequisiteStatus === "complete",
  );
  const [confirmedAvailable, setConfirmedAvailable] = useState(
    quest?.availability === "available",
  );
  return (
    <Modal
      title={quest ? "Edit personal quest" : "Add personal quest"}
      close={close}
    >
      <form
        className="acquisition-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const zone = zoneCatalogue.find(
            (z) =>
              z.name.toLocaleLowerCase() ===
              zoneName.trim().toLocaleLowerCase(),
          );
          await save({
            name,
            zoneName: zoneName || undefined,
            zoneId: zone?.id,
            requiredLevel: requiredLevel ? Number(requiredLevel) : undefined,
            recommendedLevel: level ? Number(level) : undefined,
            startingNpc: npc || undefined,
            startingLocation: location || undefined,
            dungeonId: dungeonId || undefined,
            referenceUrl: referenceUrl || undefined,
            notes,
            prerequisiteIds: prerequisites,
            prerequisiteStatus: completePrerequisites ? "complete" : "unknown",
            availability: confirmedAvailable ? "available" : "unknown",
          });
        }}
      >
        <p className="acquisition-muted">
          Personal entries work without a game database. Your target levels and
          source relationships are user supplied.
        </p>
        <label>
          Quest name
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="acquisition-form-grid">
          <label>
            Associated zone
            <input
              list="quest-zone-names"
              maxLength={120}
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
            />
            <datalist id="quest-zone-names">
              {zoneCatalogue.map((z) => (
                <option key={z.id} value={z.name} />
              ))}
            </datalist>
          </label>
          <label>
            Target level (optional)
            <input
              type="number"
              min="1"
              max="60"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </label>
          <label>
            Required level (optional)
            <input
              type="number"
              min="1"
              max="60"
              value={requiredLevel}
              onChange={(e) => setRequiredLevel(e.target.value)}
            />
          </label>
          <label>
            Dungeon association
            <select
              value={dungeonId}
              onChange={(e) => setDungeonId(e.target.value)}
            >
              <option value="">No dungeon association</option>
              {data.dungeons.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Starting NPC (optional)
            <input
              maxLength={120}
              value={npc}
              onChange={(e) => setNpc(e.target.value)}
            />
          </label>
          <label>
            Starting location (optional)
            <input
              maxLength={120}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>
        <fieldset>
          <legend>Personal prerequisites</legend>
          <p className="field-help">
            Select known preceding quests. Chain step order is tracked
            separately.
          </p>
          {data.quests
            .filter((q) => q.id !== quest?.id)
            .map((q) => (
              <label className="checkbox-option" key={q.id}>
                <input
                  type="checkbox"
                  checked={prerequisites.includes(q.id)}
                  onChange={(e) =>
                    setPrerequisites(
                      e.target.checked
                        ? [...prerequisites, q.id]
                        : prerequisites.filter((id) => id !== q.id),
                    )
                  }
                />
                {q.name}
              </label>
            ))}
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={completePrerequisites}
              onChange={(e) => setCompletePrerequisites(e.target.checked)}
            />
            This list contains all prerequisites in my personal plan
          </label>
        </fieldset>
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={confirmedAvailable}
            onChange={(e) => setConfirmedAvailable(e.target.checked)}
          />
          I have confirmed this quest is available for this character
        </label>
        <p className="field-help">
          This personal confirmation helps choose relevant plans. It does not
          record acceptance in the game client.
        </p>
        <label>
          External quest reference
          <input
            type="url"
            maxLength={2000}
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Personal quest notes
          <textarea
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={close}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving || !name.trim()}>
            {quest ? "Save quest" : "Add quest"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ChainForm({
  chain,
  saving,
  close,
  save,
}: {
  chain?: ManualQuestChain;
  saving: boolean;
  close: () => void;
  save: (draft: {
    name: string;
    notes: string;
    referenceUrl?: string;
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState(chain?.name || "");
  const [notes, setNotes] = useState(chain?.notes || "");
  const [referenceUrl, setReferenceUrl] = useState(chain?.referenceUrl || "");
  return (
    <Modal
      title={chain ? "Edit quest chain" : "Create quest chain"}
      close={close}
    >
      <form
        className="acquisition-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await save({ name, notes, referenceUrl: referenceUrl || undefined });
        }}
      >
        <label>
          Chain name
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Chain notes
          <textarea
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label>
          External chain reference
          <input
            type="url"
            maxLength={2000}
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <p className="acquisition-muted">
          Add, edit and reorder quest steps after saving this named chain.
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={close}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving || !name.trim()}>
            {chain ? "Save chain" : "Create chain"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DungeonsPage(props: AcquisitionPageProps) {
  const { character, saving } = props;
  const { change, status } = useChanges(props);
  const goals = getDungeonGoals(character.acquisition, acquisitionCatalogue);
  const milestones = character.planner.entries.filter(
    (entry) => entry.kind === "dungeon" && entry.status !== "skipped",
  );
  return (
    <div className="acquisition-page">
      <Title
        title="Dungeons"
        description="See desired dungeon equipment and your existing route milestones in one place."
      />
      <p className="acquisition-notice">
        Completing a run records a visit. It never marks an item acquired,
        completes a quest, or changes your leveling route.
      </p>
      <section className="panel">
        <div className="acquisition-heading">
          <h3>Dungeon acquisition goals</h3>
          <span className="acquisition-muted">
            {goals.length} {goals.length === 1 ? "dungeon" : "dungeons"}
          </span>
        </div>
        {goals.length ? (
          <div className="acquisition-grid">
            {goals.map((goal) => (
              <DungeonCard
                key={goal.dungeonId}
                goal={goal}
                saving={saving}
                change={change}
              />
            ))}
          </div>
        ) : (
          <Empty title="No equipment dungeon goals yet">
            Choose a dungeon source for a wanted item in Equipment. Items
            sharing a dungeon appear together here.
          </Empty>
        )}
      </section>
      <section className="panel">
        <div className="acquisition-heading">
          <h3>Route dungeon milestones</h3>
          <a
            className="text-button"
            href={`#/character/${character.id}/leveling`}
          >
            Open Leveling Route →
          </a>
        </div>
        {milestones.length ? (
          <ul className="acquisition-list">
            {milestones.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.title}</strong>
                <div className="acquisition-badges">
                  <span
                    className={`acquisition-badge ${entry.status === "completed" ? "is-complete" : ""}`}
                  >
                    {entry.status}
                  </span>
                  {entry.targetLevel && (
                    <span className="acquisition-badge">
                      Your level plan: {entry.targetLevel.min}–
                      {entry.targetLevel.max}
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <p className="acquisition-muted">{entry.notes}</p>
                )}
                <p className="acquisition-muted">
                  {entry.recordId
                    ? progressionDataset.records.find(
                        (r) => r.id === entry.recordId,
                      )?.name || "Saved catalogue reference"
                    : "Personal route milestone"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No dungeon milestones on your route">
            Your route remains your plan. Add dungeon milestones in Leveling
            Route when you want them.
          </Empty>
        )}
      </section>
      {status}
    </div>
  );
}
function DungeonCard({
  goal,
  saving,
  change,
}: {
  goal: ReturnType<typeof getDungeonGoals>[number];
  saving: boolean;
  change: Change;
}) {
  const [notes, setNotes] = useState(goal.progress.notes);
  useEffect(() => setNotes(goal.progress.notes), [goal.progress.notes]);
  return (
    <article className="acquisition-card">
      <h4>{goal.dungeon?.name || `Unresolved dungeon · ${goal.dungeonId}`}</h4>
      <div className="acquisition-badges">
        <span className="acquisition-badge">
          {goal.items.length} desired{" "}
          {goal.items.length === 1 ? "item" : "items"}
        </span>
        <span className="acquisition-badge">
          {goal.progress.runsCompleted} runs recorded
        </span>
        {goal.dungeon?.evidence.kind === "user-supplied" && (
          <span className="acquisition-badge is-user">
            User supplied dungeon
          </span>
        )}
      </div>
      {goal.dungeon?.zoneName && (
        <p className="acquisition-muted">{goal.dungeon.zoneName}</p>
      )}
      <ul className="acquisition-list">
        {goal.items.map(({ entry, item, source }) => (
          <li key={entry.id}>
            <strong
              className={`acquisition-quality-${item?.quality || "unknown"}`}
            >
              {item?.name || `Unresolved item · ${entry.itemId}`}
            </strong>
            <p className="acquisition-muted">
              {source.bossName ? `Boss: ${source.bossName}` : "Boss unknown"} ·{" "}
              {source.evidence.kind === "user-supplied"
                ? "User supplied relationship"
                : "Reviewed relationship"}
            </p>
            <Reference url={source.evidence.url} />
          </li>
        ))}
      </ul>
      <div className="acquisition-actions">
        <button
          className="primary"
          disabled={saving}
          onClick={() =>
            void change(
              (s) => recordDungeonRun(s, goal.dungeonId),
              "Dungeon run recorded. Desired items remain on your wishlist.",
            )
          }
        >
          Record completed run
        </button>
      </div>
      <details>
        <summary>Dungeon notes and reference</summary>
        {goal.dungeon ? (
          <Evidence record={goal.dungeon} />
        ) : (
          <p className="acquisition-muted">
            The dungeon record is missing. Your run history and personal notes
            are retained.
          </p>
        )}
        <form
          className="acquisition-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await change(
              (s) => setDungeonNotes(s, goal.dungeonId, notes),
              "Dungeon notes saved.",
            );
          }}
        >
          <label>
            Dungeon planning notes
            <textarea
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </label>
          <button
            className="secondary"
            disabled={saving || notes === goal.progress.notes}
          >
            Save dungeon notes
          </button>
        </form>
      </details>
    </article>
  );
}

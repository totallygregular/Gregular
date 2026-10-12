import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  addCharacter,
  addObjective,
  createProfile,
  removeCharacter,
  setNotes,
  setObjectiveComplete,
  updateCharacter,
  validateCharacterDraft,
  type Character,
  type CharacterDraft,
  type Profile,
} from "./domain";
import {
  BrowserProfileRepository,
  profileStorageKey,
} from "./profileRepository";
import { ClassCrest, Icon, Landscape, Modal } from "./components";
import {
  DATA_NOTICE,
  sampleDungeon,
  sampleItem,
  talentNodes,
} from "./mockData";

const CLASSES = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid",
];
const RACES = [
  "Human",
  "Dwarf",
  "Night Elf",
  "Gnome",
  "Orc",
  "Undead",
  "Tauren",
  "Troll",
];
const COLORS: Record<string, string> = {
  Priest: "#d6d9cc",
  Warrior: "#d1aa82",
  Paladin: "#e7a6c0",
  Hunter: "#b2cf83",
  Rogue: "#e0cf80",
  Shaman: "#77b3dd",
  Mage: "#8dd4da",
  Warlock: "#bba4e4",
  Druid: "#e7aa6c",
};
const SECTIONS = [
  { id: "journal", name: "Quest journal", icon: "journal" },
  { id: "leveling", name: "Leveling", icon: "route" },
  { id: "dungeons", name: "Dungeons", icon: "dungeon" },
  { id: "talents", name: "Talents", icon: "talent" },
  { id: "equipment", name: "Equipment", icon: "equipment" },
  { id: "notes", name: "Notes", icon: "notes" },
];
const classStyle = (c: Character): CSSProperties =>
  ({ "--class-color": COLORS[c.className] || "#d8b66d" }) as CSSProperties;
const completedCount = (c: Character) =>
  c.objectives.filter((o) => o.completed).length;
const draftLink = import.meta.env.DEV
  ? "https://gregular.org/"
  : "../index.html";
type Route = { characterId?: string; section: string };
function readRoute(): Route {
  const parts = location.hash.slice(1).split("/").filter(Boolean);
  return parts[0] === "character"
    ? {
        characterId: parts[1],
        section: SECTIONS.some((s) => s.id === parts[2]) ? parts[2] : "journal",
      }
    : { section: "roster" };
}
function go(characterId?: string, section = "journal") {
  location.hash = characterId
    ? `/character/${characterId}/${section}`
    : "/roster";
}
function sessionUsername(): string {
  try {
    return sessionStorage.getItem("gregular.active-profile") || "";
  } catch {
    return "";
  }
}

export function App() {
  const repository = useMemo(
    () => new BrowserProfileRepository(() => localStorage),
    [],
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [route, setRoute] = useState(readRoute);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Saved in this browser");
  const [problem, setProblem] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Character | "new" | null>(null);
  const [removing, setRemoving] = useState<Character | null>(null);
  const busy = useRef(false);
  const opening = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  async function enter(name: string) {
    if (opening.current) return;
    opening.current = true;
    setError("");
    setLoading(true);
    try {
      const result = await repository.load(name);
      const opened = result.profile || createProfile(name);
      const initialSave =
        result.mode === "missing" ? await repository.save(opened) : undefined;
      setProfile(initialSave?.profile || opened);
      setProblem(
        result.mode === "protected" ||
          result.mode === "unavailable" ||
          initialSave?.ok === false,
      );
      setMessage(
        result.message ||
          (initialSave?.ok === false
            ? `${initialSave.message} Changes in this tab are temporary.`
            : "Saved in this browser"),
      );
      try {
        sessionStorage.setItem("gregular.active-profile", name.trim());
      } catch {
        /* tab still works */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this profile.");
    } finally {
      opening.current = false;
      setLoading(false);
    }
  }
  useEffect(() => {
    const name = sessionUsername();
    if (name) void enter(name);
    else setLoading(false);
  }, []);
  useEffect(() => {
    const listener = () => setRoute(readRoute());
    addEventListener("hashchange", listener);
    return () => removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    // Wait for native hash navigation before moving keyboard focus to the screen.
    const frame = requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [route.characterId, route.section]);
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (
        profile &&
        (event.key === profileStorageKey(profile.usernameKey) ||
          event.key === null)
      ) {
        setProblem(true);
        setMessage(
          "Another tab changed browser data. Reopen your profile to load the latest save before continuing.",
        );
      }
    };
    addEventListener("storage", listener);
    return () => removeEventListener("storage", listener);
  }, [profile?.usernameKey]);
  async function commit(change: (p: Profile) => Profile): Promise<boolean> {
    if (!profile || busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const next = change(profile);
      setProfile(next);
      const result = await repository.save(next);
      if (result.ok && result.profile) setProfile(result.profile);
      setProblem(!result.ok);
      setMessage(
        result.ok
          ? "Saved in this browser"
          : `${result.message || "Could not save."} Changes in this tab are temporary; download a backup before leaving.`,
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make that change.");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function switchProfile() {
    setProfile(null);
    setUsername("");
    setError("");
    go();
    try {
      sessionStorage.removeItem("gregular.active-profile");
    } catch {
      /* no storage available */
    }
  }
  function downloadBackup() {
    if (!profile) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(profile, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gregular-profile-${profile.usernameKey.replace(/[^a-z0-9_-]/g, "_")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  const character = profile?.characters.find((c) => c.id === route.characterId);

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a
          className="wordmark"
          href="#/roster"
          aria-label="Gregular character roster"
        >
          <span className="brand-mark">G</span>
          <span>
            GREGULAR<small>A FOREVER COMPANION</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="prototype-tag">
            FIRST EDITION <span> / PROTOTYPE</span>
          </span>
          <a
            className="draft-link"
            href={draftLink}
            target="_blank"
            rel="noreferrer"
          >
            Class draft ↗
          </a>
          {profile && (
            <button
              className="profile-switch"
              onClick={switchProfile}
              title="Switch local profile"
            >
              <span className="avatar">
                {profile.username.slice(0, 1).toUpperCase()}
              </span>
              <span>
                {profile.username}
                <small>Switch profile</small>
              </span>
            </button>
          )}
        </div>
      </header>
      {loading ? (
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="loading-view"
        >
          <span className="eyebrow">OPENING YOUR JOURNAL</span>
          <h1>A moment by the campfire…</h1>
        </main>
      ) : !profile ? (
        <main id="main-content" ref={mainRef} tabIndex={-1} className="welcome">
          <div className="welcome-art">
            <Landscape />
            <div className="welcome-copy">
              <p className="eyebrow">FOR THE JOURNEY. AND THE PEOPLE IN IT.</p>
              <h1>
                Every adventure
                <br />
                starts with <em>you.</em>
              </h1>
              <p>
                A home for your characters, your plans,
                <br className="desktop-break" /> and whatever comes next.
              </p>
              <span className="ornament">◇ ───────── ◇</span>
              <p className="caption">
                WORLD OF WARCRAFT FOREVER
                <br />
                UNOFFICIAL COMPANION
              </p>
            </div>
          </div>
          <div className="welcome-form">
            <span className="chapter">01 / YOUR JOURNAL</span>
            <h2>Welcome, adventurer.</h2>
            <p>
              Choose a username to open your local profile. Returning? Use the
              same name to pick up where you left off.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enter(username);
              }}
            >
              <label htmlFor="username">Username</label>
              <input
                id="username"
                autoComplete="username"
                autoFocus
                maxLength={40}
                placeholder="What should we call you?"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary full" type="submit">
                Open my journal <Icon name="arrow" />
              </button>
            </form>
            <div className="privacy-note">
              <Icon name="shield" />
              <p>
                <strong>A local profile, saved on this device.</strong>
                <br />
                This is not secure sign-in. Anyone using this browser can open
                your username. No account, cloud sync, or game connection.
              </p>
            </div>
          </div>
        </main>
      ) : (
        <>
          <div
            className={`save-bar ${problem ? "has-problem" : ""}`}
            role="status"
          >
            <span className="save-dot" />
            {saving ? "Saving your journal…" : message}
            {problem && (
              <button className="text-button" onClick={downloadBackup}>
                Download backup
              </button>
            )}
          </div>
          {error && (
            <div className="global-error" role="alert">
              {error}
            </div>
          )}
          {route.characterId && !character ? (
            <main
              id="main-content"
              ref={mainRef}
              tabIndex={-1}
              className="empty-page"
            >
              <Icon name="journal" size={40} />
              <h1>Character not found.</h1>
              <p>
                This character may have been removed or belongs to a different
                local profile.
              </p>
              <button className="primary" onClick={() => go()}>
                Back to characters
              </button>
            </main>
          ) : character ? (
            <main
              id="main-content"
              ref={mainRef}
              tabIndex={-1}
              className="character-view"
              style={classStyle(character)}
            >
              <div className="character-banner">
                <Landscape />
                <button className="back-link" onClick={() => go()}>
                  <Icon name="back" size={16} /> All characters
                </button>
                <div className="character-heading">
                  <ClassCrest className={character.className} small />
                  <div>
                    <p className="eyebrow">
                      {character.faction.toUpperCase()} ·{" "}
                      {character.race.toUpperCase()}{" "}
                      {character.className.toUpperCase()}
                    </p>
                    <h1>{character.name}</h1>
                    <p>
                      Level {character.level} <span> / </span>{" "}
                      {character.plannedSpec || "Specialisation undecided"}
                    </p>
                  </div>
                  <button
                    className="secondary edit-character"
                    onClick={() => setEditor(character)}
                  >
                    <Icon name="edit" size={17} />
                    Edit character
                  </button>
                </div>
              </div>
              <div className="character-layout">
                <aside className="character-sidebar">
                  <p className="eyebrow">YOUR ADVENTURE</p>
                  <nav aria-label="Character sections">
                    {SECTIONS.map((s) => (
                      <a
                        key={s.id}
                        href={`#/character/${character.id}/${s.id}`}
                        aria-current={
                          route.section === s.id ? "page" : undefined
                        }
                      >
                        <Icon name={s.icon} />
                        {s.name}
                        <span>›</span>
                      </a>
                    ))}
                  </nav>
                  <div className="sidebar-note">
                    <span>◇</span>
                    <p>
                      One quest at a time.
                      <br />
                      Make the journey yours.
                    </p>
                  </div>
                </aside>
                <div
                  className="dashboard-content"
                  key={`${character.id}-${route.section}`}
                >
                  {route.section === "journal" && (
                    <Journal
                      character={character}
                      saving={saving}
                      commit={commit}
                    />
                  )}
                  {route.section === "leveling" && (
                    <Leveling
                      character={character}
                      edit={() => setEditor(character)}
                    />
                  )}
                  {route.section === "dungeons" && <Dungeons />}
                  {route.section === "talents" && (
                    <Talents character={character} />
                  )}
                  {route.section === "equipment" && <Equipment />}
                  {route.section === "notes" && (
                    <Notes
                      character={character}
                      saving={saving}
                      commit={commit}
                    />
                  )}
                </div>
              </div>
            </main>
          ) : (
            <main
              id="main-content"
              ref={mainRef}
              tabIndex={-1}
              className="roster-view"
            >
              <section className="roster-hero">
                <Landscape />
                <div>
                  <p className="eyebrow">THE NEXT CHAPTER IS YOURS</p>
                  <h1>
                    Your characters.
                    <br />
                    <em>Infinite possibilities.</em>
                  </h1>
                  <p>A few familiar faces. A whole world ahead.</p>
                </div>
                <div className="roster-tally">
                  <strong>
                    {String(profile.characters.length).padStart(2, "0")}
                  </strong>
                  <span>
                    {profile.characters.length === 1
                      ? "CHARACTER"
                      : "CHARACTERS"}
                    <br />
                    ONE ADVENTURE
                  </span>
                </div>
              </section>
              <section className="roster-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">CHOOSE YOUR NEXT ADVENTURE</p>
                    <h2>The company you keep.</h2>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => setEditor("new")}
                  >
                    <Icon name="plus" size={17} /> New character
                  </button>
                </div>
                <div className="character-grid">
                  {profile.characters.map((c) => (
                    <article
                      key={c.id}
                      className="character-card"
                      style={classStyle(c)}
                    >
                      <div className="card-top">
                        <span className={`faction ${c.faction.toLowerCase()}`}>
                          {c.faction}
                        </span>
                        <button
                          className="icon-button"
                          onClick={() => setEditor(c)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Icon name="edit" size={17} />
                        </button>
                      </div>
                      <div className="card-art">
                        <ClassCrest className={c.className} />
                        <span className="level-seal">
                          <small>LVL</small>
                          {c.level}
                        </span>
                      </div>
                      <div className="card-body">
                        <p className="class-label">
                          {c.race} {c.className}
                        </p>
                        <h3>{c.name}</h3>
                        <p className="spec-line">
                          {c.plannedSpec || "A path yet to choose"}
                        </p>
                        <div className="card-progress">
                          <span className={`status-pill ${c.status}`}>
                            {c.status}
                          </span>
                          <span>
                            {completedCount(c)} / {c.objectives.length}{" "}
                            objectives
                          </span>
                        </div>
                        <button
                          className="enter-character"
                          onClick={() => go(c.id)}
                          aria-label={`Open ${c.name}'s journal`}
                        >
                          Continue adventure <Icon name="arrow" />
                        </button>
                      </div>
                    </article>
                  ))}
                  <button
                    className="add-character-card"
                    onClick={() => setEditor("new")}
                  >
                    <span className="add-crest">
                      <Icon name="plus" size={30} />
                    </span>
                    <h3>
                      {profile.characters.length
                        ? "Another story awaits."
                        : "Your first story awaits."}
                    </h3>
                    <p>
                      Create a character.
                      <br />
                      Give your next adventure a name.
                    </p>
                    <span className="text-gold">
                      Create character <span>↗</span>
                    </span>
                  </button>
                  {profile.characters.length === 0 && (
                    <div className="roster-empty">
                      <span>02 — AND BEYOND</span>
                      <Icon name="journal" size={35} />
                      <h3>Room for your whole roster.</h3>
                      <p>
                        Three across on desktop.
                        <br />
                        As many characters as you need.
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <section className="roster-bottom">
                <div>
                  <Icon name="journal" size={26} />
                  <div>
                    <h3>A little planning. A better adventure.</h3>
                    <p>
                      Keep objectives, ideas, and the next good plan in one
                      place.
                    </p>
                  </div>
                </div>
                <span>
                  LOCAL SAVES <span>◇</span> YOUR OWN PACE
                </span>
              </section>
            </main>
          )}
        </>
      )}
      <footer>
        <span>
          GREGULAR <span className="footer-diamond">◇</span> MADE FOR THE
          JOURNEY
        </span>
        <p>
          Unofficial fan prototype · Not affiliated with Blizzard · Game
          examples are mock data
        </p>
        <a
          className="footer-draft-link"
          href={draftLink}
          target="_blank"
          rel="noreferrer"
        >
          Class draft ↗
        </a>
        {profile && (
          <button className="text-button" onClick={downloadBackup}>
            Export local profile
          </button>
        )}
      </footer>
      {editor && profile && (
        <CharacterEditor
          character={editor === "new" ? undefined : editor}
          saving={saving}
          close={() => setEditor(null)}
          remove={() => {
            if (editor !== "new") {
              setRemoving(editor);
              setEditor(null);
            }
          }}
          save={async (draft, sample) => {
            const ok = await commit((p) =>
              editor === "new"
                ? addCharacter(p, draft, { mockObjectives: sample })
                : updateCharacter(p, editor.id, draft),
            );
            if (ok) setEditor(null);
            return ok;
          }}
        />
      )}
      {removing && (
        <Modal
          title={`Remove ${removing.name}?`}
          close={() => setRemoving(null)}
        >
          <p className="dialog-description">
            Their objectives and notes will be removed from this local profile.
            Download a profile backup first if you want to keep a copy.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setRemoving(null)}>
              Keep character
            </button>
            <button
              className="danger"
              disabled={saving}
              onClick={async () => {
                const id = removing.id;
                const ok = await commit((p) => removeCharacter(p, id));
                if (ok) {
                  setRemoving(null);
                  if (route.characterId === id) go();
                }
              }}
            >
              Remove character
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CharacterEditor({
  character,
  saving,
  close,
  save,
  remove,
}: {
  character?: Character;
  saving: boolean;
  close: () => void;
  save: (draft: CharacterDraft, sample: boolean) => Promise<boolean>;
  remove: () => void;
}) {
  const [draft, setDraft] = useState<CharacterDraft>(
    character
      ? { ...character }
      : {
          name: "",
          race: "Troll",
          className: "Priest",
          faction: "Horde",
          plannedSpec: "",
          level: 1,
          status: "planned",
        },
  );
  const [sample, setSample] = useState(false);
  const [formError, setFormError] = useState("");
  const field = <K extends keyof CharacterDraft>(
    key: K,
    value: CharacterDraft[K],
  ) => setDraft((p) => ({ ...p, [key]: value }));
  return (
    <Modal
      title={character ? "Refine your character." : "A new adventure begins."}
      close={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setFormError("");
          try {
            validateCharacterDraft(draft);
            if (!(await save(draft, sample)))
              setFormError(
                "Could not update this character. Check the save status and try again.",
              );
          } catch (validationError) {
            setFormError(
              validationError instanceof Error
                ? validationError.message
                : "Check your character details.",
            );
          }
        }}
      >
        <div
          className="editor-preview"
          style={
            {
              "--class-color": COLORS[draft.className] || "#d8b66d",
            } as CSSProperties
          }
        >
          <ClassCrest className={draft.className} small />
          <p>
            {draft.race} {draft.className}
            <strong>{draft.name || "Your next adventurer"}</strong>
          </p>
        </div>
        <div className="form-grid">
          <label className="full-field">
            Character name
            <input
              autoFocus
              required
              maxLength={40}
              value={draft.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="Give your story a name"
            />
          </label>
          <label>
            Race
            <input
              list="race-options"
              required
              maxLength={60}
              value={draft.race}
              onChange={(e) => field("race", e.target.value)}
            />
          </label>
          <label>
            Class
            <input
              list="class-options"
              required
              maxLength={60}
              value={draft.className}
              onChange={(e) => field("className", e.target.value)}
            />
          </label>
          <label>
            Faction
            <select
              value={draft.faction}
              onChange={(e) =>
                field("faction", e.target.value as CharacterDraft["faction"])
              }
            >
              <option>Horde</option>
              <option>Alliance</option>
              <option>Undecided</option>
            </select>
          </label>
          <label>
            Current level
            <input
              type="number"
              min="1"
              max="60"
              required
              value={Number.isNaN(draft.level) ? "" : draft.level}
              onChange={(e) => field("level", e.target.valueAsNumber)}
            />
          </label>
          <label>
            Planned specialisation
            <input
              maxLength={80}
              value={draft.plannedSpec}
              onChange={(e) => field("plannedSpec", e.target.value)}
              placeholder="e.g. Holy — your own plan"
            />
          </label>
          <label>
            Progression status
            <select
              value={draft.status}
              onChange={(e) =>
                field("status", e.target.value as CharacterDraft["status"])
              }
            >
              <option value="planned">Planned</option>
              <option value="leveling">Leveling</option>
              <option value="paused">Paused</option>
            </select>
          </label>
        </div>
        <datalist id="race-options">
          {RACES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </datalist>
        <datalist id="class-options">
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </datalist>
        <p className="field-help">
          Race, class, and faction are your planning labels; beta eligibility is
          not validated. The 1–60 level range is provisional.
        </p>
        {!character && (
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={sample}
              onChange={(e) => setSample(e.target.checked)}
            />
            <span>
              Add sample planning objectives
              <small>
                Generic examples to try the checklist. No game recommendations.
              </small>
            </span>
          </label>
        )}
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="dialog-actions">
          {character && (
            <button
              className="text-button remove-link"
              type="button"
              onClick={remove}
            >
              Remove character
            </button>
          )}
          <button className="secondary" type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={saving} type="submit">
            {character ? "Save changes" : "Create character"}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

type DashboardProps = {
  character: Character;
  saving: boolean;
  commit: (change: (p: Profile) => Profile) => Promise<boolean>;
};
function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="dashboard-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
function MockLabel() {
  return <span className="mock-label">{DATA_NOTICE}</span>;
}
function Journal({ character, saving, commit }: DashboardProps) {
  const [title, setTitle] = useState("");
  const next = character.objectives
    .filter((o) => !o.completed)
    .sort(
      (a, b) => Number(b.priority === "high") - Number(a.priority === "high"),
    )[0];
  return (
    <>
      <SectionTitle
        eyebrow="A LITTLE DIRECTION GOES A LONG WAY"
        title="Your quest journal."
        description="Small steps. Good company. A story worth keeping."
      />
      <div className="journal-top">
        <section className="next-up panel">
          <p className="eyebrow">
            <span className="gold-dot" /> NEXT UP{" "}
            <span className="user-plan">YOUR PLAN</span>
          </p>
          <h3>{next?.title || "Make room for the next adventure."}</h3>
          <p>
            {next
              ? "The next unfinished objective in your journal. Set your own pace."
              : "Add an objective below. Your next step starts with a good idea."}
          </p>
          {next && (
            <button
              className="primary"
              disabled={saving}
              onClick={() =>
                void commit((p) =>
                  setObjectiveComplete(p, character.id, next.id, true),
                )
              }
            >
              Mark complete <Icon name="check" size={17} />
            </button>
          )}
        </section>
        <section className="progress-panel panel">
          <span className="eyebrow">JOURNAL PROGRESS</span>
          <div className="progress-value">
            {completedCount(character)}
            <span> / {character.objectives.length}</span>
          </div>
          <p>objectives completed</p>
          <div className="progress-track">
            <span
              style={{
                width: `${character.objectives.length ? (completedCount(character) / character.objectives.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="caption">EVERY LITTLE STEP COUNTS.</span>
        </section>
      </div>
      <section className="panel objectives">
        <div className="panel-heading">
          <h3>On the horizon</h3>
          <span>{character.objectives.length} objectives</span>
        </div>
        {character.objectives.length ? (
          <ul className="objective-list">
            {character.objectives.map((o) => (
              <li key={o.id} className={o.completed ? "is-complete" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={o.completed}
                    disabled={saving}
                    onChange={(e) =>
                      void commit((p) =>
                        setObjectiveComplete(
                          p,
                          character.id,
                          o.id,
                          e.target.checked,
                        ),
                      )
                    }
                  />
                  <span>
                    {o.title}
                    <small>
                      {o.priority === "high"
                        ? "Priority"
                        : "Personal objective"}
                    </small>
                  </span>
                </label>
                <span aria-hidden="true">{o.completed ? "✓" : "◇"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="inline-empty">
            <Icon name="journal" size={30} />
            <p>A blank page is a good beginning.</p>
            <span>Your objectives will appear here.</span>
          </div>
        )}
        <form
          className="add-objective"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await commit((p) => addObjective(p, character.id, title)))
              setTitle("");
          }}
        >
          <label className="sr-only" htmlFor="objective-title">
            New objective
          </label>
          <input
            id="objective-title"
            maxLength={160}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What would you like to do next?"
          />
          <button className="secondary" disabled={saving || !title.trim()}>
            <Icon name="plus" size={17} />
            Add objective
          </button>
        </form>
      </section>
      <div className="journal-footnote">
        <Icon name="route" />
        <p>
          Your plans lead the way. Verified routes, class quests, and group
          recommendations are coming in a later pass.
        </p>
      </div>
    </>
  );
}
function Leveling({
  character,
  edit,
}: {
  character: Character;
  edit: () => void;
}) {
  return (
    <>
      <SectionTitle
        eyebrow="THE LONG ROAD, ONE STEP AT A TIME"
        title="Enjoy the journey."
        description="A place for your route, milestones, and the detours along the way."
      />
      <MockLabel />
      <section className="panel leveling-overview">
        <div>
          <span className="eyebrow">CURRENT CHAPTER</span>
          <h3>Level {character.level}</h3>
          <p>
            {character.status === "planned"
              ? "An adventure waiting to begin."
              : "Your progress, at your own pace."}
          </p>
          <button className="secondary" onClick={edit}>
            Update your level <Icon name="edit" size={17} />
          </button>
        </div>
        <ClassCrest className={character.className} />
      </section>
      <div className="milestone-grid">
        {["Find your footing", "Choose your path", "Make your mark"].map(
          (name, i) => (
            <section className="panel milestone" key={name}>
              <span className="chapter">0{i + 1} / EXAMPLE CHAPTER</span>
              <h3>{name}</h3>
              <p>
                Future milestones will connect verified zone routes, class
                quests, and travel unlocks.
              </p>
              <span className="placeholder-label">
                Data integration planned
              </span>
            </section>
          ),
        )}
      </div>
      <p className="data-explanation">
        These are layout examples. No zone order, level bracket, or class quest
        is being recommended.
      </p>
    </>
  );
}
function Dungeons() {
  return (
    <>
      <SectionTitle
        eyebrow="BETTER TOGETHER"
        title="Into the unknown."
        description="Prepare the run. Remember the quests. Find something worth keeping."
      />
      <MockLabel />
      <section className="panel dungeon-feature">
        <div className="dungeon-art">
          <Icon name="dungeon" size={110} />
          <span>EXPEDITION / 01</span>
        </div>
        <div>
          <span className="eyebrow">{sampleDungeon.label}</span>
          <h3>{sampleDungeon.name}</h3>
          <p>{sampleDungeon.description}</p>
          <div className="dungeon-tags">
            <span>Level range pending</span>
            <span>Quest data pending</span>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h3>A prepared party</h3>
          <span>Example workflow</span>
        </div>
        <ol className="example-steps">
          {sampleDungeon.objectives.map((o, i) => (
            <li key={o}>
              <span>0{i + 1}</span>
              <div>
                <strong>{o}</strong>
                <p>
                  {i === 0
                    ? "Future shared planning will find overlapping objectives."
                    : "Verified data will be linked here in a later pass."}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <Equipment compact />
    </>
  );
}
function Talents({ character }: { character: Character }) {
  const [node, setNode] = useState<string | null>(null);
  return (
    <>
      <SectionTitle
        eyebrow="A PATH OF YOUR OWN"
        title="Shape your potential."
        description="A preview of the talent planning space. Your actual build comes later."
      />
      <MockLabel />
      <div className="panel talent-panel">
        <div className="panel-heading">
          <div>
            <h3>{character.plannedSpec || "Your planned specialisation"}</h3>
            <p>{character.className} · Visual placeholder</p>
          </div>
          <span className="placeholder-label">Allocation unavailable</span>
        </div>
        <div className="talent-tree">
          {talentNodes.map((name, i) => (
            <button
              key={name}
              className={`talent-node node-${i} ${node === name ? "selected" : ""}`}
              onClick={() => setNode(node === name ? null : name)}
              aria-label={`Preview fictional ${name} talent`}
              aria-pressed={node === name}
            >
              <Icon name={["shield", "talent", "route"][i % 3]} size={27} />
              <span>— / —</span>
            </button>
          ))}
        </div>
        <div className="talent-description" aria-live="polite">
          <strong>{node || "Explore the shape of a future build."}</strong>
          <p>
            {node
              ? "Fictional node. Rank costs, spell IDs, prerequisites, and tooltips are not connected. No talent points are allocated."
              : "Select a node to preview its details. This arrangement does not represent a Forever talent tree."}
          </p>
        </div>
      </div>
      <p className="data-explanation">
        The future planner will use a pinned Forever dataset with rank-aware
        allocation, validated prerequisites, and a level-by-level plan.
      </p>
    </>
  );
}
function Equipment({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {!compact && (
        <>
          <SectionTitle
            eyebrow="SOMETHING WORTH THE JOURNEY"
            title="The spoils ahead."
            description="A home for your wishlist, drop sources, and the items you finally find."
          />
          <MockLabel />
        </>
      )}
      <section className="panel equipment-panel">
        <div className="panel-heading">
          <h3>{compact ? "A glimpse of the loot" : "Wishlist preview"}</h3>
          <span>Fictional item</span>
        </div>
        <div className="item-row">
          <span className="item-icon">
            <Icon name="equipment" size={30} />
          </span>
          <div>
            <h4>{sampleItem.name}</h4>
            <p>{sampleItem.slot}</p>
            <span>{sampleItem.source}</span>
          </div>
          <details className="item-details">
            <summary>Item details</summary>
            <div className="item-tooltip">
              <strong>{sampleItem.name}</strong>
              <p>{sampleItem.quality}</p>
              <p>{sampleItem.slot}</p>
              <hr />
              <p>{sampleItem.description}</p>
              <small>No real item ID, stats, or drop rate.</small>
            </div>
          </details>
        </div>
        <p className="data-explanation">
          Personal loot tracking and verified dungeon associations are planned.
          This preview sends no data to an external tooltip service.
        </p>
      </section>
    </>
  );
}
function Notes({ character, saving, commit }: DashboardProps) {
  const [notes, setLocalNotes] = useState(character.notes);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <SectionTitle
        eyebrow="DON’T LET A GOOD IDEA GET AWAY"
        title="Notes from the road."
        description="A build idea. A place to revisit. The plan for your next evening together."
      />
      <form
        className="panel notes-panel"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          setSaved(await commit((p) => setNotes(p, character.id, notes)));
        }}
      >
        <label htmlFor="notes">Your personal notes</label>
        <textarea
          id="notes"
          maxLength={10000}
          rows={12}
          value={notes}
          onChange={(e) => {
            setLocalNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Leave a thought for your future self…"
        />
        <div className="notes-actions">
          <span>{notes.length.toLocaleString()} / 10,000 characters</span>
          <button className="primary" disabled={saving}>
            Save notes <Icon name="check" size={17} />
          </button>
        </div>
        <p role="status">
          {saved
            ? "Notes updated. Check the save status above for persistence."
            : notes !== character.notes
              ? "You have unsaved notes."
              : "Your own words. Saved only on this browser."}
        </p>
      </form>
    </>
  );
}

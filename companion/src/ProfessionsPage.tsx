import { useEffect, useState } from "react";
import type { Character } from "./domain";
import type { CharacterSection } from "./navigation";
import { Icon, Modal } from "./components";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { addWishlistItem, updateWishlistEntry } from "./acquisition";
import {
  addManualCraftingGoal,
  getCraftingGoals,
  removeProfession,
  setCraftingGoal,
  setCraftingMaterial,
  setProfession,
} from "./crafting";
import "./acquisition.css";
import "./professions.css";

export interface ProfessionsPageProps {
  character: Character;
  saving: boolean;
  onChange: (character: Character) => Promise<boolean>;
  onNavigate: (section: CharacterSection) => void;
}

type Change = (update: (character: Character) => Character, message: string) => Promise<boolean>;
type Profession = Parameters<typeof setProfession>[1];
type CraftingGoalView = ReturnType<typeof getCraftingGoals>[number];
type ManualDraft = Parameters<typeof addManualCraftingGoal>[1];

const professionSuggestions = [
  "Alchemy", "Blacksmithing", "Enchanting", "Engineering", "Herbalism",
  "Leatherworking", "Mining", "Skinning", "Tailoring", "Cooking", "First Aid", "Fishing",
];
const safeReference = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
};

function Reference({ url, children = "Source reference ↗" }: { url?: string; children?: string }) {
  const href = safeReference(url);
  return href ? <a href={href} target="_blank" rel="noreferrer noopener">{children}</a> : null;
}

function wishForRecipe(character: Character, recipeId: string): Character {
  const recipe = [...(acquisitionDataset.recipes || []), ...character.crafting.manualRecipes].find((entry) => entry.id === recipeId);
  if (!recipe) return setCraftingGoal(character, recipeId, { tracked: true });
  const existing = character.acquisition.wishlist.find((entry) => entry.itemId === recipe.itemId);
  const sources = [...acquisitionDataset.sources, ...character.acquisition.manualSources].filter((entry) => entry.method === "craft" && entry.recipeId === recipe.id);
  const source = sources.find((entry) => entry.id === existing?.preferredSourceId) || (sources.length === 1 ? sources[0] : undefined);
  const acquisition = existing
    ? updateWishlistEntry(character.acquisition, existing.id, { status: existing.status === "dismissed" ? "wanted" : existing.status, ...(source ? { preferredSourceId: source.id } : {}) })
    : addWishlistItem(character.acquisition, recipe.itemId, source?.id);
  return setCraftingGoal({ ...character, acquisition }, recipeId, { tracked: true });
}

export function ProfessionsPage(props: ProfessionsPageProps) {
  const { character, saving, onNavigate } = props;
  const [editingProfession, setEditingProfession] = useState<Profession | "new" | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setEditingProfession(null); setAddingGoal(false); setError(""); setFeedback("");
  }, [character.id]);
  const change: Change = async (update, message) => {
    setError("");
    try {
      const ok = await props.onChange(update(character));
      if (ok) setFeedback(message);
      else setError("Could not save that change. Review the profile save message and try again.");
      return ok;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that change.");
      return false;
    }
  };
  const goals = getCraftingGoals(character, acquisitionDataset);
  const recipes = acquisitionDataset.recipes || [];
  const professions = character.crafting.professions;

  return (
    <div className="acquisition-page professions-page">
      <div className="dashboard-title">
        <p className="eyebrow">CHARACTER PROGRESSION</p>
        <h2 tabIndex={-1}>Professions</h2>
        <p>Prepare desired crafted gear, one recipe and one material at a time.</p>
      </div>
      <section className="panel" aria-labelledby="your-professions-heading">
        <div className="acquisition-heading">
          <h3 id="your-professions-heading">Your professions</h3>
          <button className="secondary" disabled={saving} onClick={() => { setError(""); setEditingProfession("new"); }}><Icon name="plus" size={16} /> Choose profession</button>
        </div>
        <p className="acquisition-muted">Record your own choices and current skill. Crafting goals can also use another crafter.</p>
        {professions.length ? (
          <div className="profession-roster">
            {professions.map((profession) => (
              <article className="profession-card" key={profession.id}>
                <span className="profession-mark" aria-hidden="true"><Icon name="equipment" size={22} /></span>
                <div className="profession-card-copy">
                  <span className="profession-category">{profession.category === "primary" ? "Primary" : "Secondary"}</span>
                  <h4>{profession.name}</h4>
                  <p>{profession.skill === undefined ? "Skill unknown" : `Current skill ${profession.skill}`}</p>
                </div>
                <button className="text-button" disabled={saving} onClick={() => setEditingProfession(profession)} aria-label={`Edit ${profession.name}`}>Edit</button>
              </article>
            ))}
          </div>
        ) : <div className="professions-empty"><strong>No professions selected</strong><p>Choose a primary or secondary profession when you have a plan.</p></div>}
      </section>

      <section className="panel" aria-labelledby="crafting-goals-heading">
        <div className="acquisition-heading">
          <div><h3 id="crafting-goals-heading">Crafting goals</h3><p className="acquisition-muted professions-count">{goals.length} {goals.length === 1 ? "personal plan" : "personal plans"}</p></div>
          <button className="primary" disabled={saving} onClick={() => { setError(""); setAddingGoal(true); }}><Icon name="plus" size={16} /> Add personal crafting goal</button>
        </div>
        {goals.length ? <div className="crafting-goals">
          {goals.map((view) => <CraftingGoalCard key={view.goal.recipeId} view={view} character={character} saving={saving} change={change} onNavigate={onNavigate} />)}
        </div> : <div className="professions-empty"><strong>Your workbench is ready</strong><p>Plan a reviewed example below, choose a crafting source in Equipment, or add your own recipe.</p></div>}
      </section>

      {recipes.length > 0 && <section className="panel" aria-labelledby="reviewed-recipes-heading">
        <div className="acquisition-heading"><h3 id="reviewed-recipes-heading">Reviewed crafting examples</h3><span className="acquisition-badge">Limited Forever catalogue</span></div>
        <div className="crafting-example-grid">
          {recipes.map((recipe) => {
            const item = acquisitionDataset.items.find((entry) => entry.id === recipe.itemId);
            const active = goals.some((view) => view.goal.recipeId === recipe.id);
            return <article className="crafting-example" key={recipe.id}>
              <span className="profession-mark" aria-hidden="true"><Icon name="equipment" size={24} /></span>
              <div className="crafting-example-copy"><h4 className={`acquisition-quality-${item?.quality || "unknown"}`}>{item?.name || recipe.name}</h4><p>{recipe.profession || "Profession unknown"} · {recipe.requiredSkill === undefined ? "Required skill unknown" : `Skill ${recipe.requiredSkill}`}</p><Reference url={recipe.evidence.url} /></div>
              <button className="secondary" disabled={saving || active} onClick={() => void change((next) => wishForRecipe(next, recipe.id), "Crafting goal added to your workbench and wishlist.")}>{active ? "Already planned" : "Plan crafted item"}</button>
            </article>;
          })}
        </div>
      </section>}
      <p className="professions-footnote">Recipe learning, material collection, crafting and receiving the finished item are recorded separately. Counts belong to each goal; they are not an inventory.</p>
      <p role="status" className="acquisition-feedback">{feedback}</p>
      {error && <p role="alert" className="acquisition-error">{error}</p>}
      {editingProfession && <ProfessionForm profession={editingProfession === "new" ? undefined : editingProfession} saving={saving} error={error} close={() => setEditingProfession(null)} save={async (draft) => {
        if (await change((next) => setProfession(next, draft), "Profession updated.")) setEditingProfession(null);
      }} remove={async (id) => {
        if (await change((next) => removeProfession(next, id), "Profession removed. Crafting goals remain updated.")) setEditingProfession(null);
      }} />}
      {addingGoal && <ManualCraftingForm saving={saving} error={error} close={() => setAddingGoal(false)} save={async (draft) => {
        if (await change((next) => addManualCraftingGoal(next, draft), "Personal crafting goal added to your workbench and wishlist.")) setAddingGoal(false);
      }} />}
    </div>
  );
}

function ProfessionForm({ profession, saving, error, close, save, remove }: {
  profession?: Profession; saving: boolean; error: string; close: () => void;
  save: (draft: Profession) => Promise<void>; remove: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(profession?.name || "");
  const [category, setCategory] = useState<Profession["category"]>(profession?.category || "primary");
  const [skill, setSkill] = useState(profession?.skill === undefined ? "" : String(profession.skill));
  return <Modal title={profession ? "Edit profession" : "Choose profession"} close={close}>
    <form className="acquisition-form profession-form" onSubmit={async (event) => {
      event.preventDefault();
      await save({ id: profession?.id || crypto.randomUUID(), name, category, ...(skill === "" ? {} : { skill: Number(skill) }) });
    }}>
      <label>Profession name<input required maxLength={80} list="profession-suggestions" value={name} onChange={(event) => setName(event.target.value)} placeholder="Choose or enter a profession" /></label>
      <datalist id="profession-suggestions">{professionSuggestions.map((name) => <option key={name} value={name} />)}</datalist>
      <div className="acquisition-form-grid">
        <label>Profession category<select aria-label="Profession category" value={category} onChange={(event) => setCategory(event.target.value as Profession["category"])}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
        <label>Current skill<input type="number" min="0" max="1000000" step="1" value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Unknown" /></label>
      </div>
      <p className="field-help">Leave skill blank when unknown. Choices are your personal record; Gregular does not impose unverified profession limits or caps.</p>
      {error && <p role="alert" className="acquisition-error">{error}</p>}
      <div className="dialog-actions">
        {profession && <button className="text-button remove-link" type="button" disabled={saving} onClick={() => void remove(profession.id)}>Remove profession</button>}
        <button className="secondary" type="button" disabled={saving} onClick={close}>Cancel</button>
        <button className="primary" disabled={saving || !name.trim()}>Save profession</button>
      </div>
    </form>
  </Modal>;
}

function CraftingGoalCard({ view, character, saving, change, onNavigate }: {
  view: CraftingGoalView; character: Character; saving: boolean; change: Change; onNavigate: (section: CharacterSection) => void;
}) {
  const { goal, recipe, item, wishlistEntry, materials } = view;
  const [notes, setNotes] = useState(goal.notes);
  const [crafterName, setCrafterName] = useState(goal.crafterName);
  useEffect(() => { setNotes(goal.notes); setCrafterName(goal.crafterName); }, [goal.notes, goal.crafterName]);
  const ready = recipe?.materialCompleteness === "complete" && materials.every((entry) => entry.collected >= entry.requirement.quantity);
  const acquired = wishlistEntry?.status === "acquired";
  const knownProfession = character.crafting.professions.find((entry) => entry.name.toLowerCase() === recipe?.profession?.toLowerCase());
  const recipeSources = recipe ? [...acquisitionDataset.sources, ...character.acquisition.manualSources].filter((source) => recipe.sourceIds.includes(source.id)) : [];
  const update = (patch: Parameters<typeof setCraftingGoal>[2], message: string) => change((next) => setCraftingGoal(next, goal.recipeId, patch), message);
  return <article className="crafting-goal" aria-label={`${item?.name || recipe?.name || "Unresolved recipe"} crafting goal`}>
    <div className="crafting-goal-title">
      <span className="profession-mark" aria-hidden="true"><Icon name="equipment" size={25} /></span>
      <div><h4 className={`acquisition-quality-${item?.quality || "unknown"}`}>{item?.name || recipe?.name || "Unresolved crafting goal"}</h4><p>{recipe?.profession || "Profession unknown"} · {recipe?.requiredSkill === undefined ? "Required skill unknown" : `Requires skill ${recipe.requiredSkill}`}</p></div>
      <button className="text-button" onClick={() => onNavigate("equipment")}>Open Equipment →</button>
    </div>
    <div className="crafting-milestones" aria-label="Independent crafting progress">
      <span className={`acquisition-badge ${goal.recipeStatus === "learned" ? "is-complete" : ""}`}>{goal.recipeStatus === "learned" ? "Recipe learned" : goal.recipeStatus === "needed" ? "Recipe needed" : "Recipe status unknown"}</span>
      <span className={`acquisition-badge ${ready ? "is-complete" : ""}`}>{ready ? "Materials collected" : recipe?.materialCompleteness === "complete" ? "Materials pending" : "Material list incomplete"}</span>
      <span className={`acquisition-badge ${goal.crafted ? "is-complete" : ""}`}>{goal.crafted ? "Crafted" : "Not yet crafted"}</span>
      <span className={`acquisition-badge ${acquired ? "is-complete" : ""}`}>{acquired ? "Item received" : "Item not received"}</span>
    </div>
    {!recipe && <p className="acquisition-notice">This saved recipe is unavailable in the current catalogue. Your crafter, collection counts and progress are retained.</p>}
    {!recipe && goal.materialsCollected.length > 0 && <details className="crafting-recipe-source"><summary>Retained material counts</summary><ul className="acquisition-source-list">{goal.materialsCollected.map((entry) => <li key={entry.materialId}>{entry.materialId}: {entry.quantity} collected · requirement unknown</li>)}</ul></details>}
    {recipe && <div className="crafting-preparation">
      <div className="crafting-recipe">
        <h5>Recipe &amp; crafter</h5>
        <p className="acquisition-muted">{recipe.name}</p>
        <div className="acquisition-form">
          <label>Recipe acquisition status<select aria-label="Recipe acquisition status" value={goal.recipeStatus} disabled={saving} onChange={(event) => void update({ recipeStatus: event.target.value as typeof goal.recipeStatus }, "Recipe acquisition status updated.")}><option value="unknown">Unknown</option><option value="needed">Need recipe</option><option value="learned">Learned / available to crafter</option></select></label>
          <label>Who will craft this?<select aria-label="Who will craft this?" value={goal.crafter} disabled={saving} onChange={(event) => void update({ crafter: event.target.value as typeof goal.crafter }, "Crafter choice updated.")}><option value="undecided">Undecided</option><option value="self">Self-craft</option><option value="other">Another character / friend</option></select></label>
          {goal.crafter === "other" && <form className="crafting-crafter-name" onSubmit={async (event) => { event.preventDefault(); await update({ crafterName }, "Crafter name updated."); }}><label>Crafter name (optional)<input maxLength={100} value={crafterName} onChange={(event) => setCrafterName(event.target.value)} disabled={saving} /></label><button className="secondary" disabled={saving || crafterName === goal.crafterName}>Save crafter</button></form>}
        </div>
        {goal.crafter === "self" && <p className="acquisition-muted">{knownProfession ? `${knownProfession.name}: ${knownProfession.skill === undefined ? "current skill unknown" : `current skill ${knownProfession.skill}`}.` : "This profession is not recorded on your character."} {recipe.requiredSkill === undefined ? "Required skill remains unknown." : knownProfession?.skill !== undefined && knownProfession.skill < recipe.requiredSkill ? "Your recorded skill is below this recipe's requirement." : ""}</p>}
        <details className="crafting-recipe-source"><summary>Recipe source &amp; evidence</summary>
          {recipeSources.length ? <ul className="acquisition-source-list">{recipeSources.map((source) => <li key={source.id}><strong>{source.label}</strong><small>{source.evidence.kind === "user-supplied" ? "User supplied" : "Reviewed Forever relationship"}</small><Reference url={source.evidence.url} />{source.questId && <button className="text-button" onClick={() => onNavigate("quests")}>Open Quests →</button>}</li>)}</ul> : <p className="acquisition-muted">Recipe acquisition source unknown.</p>}
          <p className="acquisition-muted">{recipe.evidence.kind === "user-supplied" ? "User-authored recipe. " : "Reviewed Forever recipe. "}{recipe.evidence.note}</p>
          <Reference url={recipe.evidence.url} />
          {recipe.evidence.fields && <dl className="acquisition-stats">{Object.entries(recipe.evidence.fields).map(([field, source]) => <div key={field}><dt>{field}</dt><dd>{source}</dd></div>)}</dl>}
          {recipe.specialRequirements && <p className="acquisition-muted">Special requirements: {recipe.specialRequirements}</p>}
        </details>
      </div>
      <div className="crafting-materials">
        <h5>Materials</h5>
        {recipe.materialCompleteness !== "complete" && <p className="acquisition-muted">{recipe.materialCompleteness === "partial" ? "Known requirements only; other materials may be needed." : "Material requirements have not been established."}</p>}
        {materials.length ? <ul className="crafting-material-list">{materials.map((entry) => <MaterialProgress key={entry.requirement.materialId} entry={entry} saving={saving} save={(count) => change((next) => setCraftingMaterial(next, goal.recipeId, entry.requirement.materialId, count), "Material collection saved for this goal.")} />)}</ul> : <p className="acquisition-muted">No material requirements recorded.</p>}
      </div>
    </div>}
    <div className="crafting-finish">
      <label className="checkbox-option"><input type="checkbox" checked={goal.crafted} disabled={saving} onChange={(event) => void update({ crafted: event.target.checked }, "Crafting completion updated. Finished item acquisition stays separate.")} /><span>Item has been crafted<small>Record completion by you or the chosen crafter.</small></span></label>
      {wishlistEntry ? <label className="checkbox-option"><input type="checkbox" checked={acquired} disabled={saving} onChange={(event) => void change((next) => ({ ...next, acquisition: updateWishlistEntry(next.acquisition, wishlistEntry.id, { status: event.target.checked ? "acquired" : "wanted" }) }), "Finished item acquisition updated in the equipment wishlist.")} /><span>Finished item received<small>Updates the same item's Equipment Wishlist status.</small></span></label> : <div className="crafting-unlinked"><p className="acquisition-muted">No linked wishlist entry. Saved crafting progress remains here.</p>{item && <button className="secondary" disabled={saving} onClick={() => void change((next) => wishForRecipe(next, goal.recipeId), "Item restored to your equipment wishlist.")}>Add back to wishlist</button>}</div>}
    </div>
    <details className="crafting-notes"><summary>Personal crafting notes</summary><form className="acquisition-form" onSubmit={async (event) => { event.preventDefault(); await update({ notes }, "Crafting notes updated."); }}><label>Crafting notes<textarea value={notes} maxLength={4000} disabled={saving} onChange={(event) => setNotes(event.target.value)} /></label><button className="secondary" disabled={saving || notes === goal.notes}>Save crafting notes</button></form></details>
  </article>;
}

function MaterialProgress({ entry, saving, save }: { entry: CraftingGoalView["materials"][number]; saving: boolean; save: (count: number) => Promise<boolean> }) {
  const [count, setCount] = useState(String(entry.collected));
  useEffect(() => setCount(String(entry.collected)), [entry.collected]);
  const name = entry.material?.name || `Unresolved material · ${entry.requirement.materialId}`;
  const complete = entry.collected >= entry.requirement.quantity;
  return <li className={complete ? "is-complete" : ""}>
    <div className="crafting-material-heading"><strong>{name}</strong><span>{entry.collected}/{entry.requirement.quantity} collected</span></div>
    <div className="crafting-material-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, entry.collected / entry.requirement.quantity * 100)}%` }} /></div>
    <form onSubmit={async (event) => { event.preventDefault(); if (count !== "") await save(Number(count)); }}>
      <label><span className="sr-only">{name} collected</span><input aria-label={`${name} collected`} type="number" min="0" max="1000000" step="1" required value={count} disabled={saving} onChange={(event) => setCount(event.target.value)} /></label>
      <button className="secondary" disabled={saving || count === "" || Number(count) === entry.collected} aria-label={`Save ${name} collected`}>Save</button>
    </form>
  </li>;
}

function ManualCraftingForm({ saving, error, close, save }: { saving: boolean; error: string; close: () => void; save: (draft: ManualDraft) => Promise<void> }) {
  const [name, setName] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [profession, setProfessionName] = useState("");
  const [requiredSkill, setRequiredSkill] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [completeMaterials, setCompleteMaterials] = useState(false);
  const [materials, setMaterials] = useState<{ id: string; name: string; quantity: string }[]>([]);
  return <Modal title="Add personal crafting goal" close={close}>
    <form className="acquisition-form personal-crafting-form" onSubmit={async (event) => {
      event.preventDefault();
      await save({ name, ...(profession.trim() ? { profession } : {}), ...(recipeName.trim() ? { recipeName } : {}), ...(requiredSkill === "" ? {} : { requiredSkill: Number(requiredSkill) }), materials: materials.map((entry) => ({ name: entry.name, quantity: Number(entry.quantity) })), materialCompleteness: completeMaterials ? "complete" : materials.length ? "partial" : "unknown", notes, ...(referenceUrl ? { referenceUrl } : {}), ...(specialRequirements.trim() ? { specialRequirements } : {}) });
    }}>
      <p className="field-help">Your item, recipe and materials are labelled user-authored. Enter requirements you know; leave unknown information blank.</p>
      <label>Item name<input required value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></label>
      <label>Recipe name (optional)<input value={recipeName} maxLength={160} onChange={(event) => setRecipeName(event.target.value)} placeholder="Use the item name for this personal plan" /></label>
      <div className="acquisition-form-grid"><label>Required profession<input value={profession} maxLength={80} onChange={(event) => setProfessionName(event.target.value)} placeholder="Unknown" /></label><label>Required profession skill<input type="number" min="0" max="1000000" step="1" value={requiredSkill} onChange={(event) => setRequiredSkill(event.target.value)} placeholder="Unknown" /></label></div>
      <fieldset className="personal-materials"><legend>Personal material requirements</legend>
        {materials.length === 0 && <p className="field-help">No requirements recorded. Materials remain unknown.</p>}
        {materials.map((entry, index) => <div className="personal-material-row" key={entry.id}><label>Material {index + 1} name<input required maxLength={160} value={entry.name} onChange={(event) => setMaterials(materials.map((row) => row.id === entry.id ? { ...row, name: event.target.value } : row))} /></label><label>Required quantity<input required type="number" min="1" max="1000000" step="1" value={entry.quantity} onChange={(event) => setMaterials(materials.map((row) => row.id === entry.id ? { ...row, quantity: event.target.value } : row))} /></label><button className="secondary" type="button" aria-label={`Remove material ${index + 1}`} onClick={() => setMaterials(materials.filter((row) => row.id !== entry.id))}><Icon name="close" size={16} /></button></div>)}
        <button className="secondary" type="button" disabled={materials.length >= 50} onClick={() => setMaterials([...materials, { id: crypto.randomUUID(), name: "", quantity: "" }])}>Add material requirement</button>
        <label className="checkbox-option"><input type="checkbox" checked={completeMaterials} onChange={(event) => setCompleteMaterials(event.target.checked)} /><span>This is the complete material list for my personal plan</span></label>
      </fieldset>
      <label>Special crafting requirements<textarea maxLength={2000} value={specialRequirements} onChange={(event) => setSpecialRequirements(event.target.value)} placeholder="Optional; leave blank when unknown" /></label>
      <label>Recipe reference<input type="url" maxLength={2000} value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" /></label>
      <label>Crafting notes<textarea maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {error && <p role="alert" className="acquisition-error">{error}</p>}
      <div className="dialog-actions"><button className="secondary" type="button" disabled={saving} onClick={close}>Cancel</button><button className="primary" disabled={saving || !name.trim()}>Add crafting goal</button></div>
    </form>
  </Modal>;
}

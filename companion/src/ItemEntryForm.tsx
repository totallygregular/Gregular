import { useState } from "react";
import { Modal } from "./components";
import type { AcquisitionDataset, CharacterAcquisition, ItemRecord, ItemQuality, ManualItemDraft } from "./acquisitionTypes";
import { parseItemIdentity, itemIdentityKey, type ParsedItemIdentity } from "./itemIdentity";
import { ProviderInspector, useProviderIcons } from "./ItemPresentation";
import { Icon } from "./components";
import { statDefinitions, type ItemStatKey } from "./itemStats";
import type { TooltipProvider } from "./itemProviders";
import "./itemEntry.css";

const qualities: ItemQuality[] = ["unknown", "poor", "common", "uncommon", "rare", "epic", "legendary"];
export function ItemEntryForm({ data, state, saving, provider, setProvider, close, save, editing }: {
  data: AcquisitionDataset; state: CharacterAcquisition; saving: boolean;
  provider: TooltipProvider; setProvider: (provider: TooltipProvider) => void;
  close: () => void;
  save: (identity: ParsedItemIdentity | undefined, draft: ManualItemDraft) => Promise<boolean>;
  editing?: ItemRecord;
}) {
  const [input, setInput] = useState("");
  const [identity, setIdentity] = useState<ParsedItemIdentity | undefined>();
  const [error, setError] = useState("");
  const [name, setName] = useState(editing?.name ?? "");
  const [slot, setSlot] = useState(editing?.slot ?? "");
  const [equipmentType, setEquipmentType] = useState(editing?.equipmentType ?? "");
  const [level, setLevel] = useState(editing?.requiredLevel?.toString() ?? "");
  const [quality, setQuality] = useState<ItemQuality>(editing?.quality ?? "unknown");
  const [reference, setReference] = useState(editing?.evidence.url ?? "");
  const [notes, setNotes] = useState("");
  const [statValues, setStatValues] = useState<Partial<Record<ItemStatKey, string>>>(Object.fromEntries(Object.entries(editing?.numericStats?.values ?? {}).map(([key, value]) => [key, String(value)])));
  const [effects, setEffects] = useState(editing?.stats.filter(stat => stat.label === "Personal effect").map(stat => stat.value).join("\n") ?? "");
  const known = identity ? data.items.find(item => itemIdentityKey(item) === itemIdentityKey(identity)) : undefined;
  const originalPersonal = known ? state.manualItems.find(item => item.id === known.id || (itemIdentityKey(item) && itemIdentityKey(item) === itemIdentityKey(known))) : undefined;
  const duplicate = known && state.wishlist.some(entry => entry.itemId === known.id || itemIdentityKey(entry) === itemIdentityKey(identity!));
  const preview: ItemRecord | undefined = editing ?? known ?? (identity ? {
    id: `user:preview:${identity.gameId}`, ...identity, name: name.trim() || `Forever item #${identity.gameId}`,
    quality, slot: slot || undefined, requiredLevel: level ? Number(level) : undefined,
    stats: [], classRestrictions: [], sourceIds: [], evidence: { kind: "user-supplied", note: "Item identity supplied by you. Other details remain unknown." },
  } : undefined);
  const { icons, bridge } = useProviderIcons(provider, preview?.gameId ? [preview.gameId] : []);
  const editable = Boolean(editing || !known || (known.evidence.kind === "reviewed-forever" && !originalPersonal));
  function identify() {
    setError("");
    try {
      const parsed = parseItemIdentity(input);
      setIdentity(parsed);
      setName(""); setSlot(""); setEquipmentType(""); setLevel(""); setQuality("unknown"); setStatValues({}); setEffects("");
      setReference(parsed.referenceUrl ?? `https://foreverdb.net/item/${parsed.gameId}`);
    } catch (e) { setIdentity(undefined); setError(e instanceof Error ? e.message : "Enter a supported Forever item ID or link."); }
  }
  return <Modal title={editing ? "Edit personal details" : "Add item by ID or link"} close={close}>
    <div className="item-entry">
      {!editing && <form className="acquisition-form" onSubmit={e => { e.preventDefault(); identify(); }}>
        <p className="acquisition-muted">Bring an item from ForeverDB or Wowhead Forever into your plan. A numeric ID is always treated as WoW Forever.</p>
        <label>Item ID or Forever database link<input autoFocus required maxLength={2000} value={input} onChange={e => { setInput(e.target.value); setIdentity(undefined); setError(""); }} placeholder="273052 or https://foreverdb.net/item/273052" /></label>
        <button className="secondary" disabled={saving || !input.trim()}>Identify item</button>
      </form>}
      {error && <p className="acquisition-error" role="alert">{error}</p>}
      {preview && <>
        {bridge}
        <div className="item-entry-preview" role="status">
          <div className="equipment-card-heading"><span className="item-entry-icon" aria-hidden="true"><Icon name="equipment" size={32} />{preview.gameId && icons[preview.gameId] && <img src={icons[preview.gameId]} alt="" width="48" height="48" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = "none"; }} />}</span><div><p className="eyebrow">WoW Forever · Item ID {preview.gameId ?? "unknown"}</p><h3 className={`acquisition-quality-${preview.quality}`}>{preview.name}</h3></div></div>
          <p className="acquisition-muted">{preview.evidence.kind === "reviewed-forever" ? "Reviewed local metadata" : "Personal item · details are user supplied"} · {preview.slot ?? "Slot unknown"} · {preview.requiredLevel === undefined ? "Required level unknown" : `Requires level ${preview.requiredLevel}`} · {preview.quality}</p>
          {preview.stats.length > 0 && <ul>{preview.stats.map((stat, i) => <li key={i}>{stat.label}: {stat.value}</li>)}</ul>}
          {known?.evidence.kind === "reviewed-forever" && <p className="acquisition-muted">{known.evidence.note} <a href={known.evidence.url} target="_blank" rel="noreferrer">Reviewed source ↗</a></p>}
        </div>
        <label className="item-entry-service">Item details service<select value={provider} onChange={e => setProvider(e.target.value as TooltipProvider)}><option value="local">Local details only</option><option value="foreverdb">ForeverDB icons & tooltips</option></select></label>
        <ProviderInspector item={preview} provider={provider} />
        <p className="acquisition-muted">An ID or live tooltip does not verify equipment stats, required level or acquisition. Optional previews contact ForeverDB; local planning always works.</p>
        {duplicate && <p className="acquisition-notice" role="status">This item is already on this character's wishlist. Edit its details or source links there.</p>}
        {originalPersonal && !duplicate && <p className="acquisition-muted">Your existing personal record will be reused. Choose Edit personal details on the wishlist after adding it to change those saved details.</p>}
        <form className="acquisition-form" onSubmit={async e => {
          e.preventDefault(); setError("");
          const effectLines = effects.split("\n").map(value => value.trim()).filter(Boolean);
          const retainedStats = editing?.stats.filter(stat => stat.label !== "Personal effect") ?? [];
          if (effectLines.some(line => line.length > 1000) || effectLines.length + retainedStats.length > 40) {
            setError("Use at most 40 effects, with no more than 1,000 characters on each line."); return;
          }
          const values = Object.fromEntries(Object.entries(statValues).filter(([, value]) => value?.trim()).map(([key, value]) => [key, Number(value)]));
          const draft: ManualItemDraft = {
            name: name.trim() || (known ? "" : preview.name), slot: slot || undefined, equipmentType: equipmentType || undefined,
            requiredLevel: level ? Number(level) : undefined, quality, referenceUrl: reference || undefined, notes,
            numericStats: { values, completeness: "partial" },
            classRestrictions: editing?.classRestrictions ?? [],
            stats: [...retainedStats, ...effectLines.map(value => ({ label: "Personal effect", value }))],
          };
          try { if (!await save(identity, draft)) setError("Could not save item. Check the entered details and profile save status, then try again."); } catch (e) { setError(e instanceof Error ? e.message : "Could not save item."); }
        }}>
          {editable && <>
            <p className="acquisition-muted">Fill in what you know, or leave fields empty. These details stay personal and can be edited later. {known?.evidence.kind === "reviewed-forever" && "Optional personal details are kept separately from reviewed facts."}</p>
            <label>Personal item name<input autoFocus={Boolean(editing)} maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder={preview.name} /></label>
            <div className="acquisition-form-grid">
              <label>Equipment slot<input maxLength={80} value={slot} onChange={e => setSlot(e.target.value)} placeholder="Optional" /></label>
              <label>Equipment type<input maxLength={80} value={equipmentType} onChange={e => setEquipmentType(e.target.value)} placeholder="Optional" /></label>
              <label>Required level<input type="number" min="1" max="60" step="1" value={level} onChange={e => setLevel(e.target.value)} /></label>
              <label>Item quality<select value={quality} onChange={e => setQuality(e.target.value as ItemQuality)}>{qualities.map(q => <option key={q}>{q}</option>)}</select></label>
            </div>
            <details><summary>Personal numeric stats and special effects</summary><p className="acquisition-muted">Enter numeric bonuses explicitly. Blank means unknown; 0 means you supplied zero. Effects remain descriptive.</p>
              <div className="acquisition-form-grid">{statDefinitions.map(stat => <label key={stat.key}>{stat.label}{stat.unit === "%" ? " (%)" : ""}<input type="number" step="any" min="-1000000" max="1000000" value={statValues[stat.key] ?? ""} onChange={e => setStatValues(old => ({ ...old, [stat.key]: e.target.value }))} /></label>)}</div>
              <label>Special effects (one per line)<textarea maxLength={2000} value={effects} onChange={e => setEffects(e.target.value)} /><span className="field-help">Up to 1,000 characters per effect; 40 effects total.</span></label>
            </details>
            <label>External item reference<input type="url" maxLength={2000} value={reference} onChange={e => setReference(e.target.value)} /></label>
          </>}
          {!editing && <label>Personal acquisition notes<textarea maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} /></label>}
          {!editable && <p className="acquisition-muted">The shared record is reused. Your notes and source links belong to this character.</p>}
          <p className="acquisition-muted">Attach a quest, dungeon, crafting or personal source from the wishlist after saving.</p>
          <div className="dialog-actions"><button type="button" className="secondary" onClick={close} disabled={saving}>Cancel</button><button className="primary" disabled={saving || Boolean(duplicate)}>{editing ? "Save personal details" : "Add to wishlist"}</button></div>
        </form>
      </>}
    </div>
  </Modal>;
}

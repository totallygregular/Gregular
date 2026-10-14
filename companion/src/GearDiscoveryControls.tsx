import type { Character } from "./domain";
import type { GearSearchOptions } from "./gearSearch";
import { statDefinitions, statPresets, type ItemStatKey } from "./itemStats";
import "./gearDiscovery.css";

export type GearScope = "anywhere" | "route" | "nearby";

export function GearDiscoveryControls({ character, options, onChange, scope, onScope, includeUnknownLocations, onUnknownLocations }: {
  character: Character;
  options: GearSearchOptions;
  onChange: (next: GearSearchOptions) => void;
  scope: GearScope;
  onScope: (value: GearScope) => void;
  includeUnknownLocations: boolean;
  onUnknownLocations: (value: boolean) => void;
}) {
  const criteria = options.stats ?? [];
  const presetId = statPresets.find(preset => preset.stats.length === criteria.length && criteria.every(s => s.minimum === undefined && preset.stats.includes(s.key)))?.id ?? "";
  const update = (key: ItemStatKey, selected: boolean) => onChange({ ...options, stats: selected ? [...criteria, { key }] : criteria.filter(s => s.key !== key) });
  const minimum = (key: ItemStatKey, value: string) => onChange({ ...options, stats: criteria.map(s => s.key === key ? { key, ...(value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? { minimum: Number(value) } : {}) } : s) });
  const level = options.level ?? { mode: "all" as const };
  const commonKeys: ItemStatKey[] = ["intellect", "spirit", "stamina", "healingPower", "spellDamage"];
  const renderStat = (stat: (typeof statDefinitions)[number]) => {
    const selected = criteria.find(s => s.key === stat.key);
    return <div className={`gear-stat-option ${selected ? "is-selected" : ""}`} key={stat.key}>
      <label className="gear-checkbox"><input type="checkbox" checked={Boolean(selected)} onChange={e => update(stat.key, e.target.checked)} />{stat.label}</label>
      {selected && <label className="gear-minimum">Minimum{stat.unit === "%" ? " (%)" : ""}<input aria-label={`Minimum ${stat.label}`} type="number" min="0" max="1000000" step="any" placeholder="Any positive value" value={selected.minimum ?? ""} onChange={e => minimum(stat.key, e.target.value)} /></label>}
    </div>;
  };
  return <div className="gear-discovery-controls">
    <fieldset className="gear-stats-fieldset">
      <legend>Desired statistics</legend>
      <div className="gear-stat-toolbar">
        <label>Stat preset<select aria-label="Stat preset" value={presetId} onChange={e => {
          const preset = statPresets.find(p => p.id === e.target.value);
          if (preset) onChange({ ...options, stats: preset.stats.map(key => ({ key })) });
        }}><option value="">{criteria.length ? "Custom selection" : "Choose a starting point"}</option>{statPresets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label>Stat matching<select aria-label="Stat matching" value={options.statMode ?? "any"} onChange={e => onChange({ ...options, statMode: e.target.value as "any" | "all" })}><option value="any">Match ANY selected stat</option><option value="all">Match ALL selected stats</option></select></label>
        <button type="button" className="text-button" onClick={() => onChange({ ...options, stats: [] })} disabled={!criteria.length}>Clear stats</button>
      </div>
      <p className="acquisition-muted">Presets select broad goals. Customise any stat; they do not rank overall item power.</p>
      <div className="gear-stat-options is-primary">{commonKeys.map(key => renderStat(statDefinitions.find(stat => stat.key === key)!))}</div>
      <details className="equipment-extra-filters" open={criteria.some(s => !commonKeys.includes(s.key)) || undefined}><summary>More statistics · physical, armor and regeneration</summary><div className="gear-stat-options">{statDefinitions.filter(stat => !commonKeys.includes(stat.key)).map(renderStat)}</div></details>
      <label className="gear-checkbox gear-incomplete"><input type="checkbox" checked={options.includeIncomplete ?? false} onChange={e => onChange({ ...options, includeIncomplete: e.target.checked })} />Include incomplete stat, level or restriction records separately</label>
    </fieldset>
    <div className="gear-context-filters">
      <label>Required level window<select aria-label="Required level window" value={level.mode} onChange={e => onChange({ ...options, level: { mode: e.target.value as typeof level.mode } })}>
        <option value="all">All levels</option><option value="current">Now · level ≤ {character.level}</option><option value="plus5">+5 levels · ≤ {Math.min(60, character.level + 5)}</option><option value="plus10">+10 levels · ≤ {Math.min(60, character.level + 10)}</option><option value="custom">Custom level range</option>
      </select></label>
      <label>Source scope<select aria-label="Source scope" value={scope} onChange={e => onScope(e.target.value as GearScope)}><option value="anywhere">Anywhere</option><option value="route">My Route</option><option value="nearby">My Route + Nearby</option></select></label>
      <label>Sort equipment<select aria-label="Sort equipment" value={options.sort ?? "match"} onChange={e => onChange({ ...options, sort: e.target.value as GearSearchOptions["sort"] })}><option value="match">Best stat match</option><option value="route">Relevant to my route</option><option value="level">Required level</option><option value="quality">Item quality</option><option value="name">Alphabetical</option><option value="stat" disabled={!criteria.length}>Highest selected stat value</option></select></label>
      <label>Class restrictions · {character.className}<select aria-label="Class restrictions" value={options.classMode ?? "exclude-known-incompatible"} onChange={e => onChange({ ...options, classMode: e.target.value as GearSearchOptions["classMode"] })}><option value="exclude-known-incompatible">Hide known incompatible restrictions</option><option value="confirmed-only">Known matching restrictions only</option><option value="all">All / unknown restrictions</option></select></label>
      {level.mode === "custom" && <><label>Minimum required level<input type="number" min="1" max="60" value={level.min ?? ""} onChange={e => onChange({ ...options, level: { ...level, min: e.target.value ? Number(e.target.value) : undefined } })} /></label><label>Custom maximum required level<input type="number" min="1" max="60" value={level.max ?? ""} onChange={e => onChange({ ...options, level: { ...level, max: e.target.value ? Number(e.target.value) : undefined } })} /></label></>}
      {options.sort === "stat" && <label>Stat to sort by<select aria-label="Stat to sort by" value={options.sortStat && criteria.some(c => c.key === options.sortStat) ? options.sortStat : criteria[0]?.key ?? ""} onChange={e => onChange({ ...options, sortStat: e.target.value as ItemStatKey })}>{criteria.map(s => <option key={s.key} value={s.key}>{statDefinitions.find(d => d.key === s.key)?.label}</option>)}</select></label>}
    </div>
    {scope !== "anywhere" && <label className="gear-checkbox gear-incomplete"><input type="checkbox" checked={includeUnknownLocations} onChange={e => onUnknownLocations(e.target.checked)} />Include unknown acquisition locations separately</label>}
    <details className="equipment-extra-filters gear-discovery-help"><summary>How discovery handles missing data and travel</summary><p className="acquisition-muted">A missing stat is unknown unless the numeric record is explicitly complete. Unknown values never meet a minimum. Required level is separate from item level and source activity level. Class restrictions do not establish armor or weapon training; choose desired equipment types manually below.</p><p className="acquisition-muted">Nearby means one supported directed graph connection from a pending or active route stop, with known faction access and satisfied travel requirements. Flights need recorded unlocks. Travel evidence may be provisional; no exact duration is estimated. Quest pickup, objectives and dungeon region alone do not establish where an item is obtained.</p><p className="acquisition-muted">Best match compares confirmed matching stat counts, then missing information and route relevance. It never adds unlike stats into an item-power score. The live tooltip may differ from this pinned search catalogue.</p></details>
  </div>;
}

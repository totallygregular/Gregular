import { useEffect, useId, useRef, useState } from "react";
import type { ItemRecord } from "./acquisitionTypes";
import { Icon } from "./components";
import { permittedIcon, providerFrame, type TooltipProvider } from "./itemProviders";
import { isForeverItemIdentity } from "./itemIdentity";
import "./itemPresentation.css";

export function useProviderIcons(provider: TooltipProvider, ids: number[]) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [icons, setIcons] = useState<Record<number, string>>({});
  const key = ids.join(",");
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "gregular-icon" || !ids.includes(event.data.id)) return;
      const url = permittedIcon(event.data.url);
      if (url) setIcons(old => ({ ...old, [event.data.id]: url }));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [key]);
  return { icons: provider === "foreverdb" ? icons : {}, bridge: provider === "foreverdb" ? <iframe ref={frame} title="Optional item icon service" src={providerFrame("foreverdb", ids, true)} sandbox="allow-scripts" referrerPolicy="no-referrer" className="item-icon-bridge" aria-hidden="true" tabIndex={-1} /> : null };
}

export function ItemPortrait({ item, icon, inspect }: { item: ItemRecord; icon?: string; inspect: (item: ItemRecord) => void }) {
  const [failed, setFailed] = useState(false);
  const [peek, setPeek] = useState(false);
  const id = useId();
  useEffect(() => setFailed(false), [icon]);
  return <div className="item-portrait-wrap" onMouseEnter={() => setPeek(true)} onMouseLeave={() => setPeek(false)}>
    <button type="button" className={`item-portrait acquisition-quality-${item.quality}`} aria-label={`Inspect ${item.name}`} aria-describedby={peek ? id : undefined} onFocus={() => setPeek(true)} onBlur={() => setPeek(false)} onKeyDown={e => { if (e.key === "Escape") { setPeek(false); e.stopPropagation(); } }} onClick={() => { setPeek(false); inspect(item); }}>
      {icon && !failed ? <img src={icon} alt="" width="48" height="48" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} /> : <span className="item-placeholder"><Icon name="equipment" size={28} /><small>No icon</small></span>}
    </button>
    {peek && <div role="tooltip" id={id} className="item-local-tooltip"><strong className={`acquisition-quality-${item.quality}`}>{item.name}</strong><span>{item.quality} · {item.slot || "Slot unknown"}</span><span>{item.requiredLevel === undefined ? "Required level unknown" : `Requires level ${item.requiredLevel}`}</span>{item.stats.slice(0, 4).map((s, i) => <span key={i}>{s.label}: {s.value}</span>)}<small>Activate to inspect sources and full details.</small></div>}
  </div>;
}

export function ProviderInspector({ item, provider }: { item: ItemRecord; provider: TooltipProvider }) {
  if (provider === "local" || !item.gameId || !isForeverItemIdentity(item)) return <p className="acquisition-muted">Local details are available below. Select an optional tooltip service in Equipment for provider details.</p>;
  return <div className="provider-inspector"><iframe title={`${provider} tooltip for ${item.name}`} src={providerFrame(provider, [item.gameId])} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" /><p className="acquisition-muted">Live provider details are separate from saved local facts and personal notes. <a href={provider === "foreverdb" ? "https://foreverdb.net/embed" : "https://wow-forever.gg/developers/#tooltips"} target="_blank" rel="noreferrer">Tooltips by {provider === "foreverdb" ? "ForeverDB" : "wow-forever.gg"} ↗</a></p></div>;
}

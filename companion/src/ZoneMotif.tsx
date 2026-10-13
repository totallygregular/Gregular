import type { ZoneRecord } from "./data/zones";
import "./zoneMotif.css";

export type ZoneMotifKind =
  | "forest"
  | "farmland"
  | "reeds"
  | "mountains"
  | "coast"
  | "desert"
  | "atlas";

/**
 * Original decorative journal motifs, not maps or verified terrain data.
 * Keep assignments explicit: new/unmapped destinations get a neutral compass,
 * rather than inferring geography from a name, continent or provisional record.
 */
const motifsBySlug: Readonly<Record<string, ZoneMotifKind>> = {
  "elwynn-forest": "forest",
  "dun-morogh": "mountains",
  teldrassil: "forest",
  durotar: "desert",
  mulgore: "farmland",
  "tirisfal-glades": "forest",
  westfall: "farmland",
  "loch-modan": "mountains",
  darkshore: "coast",
  "silverpine-forest": "forest",
  "the-barrens": "desert",
  "redridge-mountains": "mountains",
  "stonetalon-mountains": "mountains",
  ashenvale: "forest",
  wetlands: "reeds",
  duskwood: "forest",
  "hillsbrad-foothills": "farmland",
  "thousand-needles": "desert",
  "alterac-mountains": "mountains",
  "arathi-highlands": "farmland",
  "stranglethorn-vale": "forest",
  desolace: "desert",
  "dustwallow-marsh": "reeds",
  badlands: "desert",
  "swamp-of-sorrows": "reeds",
  "the-hinterlands": "mountains",
  feralas: "forest",
  tanaris: "desert",
  "searing-gorge": "mountains",
  "blasted-lands": "desert",
  azshara: "coast",
  felwood: "forest",
  "ungoro-crater": "forest",
  "western-plaguelands": "farmland",
  "burning-steppes": "mountains",
  "eastern-plaguelands": "forest",
  winterspring: "mountains",
  silithus: "desert",
  "deadwind-pass": "mountains",
  moonglade: "forest",
};

export function zoneMotifFor(zone?: Pick<ZoneRecord, "id">): ZoneMotifKind {
  const prefix = "forever:zone:";
  if (!zone?.id.startsWith(prefix)) return "atlas";
  const slug = zone.id.slice(prefix.length);
  return Object.hasOwn(motifsBySlug, slug) ? motifsBySlug[slug] : "atlas";
}

function MotifDrawing({ kind }: { kind: ZoneMotifKind }) {
  switch (kind) {
    case "forest":
      return (
        <>
          <path className="motif-wash" d="M0 48Q24 30 48 43T96 37T140 43V62H0Z" />
          <path className="motif-silhouette" d="m27 14-11 19h6l-12 15h34L32 33h6Zm39 8-9 17h5l-9 12h26L70 39h5Zm37-14L90 32h7L83 51h40l-14-19h7Z" />
          <path className="motif-line" d="M27 40v15m39-10v11m37-17v17M7 56q33-5 64 0t62-1" />
        </>
      );
    case "farmland":
      return (
        <>
          <path className="motif-wash" d="M0 35Q32 14 67 34t73-9v37H0Z" />
          <path className="motif-silhouette" d="M0 48Q40 24 78 45t62-1v18H0Z" />
          <path className="motif-line" d="M1 50q40-23 80-5t58 0M7 59q42-23 83-7m-53 9q28-13 58-6m8-4V16m0 22q-11-2-11-12 11 2 11 12Zm0-9q9-3 9-11-9 2-9 11Zm0 17q11-2 11-11-11 1-11 11ZM103 22q-6-6 0-12 6 6 0 12Z" />
        </>
      );
    case "reeds":
      return (
        <>
          <path className="motif-wash" d="M0 43q31-8 65 0t75-4v23H0Z" />
          <path className="motif-line" d="M4 49h48m12-2h30m13 3h28M18 57h46m18-1h36M34 51V23m0 19Q19 31 18 39m16-2q12-16 16-10m-16-7v10m-5-12h10M86 49V15m0 22q-15-15-16-6m16 9q13-16 16-11M82 13h8m-4-5v16m24 26V28m0 13q-10-10-12-4m12-8v7" />
          <path className="motif-silhouette" d="M31 16h6v12h-6Zm52-9h6v13h-6Zm24 17h6v10h-6Z" />
        </>
      );
    case "mountains":
      return (
        <>
          <path className="motif-wash" d="m0 49 28-32 23 27 24-20 28 27 19-21 18 20v12H0Z" />
          <path className="motif-silhouette" d="m8 56 50-48 47 48Zm70 0 31-35 28 35Z" />
          <path className="motif-line" d="m38 27 11 4 9-11 8 9 7-4M58 8l3 31 16 17m22-23 10 5 6-6M7 57h129" />
        </>
      );
    case "coast":
      return (
        <>
          <circle className="motif-wash" cx="105" cy="19" r="10" />
          <path className="motif-silhouette" d="M0 36q18-1 34 9t31 9l-7 8H0Z" />
          <path className="motif-line" d="M55 36q10-5 20 0t20 0t20 0t20 0M36 44q10-5 20 0t20 0t20 0t20 0t20 0M62 53q10-5 20 0t20 0t20 0m-111-23 7-3 7 3m13-8 5-2 5 2" />
        </>
      );
    case "desert":
      return (
        <>
          <circle className="motif-wash" cx="96" cy="17" r="10" />
          <path className="motif-wash" d="M0 42q29-25 59-5t81-6v31H0Z" />
          <path className="motif-silhouette" d="M0 55q42-29 81-6t59-1v14H0Z" />
          <path className="motif-line" d="M1 54q42-27 80-5t58-1M18 61q27-12 50-8m42 4 14-2" />
        </>
      );
    default:
      return (
        <>
          <path className="motif-line motif-guide" d="M8 31h124M70 4v54M24 9l92 44M24 53l92-44" />
          <circle className="motif-line" cx="70" cy="31" r="22" />
          <circle className="motif-line" cx="70" cy="31" r="16" />
          <path className="motif-silhouette" d="m70 8 5 18 18 5-18 5-5 18-5-18-18-5 18-5Z" />
          <path className="motif-line" d="m70 8-5 28 28-5m-23 23 5-28-28 5" />
        </>
      );
  }
}

export function ZoneMotif({ zone }: { zone?: ZoneRecord }) {
  const kind = zoneMotifFor(zone);
  return (
    <span className="zone-motif" data-motif={kind} aria-hidden="true">
      <svg viewBox="0 0 140 62" focusable="false" aria-hidden="true">
        <MotifDrawing kind={kind} />
      </svg>
    </span>
  );
}

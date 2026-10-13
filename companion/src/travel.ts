import {
  classicRoadPairs,
  evidence,
  getZone,
  zoneCatalogue,
  zoneId,
  type EvidenceKind,
  type FieldEvidence,
} from "./data/zones";

export type TravelDifficulty = "easy" | "moderate" | "long" | "unknown";
export type TransportType =
  | "walking"
  | "road"
  | "flight"
  | "boat"
  | "zeppelin"
  | "tram"
  | "airship"
  | "other";
export interface TravelNode {
  id: string;
  name: string;
  continent: string;
}
export interface TravelEdge {
  id: string;
  from: string;
  to: string;
  /** Each edge is directed; reverse service must have its own edge. */
  transport: TransportType;
  factions: string[];
  prerequisites: string[];
  requiredUnlocks: string[];
  evidence: FieldEvidence;
  factionEvidence: FieldEvidence;
  note?: string;
}
export interface TravelCapabilities {
  /** No discovered paths, teleports or unlocks are assumed when absent. */
  discoveredFlightPaths?: readonly string[];
  unlocks?: readonly string[];
  completedPrerequisites?: readonly string[];
  /** Reserved for future character-specific routing; currently not scored. */
  hearthstoneZoneId?: string;
  knownTeleports?: readonly string[];
  classTravelAbilities?: readonly string[];
}
export interface TravelResult {
  difficulty: TravelDifficulty;
  label: string;
  explanation: string;
  path: string[];
  edges: TravelEdge[];
  score: number | null;
  provisional: boolean;
  confidence: EvidenceKind;
  sourceIds: string[];
}
export const travelWeights: Record<TransportType, number> = {
  walking: 1,
  road: 2,
  flight: 2,
  tram: 3,
  boat: 5,
  zeppelin: 5,
  airship: 6,
  other: 6,
};
export const CROSS_CONTINENT_WEIGHT = 4;
export const travelMetadata = {
  version: "forever-travel-2026-10-13.1",
  reviewedAt: "2026-10-13",
  scoring:
    "Relative overhead only, never minutes. Each edge weight plus 4 when continents change. Equal scores resolve by ASCII edge ID sequence.",
};

const cityId = (slug: string) => `forever:city:${slug}`;
export const travelNodes: TravelNode[] = [
  ...zoneCatalogue.map(({ id, name, continent }) => ({ id, name, continent })),
  {
    id: cityId("stormwind"),
    name: "Stormwind Harbor",
    continent: "Eastern Kingdoms",
  },
  { id: cityId("ironforge"), name: "Ironforge", continent: "Eastern Kingdoms" },
  { id: cityId("orgrimmar"), name: "Orgrimmar", continent: "Kalimdor" },
  { id: cityId("undercity"), name: "Undercity", continent: "Eastern Kingdoms" },
  { id: cityId("thunder-bluff"), name: "Thunder Bluff", continent: "Kalimdor" },
  {
    id: "forever:pass:blackrock-mountain",
    name: "Blackrock Mountain",
    continent: "Eastern Kingdoms",
  },
];

function edge(
  from: string,
  to: string,
  transport: TransportType,
  source: string,
  kind: EvidenceKind,
  factions = ["Alliance", "Horde"],
  requiredUnlocks: string[] = [],
  prerequisites: string[] = [],
): TravelEdge {
  return {
    id: `${transport}:${from}>${to}`,
    from,
    to,
    transport,
    factions,
    requiredUnlocks,
    prerequisites,
    evidence: evidence(
      kind,
      [source],
      kind === "classic-derived"
        ? "Explicit Classic Era connection; Forever traversal is provisional."
        : kind === "forever-confirmed"
          ? "Connection announced by Blizzard; service direction and faction use community client reporting. Not independently tested in gameplay."
          : "Transport reported from the Forever client; service not independently tested in gameplay.",
    ),
    factionEvidence: evidence(
      kind === "forever-confirmed" ? "client-derived" : kind,
      [kind === "forever-confirmed" ? "foreverdb-travel" : source],
      "Service faction is a routing constraint; territory alone is not an entry restriction.",
    ),
  };
}
function pair(
  from: string,
  to: string,
  transport: TransportType,
  source: string,
  kind: EvidenceKind,
  factions?: string[],
  requiredUnlocks?: string[],
  prerequisites?: string[],
): TravelEdge[] {
  return [
    edge(
      from,
      to,
      transport,
      source,
      kind,
      factions,
      requiredUnlocks,
      prerequisites,
    ),
    edge(
      to,
      from,
      transport,
      source,
      kind,
      factions,
      requiredUnlocks,
      prerequisites,
    ),
  ];
}

/** Curated edges. No route is inferred from map coordinates or proximity. */
export const travelEdges: TravelEdge[] = [
  ...classicRoadPairs.flatMap(([a, b]) =>
    pair(
      zoneId(a),
      zoneId(b),
      "walking",
      "libtourist-classic",
      "classic-derived",
    ),
  ),
  ...pair(
    zoneId("elwynn-forest"),
    cityId("stormwind"),
    "walking",
    "libtourist-classic",
    "classic-derived",
    ["Alliance"],
  ),
  ...pair(
    zoneId("dun-morogh"),
    cityId("ironforge"),
    "walking",
    "libtourist-classic",
    "classic-derived",
    ["Alliance"],
  ),
  ...pair(
    zoneId("durotar"),
    cityId("orgrimmar"),
    "walking",
    "libtourist-classic",
    "classic-derived",
    ["Horde"],
  ),
  ...pair(
    zoneId("the-barrens"),
    cityId("orgrimmar"),
    "walking",
    "libtourist-classic",
    "classic-derived",
    ["Horde"],
  ),
  ...pair(
    zoneId("tirisfal-glades"),
    cityId("undercity"),
    "walking",
    "libtourist-classic",
    "classic-derived",
    ["Horde"],
  ),
  ...pair(
    zoneId("mulgore"),
    cityId("thunder-bluff"),
    "walking",
    "libtourist-classic",
    "classic-derived",
    ["Horde"],
  ),
  ...pair(
    zoneId("searing-gorge"),
    "forever:pass:blackrock-mountain",
    "walking",
    "libtourist-classic",
    "classic-derived",
  ),
  ...pair(
    zoneId("burning-steppes"),
    "forever:pass:blackrock-mountain",
    "walking",
    "libtourist-classic",
    "classic-derived",
  ),
  ...pair(
    cityId("stormwind"),
    zoneId("darkshore"),
    "boat",
    "blizzard-found-photos",
    "forever-confirmed",
    ["Alliance"],
  ),
  edge(
    zoneId("wetlands"),
    zoneId("hillsbrad-foothills"),
    "boat",
    "blizzard-found-photos",
    "forever-confirmed",
    ["Alliance"],
  ),
  edge(
    zoneId("hillsbrad-foothills"),
    zoneId("darkshore"),
    "boat",
    "blizzard-found-photos",
    "forever-confirmed",
    ["Alliance"],
  ),
  ...pair(
    zoneId("tanaris"),
    zoneId("riverglades"),
    "boat",
    "blizzard-found-photos",
    "forever-confirmed",
  ),
  ...pair(
    zoneId("teldrassil"),
    zoneId("darkshore"),
    "boat",
    "foreverdb-travel",
    "client-derived",
    ["Alliance"],
  ),
  ...pair(
    zoneId("wetlands"),
    zoneId("darkshore"),
    "boat",
    "foreverdb-travel",
    "client-derived",
    ["Alliance"],
  ),
  ...pair(
    zoneId("wetlands"),
    zoneId("dustwallow-marsh"),
    "boat",
    "foreverdb-travel",
    "client-derived",
    ["Alliance"],
  ),
  ...pair(
    zoneId("the-barrens"),
    zoneId("stranglethorn-vale"),
    "boat",
    "foreverdb-travel",
    "client-derived",
  ),
  ...pair(
    zoneId("durotar"),
    zoneId("tirisfal-glades"),
    "zeppelin",
    "foreverdb-travel",
    "client-derived",
    ["Horde"],
  ),
  ...pair(
    zoneId("durotar"),
    zoneId("stranglethorn-vale"),
    "zeppelin",
    "foreverdb-travel",
    "client-derived",
    ["Horde"],
  ),
  ...pair(
    zoneId("tirisfal-glades"),
    zoneId("stranglethorn-vale"),
    "zeppelin",
    "foreverdb-travel",
    "client-derived",
    ["Horde"],
  ),
  ...pair(
    cityId("stormwind"),
    cityId("ironforge"),
    "tram",
    "foreverdb-travel",
    "client-derived",
    ["Alliance"],
  ),
  // The reported 3-stop Menethil→Southshore→Auberdine service is directed above;
  // no reverse regional legs are inferred. Existing Menethil↔Auberdine is separate.
  // Conservative: the direction of new Zephras services and their access prerequisites are unresolved.
  ...pair(
    zoneId("westfall"),
    cityId("stormwind"),
    "flight",
    "foreverdb-travel",
    "client-derived",
    ["Alliance"],
    ["flight:sentinel-hill", "flight:stormwind"],
    ["flight:sentinel-hill", "flight:stormwind"],
  ),
  // Loch Modan–Searing Gorge gate and Timbermaw passages are omitted until
  // access requirements are documented; map adjacency alone does not add an edge.
];

function compareAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
const labels: Record<TravelDifficulty, string> = {
  easy: "Easy travel",
  moderate: "Moderate travel",
  long: "Long travel",
  unknown: "Travel unknown",
};
function unknown(explanation = "Travel route not verified."): TravelResult {
  return {
    difficulty: "unknown",
    label: labels.unknown,
    explanation,
    path: [],
    edges: [],
    score: null,
    provisional: true,
    confidence: "unknown",
    sourceIds: [],
  };
}
const evidenceOrder: EvidenceKind[] = [
  "unknown",
  "editorial",
  "classic-derived",
  "client-derived",
  "forever-confirmed",
];

/** Deterministic Dijkstra over directed, faction-eligible, explicitly unlocked edges. */
export function findTravel(
  fromId: string | undefined,
  toId: string,
  faction: string,
  capabilities: TravelCapabilities = {},
  graph: readonly TravelEdge[] = travelEdges,
  nodes: readonly TravelNode[] = travelNodes,
): TravelResult {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  if (!fromId) return unknown("Choose a previous stop to compare travel.");
  if (!nodeMap.has(fromId) || !nodeMap.has(toId)) return unknown();
  if (faction !== "Alliance" && faction !== "Horde")
    return unknown("Choose a faction to verify travel access.");
  if (fromId === toId)
    return {
      difficulty: "easy",
      label: labels.easy,
      explanation: "Same zone · Return visit.",
      path: [fromId],
      edges: [],
      score: 0,
      provisional: false,
      confidence: "forever-confirmed",
      sourceIds: [],
    };
  const unlocks = new Set([
    ...(capabilities.unlocks ?? []),
    ...(capabilities.discoveredFlightPaths ?? []).map((path) =>
      path.startsWith("flight:") ? path : `flight:${path}`,
    ),
  ]);
  const completedPrerequisites = new Set([
    ...unlocks,
    ...(capabilities.completedPrerequisites ?? []),
  ]);
  const available = graph
    .filter(
      (connection) =>
        connection.factions.includes(faction) &&
        connection.evidence.kind !== "unknown" &&
        connection.factionEvidence.kind !== "unknown" &&
        (connection.transport !== "flight" ||
          connection.requiredUnlocks.length >= 2) &&
        connection.requiredUnlocks.every((unlock) => unlocks.has(unlock)) &&
        connection.prerequisites.every((prerequisite) =>
          completedPrerequisites.has(prerequisite),
        ) &&
        nodeMap.has(connection.from) &&
        nodeMap.has(connection.to),
    )
    .slice()
    .sort((a, b) => compareAscii(a.id, b.id));
  type Candidate = {
    node: string;
    score: number;
    key: string;
    edges: TravelEdge[];
    path: string[];
  };
  const queue: Candidate[] = [
    { node: fromId, score: 0, key: "", edges: [], path: [fromId] },
  ];
  const best = new Map<string, { score: number; key: string }>([
    [fromId, { score: 0, key: "" }],
  ]);
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score || compareAscii(a.key, b.key));
    const current = queue.shift()!;
    const saved = best.get(current.node)!;
    if (current.score !== saved.score || current.key !== saved.key) continue;
    if (current.node === toId) {
      const crossContinent = current.edges.some(
        (connection) =>
          nodeMap.get(connection.from)!.continent !==
          nodeMap.get(connection.to)!.continent,
      );
      const transportEdges = current.edges.filter(
        (connection) =>
          connection.transport !== "walking" && connection.transport !== "road",
      );
      const difficulty: TravelDifficulty =
        crossContinent || current.score > 6 || transportEdges.length > 1
          ? "long"
          : current.edges.length === 1 && current.score <= 2
            ? "easy"
            : "moderate";
      const kinds = current.edges.flatMap((connection) => [
        connection.evidence.kind,
        connection.factionEvidence.kind,
      ]);
      const confidence =
        evidenceOrder.find((kind) => kinds.includes(kind)) ?? "unknown";
      const provisional = kinds.some((kind) => kind !== "forever-confirmed");
      const modes = new Set(
        transportEdges.map((connection) => connection.transport),
      );
      const parts: string[] = [];
      if (crossContinent) parts.push("Cross-continent travel");
      if (modes.has("boat")) parts.push("Boat required");
      if (modes.has("zeppelin")) parts.push("Zeppelin required");
      if (modes.has("tram")) parts.push("Tram required");
      if (modes.has("airship")) parts.push("Airship required");
      if (modes.has("flight")) parts.push("Discovered flight points required");
      if (!transportEdges.length)
        parts.push(
          current.edges.length === 1
            ? "Adjacent zone"
            : `Via ${current.edges.length} road connections`,
        );
      if (transportEdges.length > 1) parts.push("Multiple transport legs");
      if (confidence === "classic-derived")
        parts.push("Classic-derived connection.");
      else if (provisional)
        parts.push("Client-derived service; verify in game.");
      else parts.push("Announced Forever connection.");
      return {
        difficulty,
        label: labels[difficulty],
        explanation: parts.join(" · "),
        path: current.path,
        edges: current.edges,
        score: current.score,
        provisional,
        confidence,
        sourceIds: [
          ...new Set(
            current.edges.flatMap((connection) => [
              ...connection.evidence.sourceIds,
              ...connection.factionEvidence.sourceIds,
            ]),
          ),
        ],
      };
    }
    for (const connection of available) {
      if (connection.from !== current.node) continue;
      const cross =
        nodeMap.get(connection.from)!.continent !==
        nodeMap.get(connection.to)!.continent;
      const score =
        current.score +
        travelWeights[connection.transport] +
        (cross ? CROSS_CONTINENT_WEIGHT : 0);
      const key = `${current.key}|${connection.id}`;
      const old = best.get(connection.to);
      if (
        !old ||
        score < old.score ||
        (score === old.score && compareAscii(key, old.key) < 0)
      ) {
        best.set(connection.to, { score, key });
        queue.push({
          node: connection.to,
          score,
          key,
          edges: [...current.edges, connection],
          path: [...current.path, connection.to],
        });
      }
    }
  }
  return unknown(
    "Travel route not verified; required connections or unlocks are unresolved.",
  );
}

/** Recompute from saved order, including repeated visits. No travel result is persisted. */
export function travelForRoute(
  zoneIds: readonly (string | undefined)[],
  faction: string,
  capabilities: TravelCapabilities = {},
): TravelResult[] {
  return zoneIds.map((id, index) =>
    id
      ? findTravel(
          index ? zoneIds[index - 1] : undefined,
          id,
          faction,
          capabilities,
        )
      : unknown(),
  );
}

export function travelPathNames(result: TravelResult): string[] {
  return result.path.map(
    (id) =>
      getZone(id)?.name ??
      travelNodes.find((node) => node.id === id)?.name ??
      id,
  );
}

import type {
  AcquisitionDataset,
  AcquisitionEvidence,
  AcquisitionMethod,
  AcquisitionSource,
  ItemRecord,
  SourceLocationRole,
} from "./acquisitionTypes";
import type { Character } from "./domain";
import { getSelectedSource, resolveAcquisition } from "./acquisition";
import { resolveEntryZone } from "./routeProgress";
import {
  findTravel,
  travelEdges,
  travelNodes,
  type TravelCapabilities,
  type TravelEdge,
  type TravelNode,
  type TravelResult,
} from "./travel";

export type GearRouteClassification = "direct" | "nearby" | "elsewhere" | "unknown";
export type GearRouteScope = "anywhere" | "route" | "nearby";
export type GearLocationRole = SourceLocationRole;

/**
 * Field-specific location facts, separate from personal profile data. A future
 * permitted index adapter can provide these without changing route search.
 * nodeId uses the existing travel graph; coordinates never create connections.
 */
export interface GearSourceLocation {
  sourceId: string;
  role: GearLocationRole;
  nodeId?: string;
  name?: string;
  certainty: "known" | "unknown";
  evidence: AcquisitionEvidence;
  /** Missing faction coverage does not assert unrestricted dungeon entrances. */
  factions?: readonly string[];
  /** Entrances with unresolved access requirements cannot qualify as nearby. */
  access?: "known" | "unknown";
  prerequisites?: readonly string[];
  requiredUnlocks?: readonly string[];
}

export interface GearRouteOptions {
  /** Route and method filters must match the same acquisition source. */
  acquisitionMethod?: AcquisitionMethod;
  locations?: readonly GearSourceLocation[];
  graph?: readonly TravelEdge[];
  nodes?: readonly TravelNode[];
  capabilities?: TravelCapabilities;
}

export interface GearLocationRelevance {
  classification: GearRouteClassification;
  label: string;
  explanation: string;
  sourceId: string;
  role: GearLocationRole;
  locationName?: string;
  nodeId?: string;
  routeEntryId?: string;
  routeIndex?: number;
  travel?: TravelResult;
  evidence: AcquisitionEvidence;
  /** A pickup, objective or region alone cannot confirm where gear is obtained. */
  qualifiesAcquisition: boolean;
}

export interface SourceRouteRelevance {
  classification: GearRouteClassification;
  label: string;
  explanation: string;
  sourceId: string;
  locationRole?: GearLocationRole;
  locationName?: string;
  zoneId?: string;
  routeEntryId?: string;
  routeIndex?: number;
  travel?: TravelResult;
  hasUnknownLocations: boolean;
  locations: GearLocationRelevance[];
}

export interface ItemRouteRelevance extends Omit<SourceRouteRelevance, "sourceId"> {
  sourceId?: string;
  sources: SourceRouteRelevance[];
}

const labels: Record<GearRouteClassification, string> = {
  direct: "On my route",
  nearby: "Nearby detour",
  elsewhere: "Elsewhere",
  unknown: "Location unknown",
};

export const gearLocationRoleLabels: Record<GearLocationRole, string> = {
  "quest-pickup": "Quest pickup",
  "quest-objective": "Quest objective",
  "quest-turn-in": "Reward turn-in",
  "dungeon-entrance": "Dungeon entrance",
  "dungeon-region": "Dungeon region",
  "boss-location": "Boss location",
  vendor: "Vendor location",
  "world-enemy": "Linked enemy location",
  "recipe-learning": "Recipe learning source",
  "material-source": "Material source",
  "crafting-requirement": "Crafting requirement",
  unspecified: "Unspecified location relationship",
};

/**
 * Only a reviewed pickup is currently established for the indexed quest.
 * Undercity is a transit node, not an invented zone or a complete quest path.
 * Dalaran region/entrance conflicts and crafting learning sites remain unknown.
 */
export const reviewedGearLocations: readonly GearSourceLocation[] = [
  "270030", "6335",
].map((id) => ({
  sourceId: `forever:source:${id}-book-of-ur`,
  role: "quest-pickup",
  nodeId: "forever:city:undercity",
  name: "Undercity",
  certainty: "known",
  evidence: {
    kind: "reviewed-forever",
    url: "https://foreverdb.net/quest/1013-the-book-of-ur",
    reviewedAt: "2026-10-14",
    note: "The existing reviewed snapshot records Keeper Bel'dugur's Undercity pickup, confirmed by player observations. Objective and reward turn-in locations, faction access and prerequisites are unresolved. This marker does not establish an item acquisition location.",
    fields: { pickup: "https://foreverdb.net/quest/1013-the-book-of-ur" },
  },
}));

const acquisitionRoles: Record<AcquisitionSource["method"], readonly GearLocationRole[]> = {
  quest: ["quest-turn-in"],
  dungeon: ["dungeon-entrance"],
  vendor: ["vendor"],
  world: ["world-enemy"],
  craft: ["recipe-learning", "material-source", "crafting-requirement"],
  unknown: [],
};

function compareAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function routeRelevanceRank(result: { classification: GearRouteClassification }): number {
  return ({ direct: 0, nearby: 1, elsewhere: 2, unknown: 3 })[result.classification];
}

/** Explainable lexicographic comparison; it never computes item power. */
export function compareRouteRelevance(
  a: Pick<SourceRouteRelevance, "classification" | "routeIndex" | "travel"> & { sourceId?: string },
  b: Pick<SourceRouteRelevance, "classification" | "routeIndex" | "travel"> & { sourceId?: string },
): number {
  return routeRelevanceRank(a) - routeRelevanceRank(b) ||
    (a.routeIndex ?? Number.MAX_SAFE_INTEGER) - (b.routeIndex ?? Number.MAX_SAFE_INTEGER) ||
    (a.travel?.score ?? Number.MAX_SAFE_INTEGER) - (b.travel?.score ?? Number.MAX_SAFE_INTEGER) ||
    compareAscii(a.sourceId ?? "", b.sourceId ?? "");
}

/** Nearby means exactly one supported directed edge, never map proximity. */
export const gearNearbyDefinition =
  "One supported directed travel connection from a pending zone stop, with faction, unlocks and prerequisites checked. Boats and other transport remain explicit; Classic/client-derived paths remain provisional. Completed and skipped stops are excluded.";

export function isInRouteScope(
  result: { classification: GearRouteClassification },
  scope: GearRouteScope,
  includeIncomplete = false,
): boolean {
  return scope === "anywhere" || result.classification === "direct" ||
    (scope === "nearby" && result.classification === "nearby") ||
    (includeIncomplete && result.classification === "unknown");
}

function contextualNote(role: GearLocationRole): string {
  switch (role) {
    case "quest-pickup": return "Pickup only; objectives and reward turn-in remain unverified.";
    case "quest-objective": return "Objective only; pickup and reward turn-in may be elsewhere.";
    case "dungeon-region": return "Dungeon region does not verify its entrance or faction access.";
    case "boss-location": return "Boss location does not verify the dungeon entrance.";
    case "recipe-learning": return "Recipe learning detour; owning the profession does not establish recipe access.";
    case "material-source": return "Material detour; this does not establish all crafting requirements.";
    case "crafting-requirement": return "Known crafting requirement; recipe learning and other requirements remain separate.";
    case "quest-turn-in": return "Reward turn-in only; other quest steps may be elsewhere.";
    case "world-enemy": return "Linked enemy only; this does not imply all enemies in the zone drop the item.";
    default: return "";
  }
}

function pendingRouteLocations(character: Pick<Character, "planner">) {
  return character.planner.entries.flatMap((entry, routeIndex) => {
    if (entry.kind !== "zone" || entry.origin === "illustrative" ||
        entry.status === "completed" || entry.status === "skipped") return [];
    const zone = resolveEntryZone(entry);
    return zone ? [{ entryId: entry.id, nodeId: zone.id, routeIndex }] : [];
  });
}

function locationRelevance(
  location: GearSourceLocation,
  source: AcquisitionSource,
  character: Pick<Character, "planner" | "faction">,
  options: GearRouteOptions,
): GearLocationRelevance {
  const nodes = options.nodes ?? travelNodes;
  const graph = options.graph ?? travelEdges;
  const capabilities = options.capabilities ?? {};
  const locationName = location.name ?? nodes.find((node) => node.id === location.nodeId)?.name;
  const qualifiesAcquisition = acquisitionRoles[source.method].includes(location.role);
  const base = {
    sourceId: source.id, role: location.role, nodeId: location.nodeId,
    locationName, evidence: location.evidence, qualifiesAcquisition,
  };
  const provenance = location.evidence.kind === "user-supplied" ? " User supplied." : "";
  const roleNote = contextualNote(location.role);
  const unknown = (why: string): GearLocationRelevance => ({
    ...base, classification: "unknown", label: why.startsWith("Travel uncertain") ? "Travel uncertain" : labels.unknown,
    explanation: `${gearLocationRoleLabels[location.role]}${locationName ? `: ${locationName}` : ""}. ${why}${provenance}`,
  });
  if (location.certainty !== "known" || !location.nodeId || !nodes.some((node) => node.id === location.nodeId))
    return unknown("Location relationship is not verified.");
  if (character.faction !== "Alliance" && character.faction !== "Horde")
    return unknown("Choose a faction to check access.");
  if (location.factions && !location.factions.includes(character.faction))
    return unknown("This location is not verified for this faction.");
  const unlocks = new Set([
    ...(capabilities.unlocks ?? []),
    ...(capabilities.discoveredFlightPaths ?? []).map((id) => id.startsWith("flight:") ? id : `flight:${id}`),
  ]);
  const prerequisites = new Set([...unlocks, ...(capabilities.completedPrerequisites ?? [])]);
  if (location.access === "unknown" ||
      (location.role === "dungeon-entrance" && (location.access !== "known" || !location.factions?.length)) ||
      location.requiredUnlocks?.some((id) => !unlocks.has(id)) ||
      location.prerequisites?.some((id) => !prerequisites.has(id)))
    return unknown("Travel uncertain: source access requirements or unlocks are unresolved.");
  const stops = pendingRouteLocations(character);
  const direct = stops.find((stop) => stop.nodeId === location.nodeId);
  if (direct) return {
    ...base, classification: "direct", label: labels.direct,
    routeEntryId: direct.entryId, routeIndex: direct.routeIndex,
    explanation: `${gearLocationRoleLabels[location.role]}: ${locationName}. Planned zone. ${roleNote}${provenance}`.trim(),
  };
  const candidates = stops.flatMap((stop) => {
    // Let the existing travel engine validate every direct candidate. Searching
    // only direct edges prevents a cheaper multi-hop path changing eligibility.
    return graph.filter((edge) => edge.from === stop.nodeId && edge.to === location.nodeId).flatMap((edge) => {
      const travel = findTravel(stop.nodeId, location.nodeId!, character.faction, capabilities, [edge], nodes);
      return travel.score === null ? [] : [{ stop, travel }];
    });
  }).sort((a, b) => a.stop.routeIndex - b.stop.routeIndex ||
    a.travel.score! - b.travel.score! || compareAscii(a.travel.edges[0].id, b.travel.edges[0].id));
  const nearby = candidates[0];
  if (nearby) return {
    ...base, classification: "nearby", label: labels.nearby,
    routeEntryId: nearby.stop.entryId, routeIndex: nearby.stop.routeIndex, travel: nearby.travel,
    explanation: `${gearLocationRoleLabels[location.role]}: ${locationName}. ${nearby.travel.explanation} ${roleNote}${provenance}`.trim(),
  };
  const unsupportedDirect = stops.some((stop) => graph.some((edge) => edge.from === stop.nodeId && edge.to === location.nodeId));
  if (unsupportedDirect)
    return unknown("Travel uncertain: no eligible direct connection or required unlock is confirmed.");
  return {
    ...base, classification: "elsewhere", label: labels.elsewhere,
    explanation: `${gearLocationRoleLabels[location.role]}: ${locationName}. ${stops.length ? "Outside the pending route and its supported one-connection detours." : "No pending zone stops to compare."} ${roleNote}${provenance}`.trim(),
  };
}

export function getSourceRouteRelevance(
  source: AcquisitionSource,
  character: Pick<Character, "planner" | "faction">,
  options: GearRouteOptions = {},
): SourceRouteRelevance {
  const locations = (options.locations ?? reviewedGearLocations)
    .filter((location) => location.sourceId === source.id)
    .map((location) => locationRelevance(location, source, character, options));
  // A generic legacy zone field is informative, never promoted to a verified
  // pickup, quest objective, entrance, vendor or enemy relationship.
  if (!locations.length && (source.zoneId || source.zoneName)) locations.push(locationRelevance({
    sourceId: source.id, nodeId: source.zoneId, name: source.zoneName,
    role: source.locationRole ?? "unspecified", certainty: "known", evidence: source.evidence,
  }, source, character, options));
  locations.sort((a, b) => compareRouteRelevance(a, b) || compareAscii(a.role, b.role) || compareAscii(a.nodeId ?? "", b.nodeId ?? ""));
  const eligible = locations.filter((location) => location.qualifiesAcquisition);
  const positive = eligible.find((location) => location.classification === "direct" || location.classification === "nearby");
  const hasUnknownLocations = !eligible.length || eligible.some((location) => location.classification === "unknown");
  const best = positive ?? eligible.find((location) => location.classification === "unknown") ?? eligible[0];
  const context = locations.find((location) => !location.qualifiesAcquisition && (location.classification === "direct" || location.classification === "nearby"));
  const classification = best?.classification ?? "unknown";
  return {
    classification, label: best?.label ?? labels[classification], sourceId: source.id,
    explanation: best?.explanation ?? (context ? `${context.explanation} Acquisition location remains unknown.` : source.method === "craft" ? "Crafting is independent of route geography; recipe learning, material sources and required crafting locations are unknown." : "Acquisition location is not verified; missing relationships do not establish unavailability."),
    ...(best ? {
      locationRole: best.role, locationName: best.locationName, zoneId: best.nodeId,
      routeEntryId: best.routeEntryId, routeIndex: best.routeIndex, travel: best.travel,
    } : {}),
    hasUnknownLocations, locations,
  };
}

function combineItemSourceRelevance(
  item: ItemRecord,
  getSource: (id: string) => SourceRouteRelevance | undefined,
  selectedSourceIds: readonly string[] = item.sourceIds,
): ItemRouteRelevance {
  const sourceIds = [...new Set(selectedSourceIds)].sort(compareAscii);
  const sources: SourceRouteRelevance[] = sourceIds.map((id): SourceRouteRelevance => {
    return getSource(id) ?? {
      classification: "unknown", label: labels.unknown, sourceId: id,
      explanation: "Source reference is unresolved; acquisition location remains unknown.",
      hasUnknownLocations: true, locations: [],
    };
  }).sort(compareRouteRelevance);
  const positive = sources.find((source) => source.classification === "direct" || source.classification === "nearby");
  const hasUnknownLocations = !sources.length || sources.some((source) => source.hasUnknownLocations);
  const best = positive ?? (hasUnknownLocations ? sources.find((source) => source.classification === "unknown") : sources[0]);
  return {
    classification: best?.classification ?? "unknown",
    label: best?.label ?? labels.unknown,
    explanation: best?.explanation ?? "Acquisition source and location are unknown; this does not establish unavailability.",
    sourceId: best?.sourceId, locationRole: best?.locationRole, locationName: best?.locationName,
    zoneId: best?.zoneId, routeEntryId: best?.routeEntryId, routeIndex: best?.routeIndex, travel: best?.travel,
    hasUnknownLocations, locations: sources.flatMap((source) => source.locations), sources,
  };
}

/**
 * Intersect method and geography on the same source. Missing references belong
 * only to the unknown-method bucket, matching the ordinary equipment index.
 */
export function getSourceIdsForMethod(
  item: Pick<ItemRecord, "sourceIds">,
  sources: ReadonlyMap<string, AcquisitionSource>,
  method?: AcquisitionMethod,
): string[] {
  return [...new Set(item.sourceIds)]
    .filter((id) => !method || (sources.get(id)?.method ?? "unknown") === method)
    .sort(compareAscii);
}

/** The caller supplies the resolved shared acquisition graph, including personal links. */
export function getItemRouteRelevance(
  item: ItemRecord,
  character: Pick<Character, "planner" | "faction">,
  dataset: AcquisitionDataset,
  options: GearRouteOptions = {},
): ItemRouteRelevance {
  const sources = new Map(dataset.sources.map((source) => [source.id, source]));
  return combineItemSourceRelevance(item, (id) => {
    const source = sources.get(id);
    return source ? getSourceRouteRelevance(source, character, options) : undefined;
  }, getSourceIdsForMethod(item, sources, options.acquisitionMethod));
}

/**
 * Prepare an entire result set without per-item linear source/location scans.
 * Shared acquisition sources are classified once for the current character;
 * Rebuild on route/faction/capability/method or catalogue changes, never persist
 * it. With a method filter, items without that method are omitted; source-less
 * items are included only for the unknown method or an unfiltered search.
 */
export function getGearRouteIndex(
  character: Pick<Character, "planner" | "faction">,
  dataset: AcquisitionDataset,
  options: GearRouteOptions = {},
): ReadonlyMap<string, ItemRouteRelevance> {
  const locationsBySource = new Map<string, GearSourceLocation[]>();
  for (const location of options.locations ?? reviewedGearLocations) {
    const locations = locationsBySource.get(location.sourceId) ?? [];
    locations.push(location);
    locationsBySource.set(location.sourceId, locations);
  }
  const sources = new Map(dataset.sources.map((source) => [source.id, source]));
  const scopedItems = dataset.items.map((item) => ({
    item, sourceIds: getSourceIdsForMethod(item, sources, options.acquisitionMethod),
  })).filter(({ item, sourceIds }) => !options.acquisitionMethod || sourceIds.length ||
    (options.acquisitionMethod === "unknown" && !item.sourceIds.length));
  const relevantSources = new Set(scopedItems.flatMap(({ sourceIds }) => sourceIds));
  const results = new Map<string, SourceRouteRelevance>();
  for (const id of relevantSources) {
    const source = sources.get(id);
    if (source) results.set(id, getSourceRouteRelevance(source, character, {
      ...options, locations: locationsBySource.get(id) ?? [],
    }));
  }
  return new Map(scopedItems.map(({ item, sourceIds }) => [item.id, combineItemSourceRelevance(item, (id) => results.get(id), sourceIds)]));
}

/** Counts only the player's selected source; alternatives never inflate saved goals. */
export function getRouteWishlistSummary(
  character: Character,
  dataset: AcquisitionDataset,
  options: GearRouteOptions = {},
): { direct: number; nearby: number; unknown: number; byRouteEntry: ReadonlyMap<string, number> } {
  const resolved = resolveAcquisition(character.acquisition, dataset);
  const summary = { direct: 0, nearby: 0, unknown: 0, byRouteEntry: new Map<string, number>() };
  for (const entry of character.acquisition.wishlist) {
    if (entry.status !== "wanted") continue;
    const source = getSelectedSource(entry, resolved);
    const relevance = source ? getSourceRouteRelevance(source, character, options) : undefined;
    if (!relevance || relevance.classification === "unknown") summary.unknown += 1;
    else if (relevance.classification === "direct" || relevance.classification === "nearby") {
      summary[relevance.classification] += 1;
      if (relevance.classification === "direct" && relevance.routeEntryId)
        summary.byRouteEntry.set(relevance.routeEntryId, (summary.byRouteEntry.get(relevance.routeEntryId) ?? 0) + 1);
    }
  }
  return summary;
}

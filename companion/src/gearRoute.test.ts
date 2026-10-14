import { describe, expect, it } from "vitest";
import type { AcquisitionDataset, AcquisitionSource, ItemRecord } from "./acquisitionTypes";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { evidence, zoneId } from "./data/zones";
import { createCharacter } from "./domain";
import { addManualSource, resolveAcquisition, validateAcquisition } from "./acquisition";
import { addZone } from "./routeBuilder";
import type { TravelEdge } from "./travel";
import {
  compareRouteRelevance,
  getItemRouteRelevance,
  getGearRouteIndex,
  getSourceIdsForMethod,
  getRouteWishlistSummary,
  getSourceRouteRelevance,
  isInRouteScope,
  reviewedGearLocations,
  type GearSourceLocation,
} from "./gearRoute";

// All additional items and location relationships here are isolated fixtures.
// None are shipped as real Forever item/acquisition facts.
const fixtureEvidence = { kind: "user-supplied" as const, note: "Isolated test fixture, not Forever content." };
const a = zoneId("elwynn-forest"), b = zoneId("westfall"), c = zoneId("redridge-mountains");
function character(zones = [a], faction = "Alliance") {
  const result = createCharacter({ name: "Fixture", race: "Human", className: "Priest", plannedSpec: "Healing", level: 30, faction, status: "leveling" });
  for (const id of zones) result.planner = addZone(result.planner, id, { min: 10, max: 30 });
  return result;
}
function source(id = "fixture:source", method: AcquisitionSource["method"] = "vendor"): AcquisitionSource {
  return { id, method, label: "Isolated fixture source", availability: "unknown", evidence: fixtureEvidence };
}
function item(sourceIds = ["fixture:source"]): ItemRecord {
  return { id: "fixture:item", name: "Isolated fixture item", quality: "unknown", stats: [], classRestrictions: [], sourceIds, evidence: fixtureEvidence };
}
function dataset(sources = [source()], record = item()): AcquisitionDataset {
  return { version: "isolated-fixture", reviewedAt: "2026-10-14", items: [record], sources, quests: [], dungeons: [], npcs: [] };
}
function location(nodeId = a, role: GearSourceLocation["role"] = "vendor", sourceId = "fixture:source"): GearSourceLocation {
  return { sourceId, nodeId, role, certainty: "known", evidence: fixtureEvidence };
}
function edge(from = a, to = b, changes: Partial<TravelEdge> = {}): TravelEdge {
  return {
    id: `${from}>${to}`, from, to, transport: "walking", factions: ["Alliance", "Horde"], prerequisites: [], requiredUnlocks: [],
    evidence: evidence("client-derived", [], "Isolated graph fixture"), factionEvidence: evidence("client-derived", [], "Isolated graph fixture"), ...changes,
  };
}

describe("route-aware acquisition discovery", () => {
  it("matches an explicitly located acquisition on a pending route without editing the plan", () => {
    const owner = character(), before = JSON.stringify(owner);
    const result = getItemRouteRelevance(item(), owner, dataset(), { locations: [location()] });
    expect(result.classification).toBe("direct");
    expect(result.routeEntryId).toBe(owner.planner.entries[0].id);
    expect(result.explanation).toContain("Vendor location: Elwynn Forest");
    expect(result.explanation).toContain("User supplied");
    expect(JSON.stringify(owner)).toBe(before);
  });

  it("reuses a directed one-connection detour and preserves graph provenance", () => {
    const result = getSourceRouteRelevance(source(), character(), { locations: [location(b)] });
    expect(result.classification).toBe("nearby");
    expect(result.travel?.edges).toHaveLength(1);
    expect(result.travel?.confidence).toBe("classic-derived");
    expect(result.travel?.provisional).toBe(true);
    expect(result.explanation).toContain("Adjacent zone");
    expect(result.explanation).toContain("Classic-derived");
  });

  it("bounds nearby to one connection even when a supported multi-hop path exists", () => {
    const result = getSourceRouteRelevance(source(), character([b]), { locations: [location(c)], graph: [edge(b, a), edge(a, c)] });
    expect(result.classification).toBe("elsewhere");
    expect(result.explanation).toContain("one-connection detours");
    expect(isInRouteScope(result, "nearby")).toBe(false);
  });

  it("does not infer reverse transport service", () => {
    const result = getSourceRouteRelevance(source(), character([b]), { locations: [location(a)], graph: [edge(a, b)] });
    expect(result.classification).toBe("elsewhere");
  });

  it("keeps missing source and location relationships unknown, not unavailable", () => {
    for (const record of [item([]), item(["fixture:missing"])]) {
      const result = getItemRouteRelevance(record, character(), dataset());
      expect(result.classification).toBe("unknown");
      expect(result.hasUnknownLocations).toBe(true);
      expect(isInRouteScope(result, "route")).toBe(false);
      expect(isInRouteScope(result, "route", true)).toBe(true);
    }
    expect(getSourceRouteRelevance(source(), character()).explanation).toContain("do not establish unavailability");
  });

  it("separates quest pickup, objective and reward turn-in locations", () => {
    const quest = source("fixture:source", "quest");
    const result = getSourceRouteRelevance(quest, character(), { locations: [location(a, "quest-pickup"), location(b, "quest-objective")] });
    expect(result.classification).toBe("unknown");
    expect(result.locations.map((entry) => entry.classification)).toEqual(["direct", "nearby"]);
    expect(result.locations.every((entry) => !entry.qualifiesAcquisition)).toBe(true);
    expect(result.explanation).toContain("reward turn-in remain unverified");
    const knownReward = getSourceRouteRelevance(quest, character(), { locations: [location(a, "quest-pickup"), location(c, "quest-turn-in")] });
    expect(knownReward.classification).toBe("nearby");
    expect(knownReward.locationRole).toBe("quest-turn-in");
    expect(knownReward.explanation).toContain("other quest steps may be elsewhere");
  });

  it("does not promote a generic source zone or a dungeon region to an entrance", () => {
    expect(getSourceRouteRelevance({ ...source(), zoneId: a }, character()).classification).toBe("unknown");
    const result = getSourceRouteRelevance(source("fixture:source", "dungeon"), character(), {
      locations: [location(a, "dungeon-region"), location(b, "boss-location")],
    });
    expect(result.classification).toBe("unknown");
    expect(result.explanation).toContain("does not verify its entrance");
  });

  it("requires known dungeon entrance access and explicit faction coverage", () => {
    const dungeon = source("fixture:source", "dungeon"), entrance = location(a, "dungeon-entrance");
    expect(getSourceRouteRelevance(dungeon, character(), { locations: [entrance] }).classification).toBe("unknown");
    expect(getSourceRouteRelevance(dungeon, character(), { locations: [{ ...entrance, access: "known", factions: ["Horde"] }] }).classification).toBe("unknown");
    const usable = getSourceRouteRelevance(dungeon, character(), { locations: [{ ...entrance, access: "known", factions: ["Alliance"] }] });
    expect(usable.classification).toBe("direct");
    expect(usable.locationRole).toBe("dungeon-entrance");
  });

  it("keeps crafting independent of geography until an explicit relevant requirement is known", () => {
    const craft = source("fixture:source", "craft");
    expect(getSourceRouteRelevance({ ...craft, zoneId: a }, character()).classification).toBe("unknown");
    const learning = getSourceRouteRelevance(craft, character(), { locations: [location(b, "recipe-learning")] });
    expect(learning.classification).toBe("nearby");
    expect(learning.explanation).toContain("does not establish recipe access");
    expect(learning.locationRole).toBe("recipe-learning");
  });

  it("does not imply every enemy in a world-drop zone drops the item", () => {
    const result = getSourceRouteRelevance(source("fixture:source", "world"), character(), { locations: [location(a, "world-enemy")] });
    expect(result.classification).toBe("direct");
    expect(result.explanation).toContain("does not imply all enemies");
    expect(getSourceRouteRelevance(source("fixture:source", "world"), character(), { locations: [location(a, "vendor")] }).classification).toBe("unknown");
  });

  it("checks graph faction, missing evidence, prerequisites and unlocks", () => {
    const options = { locations: [location(b)] };
    for (const connection of [
      edge(a, b, { factions: ["Horde"] }),
      edge(a, b, { evidence: evidence("unknown", [], "Unverified fixture") }),
      edge(a, b, { factionEvidence: evidence("unknown", [], "Unverified faction") }),
      edge(a, b, { prerequisites: ["fixture:quest"] }),
      edge(a, b, { requiredUnlocks: ["fixture:key"] }),
    ]) {
      const result = getSourceRouteRelevance(source(), character(), { ...options, graph: [connection] });
      expect(result.classification).toBe("unknown");
      expect(result.label).toBe("Travel uncertain");
      expect(result.explanation).toContain("Travel uncertain");
      expect(isInRouteScope(result, "nearby")).toBe(false);
      expect(isInRouteScope(result, "nearby", true)).toBe(true);
    }
    expect(getSourceRouteRelevance(source(), character(), { ...options, graph: [edge(a, b, { prerequisites: ["fixture:quest"], requiredUnlocks: ["fixture:key"] })], capabilities: { completedPrerequisites: ["fixture:quest"], unlocks: ["fixture:key"] } }).classification).toBe("nearby");
  });

  it("does not assume discovered flight paths and rejects malformed flight requirements", () => {
    const flight = edge(a, b, { transport: "flight", requiredUnlocks: ["flight:a", "flight:b"] });
    const options = { locations: [location(b)], graph: [flight] };
    expect(getSourceRouteRelevance(source(), character(), options).classification).toBe("unknown");
    const unlocked = getSourceRouteRelevance(source(), character(), { ...options, capabilities: { discoveredFlightPaths: ["a", "b"] } });
    expect(unlocked.classification).toBe("nearby");
    expect(unlocked.explanation).toContain("Discovered flight points required");
    expect(getSourceRouteRelevance(source(), character(), { ...options, graph: [{ ...flight, requiredUnlocks: [] }] }).classification).toBe("unknown");
  });

  it("shows transport explicitly without inventing minutes", () => {
    const result = getSourceRouteRelevance(source(), character(), { locations: [location(b)], graph: [edge(a, b, { transport: "boat" })] });
    expect(result.classification).toBe("nearby");
    expect(result.explanation).toContain("Boat required");
    expect(result.explanation).not.toMatch(/\d+\s*(minutes|min\b)/i);
  });

  it("recomputes completed, skipped, removed and reordered route stops", () => {
    const owner = character([a, c]);
    const options = { locations: [location(a)] };
    expect(getSourceRouteRelevance(source(), owner, options).routeIndex).toBe(0);
    owner.planner.entries.reverse();
    expect(getSourceRouteRelevance(source(), owner, options).routeIndex).toBe(1);
    const stop = owner.planner.entries.find((entry) => entry.recordId === a)!;
    stop.status = "completed";
    expect(getSourceRouteRelevance(source(), owner, options).classification).toBe("nearby");
    stop.status = "skipped";
    expect(getSourceRouteRelevance(source(), owner, options).classification).toBe("nearby");
    owner.planner.entries = [];
    const noRoute = getSourceRouteRelevance(source(), owner, options);
    expect(noRoute.classification).toBe("elsewhere");
    expect(noRoute.explanation).toContain("No pending zone stops");
  });

  it("does not turn custom or illustrative stops into verified route locations", () => {
    const owner = character();
    owner.planner.entries[0].kind = "custom";
    expect(getSourceRouteRelevance(source(), owner, { locations: [location()] }).classification).toBe("elsewhere");
    owner.planner.entries[0].kind = "zone";
    owner.planner.entries[0].origin = "illustrative";
    expect(getSourceRouteRelevance(source(), owner, { locations: [location()] }).classification).toBe("elsewhere");
  });

  it("retains unknown alternatives instead of claiming a known distant source is exhaustive", () => {
    const record = item(["fixture:elsewhere", "fixture:unknown"]);
    const data = dataset([source("fixture:elsewhere"), source("fixture:unknown")], record);
    const options = { locations: [location(zoneId("tanaris"), "vendor", "fixture:elsewhere")] };
    const result = getItemRouteRelevance(record, character(), data, options);
    expect(result.classification).toBe("unknown");
    expect(result.sources.map((entry) => entry.classification)).toEqual(["elsewhere", "unknown"]);
    expect(result.hasUnknownLocations).toBe(true);
    const withMatch = getItemRouteRelevance(record, character(), data, { locations: [...options.locations, location(a, "vendor", "fixture:unknown")] });
    expect(withMatch.classification).toBe("direct");
    expect(withMatch.sourceId).toBe("fixture:unknown");
  });

  it("sorts deterministic source choices and route relevance without input-order dependence", () => {
    const record = item(["fixture:z", "fixture:a"]), data = dataset([source("fixture:z"), source("fixture:a")], record);
    const locations = [location(a, "vendor", "fixture:z"), location(a, "vendor", "fixture:a")];
    const result = getItemRouteRelevance(record, character(), data, { locations });
    expect(result.sourceId).toBe("fixture:a");
    expect(getItemRouteRelevance({ ...record, sourceIds: record.sourceIds.slice().reverse() }, character(), { ...data, sources: data.sources.slice().reverse() }, { locations: locations.slice().reverse() }).sourceId).toBe("fixture:a");
    expect(compareRouteRelevance({ classification: "direct", sourceId: "z" }, { classification: "nearby", sourceId: "a" })).toBeLessThan(0);
  });

  it("indexes shared sources once and rebuilds after a character route changes", () => {
    const owner = character(), first = item(), second = { ...item(), id: "fixture:second-item" };
    const data = { ...dataset(), items: [first, second] }, options = { locations: [location(a)] };
    const index = getGearRouteIndex(owner, data, options);
    expect(index.get(first.id)).toEqual(getItemRouteRelevance(first, owner, data, options));
    expect(index.get(first.id)?.sources[0]).toBe(index.get(second.id)?.sources[0]);
    owner.planner.entries = [];
    expect(getGearRouteIndex(owner, data, options).get(first.id)?.classification).toBe("elsewhere");
    expect(index.get(first.id)?.classification).toBe("direct");
  });

  it("intersects route and acquisition method on the same source", () => {
    const owner = character();
    const record = item(["fixture:quest", "fixture:vendor"]);
    const data = dataset([source("fixture:quest", "quest"), source("fixture:vendor", "vendor")], record);
    const locations = [location(zoneId("tanaris"), "quest-turn-in", "fixture:quest"), location(a, "vendor", "fixture:vendor")];
    const unfiltered = getGearRouteIndex(owner, data, { locations }).get(record.id)!;
    expect(unfiltered.classification).toBe("direct");
    expect(unfiltered.sourceId).toBe("fixture:vendor");
    const questOnly = getGearRouteIndex(owner, data, { locations, acquisitionMethod: "quest" }).get(record.id)!;
    expect(questOnly.classification).toBe("elsewhere");
    expect(questOnly.sourceId).toBe("fixture:quest");
    expect(questOnly.sources.map((entry) => entry.sourceId)).toEqual(["fixture:quest"]);
    expect(isInRouteScope(questOnly, "route", true)).toBe(false);
    expect(getItemRouteRelevance(record, owner, data, { locations, acquisitionMethod: "quest" })).toEqual(questOnly);
    expect(getGearRouteIndex(owner, data, { locations, acquisitionMethod: "vendor" }).get(record.id)?.classification).toBe("direct");
  });

  it("does not borrow a different method's direct match for a nearby or unknown source", () => {
    const owner = character();
    const record = item(["fixture:quest", "fixture:vendor"]);
    const data = dataset([source("fixture:quest", "quest"), source("fixture:vendor", "vendor")], record);
    const locations = [location(a, "quest-turn-in", "fixture:quest"), location(b, "vendor", "fixture:vendor")];
    const vendorOnly = getGearRouteIndex(owner, data, { locations, acquisitionMethod: "vendor" }).get(record.id)!;
    expect(vendorOnly.classification).toBe("nearby");
    expect(isInRouteScope(vendorOnly, "route")).toBe(false);
    expect(isInRouteScope(vendorOnly, "nearby")).toBe(true);
    const unknownVendor = getGearRouteIndex(owner, data, { locations: locations.filter((entry) => entry.sourceId === "fixture:quest"), acquisitionMethod: "vendor" }).get(record.id)!;
    expect(unknownVendor.classification).toBe("unknown");
    expect(isInRouteScope(unknownVendor, "route")).toBe(false);
    expect(unknownVendor.sources).toHaveLength(1);
    expect(unknownVendor.sourceId).toBe("fixture:vendor");
  });

  it("omits items lacking the selected method and keeps unresolved sources in the unknown bucket", () => {
    const owner = character(), vendor = source("fixture:vendor");
    const records = [
      { ...item([vendor.id]), id: "fixture:vendor-only" },
      { ...item(["fixture:missing", vendor.id]), id: "fixture:unresolved" },
      { ...item([]), id: "fixture:source-less" },
      { ...item(["fixture:unknown"]), id: "fixture:unknown-method" },
    ];
    const data = { ...dataset([vendor, source("fixture:unknown", "unknown")]), items: records };
    const locations = [location(a, "vendor", vendor.id)];
    expect(getGearRouteIndex(owner, data, { locations, acquisitionMethod: "quest" }).size).toBe(0);
    const unknown = getGearRouteIndex(owner, data, { locations, acquisitionMethod: "unknown" });
    expect([...unknown.keys()]).toEqual(["fixture:unresolved", "fixture:source-less", "fixture:unknown-method"]);
    expect(unknown.get("fixture:unresolved")?.sources.map((entry) => entry.sourceId)).toEqual(["fixture:missing"]);
    expect([...unknown.values()].every((entry) => entry.classification === "unknown")).toBe(true);
    const sourceMap = new Map(data.sources.map((entry) => [entry.id, entry]));
    expect(getSourceIdsForMethod(records[1], sourceMap, "unknown")).toEqual(["fixture:missing"]);
    expect(getSourceIdsForMethod(records[1], sourceMap, "vendor")).toEqual([vendor.id]);
    expect(getSourceIdsForMethod({ sourceIds: [vendor.id, vendor.id] }, sourceMap)).toEqual([vendor.id]);
    expect(records[1].sourceIds).toEqual(["fixture:missing", vendor.id]);
  });

  it("keeps blocked detours uncertain while distinguishing a known distant location", () => {
    const blocked = getSourceRouteRelevance(source(), character(), {
      locations: [location(b)], graph: [edge(a, b, { prerequisites: ["fixture:unconfirmed-access"] })],
    });
    expect(blocked.classification).toBe("unknown");
    expect(blocked.label).toBe("Travel uncertain");
    expect(blocked.locationName).toBe("Westfall");
    expect(blocked.explanation).toContain("required unlock");
    expect(blocked.hasUnknownLocations).toBe(true);
    const distant = getSourceRouteRelevance(source(), character(), { locations: [location(zoneId("tanaris"))] });
    expect(distant.classification).toBe("elsewhere");
    expect(distant.hasUnknownLocations).toBe(false);
    expect(isInRouteScope(distant, "nearby", true)).toBe(false);
  });

  it("retains a confirmed nearby source when another candidate connection is unresolved", () => {
    const owner = character([a, c]);
    const result = getSourceRouteRelevance(source(), owner, {
      locations: [location(b)],
      graph: [edge(a, b, { evidence: evidence("unknown", [], "Unverified fixture") }), edge(c, b)],
    });
    expect(result.classification).toBe("nearby");
    expect(result.routeIndex).toBe(1);
    expect(result.travel?.edges[0].from).toBe(c);
    expect(result.hasUnknownLocations).toBe(false);
  });

  it("builds a method-scoped route index for 20,000 fixtures with shared source results", () => {
    const owner = character(), count = 20_000;
    const records = Array.from({ length: count }, (_, index) => ({
      ...item(["fixture:vendor", "fixture:quest"]), id: `fixture:scale:${index}`,
    }));
    const data = { ...dataset([source("fixture:vendor", "vendor"), source("fixture:quest", "quest")]), items: records };
    const locations = [location(a, "vendor", "fixture:vendor"), location(zoneId("tanaris"), "quest-turn-in", "fixture:quest")];
    const index = getGearRouteIndex(owner, data, { locations, acquisitionMethod: "quest" });
    expect(index.size).toBe(count);
    expect([...index.values()].every((entry) => entry.classification === "elsewhere" && entry.sourceId === "fixture:quest")).toBe(true);
    expect(index.get(records[0].id)?.sources[0]).toBe(index.get(records[count - 1].id)?.sources[0]);
    expect(index.get(records[0].id)?.sources).toHaveLength(1);
  });

  it("reports selected-source wishlist goals independently of item acquisition and other characters", () => {
    const owner = character(), record = item(["fixture:source", "fixture:unknown"]);
    const data = dataset([source(), source("fixture:unknown")], record);
    owner.acquisition.wishlist = [{ id: "fixture:wishlist", itemId: record.id, preferredSourceId: "fixture:unknown", status: "wanted", notes: "Keep this note" }];
    const options = { locations: [location()] };
    expect(getRouteWishlistSummary(owner, data, options).unknown).toBe(1);
    owner.acquisition.wishlist[0].preferredSourceId = "fixture:source";
    const before = JSON.stringify(owner);
    const summary = getRouteWishlistSummary(owner, data, options);
    expect(summary.direct).toBe(1);
    expect(summary.byRouteEntry.get(owner.planner.entries[0].id)).toBe(1);
    expect(JSON.stringify(owner)).toBe(before);
    expect(getRouteWishlistSummary(character(), data, options).direct).toBe(0);
    owner.acquisition.wishlist[0].status = "acquired";
    expect(getRouteWishlistSummary(owner, data, options).direct).toBe(0);
    expect(owner.planner.entries[0].status).toBe("planned");
  });

  it("keeps the real catalogue strict and exposes its verified pickup separately", () => {
    const owner = character([zoneId("tirisfal-glades")], "Horde");
    const mittens = acquisitionDataset.items.find((entry) => entry.gameId === 270030)!;
    const result = getItemRouteRelevance(mittens, owner, acquisitionDataset);
    expect(result.classification).toBe("unknown");
    expect(result.explanation).toContain("Quest pickup: Undercity");
    expect(result.explanation).toContain("Acquisition location remains unknown");
    expect(result.locations[0].classification).toBe("nearby");
    expect(result.locations[0].qualifiesAcquisition).toBe(false);
    expect(isInRouteScope(result, "nearby")).toBe(false);
    expect(reviewedGearLocations.every((entry) => entry.evidence.kind === "reviewed-forever")).toBe(true);
    for (const entry of acquisitionDataset.items)
      expect(getItemRouteRelevance(entry, owner, acquisitionDataset).classification).toBe("unknown");
  });

  it("uses explicit portable personal source roles while leaving generic zones uncertain", () => {
    const owner = character();
    const record = acquisitionDataset.items.find((entry) => entry.gameId === 273052)!;
    owner.acquisition = addManualSource(owner.acquisition, record.id, {
      method: "vendor", label: "Isolated personal route fixture", availability: "unknown",
      zoneId: a, zoneName: "Elwynn Forest", locationRole: "vendor",
    });
    owner.acquisition = validateAcquisition(JSON.parse(JSON.stringify(owner.acquisition)));
    const data = resolveAcquisition(owner.acquisition, acquisitionDataset);
    const updated = data.items.find((entry) => entry.id === record.id)!;
    const result = getItemRouteRelevance(updated, owner, data);
    expect(result.classification).toBe("direct");
    expect(result.explanation).toContain("User supplied");
    expect(owner.acquisition.manualSources[0].locationRole).toBe("vendor");
    const generic = { ...owner.acquisition.manualSources[0], locationRole: undefined };
    expect(getSourceRouteRelevance(generic, owner).classification).toBe("unknown");
    expect(getSourceRouteRelevance({ ...generic, locationRole: "quest-pickup", method: "quest" }, owner).classification).toBe("unknown");
    expect(getItemRouteRelevance(record, character(), acquisitionDataset).classification).toBe("unknown");
  });

  it("never interprets unknown source locations or unknown factions as direct matches", () => {
    expect(getSourceRouteRelevance(source(), character(), { locations: [{ ...location(), certainty: "unknown" }] }).classification).toBe("unknown");
    expect(getSourceRouteRelevance(source(), character([], "Unknown"), { locations: [location()] }).classification).toBe("unknown");
    expect(getSourceRouteRelevance(source(), character(), { locations: [{ ...location(), nodeId: "fixture:missing" }] }).classification).toBe("unknown");
  });
});

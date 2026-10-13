import { describe, expect, it } from "vitest";
import { catalogueSources, evidence, zoneId } from "./data/zones";
import {
  CROSS_CONTINENT_WEIGHT,
  findTravel,
  travelEdges,
  travelForRoute,
  travelNodes,
  travelPathNames,
  travelWeights,
  type TravelEdge,
  type TravelNode,
} from "./travel";

const a = zoneId("elwynn-forest"),
  b = zoneId("westfall"),
  c = zoneId("darkshore");
const nodes: TravelNode[] = [
  { id: "a", name: "A", continent: "East" },
  { id: "b", name: "B", continent: "East" },
  { id: "c", name: "C", continent: "East" },
  { id: "d", name: "D", continent: "West" },
];
function connection(
  from: string,
  to: string,
  overrides: Partial<TravelEdge> = {},
): TravelEdge {
  return {
    id: `${from}>${to}`,
    from,
    to,
    transport: "walking",
    factions: ["Alliance", "Horde"],
    prerequisites: [],
    requiredUnlocks: [],
    evidence: evidence(
      "client-derived",
      ["foreverdb-travel"],
      "Synthetic graph fixture",
    ),
    factionEvidence: evidence(
      "client-derived",
      ["foreverdb-travel"],
      "Synthetic graph fixture",
    ),
    ...overrides,
  };
}

describe("reviewed directed travel graph", () => {
  it("validates graph identities, endpoints, evidence and relative weights", () => {
    expect(new Set(travelEdges.map(({ id }) => id)).size).toBe(
      travelEdges.length,
    );
    expect(new Set(travelNodes.map(({ id }) => id)).size).toBe(
      travelNodes.length,
    );
    for (const edge of travelEdges) {
      expect(travelNodes.some((node) => node.id === edge.from)).toBe(true);
      expect(travelNodes.some((node) => node.id === edge.to)).toBe(true);
      expect(edge.from).not.toBe(edge.to);
      expect(travelWeights[edge.transport]).toBeGreaterThan(0);
      expect(edge.factions.length).toBeGreaterThan(0);
      for (const sourceId of [
        ...edge.evidence.sourceIds,
        ...edge.factionEvidence.sourceIds,
      ])
        expect(catalogueSources.some((source) => source.id === sourceId)).toBe(
          true,
        );
      if (edge.transport === "flight")
        expect(edge.requiredUnlocks.length).toBeGreaterThanOrEqual(2);
      if (edge.prerequisites.length)
        expect(edge.requiredUnlocks.length).toBeGreaterThan(0);
    }
  });

  it("recognises adjacent local zones and gives numeric scores no time claims", () => {
    const result = findTravel(a, b, "Alliance");
    expect(result.difficulty).toBe("easy");
    expect(result.label).toBe("Easy travel");
    expect(result.explanation).toBe(
      "Adjacent zone · Classic-derived connection.",
    );
    expect(result.path).toEqual([a, b]);
    expect(result.score).toBe(1);
    expect(result.provisional).toBe(true);
    expect(result.confidence).toBe("classic-derived");
  });

  it("derives indirect regional travel from supported paths", () => {
    const result = findTravel(b, zoneId("redridge-mountains"), "Alliance");
    expect(result.difficulty).toBe("moderate");
    expect(result.path).toHaveLength(3);
    expect(result.score).toBe(2);
    expect(result.explanation).toContain("Via 2 road connections");
    const throughBlackrock = findTravel(
      zoneId("searing-gorge"),
      zoneId("burning-steppes"),
      "Horde",
    );
    expect(throughBlackrock.path).toContain("forever:pass:blackrock-mountain");
  });

  it("scores cross-continent journeys and exposes required transports", () => {
    const result = findTravel(a, c, "Alliance");
    expect(result.difficulty).toBe("long");
    expect(result.score).toBe(1 + travelWeights.boat + CROSS_CONTINENT_WEIGHT);
    expect(result.explanation).toContain(
      "Cross-continent travel · Boat required",
    );
    expect(travelPathNames(result)).toEqual([
      "Elwynn Forest",
      "Stormwind Harbor",
      "Darkshore",
    ]);
    expect(result.sourceIds).toContain("blizzard-found-photos");
    const horde = findTravel(
      zoneId("durotar"),
      zoneId("tirisfal-glades"),
      "Horde",
    );
    expect(horde.difficulty).toBe("long");
    expect(horde.explanation).toContain("Zeppelin required");
  });

  it("applies faction restrictions to every edge, including intermediate services", () => {
    expect(findTravel(a, c, "Horde").path).not.toContain(
      "forever:city:stormwind",
    );
    expect(
      findTravel(
        "a",
        "b",
        "Horde",
        {},
        [connection("a", "b", { factions: ["Alliance"] })],
        nodes,
      ).difficulty,
    ).toBe("unknown");
    expect(
      findTravel(
        "a",
        "c",
        "Horde",
        {},
        [
          connection("a", "b"),
          connection("b", "c", { factions: ["Alliance"] }),
        ],
        nodes,
      ).difficulty,
    ).toBe("unknown");
    expect(findTravel(a, b, "Unknown").difficulty).toBe("unknown");
    expect(
      findTravel(a, zoneId("redridge-mountains"), "Horde").difficulty,
    ).toBe("easy");
  });

  it("respects direction and does not infer a reverse connection", () => {
    const directed = [connection("a", "b")];
    expect(
      findTravel("a", "b", "Alliance", {}, directed, nodes).difficulty,
    ).toBe("easy");
    expect(
      findTravel("b", "a", "Alliance", {}, directed, nodes).difficulty,
    ).toBe("unknown");
    const wetlandsSouthshore = travelEdges.find(
      (edge) =>
        edge.from === zoneId("wetlands") &&
        edge.to === zoneId("hillsbrad-foothills") &&
        edge.transport === "boat",
    );
    expect(wetlandsSouthshore).toBeDefined();
    expect(
      travelEdges.find(
        (edge) =>
          edge.from === zoneId("hillsbrad-foothills") &&
          edge.to === zoneId("wetlands") &&
          edge.transport === "boat",
      ),
    ).toBeUndefined();
  });

  it("keeps missing nodes, edges, unknown evidence and unresolved unlocks grey", () => {
    expect(findTravel(undefined, a, "Alliance").difficulty).toBe("unknown");
    expect(findTravel("missing", "missing", "Alliance").difficulty).toBe(
      "unknown",
    );
    expect(findTravel(a, zoneId("mount-hyjal"), "Alliance").difficulty).toBe(
      "unknown",
    );
    expect(
      findTravel(zoneId("felwood"), zoneId("winterspring"), "Horde").difficulty,
    ).toBe("unknown");
    expect(
      findTravel(
        "a",
        "b",
        "Alliance",
        {},
        [
          connection("a", "b", {
            evidence: evidence("unknown", [], "Connection not established"),
          }),
        ],
        nodes,
      ).difficulty,
    ).toBe("unknown");
    const locked = [
      connection("a", "b", {
        requiredUnlocks: ["key"],
        prerequisites: ["key"],
      }),
    ];
    expect(findTravel("a", "b", "Alliance", {}, locked, nodes).difficulty).toBe(
      "unknown",
    );
    expect(
      findTravel("a", "b", "Alliance", { unlocks: ["key"] }, locked, nodes)
        .difficulty,
    ).toBe("easy");
    const prerequisite = [
      connection("a", "b", { prerequisites: ["quest:access"] }),
    ];
    expect(
      findTravel("a", "b", "Alliance", {}, prerequisite, nodes).difficulty,
    ).toBe("unknown");
    expect(
      findTravel(
        "a",
        "b",
        "Alliance",
        { completedPrerequisites: ["quest:access"] },
        prerequisite,
        nodes,
      ).difficulty,
    ).toBe("easy");
  });

  it("never assumes a flight path is discovered and requires both endpoints", () => {
    const stormwind = "forever:city:stormwind";
    expect(
      findTravel(b, stormwind, "Alliance").edges.every(
        (edge) => edge.transport !== "flight",
      ),
    ).toBe(true);
    expect(
      findTravel(b, stormwind, "Alliance", {
        discoveredFlightPaths: ["sentinel-hill"],
      }).edges.every((edge) => edge.transport !== "flight"),
    ).toBe(true);
    expect(
      findTravel(b, stormwind, "Alliance", {
        discoveredFlightPaths: ["sentinel-hill", "stormwind"],
      }).edges.some((edge) => edge.transport === "flight"),
    ).toBe(true);
    const isolatedFlight = [
      connection("a", "b", {
        transport: "flight",
        requiredUnlocks: ["flight:a", "flight:b"],
      }),
    ];
    expect(
      findTravel("a", "b", "Alliance", {}, isolatedFlight, nodes).difficulty,
    ).toBe("unknown");
    expect(
      findTravel(
        "a",
        "b",
        "Alliance",
        { discoveredFlightPaths: ["a", "b"] },
        isolatedFlight,
        nodes,
      ).score,
    ).toBe(travelWeights.flight);
    expect(
      findTravel(
        "a",
        "b",
        "Alliance",
        {},
        [connection("a", "b", { transport: "flight" })],
        nodes,
      ).difficulty,
    ).toBe("unknown");
  });

  it("uses deterministic minimum weights independent of edge input order", () => {
    const graph = [
      connection("a", "b"),
      connection("b", "d"),
      connection("a", "c"),
      connection("c", "d"),
      connection("a", "d", { transport: "other" }),
    ];
    const expected = findTravel("a", "d", "Alliance", {}, graph, nodes);
    expect(expected.path).toEqual(["a", "b", "d"]);
    expect(expected.score).toBe(2 + CROSS_CONTINENT_WEIGHT);
    expect(
      findTravel("a", "d", "Alliance", {}, [...graph].reverse(), nodes),
    ).toEqual(expected);
    expect(
      findTravel(
        "a",
        "d",
        "Alliance",
        {},
        [graph[3], graph[0], graph[4], graph[1], graph[2]],
        nodes,
      ),
    ).toEqual(expected);
  });

  it("recomputes from saved order and handles repeated visits and partial routes", () => {
    const original = travelForRoute([a, b, c], "Alliance");
    const reordered = travelForRoute([a, c, b], "Alliance");
    expect(original[1].difficulty).toBe("easy");
    expect(reordered[1].difficulty).toBe("long");
    expect(travelForRoute([a, a], "Alliance")[1].score).toBe(0);
    expect(travelForRoute([a, undefined, b], "Alliance")[2].difficulty).toBe(
      "unknown",
    );
    expect(travelForRoute([], "Horde")).toEqual([]);
  });

  it("makes multiple transport legs long and ignores future settings until supported", () => {
    const graph = [
      connection("a", "b", { transport: "boat" }),
      connection("b", "c", { transport: "tram" }),
    ];
    expect(findTravel("a", "c", "Alliance", {}, graph, nodes).difficulty).toBe(
      "long",
    );
    expect(
      findTravel(a, c, "Alliance", {
        hearthstoneZoneId: c,
        knownTeleports: [c],
        classTravelAbilities: ["teleport"],
      }),
    ).toEqual(findTravel(a, c, "Alliance"));
  });
});

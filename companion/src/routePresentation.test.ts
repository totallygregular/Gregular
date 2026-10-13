import { describe, expect, it } from "vitest";
import { zoneCatalogue, zoneId } from "./data/zones";
import { findTravel } from "./travel";
import { travelAppearance } from "./routePresentation";

describe("transport presentation", () => {
  it("uses an uncertain marker for missing connections and a compass for a chosen start", () => {
    const unknown = findTravel(zoneId("elwynn-forest"), "unresolved", "Alliance");
    expect(travelAppearance(unknown)).toEqual({ mode: "unknown", description: "Travel route unknown" });
    expect(travelAppearance(unknown, true).mode).toBe("start");
  });
  it("distinguishes adjacent roads, multi-leg roads and supported boats", () => {
    const from = zoneId("elwynn-forest");
    expect(travelAppearance(findTravel(from, zoneId("westfall"), "Alliance")).mode).toBe("walking");
    expect(travelAppearance(findTravel(zoneId("westfall"), zoneId("redridge-mountains"), "Alliance")).mode).toBe("road");
    expect(travelAppearance(findTravel(from, zoneId("darkshore"), "Alliance")).mode).toBe("boat");
  });
  it("never implies a transport mode absent from any selected catalogue path", () => {
    for (const faction of ["Alliance", "Horde"]) {
      for (const from of zoneCatalogue) for (const to of zoneCatalogue) {
        const travel = findTravel(from.id, to.id, faction);
        const { mode } = travelAppearance(travel);
        if (["boat", "zeppelin", "airship", "tram", "flight"].includes(mode))
          expect(travel.edges.some((edge) => edge.transport === mode), `${from.name} → ${to.name}`).toBe(true);
        if (travel.difficulty === "unknown") expect(mode).toBe("unknown");
      }
    }
  });
});

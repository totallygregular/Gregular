import { describe, expect, it } from "vitest";
import {
  catalogueMetadata,
  catalogueSources,
  classicRoadPairs,
  confidenceLabel,
  filterZones,
  getZone,
  startingZoneFor,
  zoneCatalogue,
  zoneId,
} from "./zones";

describe("versioned zone catalogue", () => {
  it("has broad 1–60 coverage, unique stable IDs and reviewed provenance", () => {
    expect(zoneCatalogue.length).toBeGreaterThanOrEqual(40);
    expect(new Set(zoneCatalogue.map(({ id }) => id)).size).toBe(
      zoneCatalogue.length,
    );
    expect(new Set(catalogueSources.map(({ id }) => id)).size).toBe(
      catalogueSources.length,
    );
    expect(catalogueMetadata.version).toBe("forever-zones-2026-10-13.2");
    for (const zone of zoneCatalogue) {
      expect(zone.id).toMatch(/^forever:zone:[a-z0-9-]+$/);
      expect(zone.reviewedAt).toBe(catalogueMetadata.reviewedAt);
      expect(zone.sourceUrls.length).toBeGreaterThan(0);
      for (const url of zone.sourceUrls)
        expect(new URL(url).protocol).toBe("https:");
      for (const field of Object.values(zone.evidence)) {
        expect(field.note.length).toBeGreaterThan(10);
        expect(["high", "medium", "low", "unknown"]).toContain(
          field.confidence,
        );
        for (const id of field.sourceIds)
          expect(catalogueSources.some((source) => source.id === id)).toBe(
            true,
          );
        if (field.kind !== "unknown")
          expect(field.sourceIds.length).toBeGreaterThan(0);
      }
      if (zone.recommendedLevel) {
        expect(Number.isInteger(zone.recommendedLevel.min)).toBe(true);
        expect(Number.isInteger(zone.recommendedLevel.max)).toBe(true);
        expect(zone.recommendedLevel.min).toBeGreaterThanOrEqual(1);
        expect(zone.recommendedLevel.max).toBeLessThanOrEqual(60);
        expect(zone.recommendedLevel.max).toBeGreaterThanOrEqual(
          zone.recommendedLevel.min,
        );
      } else expect(zone.evidence.levels.kind).toBe("unknown");
    }
    for (const faction of ["Alliance", "Horde"])
      for (const level of [1, 10, 20, 30, 40, 50, 60]) {
        expect(
          filterZones({ faction, level, suitability: "now" }).length,
        ).toBeGreaterThan(0);
      }
  });

  it("keeps confirmed, Classic-derived, client-derived and unknown fields distinct", () => {
    expect(getZone(zoneId("zephras-isle"))?.evidence.levels.kind).toBe(
      "forever-confirmed",
    );
    expect(getZone(zoneId("westfall"))?.recommendedLevel).toEqual({
      min: 10,
      max: 18,
    });
    expect(getZone(zoneId("westfall"))?.evidence.levels.kind).toBe(
      "classic-derived",
    );
    expect(getZone(zoneId("westfall"))?.evidence.levels.note).toContain(
      "new Forever quests are not included",
    );
    expect(getZone(zoneId("elwynn-forest"))?.recommendedLevel).toEqual({
      min: 1,
      max: 12,
    });
    expect(getZone(zoneId("tanaris"))?.evidence.levels.sourceIds).toEqual([
      "libtourist-classic",
    ]);
    expect(getZone(zoneId("moonglade"))?.recommendedLevel).toBeUndefined();
    expect(getZone(zoneId("mount-hyjal"))?.faction).toBe("Unknown");
    expect(
      confidenceLabel(getZone(zoneId("westfall"))!.evidence.levels),
    ).toContain("provisional");
    expect(
      zoneCatalogue.filter(
        (zone) => zone.evidence.levels.kind === "forever-confirmed",
      ),
    ).toHaveLength(1);
  });

  it("keeps Riverglades 35–45 as an editorial correction without upgrading official evidence", () => {
    const zone = getZone(zoneId("riverglades"))!;
    expect(zone.recommendedLevel).toEqual({ min: 35, max: 45 });
    expect(zone.evidence.levels).toMatchObject({
      kind: "editorial",
      confidence: "low",
      sourceIds: ["gregular-editorial-2026-10-13"],
    });
    expect(zone.evidence.levels.note).toContain("Owner-requested");
    expect(zone.evidence.levels.note).toContain("not established");
    expect(zone.evidence.identity.kind).toBe("forever-confirmed");
    expect(zone.evidence.faction.kind).toBe("forever-confirmed");
    expect(zone.evidence.geography.kind).toBe("editorial");
    expect(zone.startingRaces).toEqual([]);
    expect(zone.adjoiningZoneIds).toEqual([]);
    for (const level of [35, 40, 45])
      expect(
        filterZones({ level, suitability: "now" }).some(({ id }) => id === zone.id),
      ).toBe(true);
    expect(
      filterZones({ level: 34, suitability: "later" }).some(({ id }) => id === zone.id),
    ).toBe(true);
    expect(
      filterZones({ level: 46, suitability: "now" }).some(({ id }) => id === zone.id),
    ).toBe(false);
    expect(zoneCatalogue.filter(({ recommendedLevel }) => recommendedLevel)).toHaveLength(40);
    expect(zoneCatalogue.filter(({ recommendedLevel }) => !recommendedLevel)).toHaveLength(5);
  });

  it("filters questing suitability without inventing hard faction entry restrictions", () => {
    expect(
      filterZones({ faction: "Alliance" }).some(
        (zone) => zone.faction === "Horde",
      ),
    ).toBe(false);
    expect(
      filterZones({ faction: "Horde" }).some(
        (zone) => zone.faction === "Alliance",
      ),
    ).toBe(false);
    expect(
      filterZones({ faction: "Horde" }).some(
        (zone) => zone.id === zoneId("ashenvale"),
      ),
    ).toBe(true);
    for (const slug of ["redridge-mountains", "duskwood", "wetlands"]) {
      expect(
        filterZones({ faction: "Horde" }).some(
          (zone) => zone.id === zoneId(slug),
        ),
      ).toBe(false);
      expect(getZone(zoneId(slug))?.accessFactions).toBeUndefined();
      expect(getZone(zoneId(slug))?.evidence.faction.kind).toBe("editorial");
    }
    expect(
      filterZones({ faction: "Alliance" }).some(
        (zone) => zone.faction === "Unknown",
      ),
    ).toBe(true);
    expect(zoneCatalogue.every((zone) => !zone.accessFactions)).toBe(true);
    expect(
      filterZones({ continent: "Kalimdor" }).every(
        (zone) => zone.continent === "Kalimdor",
      ),
    ).toBe(true);
    expect(
      filterZones({ search: "  WESTFALL " }).map((zone) => zone.name),
    ).toEqual(["Westfall"]);
    expect(
      filterZones({ minLevel: 50, maxLevel: 60 })
        .filter((zone) => zone.recommendedLevel)
        .every((zone) => zone.recommendedLevel!.max >= 50),
    ).toBe(true);
  });

  it("prioritises suitable levels but keeps all zones and unknowns available by default", () => {
    const all = filterZones({ level: 18 });
    expect(all).toHaveLength(zoneCatalogue.length);
    expect(all[0].recommendedLevel!.min).toBeLessThanOrEqual(18);
    expect(all[0].recommendedLevel!.max).toBeGreaterThanOrEqual(18);
    expect(
      filterZones({ level: 18, suitability: "now" }).every(
        (zone) =>
          zone.recommendedLevel &&
          zone.recommendedLevel.min <= 18 &&
          zone.recommendedLevel.max >= 18,
      ),
    ).toBe(true);
    expect(
      filterZones({ level: 18, suitability: "later" }).every(
        (zone) => zone.recommendedLevel && zone.recommendedLevel.min > 18,
      ),
    ).toBe(true);
  });

  it("offers optional race starts without accepting wrong factions or inventing unknown races", () => {
    expect(startingZoneFor("Human", "Alliance")?.id).toBe(
      zoneId("elwynn-forest"),
    );
    expect(startingZoneFor("Dwarf", "Alliance")?.id).toBe(zoneId("dun-morogh"));
    expect(startingZoneFor("Gnome", "Alliance")?.id).toBe(zoneId("dun-morogh"));
    expect(startingZoneFor("night-elf", "Alliance")?.id).toBe(
      zoneId("teldrassil"),
    );
    expect(startingZoneFor("Orc", "Horde")?.id).toBe(zoneId("durotar"));
    expect(startingZoneFor("Tauren", "Horde")?.id).toBe(zoneId("mulgore"));
    expect(startingZoneFor("Undead", "Horde")?.id).toBe(
      zoneId("tirisfal-glades"),
    );
    expect(startingZoneFor("Skyborne", "Horde")?.id).toBe(
      zoneId("zephras-isle"),
    );
    expect(startingZoneFor("High Order Skyborne", "Horde")).toBeUndefined();
    expect(startingZoneFor("Human", "Horde")).toBeUndefined();
    expect(startingZoneFor("Unknown race", "Alliance")).toBeUndefined();
    expect(startingZoneFor("Human", "Unknown")).toBeUndefined();
  });

  it("preserves old zone identifiers and resolves updates without writing personal choices", () => {
    for (const slug of [
      "stonetalon-mountains",
      "ashenvale",
      "hillsbrad-foothills",
      "redridge-mountains",
      "duskwood",
      "wetlands",
    ])
      expect(getZone(zoneId(slug))).toBeDefined();
    const original = getZone(zoneId("westfall"))!;
    const personal = {
      zoneId: original.id,
      plannedLevel: { min: 12, max: 16 },
      notes: "Stay with friends",
    };
    const updated = zoneCatalogue.map((zone) =>
      zone.id === original.id
        ? { ...zone, recommendedLevel: { min: 9, max: 24 } }
        : zone,
    );
    expect(getZone(original.id, updated)?.recommendedLevel).toEqual({
      min: 9,
      max: 24,
    });
    expect(personal).toEqual({
      zoneId: original.id,
      plannedLevel: { min: 12, max: 16 },
      notes: "Stay with friends",
    });
    expect(original.recommendedLevel).toEqual({ min: 10, max: 18 });
    expect(getZone("forever:zone:missing")).toBeUndefined();
  });

  it("links only explicitly sourced neighbouring zones", () => {
    for (const [a, b] of classicRoadPairs) {
      expect(getZone(zoneId(a))?.adjoiningZoneIds).toContain(zoneId(b));
      expect(getZone(zoneId(b))?.adjoiningZoneIds).toContain(zoneId(a));
    }
    expect(getZone(zoneId("elwynn-forest"))?.adjoiningZoneIds).not.toContain(
      zoneId("darkshore"),
    );
    expect(getZone(zoneId("riverglades"))?.adjoiningZoneIds).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { progressionDataset } from "./progression";

describe("reviewed Forever progression snapshot", () => {
  it("has unique local record/template/source IDs and reviewed official references", () => {
    expect(progressionDataset.edition).toBe("WoW Forever");
    expect(progressionDataset.reviewedAt).toBe("2026-10-13");
    expect(progressionDataset.gameRevision).toBeNull();
    expect(progressionDataset.currentLevelCap).toBe(30);
    expect(progressionDataset.levelCapEvidence.confidence).toBe("confirmed");
    expect(
      progressionDataset.sources.some(
        ({ id }) => id === progressionDataset.levelCapEvidence.sourceId,
      ),
    ).toBe(true);
    for (const collection of [
      progressionDataset.records,
      progressionDataset.templates,
      progressionDataset.sources,
    ]) {
      expect(new Set(collection.map(({ id }) => id)).size).toBe(
        collection.length,
      );
    }
    for (const source of progressionDataset.sources) {
      expect(new URL(source.url).hostname).toBe("us.forums.blizzard.com");
      expect(source.reviewedAt).toBe(progressionDataset.reviewedAt);
    }
    for (const record of progressionDataset.records) {
      expect(record.gameId).toBeUndefined();
      expect(record.id).toMatch(/^forever:(zone|dungeon):/);
      for (const field of Object.values(record.evidence)) {
        if (field.confidence === "confirmed")
          expect(
            progressionDataset.sources.some(({ id }) => id === field.sourceId),
          ).toBe(true);
      }
    }
  });

  it("leaves unverified zone levels, factions, relationships and prerequisites unknown", () => {
    for (const record of progressionDataset.records) {
      expect(record.faction).toBe("Unknown");
      expect(record.evidence.prerequisites.confidence).toBe("unknown");
      expect(record.evidence.relationships.confidence).toBe("unknown");
      expect(record.minimumLevel).toBeUndefined();
      if (record.kind === "zone") {
        expect(record.announcedLevel).toBeUndefined();
        expect(record.evidence.levels.confidence).toBe("unknown");
      } else
        expect(record.evidence.levels.note).toContain("entry minimum unknown");
    }
  });

  it("keeps editorial route windows separate from confirmed catalogue facts", () => {
    expect(progressionDataset.templates).toHaveLength(2);
    for (const template of progressionDataset.templates) {
      expect(template.description).toContain("editorial");
      expect(new Set(template.entries.map(({ id }) => id)).size).toBe(
        template.entries.length,
      );
      for (const entry of template.entries) {
        expect(entry.notes).toContain("Editorial");
        expect(entry.targetLevel.max).toBeGreaterThanOrEqual(
          entry.targetLevel.min,
        );
        const record = progressionDataset.records.find(
          ({ id }) => id === entry.recordId,
        );
        expect(record?.kind).toBe("zone");
        expect(record?.announcedLevel).toBeUndefined();
      }
    }
  });
});

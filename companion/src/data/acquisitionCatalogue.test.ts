import { describe, expect, it } from "vitest";
import {
  createBlankAcquisition,
  searchItems,
  validateAcquisitionDataset,
} from "../acquisition";
import { acquisitionDataset } from "./acquisitionCatalogue";
import { getZone } from "./zones";

describe("reviewed acquisition starter catalogue", () => {
  it("passes the same validation contract as future snapshots", () => {
    expect(validateAcquisitionDataset(acquisitionDataset)).toEqual(
      acquisitionDataset,
    );
    for (const records of [
      acquisitionDataset.items,
      acquisitionDataset.sources,
      acquisitionDataset.quests,
      acquisitionDataset.dungeons,
      acquisitionDataset.npcs,
    ]) {
      expect(new Set(records.map((record) => record.id)).size).toBe(
        records.length,
      );
      for (const record of records) {
        expect(record.evidence.kind).toBe("reviewed-forever");
        expect(record.evidence.reviewedAt).toBe(acquisitionDataset.reviewedAt);
        expect(new URL(record.evidence.url!).protocol).toBe("https:");
        expect(
          Object.keys(record.evidence.fields ?? {}).length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("resolves typed item, source, NPC, dungeon and zone references", () => {
    for (const item of acquisitionDataset.items) {
      for (const sourceId of item.sourceIds) {
        const source = acquisitionDataset.sources.find(
          (record) => record.id === sourceId,
        );
        expect(source).toBeDefined();
        if (source?.questId) {
          const quest = acquisitionDataset.quests.find(
            (record) => record.id === source.questId,
          );
          expect(quest?.rewardItemIds).toContain(item.id);
        }
        if (source?.dungeonId)
          expect(
            acquisitionDataset.dungeons.some(
              (record) => record.id === source.dungeonId,
            ),
          ).toBe(true);
        if (source?.npcId)
          expect(
            acquisitionDataset.npcs.some(
              (record) => record.id === source.npcId,
            ),
          ).toBe(true);
        if (source?.zoneId) expect(getZone(source.zoneId)).toBeDefined();
      }
    }
    for (const dungeon of acquisitionDataset.dungeons)
      if (dungeon.zoneId) expect(getZone(dungeon.zoneId)).toBeDefined();
  });

  it("shares one reward quest for both reviewed reward choices", () => {
    const rewards = acquisitionDataset.sources.filter(
      (source) => source.method === "quest",
    );
    expect(rewards).toHaveLength(2);
    expect(new Set(rewards.map((source) => source.questId))).toEqual(
      new Set(["forever:quest:1013"]),
    );
    expect(
      acquisitionDataset.quests.find((quest) => quest.gameId === 1013)
        ?.rewardItemIds,
    ).toEqual(
      expect.arrayContaining(["forever:item:270030", "forever:item:6335"]),
    );
  });

  it("does not fill Forever prerequisite and level gaps from Classic", () => {
    const quest = acquisitionDataset.quests.find(
      (record) => record.gameId === 1013,
    )!;
    expect(quest.prerequisiteStatus).toBe("unknown");
    expect(quest.prerequisiteIds).toEqual([]);
    expect(quest.requiredLevel).toBeUndefined();
    expect(quest.availability).toBe("unknown");
    expect(
      acquisitionDataset.items.find((record) => record.gameId === 270030)
        ?.requiredLevel,
    ).toBeUndefined();
  });

  it("keeps disputed stats and drop chances out of shipped facts", () => {
    const mittens = acquisitionDataset.items.find(
      (record) => record.gameId === 270030,
    )!;
    expect(mittens.stats).toEqual([{ label: "Armor", value: "29" }]);
    for (const source of acquisitionDataset.sources)
      expect(source).not.toHaveProperty("dropChance");
  });

  it("searches real records by name, slot and acquisition method without guessing unknown levels", () => {
    const state = createBlankAcquisition();
    expect(
      searchItems(state, acquisitionDataset, {
        name: "PONDEROUS",
        method: "dungeon",
        slot: "Off hand",
      }).map((item) => item.gameId),
    ).toEqual([273052]);
    expect(
      searchItems(state, acquisitionDataset, { method: "quest" }).map(
        (item) => item.gameId,
      ),
    ).toEqual([270030, 6335]);
    expect(
      searchItems(state, acquisitionDataset, { method: "unknown" }).map(
        (item) => item.gameId,
      ),
    ).toEqual([273088]);
    expect(
      searchItems(state, acquisitionDataset, { maxLevel: 20 }).map(
        (item) => item.gameId,
      ),
    ).toEqual([273088]);
  });
});

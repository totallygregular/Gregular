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
      acquisitionDataset.recipes ?? [],
      acquisitionDataset.materials ?? [],
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
        if (source?.method === "craft") {
          const recipe = acquisitionDataset.recipes?.find(
            (record) => record.id === source.recipeId,
          );
          expect(recipe?.itemId).toBe(item.id);
          expect(source.itemIds).toContain(item.id);
        }
      }
    }
    for (const dungeon of acquisitionDataset.dungeons)
      if (dungeon.zoneId) expect(getZone(dungeon.zoneId)).toBeDefined();
    for (const recipe of acquisitionDataset.recipes ?? []) {
      expect(acquisitionDataset.items.some((item) => item.id === recipe.itemId)).toBe(true);
      for (const requirement of recipe.materials) {
        expect(acquisitionDataset.materials?.some((material) => material.id === requirement.materialId)).toBe(true);
        expect(Number.isSafeInteger(requirement.quantity)).toBe(true);
        expect(requirement.quantity).toBeGreaterThan(0);
      }
    }
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
    ).toEqual([273088, 10421, 250482]);
    expect(
      searchItems(state, acquisitionDataset, {
        method: "craft",
        equipmentType: "Mail",
        slot: "Feet",
        maxLevel: 10,
        quality: "rare",
      }).map((item) => item.gameId),
    ).toEqual([250482]);
  });

  it("retains a bounded six-item sample with two reviewed Forever craft sources", () => {
    expect(acquisitionDataset.items).toHaveLength(6);
    expect(acquisitionDataset.recipes).toHaveLength(2);
    expect(acquisitionDataset.materials).toHaveLength(3);
    const vest = acquisitionDataset.items.find((item) => item.gameId === 10421)!;
    expect(vest).toMatchObject({ quality: "uncommon", requiredLevel: 2, slot: "Chest", equipmentType: "Mail" });
    expect(vest.stats).toEqual([{ label: "Armor", value: "108" }, { label: "Stamina", value: "+1" }]);
    const boots = acquisitionDataset.items.find((item) => item.gameId === 250482)!;
    expect(boots).toMatchObject({ quality: "rare", requiredLevel: 10, slot: "Feet", equipmentType: "Mail" });
    expect(boots.evidence.note).toContain("bind-on-pickup");
    expect(vest.classRestrictions).toEqual([]);
    expect(boots.classRestrictions).toEqual([]);
  });

  it("shares material identity while preserving verified per-recipe quantities and unknown learning sources", () => {
    const vest = acquisitionDataset.recipes?.find((recipe) => recipe.id === "forever:recipe:rough-copper-vest")!;
    const boots = acquisitionDataset.recipes?.find((recipe) => recipe.id === "forever:recipe:glowing-copper-boots")!;
    expect(vest).toMatchObject({ profession: "Blacksmithing", requiredSkill: 1, materialCompleteness: "complete" });
    expect(vest.materials).toEqual([{ materialId: "forever:material:copper-bar", quantity: 4 }]);
    expect(boots).toMatchObject({ profession: "Blacksmithing", requiredSkill: 35, materialCompleteness: "complete" });
    expect(boots.materials).toEqual([
      { materialId: "forever:material:copper-bar", quantity: 2 },
      { materialId: "forever:material:lesser-magic-essence", quantity: 4 },
      { materialId: "forever:material:light-leather", quantity: 2 },
    ]);
    for (const recipe of [vest, boots]) {
      expect(recipe.sourceIds).toEqual([]);
      expect(recipe.recipeItemId).toBeUndefined();
      expect(recipe.specialRequirements).toBeUndefined();
    }
    for (const material of acquisitionDataset.materials ?? []) expect(material.gameId).toBeUndefined();
    for (const source of acquisitionDataset.sources.filter((source) => source.method === "craft")) expect(source.availability).toBe("unknown");
  });
});

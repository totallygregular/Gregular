import { describe, expect, it } from "vitest";
import {
  addChainStep,
  addManualChain,
  addManualDungeon,
  addManualItem,
  addManualQuest,
  addManualSource,
  addWishlistItem,
  createBlankAcquisition,
  getAcquisitionSummary,
  getChainProgress,
  getDungeonGoals,
  getQuestDependencyIssues,
  getQuestGoals,
  getSelectedSource,
  getZoneAcquisitionGoals,
  moveChainStep,
  recordDungeonRun,
  removeChainStep,
  removeManualChain,
  removeManualQuest,
  removeWishlistItem,
  resolveAcquisition,
  searchItems,
  setChainComplete,
  setDungeonNotes,
  setQuestComplete,
  setQuestNotes,
  trackQuest,
  updateManualChain,
  updateManualQuest,
  updateWishlistEntry,
  validateAcquisition,
  validateAcquisitionDataset,
  validateReferenceUrl,
} from "./acquisition";
import type {
  AcquisitionDataset,
  AcquisitionEvidence,
  AcquisitionSource,
  ItemRecord,
  QuestRecord,
} from "./acquisitionTypes";

// Deliberately synthetic test fixtures. These are never shipped as game records.
const evidence: AcquisitionEvidence = {
  kind: "reviewed-forever",
  note: "Synthetic unit-test fixture only.",
  url: "https://example.org/test",
};
const quest = (id: string, prerequisiteIds: string[] = []): QuestRecord => ({
  id,
  name: id,
  prerequisiteIds,
  prerequisiteStatus: "complete",
  followUpIds: [],
  rewardItemIds: [],
  requiredLevel: 10,
  availability: "available",
  evidence,
  zoneId: "test-zone",
});
const source = (
  id: string,
  method: AcquisitionSource["method"],
  target: string,
): AcquisitionSource => ({
  id,
  method,
  label: id,
  availability: "available",
  evidence,
  ...(method === "quest" ? { questId: target } : { dungeonId: target }),
});
const item = (id: string, sourceIds: string[]): ItemRecord => ({
  id,
  name: id,
  quality: "rare",
  slot: "Head",
  equipmentType: "Cloth",
  requiredLevel: 10,
  stats: [],
  classRestrictions: [],
  sourceIds,
  evidence,
});
function dataset(): AcquisitionDataset {
  return {
    version: "test-only",
    reviewedAt: "2026-10-14",
    items: [
      item("reward-a", ["quest-source"]),
      item("reward-b", ["quest-source"]),
      item("drop-a", ["dungeon-source"]),
      item("drop-b", ["dungeon-source"]),
      item("choice", ["quest-source", "dungeon-source"]),
      item("unknown-item", []),
    ],
    sources: [
      source("quest-source", "quest", "final"),
      source("dungeon-source", "dungeon", "test-dungeon"),
    ],
    quests: [
      quest("first"),
      quest("left", ["first"]),
      quest("right", ["first"]),
      quest("final", ["left", "right"]),
    ],
    dungeons: [
      {
        id: "test-dungeon",
        name: "Test dungeon",
        zoneId: "test-zone",
        evidence,
      },
    ],
    npcs: [],
  };
}

describe("shared acquisition planning", () => {
  it("finds removed source records under unknown acquisition without inventing a relationship", () => {
    const data = dataset();
    data.sources = [];
    const state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    expect(searchItems(state, data, { method: "unknown" })).toHaveLength(
      data.items.length,
    );
    expect(getQuestGoals(state, data)).toEqual([]);
    expect(state.wishlist[0].preferredSourceId).toBe("quest-source");
  });
  it("searches name, slot, quality, type, known level and source method", () => {
    const state = createBlankAcquisition(),
      data = dataset();
    expect(
      searchItems(state, data, {
        name: "reward",
        slot: "Head",
        quality: "rare",
        equipmentType: "Cloth",
        maxLevel: 10,
        method: "quest",
      }),
    ).toHaveLength(2);
    expect(searchItems(state, data, { method: "dungeon" })).toHaveLength(3);
    expect(
      searchItems(state, data, { method: "unknown" }).map((item) => item.id),
    ).toEqual(["unknown-item"]);
    expect(searchItems(state, data, { maxLevel: 9 })).toEqual([]);
    expect(searchItems(state, data, { quality: "epic" })).toEqual([]);
  });

  it("requires explicit source selection, including when only one source is known", () => {
    const data = dataset(),
      state = addWishlistItem(createBlankAcquisition(), "reward-a");
    expect(getQuestGoals(state, data)).toEqual([]);
    expect(
      getSelectedSource(state.wishlist[0], resolveAcquisition(state, data)),
    ).toBeUndefined();
    expect(getAcquisitionSummary(state, data).unresolvedItems).toBe(1);
    const selected = updateWishlistEntry(state, state.wishlist[0].id, {
      preferredSourceId: "quest-source",
    });
    expect(getQuestGoals(selected, data)).toHaveLength(4);
    expect(state.wishlist[0].preferredSourceId).toBeUndefined();
  });

  it("rejects duplicate wishlist items and preserves independent characters", () => {
    const initial = createBlankAcquisition(),
      first = addWishlistItem(initial, "reward-a");
    expect(() => addWishlistItem(first, "reward-a")).toThrow("already");
    expect(addWishlistItem(initial, "reward-a").wishlist[0].id).not.toBe(
      first.wishlist[0].id,
    );
    expect(initial.wishlist).toEqual([]);
  });

  it("groups multiple drops into one dungeon and tracks runs separately from item ownership", () => {
    const data = dataset();
    let state = addWishlistItem(
      createBlankAcquisition(),
      "drop-a",
      "dungeon-source",
    );
    state = addWishlistItem(state, "drop-b", "dungeon-source");
    expect(getDungeonGoals(state, data)).toHaveLength(1);
    expect(getDungeonGoals(state, data)[0].items).toHaveLength(2);
    state = recordDungeonRun(state, "test-dungeon");
    state = setDungeonNotes(state, "test-dungeon", "Try again Friday");
    expect(state.wishlist.every((entry) => entry.status === "wanted")).toBe(
      true,
    );
    expect(getDungeonGoals(state, data)[0].progress).toMatchObject({
      runsCompleted: 1,
      notes: "Try again Friday",
    });
    state = updateWishlistEntry(state, state.wishlist[0].id, {
      status: "acquired",
    });
    expect(getDungeonGoals(state, data)[0].items).toHaveLength(1);
    expect(getDungeonGoals(state, data)[0].progress.runsCompleted).toBe(1);
  });

  it("shares quest and branching prerequisite records without duplicating persistent goals", () => {
    const data = dataset();
    let state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    state = addWishlistItem(state, "reward-b", "quest-source");
    const goals = getQuestGoals(state, data, 10);
    expect(goals).toHaveLength(4);
    expect(
      goals.find((goal) => goal.questId === "final")?.desiredItems,
    ).toHaveLength(2);
    expect(
      goals
        .filter((goal) => goal.questId !== "final")
        .every(
          (goal) =>
            goal.desiredItems.length === 0 && goal.supportingItems.length === 2,
        ),
    ).toBe(true);
    expect(goals.find((goal) => goal.questId === "first")?.ready).toBe(true);
    expect(goals.find((goal) => goal.questId === "final")?.ready).toBe(false);
    expect(state.questProgress).toEqual([]);
    state = setQuestComplete(state, "first", true);
    state = setQuestComplete(state, "left", true);
    state = setQuestComplete(state, "right", true);
    expect(
      getQuestGoals(state, data, 10).find((goal) => goal.questId === "final")
        ?.ready,
    ).toBe(true);
  });

  it("removes one shared goal dependency while preserving other rewards and manual progress", () => {
    const data = dataset();
    let state = addManualQuest(createBlankAcquisition(), {
      name: "My own task",
    });
    const manualId = state.manualQuests[0].id;
    state = addWishlistItem(state, "reward-a", "quest-source");
    state = addWishlistItem(state, "reward-b", "quest-source");
    state = setQuestNotes(state, "final", "Personal reward note");
    state = setQuestComplete(state, "first", true);
    state = removeWishlistItem(state, state.wishlist[0].id);
    expect(
      getQuestGoals(state, data)
        .find((goal) => goal.questId === "final")
        ?.desiredItems.map((item) => item.id),
    ).toEqual(["reward-b"]);
    state = removeWishlistItem(state, state.wishlist[0].id);
    expect(
      getQuestGoals(state, data).some((goal) => goal.questId === manualId),
    ).toBe(true);
    expect(
      state.questProgress.find((entry) => entry.questId === "final")?.notes,
    ).toBe("Personal reward note");
    expect(
      state.questProgress.find((entry) => entry.questId === "first")?.status,
    ).toBe("completed");
  });

  it("source changes update views without losing wishlist notes or status", () => {
    const data = dataset();
    let state = addWishlistItem(
      createBlankAcquisition(),
      "choice",
      "quest-source",
    );
    const id = state.wishlist[0].id;
    state = updateWishlistEntry(state, id, {
      notes: "Keep this",
      preferredSourceId: "dungeon-source",
    });
    expect(getQuestGoals(state, data)).toEqual([]);
    expect(getDungeonGoals(state, data)).toHaveLength(1);
    state = updateWishlistEntry(state, id, {
      status: "dismissed",
      preferredSourceId: "quest-source",
    });
    expect(state.wishlist[0]).toMatchObject({
      notes: "Keep this",
      status: "dismissed",
    });
    expect(getDungeonGoals(state, data)).toEqual([]);
    expect(getQuestGoals(state, data)).toEqual([]);
  });

  it("acquiring a reward never completes a source quest or run", () => {
    const data = dataset();
    let state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    state = trackQuest(state, "final");
    state = updateWishlistEntry(state, state.wishlist[0].id, {
      status: "acquired",
    });
    expect(
      getQuestGoals(state, data).find((goal) => goal.questId === "final")
        ?.progress.status,
    ).toBe("planned");
    expect(state.dungeonProgress).toEqual([]);
    expect(getAcquisitionSummary(state, data).acquiredItems).toBe(1);
  });

  it("keeps missing item, source and quest IDs through validation and catalogue changes", () => {
    let state = addWishlistItem(
      createBlankAcquisition(),
      "removed-item",
      "removed-source",
    );
    state = setQuestComplete(state, "removed-quest", true);
    const roundtrip = validateAcquisition(JSON.parse(JSON.stringify(state)));
    expect(roundtrip).toEqual(state);
    expect(getAcquisitionSummary(roundtrip, dataset()).unresolvedItems).toBe(1);
    expect(getQuestGoals(roundtrip, dataset())[0]).toMatchObject({
      questId: "removed-quest",
      progress: { status: "completed" },
    });
    expect(
      getQuestGoals(roundtrip, dataset())[0].blockedReasons.join(" "),
    ).toContain("missing");
  });

  it("does not permit a preferred source unrelated to an item to create false derived goals", () => {
    const data = dataset(),
      state = addWishlistItem(
        createBlankAcquisition(),
        "unknown-item",
        "quest-source",
      );
    expect(getQuestGoals(state, data)).toEqual([]);
    expect(state.wishlist[0].preferredSourceId).toBe("quest-source");
  });

  it("keeps incomplete prerequisites, unknown availability and unknown levels out of Next Up", () => {
    const data = dataset();
    let state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    data.quests[0].prerequisiteStatus = "unknown";
    expect(
      getQuestGoals(state, data, 60).find((goal) => goal.questId === "first")
        ?.ready,
    ).toBe(false);
    data.quests[0].prerequisiteStatus = "complete";
    data.quests[0].availability = "unknown";
    expect(
      getQuestGoals(state, data, 60).find((goal) => goal.questId === "first")
        ?.ready,
    ).toBe(false);
    data.quests[0].availability = "available";
    delete data.quests[0].requiredLevel;
    expect(
      getQuestGoals(state, data, 60).find((goal) => goal.questId === "first")
        ?.ready,
    ).toBe(false);
    data.quests[0].requiredLevel = 10;
    data.sources[0].availability = "unknown";
    expect(
      getQuestGoals(state, data, 60).find((goal) => goal.questId === "final")
        ?.blockedReasons,
    ).toContain("Desired reward source availability requires review.");
    expect(
      getQuestGoals(state, data, 60).find((goal) => goal.questId === "first")
        ?.ready,
    ).toBe(true);
    state = updateWishlistEntry(state, state.wishlist[0].id, {
      preferredSourceId: undefined,
    });
    expect(getQuestGoals(state, data, 60)).toEqual([]);
  });

  it("retains missing prerequisites and reports graph cycles safely", () => {
    const data = dataset();
    data.quests[0].prerequisiteIds = ["final", "removed"];
    const state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    const goals = getQuestGoals(state, data, 60);
    expect(goals).toHaveLength(5);
    expect(goals.every((goal) => !goal.ready)).toBe(true);
    expect(
      goals.find((goal) => goal.questId === "first")?.unresolvedPrerequisiteIds,
    ).toContain("removed");
    expect(
      getQuestDependencyIssues(data.quests).some(
        (issue) => issue.kind === "cycle",
      ),
    ).toBe(true);
    expect(() => validateAcquisitionDataset(data)).toThrow("cycle");
  });

  it("handles deep prerequisite graphs iteratively and preserves shared prerequisites", () => {
    const data = dataset();
    data.quests = Array.from({ length: 12000 }, (_, index) =>
      quest(`deep-${index}`, index ? [`deep-${index - 1}`] : []),
    );
    data.sources[0].questId = "deep-11999";
    const state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    expect(getQuestDependencyIssues(data.quests)).toEqual([]);
    expect(getQuestGoals(state, data, 10)).toHaveLength(12000);
  });

  it("supports manual ordered chain CRUD, step reorder and independent completion", () => {
    let state = addManualChain(createBlankAcquisition(), {
      name: "My chain",
      notes: "Bring supplies",
      referenceUrl: "https://example.org/personal",
    });
    const chainId = state.manualChains[0].id;
    state = addChainStep(state, chainId, {
      name: "First step",
      zoneName: "Personal zone",
      requiredLevel: 12,
    });
    state = addChainStep(state, chainId, { name: "Second step" });
    const [firstId, secondId] = state.manualChains[0].questIds;
    state = updateManualQuest(state, firstId, {
      name: "Edited step",
      notes: "Updated",
      recommendedLevel: 12,
    });
    state = updateManualChain(state, chainId, { name: "Edited chain" });
    state = setQuestComplete(state, firstId, true);
    expect(getChainProgress(state, chainId)).toEqual({
      completed: 1,
      total: 2,
    });
    expect(state.manualQuests[0]).toMatchObject({
      id: firstId,
      name: "Edited step",
      recommendedLevel: 12,
    });
    state = moveChainStep(state, chainId, secondId, "up");
    expect(state.manualChains[0].questIds).toEqual([secondId, firstId]);
    state = setChainComplete(state, chainId, true);
    expect(getChainProgress(state, chainId)).toEqual({
      completed: 2,
      total: 2,
    });
    state = removeChainStep(state, chainId, firstId);
    expect(getChainProgress(state, chainId)).toEqual({
      completed: 1,
      total: 1,
    });
    state = removeManualChain(state, chainId);
    expect(state.manualQuests).toHaveLength(2);
    expect(
      state.questProgress.every((entry) => entry.status === "completed"),
    ).toBe(true);
    state = removeManualQuest(state, firstId);
    expect(
      getQuestGoals(state, dataset()).find((goal) => goal.questId === firstId)
        ?.quest,
    ).toBeUndefined();
    expect(
      state.questProgress.find((entry) => entry.questId === firstId)?.notes,
    ).toBe("Updated");
  });

  it("supports explicit personal availability without claiming in-game acceptance", () => {
    let state = addManualQuest(createBlankAcquisition(), {
      name: "Personal plan",
      requiredLevel: 12,
      availability: "available",
      prerequisiteStatus: "complete",
    });
    const id = state.manualQuests[0].id;
    expect(getQuestGoals(state, dataset(), 11)[0].ready).toBe(false);
    expect(getQuestGoals(state, dataset(), 12)[0]).toMatchObject({
      ready: true,
      progress: { status: "planned" },
      quest: { evidence: { kind: "user-supplied" } },
    });
    state = updateManualQuest(state, id, {
      name: "Personal plan",
      requiredLevel: 12,
      prerequisiteIds: ["unknown-prerequisite"],
    });
    expect(
      getQuestGoals(state, dataset(), 12).find((goal) => goal.questId === id)
        ?.ready,
    ).toBe(false);
  });

  it("keeps available prerequisite preparation ready when its later reward source is uncertain or above level", () => {
    const data = dataset();
    data.sources[0].availability = "unknown";
    data.sources[0].requiredLevel = 50;
    let state = trackQuest(createBlankAcquisition(), "first");
    expect(getQuestGoals(state, data, 10)[0].ready).toBe(true);
    state = addWishlistItem(state, "reward-a", "quest-source");
    const goals = getQuestGoals(state, data, 10);
    expect(goals.find((goal) => goal.questId === "first")).toMatchObject({
      ready: true,
      desiredItems: [],
    });
    expect(
      goals.find((goal) => goal.questId === "first")?.supportingItems,
    ).toHaveLength(1);
    expect(
      goals.find((goal) => goal.questId === "final")?.blockedReasons,
    ).toContain("Desired reward source availability requires review.");
    expect(
      goals.find((goal) => goal.questId === "final")?.blockedReasons,
    ).toContain("Reward source requires level 50.");
  });

  it("respects a player's later target level above an earlier known quest minimum", () => {
    const state = addManualQuest(createBlankAcquisition(), {
      name: "My later quest",
      requiredLevel: 5,
      recommendedLevel: 30,
      availability: "available",
      prerequisiteStatus: "complete",
    });
    expect(getQuestGoals(state, dataset(), 10)[0]).toMatchObject({
      ready: false,
    });
    expect(getQuestGoals(state, dataset(), 10)[0].blockedReasons).toContain(
      "Planned from level 30.",
    );
    expect(getQuestGoals(state, dataset(), 30)[0].ready).toBe(true);
  });

  it("detects cycles combining manual chain order with explicit prerequisites", () => {
    let state = addManualChain(createBlankAcquisition(), {
      name: "My ordered chain",
    });
    const chainId = state.manualChains[0].id;
    state = addChainStep(state, chainId, {
      name: "A",
      requiredLevel: 5,
      availability: "available",
      prerequisiteStatus: "complete",
    });
    state = addChainStep(state, chainId, {
      name: "B",
      requiredLevel: 5,
      availability: "available",
      prerequisiteStatus: "complete",
    });
    const [a, b] = state.manualChains[0].questIds;
    state = updateManualQuest(state, a, {
      name: "A",
      requiredLevel: 5,
      prerequisiteIds: [b],
    });
    expect(
      getQuestGoals(state, dataset(), 10).every((goal) =>
        goal.blockedReasons.some((reason) => reason.includes("cycle")),
      ),
    ).toBe(true);
    state = setChainComplete(state, chainId, true);
    expect(
      getQuestGoals(state, dataset(), 10).every((goal) =>
        goal.blockedReasons.some((reason) => reason.includes("cycle")),
      ),
    ).toBe(true);
    state = setQuestComplete(state, a, false);
    expect(
      getQuestGoals(state, dataset(), 10).find((goal) => goal.questId === a)
        ?.ready,
    ).toBe(false);
    expect(validateAcquisition(JSON.parse(JSON.stringify(state)))).toEqual(
      state,
    );
  });

  it("creates user-authored item to quest and dungeon relationships without modifying reference records", () => {
    const data = dataset(),
      unchanged = JSON.stringify(data);
    let state = addManualItem(createBlankAcquisition(), {
      name: "My desired item",
      slot: "Hands",
      referenceUrl: "https://example.org/item",
    });
    const id = state.manualItems[0].id;
    state = addManualQuest(state, {
      name: "My reward quest",
      zoneId: "test-zone",
    });
    const questId = state.manualQuests[0].id;
    state = addManualSource(state, id, {
      method: "quest",
      label: "My reward",
      questId,
      availability: "unknown",
    });
    const questSource = state.manualSources[0].id;
    state = addManualDungeon(state, {
      name: "My dungeon",
      zoneId: "test-zone",
    });
    state = addManualSource(state, id, {
      method: "dungeon",
      label: "My dungeon source",
      dungeonId: state.manualDungeons[0].id,
      availability: "unknown",
    });
    state = addWishlistItem(state, id, questSource);
    expect(
      getQuestGoals(state, data).find((goal) => goal.questId === questId)
        ?.desiredItems[0].id,
    ).toBe(id);
    state = updateWishlistEntry(state, state.wishlist[0].id, {
      preferredSourceId: state.manualSources[1].id,
    });
    expect(getDungeonGoals(state, data)[0].dungeon?.name).toBe("My dungeon");
    expect(state.manualItems[0].evidence.kind).toBe("user-supplied");
    expect(JSON.stringify(data)).toBe(unchanged);
  });

  it("shows honest zone counts through quest and dungeon source links without changing routes", () => {
    const data = dataset();
    let state = addWishlistItem(
      createBlankAcquisition(),
      "reward-a",
      "quest-source",
    );
    state = addWishlistItem(state, "drop-a", "dungeon-source");
    expect(getZoneAcquisitionGoals(state, data, "test-zone")).toEqual({
      quests: 4,
      desiredItems: 2,
      dungeonGoals: 1,
    });
    expect(getZoneAcquisitionGoals(state, data, "unrelated")).toEqual({
      quests: 0,
      desiredItems: 0,
      dungeonGoals: 0,
    });
  });
});

describe("untrusted acquisition validation", () => {
  it("round-trips personal records while discarding unknown fields", () => {
    const state = addManualQuest(createBlankAcquisition(), {
      name: "Safe <script>text</script>",
      notes: "Spacing  \n  preserved.  ",
    });
    const checked = validateAcquisition({
      ...state,
      injected: "discarded",
      manualQuests: state.manualQuests.map((quest) => ({
        ...quest,
        script: "discarded",
      })),
    });
    expect(checked).toEqual(state);
    expect(checked).not.toHaveProperty("injected");
    expect(checked.manualQuests[0]).not.toHaveProperty("script");
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///tmp/item",
    "https://user:password@example.org",
    "//example.org",
    "not a URL",
  ])("rejects unsafe reference %s", (url) => {
    expect(() => validateReferenceUrl(url)).toThrow("Reference URL");
    expect(() =>
      addManualItem(createBlankAcquisition(), {
        name: "My item",
        referenceUrl: url,
      }),
    ).toThrow();
  });
  it("validates safe link protocols, lengths, booleans, integers and list limits", () => {
    expect(validateReferenceUrl("https://example.org/path")).toBe(
      "https://example.org/path",
    );
    const state = createBlankAcquisition();
    expect(() =>
      validateAcquisition({ ...state, wishlist: Array(1001).fill({}) }),
    ).toThrow("1000");
    expect(() => addManualQuest(state, { name: "x".repeat(201) })).toThrow();
    expect(() =>
      addManualQuest(state, { name: "x", requiredLevel: 61 }),
    ).toThrow();
    expect(() => setQuestComplete(state, "quest", "yes" as never)).toThrow();
    expect(() =>
      validateAcquisition({
        ...state,
        dungeonProgress: [
          { dungeonId: "d", runsCompleted: -1, notes: "", tracked: true },
        ],
      }),
    ).toThrow();
  });
  it("rejects duplicate IDs and attempts to masquerade personal data as verified catalogue records", () => {
    const state = addManualQuest(createBlankAcquisition(), { name: "My task" });
    expect(() =>
      validateAcquisition({
        ...state,
        manualQuests: [state.manualQuests[0], state.manualQuests[0]],
      }),
    ).toThrow("duplicate");
    expect(() =>
      validateAcquisition({
        ...state,
        manualQuests: [{ ...state.manualQuests[0], evidence }],
      }),
    ).toThrow("user-supplied");
    expect(() =>
      validateAcquisition({
        ...state,
        manualQuests: [{ ...state.manualQuests[0], id: "forever:quest:123" }],
      }),
    ).toThrow("user ID");
    expect(() =>
      validateAcquisition({
        ...state,
        questProgress: [...state.questProgress, state.questProgress[0]],
      }),
    ).toThrow("duplicate");
    expect(() =>
      validateAcquisitionDataset({
        ...dataset(),
        items: [item("__proto__", [])],
      }),
    ).toThrow("ID");
  });
});

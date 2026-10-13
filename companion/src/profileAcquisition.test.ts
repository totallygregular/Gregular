import { describe, expect, it } from "vitest";
import {
  addCharacter,
  addObjective,
  createProfile,
  migrateProfile,
  setCharacterAcquisition,
  setCharacterPlanner,
  setNotes,
  validateProfile,
} from "./domain";
import {
  addChainStep,
  addManualChain,
  addManualItem,
  addManualQuest,
  addManualSource,
  addWishlistItem,
  createBlankAcquisition,
  recordDungeonRun,
  setQuestComplete,
  updateWishlistEntry,
} from "./acquisition";
import { addEntry } from "./planner";
import {
  BrowserProfileRepository,
  profileStorageKey,
  profileV1BackupKey,
  profileV2BackupKey,
  type StorageLike,
} from "./profileRepository";
import { parseProfileTransfer } from "./profileTransfer";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
function profileFixture(username = "Connected planner") {
  let profile = addCharacter(createProfile(username), {
    name: "Planner",
    race: "Troll",
    className: "Priest",
    faction: "Horde",
    plannedSpec: "Holy",
    level: 24,
    status: "leveling",
  });
  const id = profile.characters[0].id;
  profile = setNotes(profile, id, "Previous notes\n  intentional spacing.  ");
  profile = addObjective(profile, id, "Previous objective", "high");
  return setCharacterPlanner(
    profile,
    id,
    addEntry(profile.characters[0].planner, {
      kind: "custom",
      title: "Previous route goal",
      status: "completed",
      notes: "Preserve this",
    }),
  );
}
function oldV2(profile = profileFixture()) {
  return {
    ...profile,
    schemaVersion: 2,
    characters: profile.characters.map(
      ({ acquisition: _acquisition, ...character }) => character,
    ),
  };
}
function connectedFixture() {
  let profile = profileFixture();
  const id = profile.characters[0].id;
  let state = addManualQuest(createBlankAcquisition(), {
    name: "Personal reward quest",
    requiredLevel: 20,
    zoneName: "Personal zone",
    notes: "Quest note",
    referenceUrl: "https://example.org/reference",
  });
  const questId = state.manualQuests[0].id;
  state = addManualItem(state, {
    name: "Personal desired item",
    slot: "Hands",
  });
  const itemId = state.manualItems[0].id;
  state = addManualSource(state, itemId, {
    method: "quest",
    label: "Personal reward source",
    questId,
    availability: "unknown",
  });
  state = addWishlistItem(state, itemId, state.manualSources[0].id);
  state = updateWishlistEntry(state, state.wishlist[0].id, {
    notes: "Personal item note",
  });
  state = addManualChain(state, {
    name: "Separate chain",
    notes: "Chain note",
  });
  const chainId = state.manualChains[0].id;
  state = addChainStep(state, chainId, {
    name: "First step",
    zoneId: "removed-zone-reference",
  });
  state = addChainStep(state, chainId, { name: "Second step" });
  state = setQuestComplete(state, state.manualChains[0].questIds[0], true);
  state = recordDungeonRun(state, "removed-dungeon-reference");
  profile = setCharacterAcquisition(profile, id, state);
  return profile;
}

describe("schema 3 connected plans and compatibility", () => {
  it("migrates v2 without changing previous state or source JSON", () => {
    const previous = oldV2(),
      raw = JSON.stringify(previous, null, 2);
    const migrated = migrateProfile(JSON.parse(raw));
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.characters[0].acquisition).toEqual(
      createBlankAcquisition(),
    );
    const { acquisition: _acquisition, ...preserved } = migrated.characters[0];
    expect(preserved).toEqual(previous.characters[0]);
    expect(JSON.stringify(previous, null, 2)).toBe(raw);
    expect(parseProfileTransfer(raw).sourceSchemaVersion).toBe(2);
    expect(validateProfile(migrated)).toEqual(migrated);
    expect(() => validateProfile(previous)).toThrow("unsupported");
  });
  it("loads v2 without writes, then stores its exact one-time backup before saving v3", async () => {
    const storage = new MemoryStorage(),
      previous = oldV2(),
      raw = JSON.stringify(previous, null, 2),
      username = previous.username;
    storage.setItem(profileStorageKey(username), raw);
    const repository = new BrowserProfileRepository(storage),
      loaded = await repository.load(username);
    expect(loaded.mode).toBe("ready");
    expect(loaded.message).toContain("backed up");
    expect(storage.values.size).toBe(1);
    expect(storage.getItem(profileStorageKey(username))).toBe(raw);
    expect((await repository.save(loaded.profile!)).ok).toBe(true);
    expect(storage.getItem(profileV2BackupKey(username))).toBe(raw);
    expect(storage.getItem(profileV1BackupKey(username))).toBeNull();
    const saved = (await repository.load(username)).profile!;
    expect(
      (
        await repository.save(
          setNotes(saved, saved.characters[0].id, "Next note"),
        )
      ).ok,
    ).toBe(true);
    expect(storage.getItem(profileV2BackupKey(username))).toBe(raw);
  });
  it("preserves older v2 backups and refuses migration if backup creation fails", async () => {
    const storage = new MemoryStorage(),
      previous = oldV2(),
      raw = JSON.stringify(previous),
      username = previous.username;
    storage.setItem(profileStorageKey(username), raw);
    let repository = new BrowserProfileRepository(storage);
    let loaded = (await repository.load(username)).profile!;
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === profileV2BackupKey(username)) throw new Error("quota");
      write(key, value);
    };
    expect((await repository.save(loaded)).ok).toBe(false);
    expect(storage.getItem(profileStorageKey(username))).toBe(raw);
    storage.setItem = write;
    storage.setItem(profileV2BackupKey(username), "earlier exact backup");
    repository = new BrowserProfileRepository(storage);
    loaded = (await repository.load(username)).profile!;
    expect((await repository.save(loaded)).ok).toBe(true);
    expect(storage.getItem(profileV2BackupKey(username))).toBe(
      "earlier exact backup",
    );
  });
  it("retains revision conflicts for v2 tabs and independent characters/usernames", async () => {
    const storage = new MemoryStorage(),
      previous = oldV2();
    storage.setItem(
      profileStorageKey(previous.username),
      JSON.stringify(previous),
    );
    const first = new BrowserProfileRepository(storage),
      second = new BrowserProfileRepository(storage);
    const originalA = (await first.load(previous.username)).profile!,
      originalB = (await second.load(previous.username)).profile!;
    const connected = connectedFixture().characters[0].acquisition;
    expect(
      (
        await first.save(
          setCharacterAcquisition(
            originalA,
            originalA.characters[0].id,
            connected,
          ),
        )
      ).ok,
    ).toBe(true);
    expect((await second.save(originalB)).ok).toBe(false);
    let profile = addCharacter(connectedFixture(), {
      name: "Other character",
      race: "Human",
      className: "Mage",
      faction: "Alliance",
      plannedSpec: "",
      level: 1,
      status: "planned",
    });
    const unchanged = profile.characters[1];
    profile = setCharacterAcquisition(
      profile,
      profile.characters[0].id,
      createBlankAcquisition(),
    );
    expect(profile.characters[1]).toBe(unchanged);
    expect(profileFixture("Other username").characters[0].acquisition).toEqual(
      createBlankAcquisition(),
    );
  });
  it("round-trips all supported state and relationships into a separate environment", async () => {
    const profile = connectedFixture(),
      exported = JSON.stringify(profile),
      parsed = parseProfileTransfer(exported);
    expect(parsed.profile).toEqual(profile);
    expect(parsed.summary).toMatchObject({
      wishlistEntries: 1,
      questGoals: 3,
      questChains: 1,
      dungeonGoals: 1,
    });
    const destination = new BrowserProfileRepository(new MemoryStorage()),
      preview = await destination.prepareImport(exported);
    expect(preview.ok).toBe(true);
    const applied = await destination.applyTransfer(preview.preparation!.token);
    expect(applied.ok).toBe(true);
    const loaded = (await destination.load(profile.username)).profile!;
    expect(loaded.characters).toEqual(profile.characters);
    const state = loaded.characters[0].acquisition;
    expect(state.wishlist[0].preferredSourceId).toBe(state.manualSources[0].id);
    expect(state.manualSources[0].questId).toBe(state.manualQuests[0].id);
    expect(
      state.questProgress.find(
        (entry) => entry.questId === state.manualChains[0].questIds[0],
      )?.status,
    ).toBe("completed");
    expect(state.dungeonProgress[0].dungeonId).toBe(
      "removed-dungeon-reference",
    );
  });
  it("failed imports cannot mutate good profiles, backups or unresolved progress", async () => {
    const storage = new MemoryStorage(),
      repository = new BrowserProfileRepository(storage),
      profile = connectedFixture();
    await repository.save(profile);
    const before = new Map(storage.values);
    const state = profile.characters[0].acquisition;
    const corrupt = {
      ...profile,
      characters: [
        {
          ...profile.characters[0],
          acquisition: {
            ...state,
            wishlist: [...state.wishlist, state.wishlist[0]],
          },
        },
      ],
    };
    expect((await repository.prepareImport(JSON.stringify(corrupt))).ok).toBe(
      false,
    );
    expect(storage.values).toEqual(before);
    expect(
      (await repository.load(profile.username)).profile?.characters[0]
        .acquisition,
    ).toEqual(state);
  });
});

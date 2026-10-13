import { describe, expect, it } from "vitest";
import {
  addCharacter,
  createProfile,
  setCharacterPlanner,
  setNotes,
  setObjectiveComplete,
  type Profile,
} from "./domain";
import { addEntry } from "./planner";
import {
  BrowserProfileRepository,
  profileReplacementBackupKey,
  profileStorageKey,
  profileV1BackupKey,
  type StorageLike,
} from "./profileRepository";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function populatedProfile(username = "Greg"): Profile {
  return addCharacter(createProfile(username), {
    name: "Zala",
    race: "Troll",
    className: "Priest",
    faction: "Horde",
    plannedSpec: "Holy",
    level: 12,
    status: "leveling",
  });
}

function legacyRaw(): string {
  let profile = addCharacter(
    populatedProfile(),
    {
      name: "Second character",
      race: "Human",
      className: "Mage",
      faction: "Alliance",
      plannedSpec: "Frost",
      level: 24,
      status: "leveling",
    },
    { mockObjectives: true },
  );
  const second = profile.characters[1];
  profile = setObjectiveComplete(
    profile,
    second.id,
    second.objectives[0].id,
    true,
  );
  profile = setNotes(profile, second.id, "Preserve these notes\n  exactly.  ");
  return JSON.stringify({
    ...profile,
    schemaVersion: 1,
    revision: 4,
    characters: profile.characters.map(
      ({ planner: _planner, ...character }) => character,
    ),
  });
}

describe("browser profile repository", () => {
  it("saves a profile and reloads stable character data through a new adapter", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    expect(await repository.load(" Greg ")).toEqual({
      profile: null,
      mode: "missing",
    });
    const input = populatedProfile();
    const saved = await repository.save(input);
    expect(saved.ok).toBe(true);
    expect(saved.profile?.revision).toBe(1);
    expect(input.revision).toBe(0);
    const reloaded = await new BrowserProfileRepository(storage).load("GREG");
    expect(reloaded.mode).toBe("ready");
    expect(reloaded.profile).toEqual(saved.profile);
    expect(reloaded.profile?.characters[0].id).toBe(input.characters[0].id);
  });

  it("keeps multiple username profiles isolated and storage keys case insensitive", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile("Greg"));
    await repository.save(populatedProfile("Friend"));
    expect(storage.values.size).toBe(2);
    expect((await repository.load("greg")).profile?.username).toBe("Greg");
    expect((await repository.load("FRIEND")).profile?.username).toBe("Friend");
    expect(profileStorageKey(" ＧREG ")).toBe(profileStorageKey("greg"));
  });

  it("does not touch other storage records", async () => {
    const storage = new MemoryStorage();
    storage.setItem("existing-class-draft", '{"keep":true}');
    await new BrowserProfileRepository(storage).save(populatedProfile());
    expect(storage.getItem("existing-class-draft")).toBe('{"keep":true}');
  });

  it("handles blocked storage access without throwing during construction or load/save", async () => {
    const repository = new BrowserProfileRepository(() => {
      throw new Error("SecurityError");
    });
    expect((await repository.load("Greg")).mode).toBe("unavailable");
    expect((await repository.save(populatedProfile())).ok).toBe(false);
  });

  it("reports quota errors and preserves the last saved record", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const initial = await repository.save(populatedProfile());
    const before = storage.getItem(profileStorageKey("Greg"));
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const changed = setNotes(
      initial.profile!,
      initial.profile!.characters[0].id,
      "Unsaved change",
    );
    const result = await repository.save(changed);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("full or blocked");
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(before);
  });

  it.each([
    "not-json",
    JSON.stringify({ ...populatedProfile(), schemaVersion: 9 }),
    JSON.stringify({ characters: [] }),
  ])(
    "protects corrupt or unsupported saved data from replacement",
    async (raw) => {
      const storage = new MemoryStorage();
      const key = profileStorageKey("Greg");
      storage.setItem(key, raw);
      const repository = new BrowserProfileRepository(storage);
      expect((await repository.load("Greg")).mode).toBe("protected");
      expect((await repository.save(populatedProfile())).ok).toBe(false);
      expect(storage.getItem(key)).toBe(raw);
    },
  );

  it("rejects malformed in-memory profiles without writing them", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const invalid = { ...populatedProfile(), revision: -1 };
    expect((await repository.save(invalid)).ok).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("rejects overwriting an existing profile that this adapter has never loaded", async () => {
    const storage = new MemoryStorage();
    const first = await new BrowserProfileRepository(storage).save(
      populatedProfile(),
    );
    const result = await new BrowserProfileRepository(storage).save(
      first.profile!,
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Reload");
  });

  it("fails closed when another tab saves a newer revision, then allows explicit reload", async () => {
    const storage = new MemoryStorage();
    await new BrowserProfileRepository(storage).save(populatedProfile());
    const tabA = new BrowserProfileRepository(storage);
    const tabB = new BrowserProfileRepository(storage);
    const originalA = (await tabA.load("Greg")).profile!;
    const originalB = (await tabB.load("Greg")).profile!;
    const changedA = setNotes(
      originalA,
      originalA.characters[0].id,
      "Saved by A",
    );
    expect((await tabA.save(changedA)).ok).toBe(true);
    const changedB = setNotes(originalB, originalB.characters[0].id, "Stale B");
    const result = await tabB.save(changedB);
    expect(result.ok).toBe(false);
    expect((await tabB.load("Greg")).profile?.characters[0].notes).toBe(
      "Saved by A",
    );
    const latestB = (await tabB.load("Greg")).profile!;
    expect(
      (
        await tabB.save(
          setNotes(latestB, latestB.characters[0].id, "B after reload"),
        )
      ).ok,
    ).toBe(true);
  });

  it("rejects stale UI state even within the same adapter", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const initial = populatedProfile();
    expect((await repository.save(initial)).ok).toBe(true);
    expect((await repository.save(initial)).ok).toBe(false);
  });

  it("detects deletion and same-revision edits in another tab", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const original = (await repository.load("Greg")).profile!;
    storage.setItem(
      profileStorageKey("Greg"),
      JSON.stringify({ ...original, username: "GREG" }),
    );
    expect((await repository.save(original)).ok).toBe(false);
    await repository.load("Greg");
    storage.values.delete(profileStorageKey("Greg"));
    expect((await repository.save(original)).ok).toBe(false);
  });

  it("loads v1 without writes and backs up the original before a normal v2 save", async () => {
    const storage = new MemoryStorage();
    const key = profileStorageKey("Greg");
    const raw = legacyRaw();
    storage.setItem(key, raw);
    const repository = new BrowserProfileRepository(storage);
    const loaded = await repository.load("Greg");
    expect(loaded.mode).toBe("ready");
    expect(loaded.profile?.schemaVersion).toBe(3);
    expect(loaded.message).toContain("backed up");
    expect(storage.getItem(key)).toBe(raw);
    expect(storage.values.size).toBe(1);
    const migrated = loaded.profile!;
    expect(
      (await new BrowserProfileRepository(storage).load("Greg")).profile,
    ).toEqual(migrated);
    const changed = setNotes(migrated, migrated.characters[0].id, "New note");
    const saved = await repository.save(changed);
    expect(saved.ok).toBe(true);
    expect(saved.profile?.revision).toBe(5);
    expect(storage.getItem(profileV1BackupKey("Greg"))).toBe(raw);
    expect(JSON.parse(storage.getItem(key)!).schemaVersion).toBe(3);
    const reloaded = (await new BrowserProfileRepository(storage).load("Greg"))
      .profile!;
    expect(reloaded.characters[1].objectives).toEqual(
      JSON.parse(raw).characters[1].objectives,
    );
    expect(reloaded.characters[1].notes).toBe(
      JSON.parse(raw).characters[1].notes,
    );
    expect(reloaded.characters[1].id).toBe(JSON.parse(raw).characters[1].id);
  });

  it("never overwrites a previously retained v1 backup", async () => {
    const storage = new MemoryStorage();
    storage.setItem(profileStorageKey("Greg"), legacyRaw());
    storage.setItem(
      profileV1BackupKey("Greg"),
      "existing backup retained verbatim",
    );
    const repository = new BrowserProfileRepository(storage);
    const loaded = (await repository.load("Greg")).profile!;
    expect((await repository.save(loaded)).ok).toBe(true);
    expect(storage.getItem(profileV1BackupKey("Greg"))).toBe(
      "existing backup retained verbatim",
    );
  });

  it("does not replace v1 data when its backup cannot be written", async () => {
    const storage = new MemoryStorage();
    const key = profileStorageKey("Greg");
    const raw = legacyRaw();
    storage.setItem(key, raw);
    const repository = new BrowserProfileRepository(storage);
    const loaded = (await repository.load("Greg")).profile!;
    const write = storage.setItem.bind(storage);
    storage.setItem = (target, value) => {
      if (target.endsWith(":backup:v1")) throw new Error("QuotaExceededError");
      write(target, value);
    };
    const result = await repository.save(loaded);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("could not be backed up");
    expect(storage.getItem(key)).toBe(raw);
  });

  it("retains both the v1 record and its backup if the v2 write fails", async () => {
    const storage = new MemoryStorage();
    const key = profileStorageKey("Greg");
    const raw = legacyRaw();
    storage.setItem(key, raw);
    const repository = new BrowserProfileRepository(storage);
    const loaded = (await repository.load("Greg")).profile!;
    const write = storage.setItem.bind(storage);
    storage.setItem = (target, value) => {
      if (target === key) throw new Error("QuotaExceededError");
      write(target, value);
    };
    expect((await repository.save(loaded)).ok).toBe(false);
    expect(storage.getItem(key)).toBe(raw);
    expect(storage.getItem(profileV1BackupKey("Greg"))).toBe(raw);
  });

  it("rejects a stale v1 tab after another tab completes migration", async () => {
    const storage = new MemoryStorage();
    storage.setItem(profileStorageKey("Greg"), legacyRaw());
    const tabA = new BrowserProfileRepository(storage);
    const tabB = new BrowserProfileRepository(storage);
    const originalA = (await tabA.load("Greg")).profile!;
    const originalB = (await tabB.load("Greg")).profile!;
    expect(
      (
        await tabA.save(
          setNotes(originalA, originalA.characters[0].id, "Saved by A"),
        )
      ).ok,
    ).toBe(true);
    const result = await tabB.save(
      setNotes(originalB, originalB.characters[0].id, "Stale B"),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("another tab");
    expect((await tabB.load("Greg")).profile?.characters[0].notes).toBe(
      "Saved by A",
    );
  });

  it("fails closed for v2 records with invalid planners and preserves the raw record", async () => {
    const storage = new MemoryStorage();
    const profile = populatedProfile();
    const raw = JSON.stringify({
      ...profile,
      characters: [
        { ...profile.characters[0], planner: { entries: "invalid" } },
      ],
    });
    storage.setItem(profileStorageKey("Greg"), raw);
    const repository = new BrowserProfileRepository(storage);
    expect((await repository.load("Greg")).mode).toBe("protected");
    expect((await repository.save(profile)).ok).toBe(false);
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(raw);
  });

  it("retains an independent route and missing reference IDs across dataset revisions", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const profile = populatedProfile();
    const character = profile.characters[0];
    const route = addEntry(
      { ...character.planner, datasetVersion: "reviewed-previous-version" },
      {
        kind: "zone",
        title: "My previous zone plan",
        recordId: "a-record-removed-from-a-future-snapshot",
        origin: "reference",
        access: "unknown",
        status: "completed",
        notes: "Keep my progress and context even if the reference disappears.",
        targetLevel: { min: 20, max: 30 },
        targetLevelSource: "user",
      },
    );
    const saved = await repository.save(
      setCharacterPlanner(profile, character.id, route),
    );
    expect(saved.ok).toBe(true);
    const loaded = (await new BrowserProfileRepository(storage).load("Greg"))
      .profile!;
    expect(loaded.characters[0].planner).toEqual(route);
    expect(loaded.characters[0].planner.entries[0].status).toBe("completed");
    expect(loaded.characters[0].id).toBe(character.id);
  });
});

describe("profile import and recovery", () => {
  async function prepare(
    repository: BrowserProfileRepository,
    profile = populatedProfile(),
  ) {
    const result = await repository.prepareImport(JSON.stringify(profile));
    expect(result.ok).toBe(true);
    return result.preparation!;
  }

  it("previews without writes and requires a valid one-use preparation before replacement", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const profile = populatedProfile();
    const preview = await prepare(repository, profile);
    expect(preview).toMatchObject({
      kind: "import",
      targetMode: "missing",
      sourceSchemaVersion: 3,
    });
    expect(preview.summary.characters).toBe(1);
    expect(storage.values.size).toBe(0);
    expect((await repository.applyTransfer("not-reviewed")).ok).toBe(false);
    expect(storage.values.size).toBe(0);
    const applied = await repository.applyTransfer(preview.token);
    expect(applied).toMatchObject({
      ok: true,
      backupCreated: false,
      profile: { id: profile.id, revision: 1 },
    });
    expect((await repository.applyTransfer(preview.token)).ok).toBe(false);
  });

  it("imports into the file's own username and preserves other local profiles", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile("Current player"));
    const currentRaw = storage.getItem(profileStorageKey("Current player"));
    const input = populatedProfile("Portable player");
    const preview = await prepare(repository, input);
    const applied = await repository.applyTransfer(preview.token);
    expect(applied.ok).toBe(true);
    expect(storage.getItem(profileStorageKey("Current player"))).toBe(
      currentRaw,
    );
    expect((await repository.load("Portable player")).profile?.id).toBe(
      input.id,
    );
    expect(
      storage.getItem(profileReplacementBackupKey("Portable player")),
    ).toBe(null);
  });

  it("preserves v2 routes, objectives, notes and stable IDs through replacement and later saves", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save({ ...populatedProfile(), revision: 0 });
    let input = populatedProfile();
    const character = input.characters[0];
    input = setNotes(input, character.id, "Portable notes\n  unchanged.  ");
    input = setCharacterPlanner(
      input,
      character.id,
      addEntry(character.planner, {
        title: "Personal dungeon goal",
        kind: "dungeon",
        status: "skipped",
        priority: "high",
        targetLevel: { min: 24, max: 28 },
        notes: "My own plan",
        access: "confirmed",
      }),
    );
    input = { ...input, revision: 7 };
    const preview = await prepare(repository, input);
    expect(preview.targetMode).toBe("ready");
    expect(preview.existingProfile?.id).not.toBe(input.id);
    const applied = await repository.applyTransfer(preview.token);
    expect(applied.ok).toBe(true);
    expect(applied.profile).toEqual({
      ...input,
      revision: 8,
      updatedAt: applied.profile!.updatedAt,
    });
    expect(
      (await new BrowserProfileRepository(storage).load("Greg")).profile
        ?.characters,
    ).toEqual(input.characters);
    const saved = await repository.save(
      setNotes(applied.profile!, character.id, "Next saved note"),
    );
    expect(saved.ok).toBe(true);
    expect(saved.profile?.revision).toBe(9);
  });

  it("migrates v1 imports without losing previous notes or completed objectives", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const raw = legacyRaw();
    const result = await repository.prepareImport(raw);
    expect(result.ok).toBe(true);
    expect(result.preparation?.sourceSchemaVersion).toBe(1);
    expect(storage.values.size).toBe(0);
    const applied = await repository.applyTransfer(result.preparation!.token);
    expect(applied.profile?.schemaVersion).toBe(3);
    expect(applied.profile?.revision).toBe(5);
    expect(applied.profile?.characters[1]).toMatchObject(
      JSON.parse(raw).characters[1],
    );
    expect(applied.profile?.characters[1].planner.entries).toEqual([]);
  });

  it("advances beyond the greater imported or target revision", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const target = { ...populatedProfile(), revision: 50 };
    storage.setItem(profileStorageKey("Greg"), JSON.stringify(target));
    const preview = await prepare(repository, {
      ...populatedProfile(),
      revision: 2,
    });
    expect(
      (await repository.applyTransfer(preview.token)).profile?.revision,
    ).toBe(51);
  });

  it("retains exact prior JSON, allows previewed restore and backs up the replaced import", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const target = populatedProfile();
    const originalRaw = JSON.stringify(target, null, 2);
    storage.setItem(profileStorageKey("Greg"), originalRaw);
    expect((await repository.readBackup("Greg")).available).toBe(false);
    const preview = await prepare(repository);
    const applied = await repository.applyTransfer(preview.token);
    expect(applied).toMatchObject({ ok: true, backupCreated: true });
    expect(storage.getItem(profileReplacementBackupKey("Greg"))).toBe(
      originalRaw,
    );
    const backup = await repository.readBackup("Greg");
    expect(backup).toMatchObject({
      available: true,
      raw: originalRaw,
      profile: target,
    });
    const importedRaw = storage.getItem(profileStorageKey("Greg"));
    const restore = await repository.prepareRestore("Greg");
    expect(restore.preparation).toMatchObject({
      kind: "restore",
      targetMode: "ready",
      profile: target,
    });
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(importedRaw);
    const restored = await repository.applyTransfer(restore.preparation!.token);
    expect(restored.ok).toBe(true);
    expect(restored.profile?.id).toBe(target.id);
    expect(restored.profile?.characters).toEqual(target.characters);
    expect(restored.profile?.revision).toBe(applied.profile!.revision + 1);
    expect(storage.getItem(profileReplacementBackupKey("Greg"))).toBe(
      importedRaw,
    );
  });

  it("cannot change a prepared replacement by mutating the public preview", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const input = populatedProfile();
    const preview = await prepare(repository, input);
    preview.profile.username = "Different target";
    preview.profile.characters[0].name = "Changed after preview";
    const applied = await repository.applyTransfer(preview.token);
    expect(applied.profile?.username).toBe(input.username);
    expect(applied.profile?.characters).toEqual(input.characters);
    expect(storage.getItem(profileStorageKey("Different target"))).toBe(null);
  });

  it("invalidates an older preparation when a different file is reviewed", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const first = await prepare(repository);
    const second = await prepare(repository, populatedProfile("Other player"));
    expect((await repository.applyTransfer(first.token)).ok).toBe(false);
    expect(storage.values.size).toBe(0);
    expect((await repository.applyTransfer(second.token)).ok).toBe(true);
  });

  it.each([
    "not-json",
    JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify({ schemaVersion: 2 }),
  ])(
    "rejects failed imports before any saved profile or backup is changed",
    async (raw) => {
      const storage = new MemoryStorage();
      const repository = new BrowserProfileRepository(storage);
      await repository.save(populatedProfile());
      storage.setItem(
        profileReplacementBackupKey("Greg"),
        "retained older backup",
      );
      const before = new Map(storage.values);
      expect((await repository.prepareImport(raw)).ok).toBe(false);
      expect(storage.values).toEqual(before);
    },
  );

  it("allows explicit replacement of a protected target while keeping its exact original raw backup", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const corruptRaw = '{"schemaVersion":99,"important":"future data"}';
    storage.setItem(profileStorageKey("Greg"), corruptRaw);
    const preview = await prepare(repository);
    expect(preview.targetMode).toBe("protected");
    expect(preview.existingProfile).toBeUndefined();
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(corruptRaw);
    expect((await repository.applyTransfer(preview.token)).ok).toBe(true);
    expect(await repository.readBackup("Greg")).toMatchObject({
      available: true,
      raw: corruptRaw,
    });
    expect((await repository.readBackup("Greg")).profile).toBeUndefined();
    expect((await repository.prepareRestore("Greg")).ok).toBe(false);
    expect(storage.getItem(profileReplacementBackupKey("Greg"))).toBe(
      corruptRaw,
    );
  });

  it("leaves good data untouched if the required backup cannot be written", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const original = storage.getItem(profileStorageKey("Greg"));
    const preview = await prepare(repository);
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === profileReplacementBackupKey("Greg"))
        throw new Error("QuotaExceededError");
      write(key, value);
    };
    const result = await repository.applyTransfer(preview.token);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("could not be backed up");
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(original);
  });

  it("preserves the current profile and its recovery backup when replacement writing fails", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const original = storage.getItem(profileStorageKey("Greg"));
    const preview = await prepare(repository);
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === profileStorageKey("Greg"))
        throw new Error("QuotaExceededError");
      write(key, value);
    };
    const result = await repository.applyTransfer(preview.token);
    expect(result).toMatchObject({ ok: false, backupCreated: true });
    expect(result.message).toContain("current profile was preserved");
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(original);
    expect(storage.getItem(profileReplacementBackupKey("Greg"))).toBe(original);
  });

  it("rejects changes from another tab before confirmation without overwriting its data or backup", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const preview = await prepare(repository);
    const tab = new BrowserProfileRepository(storage);
    const latest = (await tab.load("Greg")).profile!;
    await tab.save(
      setNotes(latest, latest.characters[0].id, "New tab's notes"),
    );
    const original = new Map(storage.values);
    const result = await repository.applyTransfer(preview.token);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("another tab");
    expect(storage.values).toEqual(original);
  });

  it("checks for an intervening save again after creating the backup", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const original = storage.getItem(profileStorageKey("Greg"))!;
    const newer = JSON.stringify({ ...JSON.parse(original), revision: 100 });
    const preview = await prepare(repository);
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      write(key, value);
      if (key === profileReplacementBackupKey("Greg"))
        write(profileStorageKey("Greg"), newer);
    };
    const result = await repository.applyTransfer(preview.token);
    expect(result).toMatchObject({ ok: false, backupCreated: true });
    expect(result.message).toContain("another tab");
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(newer);
    expect(storage.getItem(profileReplacementBackupKey("Greg"))).toBe(original);
  });

  it("retains multi-tab revision protection after importing a different profile ID", async () => {
    const storage = new MemoryStorage();
    const first = new BrowserProfileRepository(storage);
    await first.save(populatedProfile());
    const staleTab = new BrowserProfileRepository(storage);
    const stale = (await staleTab.load("Greg")).profile!;
    const preview = await prepare(first);
    expect((await first.applyTransfer(preview.token)).ok).toBe(true);
    const after = storage.getItem(profileStorageKey("Greg"));
    expect((await staleTab.save(stale)).ok).toBe(false);
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(after);
  });

  it("rejects restore when its reviewed backup changes before confirmation", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const preview = await prepare(repository);
    await repository.applyTransfer(preview.token);
    const restore = await repository.prepareRestore("Greg");
    const current = storage.getItem(profileStorageKey("Greg"));
    storage.setItem(
      profileReplacementBackupKey("Greg"),
      JSON.stringify(populatedProfile()),
    );
    expect(
      (await repository.applyTransfer(restore.preparation!.token)).ok,
    ).toBe(false);
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(current);
  });

  it("retains the separate original-v1 migration backup during replacement and restore", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const raw = legacyRaw();
    storage.setItem(profileStorageKey("Greg"), raw);
    storage.setItem(profileV1BackupKey("Greg"), "earlier v1 migration backup");
    const preview = await prepare(repository);
    await repository.applyTransfer(preview.token);
    expect(storage.getItem(profileReplacementBackupKey("Greg"))).toBe(raw);
    const restore = await repository.prepareRestore("Greg");
    expect(restore.preparation?.sourceSchemaVersion).toBe(1);
    expect(
      (await repository.applyTransfer(restore.preparation!.token)).profile
        ?.characters[1].objectives[0].completed,
    ).toBe(true);
    expect(storage.getItem(profileV1BackupKey("Greg"))).toBe(
      "earlier v1 migration backup",
    );
  });

  it("fails safely when storage reads are blocked during preparation or confirmation", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const preview = await prepare(repository);
    storage.getItem = () => {
      throw new Error("SecurityError");
    };
    expect((await repository.applyTransfer(preview.token)).ok).toBe(false);
    expect(
      (await repository.prepareImport(JSON.stringify(populatedProfile()))).ok,
    ).toBe(false);
    expect((await repository.readBackup("Greg")).available).toBe(false);
    expect((await repository.prepareRestore("Greg")).ok).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("also invalidates an earlier preview after a failed file selection", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const preview = await prepare(repository);
    expect((await repository.prepareImport("invalid JSON")).ok).toBe(false);
    expect((await repository.applyTransfer(preview.token)).ok).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("rejects duplicate IDs and invalid character records without changing an existing profile", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    const saved = await repository.save(populatedProfile());
    const profile = saved.profile!;
    const before = new Map(storage.values);
    const duplicate = {
      ...profile,
      characters: [profile.characters[0], profile.characters[0]],
    };
    expect((await repository.prepareImport(JSON.stringify(duplicate))).ok).toBe(
      false,
    );
    const invalid = {
      ...profile,
      characters: [{ ...profile.characters[0], level: -5 }],
    };
    expect((await repository.prepareImport(JSON.stringify(invalid))).ok).toBe(
      false,
    );
    expect(storage.values).toEqual(before);
  });

  it("will not replace a profile if another writer interferes with its required backup", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const original = storage.getItem(profileStorageKey("Greg"));
    const preview = await prepare(repository);
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      write(key, value);
      if (key === profileReplacementBackupKey("Greg"))
        write(key, "intervening backup");
    };
    expect((await repository.applyTransfer(preview.token)).ok).toBe(false);
    expect(storage.getItem(profileStorageKey("Greg"))).toBe(original);
  });

  it("retains the current record and backup if storage becomes unreadable after backup creation", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    await repository.save(populatedProfile());
    const original = storage.getItem(profileStorageKey("Greg"));
    const preview = await prepare(repository);
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      write(key, value);
      if (key === profileReplacementBackupKey("Greg"))
        storage.getItem = () => {
          throw new Error("SecurityError");
        };
    };
    const result = await repository.applyTransfer(preview.token);
    expect(result).toMatchObject({ ok: false, backupCreated: true });
    expect(storage.values.get(profileStorageKey("Greg"))).toBe(original);
    expect(storage.values.get(profileReplacementBackupKey("Greg"))).toBe(
      original,
    );
  });

  it.each([
    "not JSON",
    "",
    JSON.stringify({ schemaVersion: 4 }),
    JSON.stringify(populatedProfile("Another player")),
  ])(
    "keeps corrupt, unsupported or mismatched backups downloadable and rejects restore",
    async (raw) => {
      const storage = new MemoryStorage();
      const repository = new BrowserProfileRepository(storage);
      await repository.save(populatedProfile());
      storage.setItem(profileReplacementBackupKey("Greg"), raw);
      const before = new Map(storage.values);
      expect(await repository.readBackup("Greg")).toMatchObject({
        available: true,
        raw,
      });
      expect((await repository.readBackup("Greg")).profile).toBeUndefined();
      expect((await repository.prepareRestore("Greg")).ok).toBe(false);
      expect(storage.values).toEqual(before);
    },
  );

  it("rejects revision overflow before making any storage mutation", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProfileRepository(storage);
    expect(
      (
        await repository.prepareImport(
          JSON.stringify({
            ...populatedProfile(),
            revision: Number.MAX_SAFE_INTEGER,
          }),
        )
      ).ok,
    ).toBe(false);
    expect(storage.values.size).toBe(0);
    storage.setItem(
      profileStorageKey("Greg"),
      JSON.stringify({
        ...populatedProfile(),
        revision: Number.MAX_SAFE_INTEGER,
      }),
    );
    const before = new Map(storage.values);
    expect(
      (await repository.prepareImport(JSON.stringify(populatedProfile()))).ok,
    ).toBe(false);
    expect(storage.values).toEqual(before);
  });
});

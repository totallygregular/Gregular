import { describe, expect, it } from "vitest";
import { addCharacter, createProfile, setNotes, type Profile } from "./domain";
import {
  BrowserProfileRepository,
  profileStorageKey,
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
});

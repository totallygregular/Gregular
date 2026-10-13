import {
  migrateProfile,
  normalizeUsername,
  validateProfile,
  type Profile,
} from "./domain";

export type LoadMode = "ready" | "missing" | "unavailable" | "protected";
export interface LoadResult {
  profile: Profile | null;
  mode: LoadMode;
  message?: string;
}
export interface SaveResult {
  ok: boolean;
  profile?: Profile;
  message?: string;
}
/** Future cloud adapters can implement this boundary without changing the UI domain. */
export interface ProfileRepository {
  load(username: string): Promise<LoadResult>;
  save(profile: Profile): Promise<SaveResult>;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PROFILE_STORAGE_PREFIX = "gregular:forever:profile:";
export function profileStorageKey(username: string): string {
  return `${PROFILE_STORAGE_PREFIX}${encodeURIComponent(normalizeUsername(username))}`;
}

/** The original v1 JSON is retained once, before its first v2 save. */
export function profileV1BackupKey(username: string): string {
  return `${profileStorageKey(username)}:backup:v1`;
}

type StorageProvider = StorageLike | (() => StorageLike);
type Snapshot = { raw: string | null; profile: Profile | null };
const READ_ERROR =
  "Browser storage is unavailable. Changes cannot be saved; enable local storage and try again.";
const PROTECTED_ERROR =
  "This saved profile is unreadable or uses a different version. It has been preserved without changes.";
const CONFLICT_ERROR =
  "This profile changed in another tab or window. Reload it before saving to avoid overwriting those changes.";

/** Username entry identifies local data; it is not authentication or access control. */
export class BrowserProfileRepository implements ProfileRepository {
  private readonly source: StorageProvider;
  private readonly snapshots = new Map<string, Snapshot>();

  constructor(storage: StorageProvider = () => globalThis.localStorage) {
    // Resolve lazily: even accessing localStorage may throw in restricted browsers.
    this.source = storage;
  }

  private storage(): StorageLike {
    return typeof this.source === "function" ? this.source() : this.source;
  }

  async load(username: string): Promise<LoadResult> {
    let key: string;
    try {
      key = profileStorageKey(username);
    } catch (error) {
      return {
        profile: null,
        mode: "unavailable",
        message:
          error instanceof Error ? error.message : "Enter a valid username.",
      };
    }
    let raw: string | null;
    try {
      raw = this.storage().getItem(key);
    } catch {
      this.snapshots.delete(key);
      return { profile: null, mode: "unavailable", message: READ_ERROR };
    }
    if (raw === null) {
      this.snapshots.set(key, { raw: null, profile: null });
      return { profile: null, mode: "missing" };
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const profile = migrateProfile(parsed);
      if (profile.usernameKey !== normalizeUsername(username))
        throw new Error("Mismatched profile.");
      this.snapshots.set(key, { raw, profile });
      const migrated =
        typeof parsed === "object" &&
        parsed !== null &&
        "schemaVersion" in parsed &&
        parsed.schemaVersion === 1;
      return {
        profile,
        mode: "ready",
        ...(migrated
          ? {
              message:
                "Your existing profile is ready for the leveling planner. Its original data will be backed up when you next save a change.",
            }
          : {}),
      };
    } catch {
      this.snapshots.delete(key);
      return { profile: null, mode: "protected", message: PROTECTED_ERROR };
    }
  }

  async save(input: Profile): Promise<SaveResult> {
    let profile: Profile;
    try {
      profile = validateProfile(input);
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The profile is invalid. Nothing was saved.",
      };
    }
    const key = profileStorageKey(profile.usernameKey);
    let storage: StorageLike;
    let currentRaw: string | null;
    try {
      storage = this.storage();
      currentRaw = storage.getItem(key);
    } catch {
      return { ok: false, message: READ_ERROR };
    }
    let current: Profile | null = null;
    let currentVersion: unknown;
    if (currentRaw !== null) {
      try {
        const parsed = JSON.parse(currentRaw);
        currentVersion = parsed.schemaVersion;
        current = migrateProfile(parsed);
        if (current.usernameKey !== profile.usernameKey)
          throw new Error("Mismatched profile.");
      } catch {
        return { ok: false, message: PROTECTED_ERROR };
      }
    }
    const snapshot = this.snapshots.get(key);
    // Existing records must first be read by this adapter. Compare both content and
    // revision, including deletion, so stale tabs and stale UI state fail closed.
    if (
      (snapshot && snapshot.raw !== currentRaw) ||
      (!snapshot && currentRaw !== null) ||
      (current &&
        (current.id !== profile.id || current.revision !== profile.revision)) ||
      (!current && profile.revision !== 0) ||
      (snapshot?.profile && snapshot.profile.id !== profile.id)
    ) {
      return { ok: false, message: CONFLICT_ERROR };
    }
    const saved: Profile = {
      ...profile,
      revision: profile.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    if (!Number.isSafeInteger(saved.revision))
      return {
        ok: false,
        message: "The profile revision limit was reached. Nothing was saved.",
      };
    const raw = JSON.stringify(saved);
    if (currentRaw !== null && currentVersion === 1) {
      try {
        const backupKey = profileV1BackupKey(profile.usernameKey);
        if (storage.getItem(backupKey) === null) {
          storage.setItem(backupKey, currentRaw);
        }
      } catch {
        return {
          ok: false,
          message:
            "The original profile could not be backed up. Nothing was changed. Free browser storage and try again.",
        };
      }
    }
    // Check again after backup creation: a stale tab must not replace a newer
    // profile, even if it was initially reading an older storage schema.
    try {
      if (storage.getItem(key) !== currentRaw)
        return { ok: false, message: CONFLICT_ERROR };
    } catch {
      return { ok: false, message: READ_ERROR };
    }
    try {
      storage.setItem(key, raw);
    } catch {
      return {
        ok: false,
        message:
          "Browser storage is full or blocked. Changes were not saved. Free some space and try again.",
      };
    }
    this.snapshots.set(key, { raw, profile: saved });
    return { ok: true, profile: saved };
  }
}

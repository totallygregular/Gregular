import {
  migrateProfile,
  normalizeUsername,
  validateProfile,
  type Profile,
} from "./domain";
import {
  parseProfileTransfer,
  type ParsedProfileTransfer,
  type ProfileTransferSummary,
} from "./profileTransfer";

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
export interface TransferPreparation {
  readonly token: string;
  readonly kind: "import" | "restore";
  readonly profile: Profile;
  readonly sourceSchemaVersion: 1 | 2 | 3;
  readonly summary: ProfileTransferSummary;
  readonly targetMode: "missing" | "ready" | "protected";
  readonly existingProfile?: Profile;
}
export interface TransferPreparationResult {
  ok: boolean;
  preparation?: TransferPreparation;
  message?: string;
}
export interface TransferResult extends SaveResult {
  backupCreated?: boolean;
}
export interface BackupResult {
  available: boolean;
  /** Exact previous saved JSON, even if it can only be recovered externally. */
  raw?: string;
  profile?: Profile;
  message?: string;
}
/** Future cloud adapters can implement this boundary without changing the UI domain. */
export interface ProfileRepository {
  load(username: string): Promise<LoadResult>;
  save(profile: Profile): Promise<SaveResult>;
  prepareImport(text: string): Promise<TransferPreparationResult>;
  prepareRestore(username: string): Promise<TransferPreparationResult>;
  applyTransfer(token: string): Promise<TransferResult>;
  readBackup(username: string): Promise<BackupResult>;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PROFILE_STORAGE_PREFIX = "gregular:forever:profile:";
export function profileStorageKey(username: string): string {
  return `${PROFILE_STORAGE_PREFIX}${encodeURIComponent(normalizeUsername(username))}`;
}

/** The original v1 JSON is retained once, before its first migrated save. */
export function profileV1BackupKey(username: string): string {
  return `${profileStorageKey(username)}:backup:v1`;
}

/** The original v2 planner profile is retained exactly before its first v3 save. */
export function profileV2BackupKey(username: string): string {
  return `${profileStorageKey(username)}:backup:v2`;
}

/** The last replaced record is retained verbatim, separately from v1 migration. */
export function profileReplacementBackupKey(username: string): string {
  return `${profileStorageKey(username)}:backup:replacement`;
}

type StorageProvider = StorageLike | (() => StorageLike);
type Snapshot = { raw: string | null; profile: Profile | null };
type PendingTransfer = {
  key: string;
  expectedRaw: string | null;
  importedRaw: string;
  revision: number;
  /** Restore must also retain the backup which the user reviewed. */
  expectedBackupRaw?: string;
};
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
  private readonly transfers = new Map<string, PendingTransfer>();

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
        (parsed.schemaVersion === 1 || parsed.schemaVersion === 2);
      return {
        profile,
        mode: "ready",
        ...(migrated
          ? {
              message:
                "Your existing profile is ready for connected progression planning. Its original data will be backed up when you next save a change.",
            }
          : {}),
      };
    } catch {
      this.snapshots.delete(key);
      return { profile: null, mode: "protected", message: PROTECTED_ERROR };
    }
  }

  async prepareImport(text: string): Promise<TransferPreparationResult> {
    this.transfers.clear();
    try {
      return this.prepareTransfer(parseProfileTransfer(text), "import");
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The profile is invalid. Nothing was changed.",
      };
    }
  }

  async readBackup(username: string): Promise<BackupResult> {
    let raw: string | null;
    try {
      raw = this.storage().getItem(profileReplacementBackupKey(username));
    } catch {
      return { available: false, message: READ_ERROR };
    }
    if (raw === null) return { available: false };
    try {
      const { profile } = parseProfileTransfer(raw);
      if (profile.usernameKey !== normalizeUsername(username))
        throw new Error("Mismatched profile.");
      return { available: true, raw, profile };
    } catch {
      return {
        available: true,
        raw,
        message:
          "This backup cannot be restored in the app. Download it to retain the original data.",
      };
    }
  }

  async prepareRestore(username: string): Promise<TransferPreparationResult> {
    this.transfers.clear();
    const backup = await this.readBackup(username);
    if (!backup.raw || !backup.profile)
      return {
        ok: false,
        message:
          backup.message ??
          "No replacement backup is available for this profile.",
      };
    return this.prepareTransfer(
      parseProfileTransfer(backup.raw),
      "restore",
      backup.raw,
    );
  }

  private prepareTransfer(
    parsed: ParsedProfileTransfer,
    kind: TransferPreparation["kind"],
    expectedBackupRaw?: string,
  ): TransferPreparationResult {
    const { profile } = parsed;
    const key = profileStorageKey(profile.usernameKey);
    let currentRaw: string | null;
    try {
      currentRaw = this.storage().getItem(key);
    } catch {
      return { ok: false, message: READ_ERROR };
    }
    let current: Profile | undefined;
    let targetMode: TransferPreparation["targetMode"] = "missing";
    if (currentRaw !== null) {
      targetMode = "protected";
      try {
        current = migrateProfile(JSON.parse(currentRaw));
        if (current.usernameKey !== profile.usernameKey)
          throw new Error("Mismatched profile.");
        targetMode = "ready";
      } catch {
        current = undefined;
      }
    }
    const revision = Math.max(profile.revision, current?.revision ?? -1) + 1;
    if (!Number.isSafeInteger(revision))
      return {
        ok: false,
        message: "The profile revision limit was reached. Nothing was changed.",
      };
    const token = crypto.randomUUID();
    // The public preview is a detached model. Applying uses this private JSON,
    // never a possibly modified UI object or a different target username.
    this.transfers.clear();
    this.transfers.set(token, {
      key,
      expectedRaw: currentRaw,
      importedRaw: JSON.stringify(profile),
      revision,
      ...(expectedBackupRaw === undefined ? {} : { expectedBackupRaw }),
    });
    return {
      ok: true,
      preparation: Object.freeze({
        token,
        kind,
        profile,
        sourceSchemaVersion: parsed.sourceSchemaVersion,
        summary: parsed.summary,
        targetMode,
        ...(current ? { existingProfile: current } : {}),
      }),
    };
  }

  /** Called only after explicit UI confirmation of the prepared target profile. */
  async applyTransfer(token: string): Promise<TransferResult> {
    const pending = this.transfers.get(token);
    // One-use preparations prevent accidental double confirmation or retries
    // after errors. A new preview is required if the saved data has changed.
    this.transfers.delete(token);
    if (!pending)
      return {
        ok: false,
        message: "Review the profile again before replacing saved data.",
      };
    const profile: Profile = {
      ...validateProfile(JSON.parse(pending.importedRaw)),
      revision: pending.revision,
      updatedAt: new Date().toISOString(),
    };
    const backupKey = profileReplacementBackupKey(profile.usernameKey);
    let storage: StorageLike;
    try {
      storage = this.storage();
      if (
        storage.getItem(pending.key) !== pending.expectedRaw ||
        (pending.expectedBackupRaw !== undefined &&
          storage.getItem(backupKey) !== pending.expectedBackupRaw)
      )
        return { ok: false, message: CONFLICT_ERROR };
    } catch {
      return { ok: false, message: READ_ERROR };
    }
    const backupCreated = pending.expectedRaw !== null;
    if (backupCreated) {
      try {
        storage.setItem(backupKey, pending.expectedRaw!);
      } catch {
        return {
          ok: false,
          message:
            "The current profile could not be backed up. Nothing was changed. Free browser storage and try again.",
        };
      }
    }
    try {
      // localStorage has no transaction primitive. This repeated comparison
      // detects intervening saves; exactly simultaneous writes remain a browser
      // storage limitation, as they are for normal profile saves.
      if (
        storage.getItem(pending.key) !== pending.expectedRaw ||
        (backupCreated && storage.getItem(backupKey) !== pending.expectedRaw)
      )
        return { ok: false, message: CONFLICT_ERROR, backupCreated };
    } catch {
      return { ok: false, message: READ_ERROR, backupCreated };
    }
    const raw = JSON.stringify(profile);
    try {
      storage.setItem(pending.key, raw);
    } catch {
      return {
        ok: false,
        backupCreated,
        message:
          "Browser storage is full or blocked. The current profile was preserved. Free some space and try again.",
      };
    }
    this.snapshots.set(pending.key, { raw, profile });
    return { ok: true, profile, backupCreated };
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
    if (currentRaw !== null && (currentVersion === 1 || currentVersion === 2)) {
      try {
        const backupKey = currentVersion === 1 ? profileV1BackupKey(profile.usernameKey) : profileV2BackupKey(profile.usernameKey);
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

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Modal } from "./components";
import type { Profile } from "./domain";
import type { ProfileRepository } from "./profileRepository";
import { MAX_PROFILE_IMPORT_BYTES } from "./profileTransfer";

type Preparation = NonNullable<
  Awaited<ReturnType<ProfileRepository["prepareImport"]>>["preparation"]
>;
type Backup = Awaited<ReturnType<ProfileRepository["readBackup"]>>;

function downloadJSON(raw: string, username: string) {
  const url = URL.createObjectURL(
    new Blob([raw], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `gregular-backup-${username.replace(/[^a-z0-9_-]/gi, "_")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** File selection and confirmation are separate; the repository owns validation and writes. */
export function ProfileSettings({
  repository,
  profile,
  temporaryChanges,
  exportProfile,
  imported,
  close,
}: {
  repository: ProfileRepository;
  profile: Profile | null;
  temporaryChanges: boolean;
  exportProfile: () => void;
  imported: (profile: Profile, notice: string) => void;
  close: () => void;
}) {
  const [preparation, setPreparation] = useState<Preparation | null>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [confirmationFailed, setConfirmationFailed] = useState(false);
  const operation = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    if (profile) {
      void repository.readBackup(profile.usernameKey).then((result) => {
        if (mounted.current) setBackup(result);
      });
    }
    return () => {
      mounted.current = false;
    };
  }, [repository, profile?.usernameKey]);

  const dismiss = () => {
    if (!operation.current) close();
  };

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || operation.current) return;
    operation.current = true;
    setWorking(true);
    setError("");
    try {
      if (file.size > MAX_PROFILE_IMPORT_BYTES)
        throw new Error("Choose a JSON file smaller than 10 MB.");
      const result = await repository.prepareImport(await file.text());
      if (!mounted.current) return;
      if (!result.ok || !result.preparation)
        throw new Error(result.message || "This file could not be read.");
      setPreparation(result.preparation);
      setConfirmationFailed(false);
    } catch (failure) {
      if (mounted.current)
        setError(
          `Import failed: ${failure instanceof Error ? failure.message : "Choose a valid profile JSON file."}`,
        );
    } finally {
      operation.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  async function restoreBackup() {
    if (!profile || operation.current) return;
    operation.current = true;
    setWorking(true);
    setError("");
    try {
      const result = await repository.prepareRestore(profile.usernameKey);
      if (!mounted.current) return;
      if (!result.ok || !result.preparation)
        throw new Error(result.message || "This backup could not be restored.");
      setPreparation(result.preparation);
      setConfirmationFailed(false);
    } catch (failure) {
      if (mounted.current)
        setError(
          `Restore failed: ${failure instanceof Error ? failure.message : "This backup could not be restored."}`,
        );
    } finally {
      operation.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  async function confirm() {
    if (!preparation || operation.current) return;
    operation.current = true;
    setWorking(true);
    setError("");
    try {
      const result = await repository.applyTransfer(preparation.token);
      if (!mounted.current) return;
      if (!result.ok || !result.profile)
        throw new Error(result.message || "Nothing was changed.");
      const action = preparation.kind === "restore" ? "restored" : "imported";
      imported(
        result.profile,
        `${result.backupCreated ? "Backup created. " : ""}Profile ${action}.`,
      );
    } catch (failure) {
      if (mounted.current) {
        setConfirmationFailed(true);
        setError(
          `${preparation.kind === "restore" ? "Restore" : "Import"} failed: ${failure instanceof Error ? failure.message : "Nothing was changed."} Cancel and review a new preview to try again.`,
        );
      }
    } finally {
      operation.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  if (preparation) {
    const replacing = preparation.targetMode !== "missing";
    const counts = preparation.summary;
    return (
      <Modal
        key={preparation.token}
        title={
          preparation.kind === "restore" ? "Restore backup" : "Import profile"
        }
        close={dismiss}
      >
        <div className="profile-transfer">
          <p className="transfer-target">{preparation.profile.username}</p>
          <p className="dialog-description">
            {counts.characters} characters · {counts.routeEntries} route entries
            · {counts.objectives} journal objectives
          </p>
          <p className="transfer-detail">
            {counts.wishlistEntries} wishlist entries · {counts.questGoals} saved quest states · {counts.questChains} personal quest chains · {counts.dungeonGoals} saved dungeon states.
            Linked planning views are rebuilt from shared references and your preferred sources.
          </p>
          <ul className="transfer-characters" aria-label="Characters to import">
            {preparation.profile.characters.map((character) => (
              <li key={character.id}>
                <strong>{character.name}</strong>
                <span>
                  Level {character.level} · {character.race}{" "}
                  {character.className} · {character.faction}
                </span>
              </li>
            ))}
          </ul>
          {!counts.characters && (
            <p className="dialog-description">
              This profile has no characters.
            </p>
          )}
          <p className="transfer-detail">
            {counts.professions} professions · {counts.craftingGoals} crafting goals. {counts.completedEntries} completed · {counts.skippedEntries}{" "}
            skipped route entries.
            {preparation.sourceSchemaVersion !== 4 &&
              ` Version ${preparation.sourceSchemaVersion} will be upgraded to version 4.`}{" "}
            Character IDs, notes and supported progression will be kept.
          </p>
          <div className="transfer-warning">
            {replacing ? (
              <>
                <strong>
                  Replace the saved profile “{preparation.profile.username}” in
                  this browser?
                </strong>
                <p>
                  {preparation.targetMode === "protected"
                    ? "The current saved data is unreadable. Its original JSON will be backed up before replacement."
                    : `Its ${preparation.existingProfile?.characters.length ?? 0} characters will be replaced. A backup will be created first.`}
                </p>
              </>
            ) : (
              <p>
                A new local profile “{preparation.profile.username}” will be
                saved.
              </p>
            )}
            {profile &&
              profile.usernameKey !== preparation.profile.usernameKey && (
                <p>
                  Your current profile “{profile.username}” stays saved. The
                  imported profile will open next.
                </p>
              )}
            {temporaryChanges && profile && (
              <p>
                Opening this profile leaves temporary changes in this tab
                behind. They are not in the saved backup. Cancel and export them
                first if needed.
              </p>
            )}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="secondary"
              disabled={working}
              onClick={() => {
                setPreparation(null);
                setError("");
              }}
            >
              Cancel
            </button>
            <button
              className="primary"
              disabled={working || confirmationFailed}
              onClick={() => void confirm()}
            >
              {working
                ? "Saving…"
                : replacing
                  ? "Replace current profile"
                  : "Import profile"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal key="settings" title="Profile settings" close={dismiss}>
      <div className="profile-transfer">
        {profile && <p className="transfer-target">{profile.username}</p>}
        <p className="dialog-description">
          JSON files are portable. Local profiles do not sync between devices,
          browsers or preview URLs.
        </p>
        {temporaryChanges && (
          <p className="transfer-warning">
            Some changes are temporary. Export profile before replacing them.
          </p>
        )}
        {profile && (
          <button
            className="secondary"
            onClick={exportProfile}
            disabled={working}
          >
            Export profile
          </button>
        )}
        <div className="transfer-file">
          <label htmlFor="profile-json">Profile JSON</label>
          <input
            id="profile-json"
            type="file"
            accept=".json,application/json"
            aria-describedby="profile-file-help"
            onChange={(event) => void selectFile(event)}
            disabled={working}
          />
          <small id="profile-file-help">
            Choose a version 1, 2 or 3 export. Review it before saving.
          </small>
        </div>
        {working && <p role="status">Reading profile…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {backup?.available && profile && (
          <section className="transfer-backup" aria-label="Recovery backup">
            <h3>Previous profile backup</h3>
            <p>
              Kept in this browser before the last replacement. Export a file
              for a lasting copy.
            </p>
            <div className="transfer-actions">
              <button
                className="secondary"
                disabled={working || !backup.profile}
                onClick={() => void restoreBackup()}
              >
                Restore backup
              </button>
              <button
                className="text-button"
                disabled={working || backup.raw === undefined}
                onClick={() =>
                  backup.raw !== undefined &&
                  downloadJSON(backup.raw, profile.usernameKey)
                }
              >
                Download backup
              </button>
            </div>
            {backup.message && (
              <p className="transfer-detail">{backup.message}</p>
            )}
          </section>
        )}
        <p className="transfer-demo">
          Testing?{" "}
          <a
            href={`${import.meta.env.BASE_URL}demo-profile-v2.json`}
            download="gregular-demo-profile.json"
          >
            Download demo profile
          </a>
          , then import it. It opens as “Gregular Demo”.
        </p>
        <div className="dialog-actions">
          <button className="secondary" disabled={working} onClick={dismiss}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

import { migrateProfile, ValidationError, type Profile } from "./domain";

/** The UI also checks File.size before reading; this protects non-file callers. */
export const MAX_PROFILE_IMPORT_BYTES = 10 * 1024 * 1024;

export interface ProfileTransferSummary {
  characters: number;
  routeEntries: number;
  completedEntries: number;
  skippedEntries: number;
  objectives: number;
  completedObjectives: number;
}

export interface ParsedProfileTransfer {
  profile: Profile;
  sourceSchemaVersion: 1 | 2;
  summary: ProfileTransferSummary;
}

/** Untrusted JSON becomes a fresh known-shape model. No storage is accessed. */
export function parseProfileTransfer(text: string): ParsedProfileTransfer {
  if (typeof text !== "string")
    throw new ValidationError("Choose a JSON profile file.");
  if (new TextEncoder().encode(text).byteLength > MAX_PROFILE_IMPORT_BYTES)
    throw new ValidationError("Profile files must be 10 MB or smaller.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ValidationError("The file is not valid JSON.");
  }
  const version =
    typeof value === "object" && value !== null && "schemaVersion" in value
      ? value.schemaVersion
      : undefined;
  if (version !== 1 && version !== 2)
    throw new ValidationError(
      "This profile uses an unsupported storage version. Import a version-1 or version-2 profile.",
    );
  const profile = migrateProfile(value);
  const entries = profile.characters.flatMap(
    (character) => character.planner.entries,
  );
  const objectives = profile.characters.flatMap(
    (character) => character.objectives,
  );
  return {
    profile,
    sourceSchemaVersion: version,
    summary: {
      characters: profile.characters.length,
      routeEntries: entries.length,
      completedEntries: entries.filter((entry) => entry.status === "completed")
        .length,
      skippedEntries: entries.filter((entry) => entry.status === "skipped")
        .length,
      objectives: objectives.length,
      completedObjectives: objectives.filter((objective) => objective.completed)
        .length,
    },
  };
}

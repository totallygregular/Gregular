import { createBlankPlanner, validatePlanner } from "./planner";
import type { CharacterPlanner } from "./progressionTypes";
import { createBlankAcquisition, validateAcquisition } from "./acquisition";
import type { CharacterAcquisition } from "./acquisitionTypes";

/** Saved character labels stay import-compatible; new editor choices use reviewed Forever data. */
export const PROFILE_SCHEMA_VERSION = 3 as const;

export type CharacterStatus = "planned" | "leveling" | "paused";
export type ObjectivePriority = "high" | "normal";

export interface Objective {
  id: string;
  title: string;
  completed: boolean;
  priority: ObjectivePriority;
}

export interface CharacterDraft {
  name: string;
  race: string;
  className: string;
  faction: string;
  plannedSpec: string;
  level: number;
  status: CharacterStatus;
}

export interface Character extends CharacterDraft {
  id: string;
  objectives: Objective[];
  notes: string;
  planner: CharacterPlanner;
  acquisition: CharacterAcquisition;
}

export interface Profile {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  id: string;
  username: string;
  usernameKey: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  characters: Character[];
}

export interface CharacterOptions {
  /** Explicitly opt into illustrative planning tasks; these are not game recommendations. */
  mockObjectives?: boolean;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const invalid = (message: string): never => {
  throw new ValidationError(message);
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(
  value: unknown,
  label: string,
  maximum: number,
  required = true,
): string {
  if (typeof value !== "string") return invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) return invalid(`${label} is required.`);
  if (trimmed.length > maximum)
    return invalid(`${label} must be ${maximum} characters or fewer.`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimmed)) {
    return invalid(`${label} contains unsupported control characters.`);
  }
  return trimmed;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function id(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value))
    return invalid(`${label} is invalid.`);
  return value;
}

function timestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return invalid(`${label} is invalid.`);
  }
  return value;
}

export function normalizeUsername(username: string): string {
  if (typeof username !== "string") return invalid("Username must be text.");
  return text(username.normalize("NFKC"), "Username", 40).toLowerCase();
}

export function validateCharacterDraft(value: unknown): CharacterDraft {
  const candidate = record(value, "Character");
  if (
    !Number.isInteger(candidate.level) ||
    Number(candidate.level) < 1 ||
    Number(candidate.level) > 60
  ) {
    return invalid(
      "Level must be a whole number between 1 and 60 (provisional prototype range).",
    );
  }
  if (
    typeof candidate.status !== "string" ||
    !["planned", "leveling", "paused"].includes(candidate.status)
  ) {
    return invalid("Choose a valid progression status.");
  }
  return {
    name: text(candidate.name, "Character name", 40),
    race: text(candidate.race, "Race", 60),
    className: text(candidate.className, "Class", 60),
    faction: text(candidate.faction, "Faction", 40),
    plannedSpec: text(
      candidate.plannedSpec,
      "Planned specialisation",
      80,
      false,
    ),
    level: candidate.level as number,
    status: candidate.status as CharacterStatus,
  };
}

export function createProfile(username: string): Profile {
  const usernameKey = normalizeUsername(username);
  const now = new Date().toISOString();
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    username: username.normalize("NFKC").trim(),
    usernameKey,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    characters: [],
  };
}

export function createCharacter(
  draft: CharacterDraft,
  options: CharacterOptions = {},
): Character {
  return {
    ...validateCharacterDraft(draft),
    id: crypto.randomUUID(),
    objectives: options.mockObjectives
      ? [
          {
            id: crypto.randomUUID(),
            title: "Sample: decide on a goal for your next session",
            completed: false,
            priority: "high",
          },
          {
            id: crypto.randomUUID(),
            title: "Sample: compare plans with your party",
            completed: false,
            priority: "normal",
          },
          {
            id: crypto.randomUUID(),
            title: "Sample: write down an item you want to research",
            completed: false,
            priority: "normal",
          },
        ]
      : [],
    notes: "",
    planner: createBlankPlanner(),
    acquisition: createBlankAcquisition(),
  };
}

function characterIndex(profile: Profile, characterId: string): number {
  const index = profile.characters.findIndex(
    (character) => character.id === characterId,
  );
  if (index < 0)
    return invalid(
      "This character could not be found. Reload the profile and try again.",
    );
  return index;
}

function mapCharacter(
  profile: Profile,
  characterId: string,
  transform: (character: Character) => Character,
): Profile {
  const index = characterIndex(profile, characterId);
  return {
    ...profile,
    characters: profile.characters.map((character, position) =>
      position === index ? transform(character) : character,
    ),
  };
}

export function addCharacter(
  profile: Profile,
  draft: CharacterDraft,
  options: CharacterOptions = {},
): Profile {
  return {
    ...profile,
    characters: [...profile.characters, createCharacter(draft, options)],
  };
}

export function updateCharacter(
  profile: Profile,
  characterId: string,
  draft: CharacterDraft,
): Profile {
  const checked = validateCharacterDraft(draft);
  return mapCharacter(profile, characterId, (character) => ({
    ...character,
    ...checked,
  }));
}

export function removeCharacter(
  profile: Profile,
  characterId: string,
): Profile {
  characterIndex(profile, characterId);
  return {
    ...profile,
    characters: profile.characters.filter(
      (character) => character.id !== characterId,
    ),
  };
}

export function setObjectiveComplete(
  profile: Profile,
  characterId: string,
  objectiveId: string,
  completed: boolean,
): Profile {
  if (typeof completed !== "boolean")
    return invalid("Objective completion must be true or false.");
  return mapCharacter(profile, characterId, (character) => {
    if (!character.objectives.some((objective) => objective.id === objectiveId))
      return invalid("This objective could not be found.");
    return {
      ...character,
      objectives: character.objectives.map((objective) =>
        objective.id === objectiveId ? { ...objective, completed } : objective,
      ),
    };
  });
}

export function addObjective(
  profile: Profile,
  characterId: string,
  title: string,
  priority: ObjectivePriority = "normal",
): Profile {
  const checked = text(title, "Objective", 200);
  if (priority !== "normal" && priority !== "high")
    return invalid("Choose a valid objective priority.");
  return mapCharacter(profile, characterId, (character) => ({
    ...character,
    objectives: [
      ...character.objectives,
      { id: crypto.randomUUID(), title: checked, completed: false, priority },
    ],
  }));
}

export function setNotes(
  profile: Profile,
  characterId: string,
  notes: string,
): Profile {
  if (typeof notes !== "string" || notes.length > 10000)
    return invalid("Notes must be text with 10,000 characters or fewer.");
  return mapCharacter(profile, characterId, (character) => ({
    ...character,
    notes,
  }));
}

/** Replaces only this character's route; older notes and objectives remain intact. */
export function setCharacterPlanner(
  profile: Profile,
  characterId: string,
  planner: CharacterPlanner,
): Profile {
  const checked = validatePlanner(planner);
  return mapCharacter(profile, characterId, (character) => ({
    ...character,
    planner: checked,
  }));
}

/** Personal acquisition state is independent from route, notes and objectives. */
export function setCharacterAcquisition(profile: Profile, characterId: string, acquisition: CharacterAcquisition): Profile {
  const checked = validateAcquisition(acquisition);
  return mapCharacter(profile, characterId, (character) => ({ ...character, acquisition: checked }));
}

/** Validates untrusted persisted data and returns a fresh, known-shape object. */
export function validateProfile(value: unknown): Profile {
  return validateProfileVersion(value, PROFILE_SCHEMA_VERSION);
}

/** Explicit, lossless migration. Reading older profiles never writes browser storage. */
export function migrateProfile(value: unknown): Profile {
  const candidate = record(value, "Profile");
  if (candidate.schemaVersion === 1) return validateProfileVersion(value, 1);
  if (candidate.schemaVersion === 2) return validateProfileVersion(value, 2);
  return validateProfile(value);
}

function validateProfileVersion(value: unknown, version: 1 | 2 | 3): Profile {
  const candidate = record(value, "Profile");
  if (candidate.schemaVersion !== version)
    return invalid("This profile uses an unsupported storage version.");
  const username = text(candidate.username, "Username", 40);
  const usernameKey = normalizeUsername(username);
  if (candidate.usernameKey !== usernameKey)
    return invalid("The saved username does not match its storage key.");
  if (
    !Number.isSafeInteger(candidate.revision) ||
    Number(candidate.revision) < 0
  )
    return invalid("The profile revision is invalid.");
  if (!Array.isArray(candidate.characters))
    return invalid("The character list is invalid.");
  const characterIds = new Set<string>();
  const characters = candidate.characters.map((value): Character => {
    const character = record(value, "Saved character");
    const characterId = id(character.id, "Character ID");
    if (characterIds.has(characterId.toLowerCase()))
      return invalid("The profile contains duplicate character IDs.");
    characterIds.add(characterId.toLowerCase());
    if (!Array.isArray(character.objectives))
      return invalid("The objective list is invalid.");
    const objectiveIds = new Set<string>();
    const objectives = character.objectives.map((value): Objective => {
      const objective = record(value, "Saved objective");
      const objectiveId = id(objective.id, "Objective ID");
      if (objectiveIds.has(objectiveId.toLowerCase()))
        return invalid("The character contains duplicate objective IDs.");
      objectiveIds.add(objectiveId.toLowerCase());
      if (typeof objective.completed !== "boolean")
        return invalid("Saved objective completion is invalid.");
      if (objective.priority !== "normal" && objective.priority !== "high")
        return invalid("Saved objective priority is invalid.");
      return {
        id: objectiveId,
        title: text(objective.title, "Objective", 200),
        completed: objective.completed,
        priority: objective.priority,
      };
    });
    if (typeof character.notes !== "string" || character.notes.length > 10000)
      return invalid("Saved notes are invalid.");
    return {
      ...validateCharacterDraft(character),
      id: characterId,
      objectives,
      notes: character.notes,
      // A deterministic ID gives repeated read-only v1 loads the same migrated
      // route. IDs are scoped to each model; the character's ID remains intact.
      planner:
        version === 1
          ? createBlankPlanner("My route", characterId)
          : validatePlanner(character.planner),
      acquisition: version < 3 ? createBlankAcquisition() : validateAcquisition(character.acquisition),
    };
  });
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: id(candidate.id, "Profile ID"),
    username,
    usernameKey,
    revision: candidate.revision as number,
    createdAt: timestamp(candidate.createdAt, "Creation date"),
    updatedAt: timestamp(candidate.updatedAt, "Updated date"),
    characters,
  };
}

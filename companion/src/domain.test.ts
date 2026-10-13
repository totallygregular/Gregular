import { describe, expect, it } from "vitest";
import {
  addCharacter,
  addObjective,
  createCharacter,
  createProfile,
  migrateProfile,
  normalizeUsername,
  removeCharacter,
  setNotes,
  setCharacterPlanner,
  setObjectiveComplete,
  updateCharacter,
  validateProfile,
  type CharacterDraft,
} from "./domain";

const draft: CharacterDraft = {
  name: "A new adventurer",
  race: "Troll",
  className: "Priest",
  faction: "Horde",
  plannedSpec: "Still deciding",
  level: 1,
  status: "planned",
};

describe("profile and character domain", () => {
  it("normalizes local usernames by Unicode compatibility, whitespace and case", () => {
    expect(normalizeUsername("  Ｇreg  ")).toBe("greg");
    expect(createProfile("  Greg  ")).toMatchObject({
      username: "Greg",
      usernameKey: "greg",
      revision: 0,
      characters: [],
    });
    expect(() => createProfile("   ")).toThrow("Username is required");
    expect(() => createProfile("x".repeat(41))).toThrow("40 characters");
  });

  it("creates stable unique IDs and accepts user-entered combinations without claiming canon", () => {
    const first = createCharacter(draft);
    const second = createCharacter({
      ...draft,
      race: "Invented race",
      className: "Research pending",
      faction: "Undecided",
    });
    expect(first.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(first.id).not.toBe(second.id);
    expect(second.race).toBe("Invented race");
    expect(first.objectives).toEqual([]);
  });

  it("only supplies explicitly requested sample objectives", () => {
    const character = createCharacter(draft, { mockObjectives: true });
    expect(character.objectives.length).toBeGreaterThan(0);
    expect(
      character.objectives.every((objective) =>
        objective.title.startsWith("Sample:"),
      ),
    ).toBe(true);
    expect(
      new Set(character.objectives.map((objective) => objective.id)).size,
    ).toBe(character.objectives.length);
  });

  it("supports more than three characters and immutable edits/removal with stable IDs", () => {
    let profile = createProfile("Greg");
    for (let index = 0; index < 5; index += 1)
      profile = addCharacter(profile, {
        ...draft,
        name: `Adventurer ${index}`,
      });
    const first = profile.characters[0];
    const edited = updateCharacter(profile, first.id, {
      ...draft,
      name: "Renamed",
      level: 15,
      status: "leveling",
    });
    expect(edited.characters).toHaveLength(5);
    expect(edited.characters[0]).toMatchObject({
      id: first.id,
      name: "Renamed",
      level: 15,
    });
    expect(profile.characters[0].name).toBe("Adventurer 0");
    expect(removeCharacter(edited, first.id).characters).toHaveLength(4);
    expect(() => removeCharacter(edited, "missing")).toThrow(
      "could not be found",
    );
  });

  it("adds and completes custom objectives without mutating prior state", () => {
    const initial = addCharacter(createProfile("Greg"), draft);
    const characterId = initial.characters[0].id;
    const withObjective = addObjective(
      initial,
      characterId,
      "  Ask the party about Friday  ",
      "high",
    );
    const objective = withObjective.characters[0].objectives[0];
    expect(objective).toMatchObject({
      title: "Ask the party about Friday",
      completed: false,
      priority: "high",
    });
    const completed = setObjectiveComplete(
      withObjective,
      characterId,
      objective.id,
      true,
    );
    expect(completed.characters[0].objectives[0].completed).toBe(true);
    expect(withObjective.characters[0].objectives[0].completed).toBe(false);
    expect(initial.characters[0].objectives).toEqual([]);
    expect(() =>
      setObjectiveComplete(completed, characterId, "missing", true),
    ).toThrow("could not be found");
    expect(() => addObjective(initial, characterId, " ")).toThrow("required");
  });

  it("preserves notes and objectives through character edits", () => {
    const profile = addCharacter(createProfile("Greg"), draft, {
      mockObjectives: true,
    });
    const characterId = profile.characters[0].id;
    const notes = "A plan\n\nWith room to change.  ";
    const noted = setNotes(profile, characterId, notes);
    const edited = updateCharacter(noted, characterId, {
      ...draft,
      plannedSpec: "Holy (unverified)",
    });
    expect(edited.characters[0].notes).toBe(notes);
    expect(edited.characters[0].objectives).toEqual(
      profile.characters[0].objectives,
    );
    expect(profile.characters[0].notes).toBe("");
  });

  it.each([0, 61, 1.5, NaN, Infinity])(
    "rejects invalid provisional level %s",
    (level) => {
      expect(() => createCharacter({ ...draft, level })).toThrow(
        "whole number",
      );
    },
  );

  it("rejects invalid status, empty fields and oversized notes", () => {
    expect(() => createCharacter({ ...draft, name: " " })).toThrow("required");
    expect(() =>
      createCharacter({ ...draft, status: "unknown" as "planned" }),
    ).toThrow("status");
    const profile = addCharacter(createProfile("Greg"), draft);
    expect(() =>
      setNotes(profile, profile.characters[0].id, "x".repeat(10001)),
    ).toThrow("10,000");
  });

  it("roundtrips valid data and rejects unsupported versions, mismatched names and duplicate IDs", () => {
    const profile = addCharacter(createProfile("Greg"), draft, {
      mockObjectives: true,
    });
    expect(validateProfile(JSON.parse(JSON.stringify(profile)))).toEqual(
      profile,
    );
    expect(() => validateProfile({ ...profile, schemaVersion: 99 })).toThrow(
      "unsupported",
    );
    expect(() =>
      validateProfile({ ...profile, usernameKey: "someone-else" }),
    ).toThrow("storage key");
    expect(() =>
      validateProfile({
        ...profile,
        characters: [...profile.characters, profile.characters[0]],
      }),
    ).toThrow("duplicate character");
    const character = profile.characters[0];
    expect(() =>
      validateProfile({
        ...profile,
        characters: [
          {
            ...character,
            objectives: [character.objectives[0], character.objectives[0]],
          },
        ],
      }),
    ).toThrow("duplicate objective");
  });

  it("migrates version-1 profiles without losing identities, notes or completed objectives", () => {
    let profile = addCharacter(createProfile("Greg"), draft, {
      mockObjectives: true,
    });
    profile = addCharacter(profile, {
      ...draft,
      name: "Second character",
      level: 24,
    });
    const first = profile.characters[0];
    profile = setObjectiveComplete(
      profile,
      first.id,
      first.objectives[0].id,
      true,
    );
    profile = setNotes(
      profile,
      first.id,
      "Previous notes\n  with intentional spacing.  ",
    );
    const legacy = {
      ...profile,
      schemaVersion: 1,
      characters: profile.characters.map(
        ({ planner: _planner, ...character }) => character,
      ),
    };
    const raw = JSON.stringify(legacy);
    const migrated = migrateProfile(JSON.parse(raw));
    expect(migrated).toMatchObject({ ...legacy, schemaVersion: 3 });
    expect(migrated.characters[0].objectives[0].completed).toBe(true);
    expect(migrated.characters.map((character) => character.id)).toEqual(
      profile.characters.map((character) => character.id),
    );
    expect(
      migrated.characters.map((character) => character.planner.id),
    ).toEqual(profile.characters.map((character) => character.id));
    expect(
      migrated.characters.every(
        (character) => character.planner.entries.length === 0,
      ),
    ).toBe(true);
    expect(migrateProfile(JSON.parse(raw))).toEqual(migrated);
    expect(JSON.stringify(legacy)).toBe(raw);
    expect(validateProfile(JSON.parse(JSON.stringify(migrated)))).toEqual(
      migrated,
    );
    expect(() => validateProfile(legacy)).toThrow("unsupported");
  });

  it("rejects malformed legacy records and protects unsupported future versions", () => {
    const profile = addCharacter(createProfile("Greg"), draft, {
      mockObjectives: true,
    });
    const character = profile.characters[0];
    expect(() =>
      migrateProfile({
        ...profile,
        schemaVersion: 1,
        characters: [
          {
            ...character,
            objectives: [{ ...character.objectives[0], completed: "yes" }],
          },
        ],
      }),
    ).toThrow("completion");
    expect(() => migrateProfile({ ...profile, schemaVersion: 4 })).toThrow(
      "unsupported",
    );
  });

  it("updates a single character's validated planner without altering legacy state", () => {
    let profile = addCharacter(createProfile("Greg"), draft, {
      mockObjectives: true,
    });
    profile = addCharacter(profile, { ...draft, name: "Second character" });
    const first = profile.characters[0];
    const planner = { ...first.planner, name: "My level 24 route" };
    const changed = setCharacterPlanner(profile, first.id, planner);
    expect(changed.characters[0].planner.name).toBe("My level 24 route");
    expect(changed.characters[0].planner).not.toBe(planner);
    expect(changed.characters[0].objectives).toEqual(first.objectives);
    expect(changed.characters[0].notes).toBe(first.notes);
    expect(changed.characters[1]).toBe(profile.characters[1]);
    expect(first.planner.name).toBe("My route");
    expect(() =>
      setCharacterPlanner(profile, first.id, {
        ...planner,
        entries: null,
      } as never),
    ).toThrow();
    expect(() =>
      validateProfile({
        ...profile,
        characters: [{ ...first, planner: { ...planner, entries: null } }],
      }),
    ).toThrow();
  });
});

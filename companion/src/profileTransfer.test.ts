import { describe, expect, it } from "vitest";
import {
  addCharacter,
  addObjective,
  createProfile,
  setCharacterPlanner,
  setNotes,
  setObjectiveComplete,
} from "./domain";
import { addEntry } from "./planner";
import {
  MAX_PROFILE_IMPORT_BYTES,
  parseProfileTransfer,
} from "./profileTransfer";

function sampleProfile() {
  let profile = addCharacter(createProfile("Transfer test"), {
    name: "Zala",
    race: "Troll",
    className: "Priest",
    faction: "Horde",
    plannedSpec: "Holy",
    level: 24,
    status: "leveling",
  });
  const id = profile.characters[0].id;
  profile = addObjective(profile, id, "Train with friends", "high");
  profile = setObjectiveComplete(
    profile,
    id,
    profile.characters[0].objectives[0].id,
    true,
  );
  profile = setNotes(profile, id, "My notes\n  keep spacing.  ");
  let planner = addEntry(profile.characters[0].planner, {
    title: "My completed stop",
    kind: "zone",
    status: "completed",
    access: "confirmed",
    recordId: "no-longer-in-snapshot",
    targetLevel: { min: 20, max: 25 },
    notes: "Keep this reference even if the dataset changes.",
  });
  planner = addEntry(planner, {
    title: "Skipped goal",
    kind: "custom",
    status: "skipped",
  });
  planner = addEntry(planner, {
    title: "Dungeon preparation",
    kind: "dungeon",
    status: "planned",
    prerequisiteEntryIds: [planner.entries[0].id],
  });
  return setCharacterPlanner(profile, id, planner);
}

describe("portable profile validation", () => {
  it("round-trips supported v2 data and reports a useful preview without changing IDs", () => {
    const profile = sampleProfile();
    const parsed = parseProfileTransfer(JSON.stringify(profile));
    expect(parsed.profile).toEqual(profile);
    expect(parsed.profile).not.toBe(profile);
    expect(parsed.sourceSchemaVersion).toBe(2);
    expect(parsed.summary).toEqual({
      characters: 1,
      routeEntries: 3,
      completedEntries: 1,
      skippedEntries: 1,
      objectives: 1,
      completedObjectives: 1,
    });
    expect(parsed.profile.characters[0].planner.entries[0].recordId).toBe(
      "no-longer-in-snapshot",
    );
  });

  it("migrates v1 through the existing migration without changing notes, completion or identities", () => {
    const profile = sampleProfile();
    const legacy = {
      ...profile,
      schemaVersion: 1,
      characters: profile.characters.map(
        ({ planner: _planner, ...character }) => character,
      ),
    };
    const parsed = parseProfileTransfer(JSON.stringify(legacy));
    expect(parsed.sourceSchemaVersion).toBe(1);
    expect(parsed.profile).toMatchObject({ ...legacy, schemaVersion: 2 });
    expect(parsed.profile.characters[0].planner.entries).toEqual([]);
    expect(parsed.summary).toMatchObject({
      characters: 1,
      routeEntries: 0,
      completedObjectives: 1,
    });
  });

  it.each(["", "{", "not JSON", '{"schemaVersion":2,}'])(
    "rejects malformed JSON: %s",
    (raw) => {
      expect(() => parseProfileTransfer(raw)).toThrow("not valid JSON");
    },
  );

  it.each([
    null,
    [],
    {},
    { schemaVersion: 3 },
    { schemaVersion: "2" },
    { schemaVersion: -1 },
  ])("rejects unsupported or missing schema versions", (value) => {
    expect(() => parseProfileTransfer(JSON.stringify(value))).toThrow(
      "unsupported storage version",
    );
  });

  it("rejects corrupt records and duplicate IDs, including case variants", () => {
    const profile = sampleProfile();
    const character = profile.characters[0];
    const objective = character.objectives[0];
    expect(() =>
      parseProfileTransfer(
        JSON.stringify({
          ...profile,
          characters: [
            character,
            { ...character, id: character.id.toUpperCase() },
          ],
        }),
      ),
    ).toThrow("duplicate character");
    expect(() =>
      parseProfileTransfer(
        JSON.stringify({
          ...profile,
          characters: [
            {
              ...character,
              objectives: [
                objective,
                { ...objective, id: objective.id.toUpperCase() },
              ],
            },
          ],
        }),
      ),
    ).toThrow("duplicate objective");
    expect(() =>
      parseProfileTransfer(
        JSON.stringify({
          ...profile,
          characters: [{ ...character, level: 24.5 }],
        }),
      ),
    ).toThrow("whole number");
    expect(() =>
      parseProfileTransfer(
        JSON.stringify({
          ...profile,
          characters: [
            { ...character, objectives: [{ ...objective, completed: "yes" }] },
          ],
        }),
      ),
    ).toThrow("completion");
    expect(() =>
      parseProfileTransfer(
        JSON.stringify({
          ...profile,
          characters: [
            {
              ...character,
              planner: {
                ...character.planner,
                entries: [
                  ...character.planner.entries,
                  character.planner.entries[0],
                ],
              },
            },
          ],
        }),
      ),
    ).toThrow("duplicate entry");
  });

  it("does not import unknown properties or interpret user text as executable markup", () => {
    const profile = sampleProfile();
    const markup = '<img src=x onerror="alert(1)">';
    const parsed = parseProfileTransfer(
      JSON.stringify({
        ...profile,
        script: "execute me",
        characters: [
          { ...profile.characters[0], notes: markup, unsafeMarkup: markup },
        ],
      }),
    );
    expect(parsed.profile).not.toHaveProperty("script");
    expect(parsed.profile.characters[0]).not.toHaveProperty("unsafeMarkup");
    expect(parsed.profile.characters[0].notes).toBe(markup);
  });

  it("rejects oversized UTF-8 input before parsing", () => {
    expect(() =>
      parseProfileTransfer("é".repeat(MAX_PROFILE_IMPORT_BYTES / 2 + 1)),
    ).toThrow("10 MB");
    expect(() => parseProfileTransfer({} as string)).toThrow(
      "Choose a JSON profile file",
    );
  });
});

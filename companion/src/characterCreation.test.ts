import { describe, expect, it } from "vitest";
import { createProfile } from "./domain";
import { addPlannedCharacter } from "./characterCreation";
import { zoneId } from "./data/zones";
const draft = { name: "Traveler", race: "Troll", className: "Shaman", faction: "Horde", plannedSpec: "Enhancement", level: 1, status: "planned" as const };
describe("character starting destination", () => {
  it("saves a chosen starting zone with the new character without affecting other characters", () => {
    const original = addPlannedCharacter(createProfile("Travelers"), { ...draft, name: "Existing" });
    const next = addPlannedCharacter(original, draft, { startingZoneId: zoneId("durotar") });
    expect(next.characters[1].planner.entries[0]).toMatchObject({ recordId: zoneId("durotar"), targetLevel: { min: 1, max: 12 }, status: "planned" });
    expect(next.characters[0]).toEqual(original.characters[0]);
    expect(original.characters).toHaveLength(1);
  });
  it("allows a friend's starting zone, a blank route, or a higher-level first destination", () => {
    const profile = createProfile("Travelers");
    expect(addPlannedCharacter(profile, draft).characters[0].planner.entries).toEqual([]);
    expect(addPlannedCharacter(profile, draft, { startingZoneId: zoneId("mulgore") }).characters[0].planner.entries[0].recordId).toBe(zoneId("mulgore"));
    expect(addPlannedCharacter(profile, { ...draft, level: 20 }, { startingZoneId: zoneId("durotar") }).characters[0].planner.entries[0].targetLevel).toEqual({ min: 20, max: 20 });
  });
  it("keeps unknown first-destination ranges unestimated and rejects missing references atomically", () => {
    const profile = createProfile("Travelers");
    expect(addPlannedCharacter(profile, draft, { startingZoneId: zoneId("moonglade") }).characters[0].planner.entries[0].targetLevel).toEqual({ min: 1, max: 1 });
    expect(() => addPlannedCharacter(profile, draft, { startingZoneId: "missing" })).toThrow("could not be found");
    expect(profile.characters).toEqual([]);
  });
});

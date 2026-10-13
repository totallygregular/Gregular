import { describe, expect, it } from "vitest";
import demoJson from "../public/demo-profile-v2.json";
import { migrateProfile, validateProfile } from "./domain";
import { getNextUp } from "./planner";

describe("opt-in demo profile", () => {
  it("is a valid portable version-2 fixture with stable character and progress IDs", () => {
    const demo = validateProfile(demoJson);
    expect(demo).toEqual(demoJson);
    expect(migrateProfile(JSON.parse(JSON.stringify(demo)))).toEqual(demo);
    expect(demo.username).toBe("Gregular Demo");
    expect(demo.characters.map(({ level }) => level)).toEqual([24, 12, 30]);
    expect(new Set(demo.characters.map(({ faction }) => faction))).toEqual(
      new Set(["Horde", "Alliance"]),
    );
    expect(
      new Set(
        demo.characters.flatMap(({ planner }) =>
          planner.entries.map(({ status }) => status),
        ),
      ),
    ).toEqual(new Set(["planned", "active", "completed", "skipped"]));
    for (const character of demo.characters) {
      expect(character.notes).toContain("Fictional");
      for (const entry of character.planner.entries) {
        expect(entry.origin).toBe("user");
        expect(entry.targetLevelSource).toBe("user");
        expect(entry.recordId).toBeUndefined();
      }
    }
  });

  it("exercises distinct actionable, upcoming and blocked personal plans", () => {
    const demo = validateProfile(demoJson);
    const [priest, paladin, warrior] = demo.characters;
    const horde = getNextUp(priest);
    expect(horde.recommendations.map(({ title }) => title)).toContain(
      "Review abilities with the group",
    );
    expect(horde.recommendations.map(({ title }) => title)).toContain(
      "Meet the party in the Barrens",
    );
    expect(horde.recommendations.map(({ title }) => title)).not.toContain(
      "Optional material gathering",
    );
    const alliance = getNextUp(paladin);
    expect(alliance.blocked.map(({ title }) => title)).toContain(
      "Research a first dungeon",
    );
    expect(alliance.upcoming.map(({ title }) => title)).toContain(
      "Review the next session plan",
    );
    expect(
      getNextUp(warrior).recommendations.map(({ title }) => title),
    ).toEqual(["Sort the bank before returning"]);
  });
});

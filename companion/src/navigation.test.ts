import { describe, expect, it } from "vitest";
import { characterHash, characterSections, parseRoute } from "./navigation";

describe("character navigation compatibility", () => {
  it("defaults character selection, incomplete links and legacy journal links to Overview", () => {
    expect(characterHash("a")).toBe("/character/a/overview");
    for (const suffix of ["", "/journal", "/unrecognized"]) {
      expect(parseRoute(`#/character/a${suffix}`)).toEqual({
        characterId: "a",
        section: "overview",
      });
    }
  });
  it("keeps actual Quests distinct and character identity stable on every section", () => {
    expect(characterSections.map((s) => s.id)).toEqual([
      "overview",
      "leveling",
      "quests",
      "dungeons",
      "equipment",
      "professions",
      "talents",
      "notes",
    ]);
    for (const characterId of ["first", "second"]) {
      for (const section of characterSections) {
        expect(
          parseRoute(`#${characterHash(characterId, section.id)}`),
        ).toEqual({ characterId, section: section.id });
      }
    }
    expect(parseRoute("#/roster")).toEqual({ section: "roster" });
  });
});

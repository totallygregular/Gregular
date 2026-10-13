import { describe, expect, it } from "vitest";
import {
  characterOptionSources,
  characterOptionsReview,
  classesForRace,
  classSpecialisations,
  raceOptionFor,
  raceOptions,
  specialisationsForClass,
} from "./characterOptions";

describe("reviewed Forever character choices", () => {
  it("contains the exact official race/class table, including Forever additions", () => {
    expect(Object.fromEntries(raceOptions.map(({ id, classNames }) => [id, classNames]))).toEqual({
      dwarf: ["Hunter", "Paladin", "Priest", "Rogue", "Shaman", "Warrior"],
      gnome: ["Mage", "Priest", "Rogue", "Warlock", "Warrior"],
      human: ["Hunter", "Mage", "Paladin", "Priest", "Rogue", "Warlock", "Warrior"],
      "night-elf": ["Druid", "Hunter", "Priest", "Rogue", "Warrior"],
      "skyborne-alliance": ["Druid", "Hunter", "Mage", "Rogue", "Warrior"],
      orc: ["Hunter", "Mage", "Rogue", "Shaman", "Warlock", "Warrior"],
      tauren: ["Druid", "Hunter", "Shaman", "Warrior"],
      troll: ["Hunter", "Mage", "Priest", "Rogue", "Shaman", "Warlock", "Warrior"],
      undead: ["Mage", "Paladin", "Priest", "Rogue", "Warlock", "Warrior"],
      "skyborne-horde": ["Druid", "Hunter", "Rogue", "Shaman", "Warrior"],
    });
    expect(new Set(raceOptions.map(({ id }) => id)).size).toBe(10);
    expect(new Set(raceOptions.flatMap(({ classNames }) => classNames)).size).toBe(9);
  });

  it("derives faction from the selected race while preserving the two Skyborne choices", () => {
    expect(raceOptionFor("Troll", "Horde")?.id).toBe("troll");
    expect(raceOptionFor("Skyborne", "Horde")?.id).toBe("skyborne-horde");
    expect(raceOptionFor("Skyborne", "Alliance")?.id).toBe("skyborne-alliance");
    expect(raceOptionFor(" night elf ", "ALLIANCE")?.id).toBe("night-elf");
    expect(raceOptionFor("Troll", "Alliance")).toBeUndefined();
    expect(raceOptionFor("Skyborne", "Neutral")).toBeUndefined();
    expect(raceOptionFor("Custom race", "Horde")).toBeUndefined();
  });

  it("offers only the 27 named Forever specialisations without retail replacements", () => {
    expect(Object.fromEntries(Object.entries(classSpecialisations).map(([name, { names }]) => [name, names]))).toEqual({
      Druid: ["Balance", "Feral Combat", "Restoration"],
      Hunter: ["Beast Mastery", "Marksmanship", "Survival"],
      Mage: ["Arcane", "Fire", "Frost"],
      Paladin: ["Holy", "Protection", "Retribution"],
      Priest: ["Discipline", "Holy", "Shadow"],
      Rogue: ["Assassination", "Combat", "Subtlety"],
      Shaman: ["Elemental Combat", "Enhancement", "Restoration"],
      Warlock: ["Affliction", "Demonology", "Destruction"],
      Warrior: ["Arms", "Fury", "Protection"],
    });
    expect(Object.values(classSpecialisations).flatMap(({ names }) => names)).toHaveLength(27);
    for (const { classNames } of raceOptions)
      for (const name of classNames)
        expect(specialisationsForClass(name)).toHaveLength(3);
  });

  it("fails closed for unknown choices and returns independent arrays", () => {
    expect(classesForRace("unknown")).toEqual([]);
    expect(specialisationsForClass("")).toEqual([]);
    expect(specialisationsForClass("Death Knight")).toEqual([]);
    expect(specialisationsForClass("constructor")).toEqual([]);
    classesForRace("troll").push("Druid");
    specialisationsForClass("Shaman").push("Custom");
    expect(classesForRace("troll")).not.toContain("Druid");
    expect(specialisationsForClass("Shaman")).not.toContain("Custom");
  });

  it("retains dated primary-source evidence for every availability and spec list", () => {
    expect(characterOptionsReview.edition).toBe("WoW Forever");
    expect(characterOptionsReview.reviewedAt).toBe("2026-10-13");
    expect(characterOptionsReview.gameRevision).toBeNull();
    const sources = new Set(characterOptionSources.map(({ id }) => id));
    expect(sources.size).toBe(characterOptionSources.length);
    expect(sources.has(characterOptionsReview.raceClassesSourceId)).toBe(true);
    for (const source of characterOptionSources) {
      expect(new URL(source.url).hostname).toBe("news.blizzard.com");
      expect(source.reviewedAt).toBe(characterOptionsReview.reviewedAt);
      expect(source.confidence).toBe("forever-confirmed");
    }
    for (const { sourceId } of Object.values(classSpecialisations))
      expect(sources.has(sourceId)).toBe(true);
  });
});

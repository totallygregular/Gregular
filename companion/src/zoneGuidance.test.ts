import { describe, expect, it } from "vitest";
import { getZone, zoneId } from "./data/zones";
import {
  getZoneGuidance,
  LONG_STAY_REVIEW_LEVELS,
  longStayWarning,
} from "./zoneGuidance";

const westfall = getZone(zoneId("westfall"))!;

describe("editorial zone planning guidance", () => {
  it("separates planning advice from a sourced suitable range", () => {
    const guidance = getZoneGuidance(westfall);
    expect(guidance.kind).toBe("editorial");
    expect(guidance.label).toBe("Plan alongside other stops");
    expect(guidance.note).toContain("not levels gained");
    expect(westfall.evidence.levels.kind).toBe("classic-derived");
    expect(getZoneGuidance(getZone(zoneId("riverglades"))).kind).toBe(
      "editorial",
    );
  });

  it("offers starter planning advice without claiming a guaranteed stay", () => {
    const guidance = getZoneGuidance(getZone(zoneId("elwynn-forest")));
    expect(guidance.label).toBe("Starting route segment");
    expect(guidance.note).toContain("follow-up stop as needed");
    expect(guidance.note).toContain("not levels gained");
  });

  it("states unknown guidance without fabricating a short or long stay", () => {
    for (const zone of [undefined, getZone(zoneId("mount-hyjal"))]) {
      expect(getZoneGuidance(zone)).toEqual({
        label: "Guidance unknown",
        note: "Coverage is not established. Choose your own planned range.",
        kind: "unknown",
      });
      expect(longStayWarning({ min: 1, max: 60 }, zone)).toBeUndefined();
    }
  });

  it("uses the documented editorial review threshold, independent of suitable endpoints", () => {
    expect(LONG_STAY_REVIEW_LEVELS).toBe(8);
    expect(longStayWarning({ min: 10, max: 17 }, westfall)).toBeUndefined();
    expect(longStayWarning({ min: 10, max: 18 }, westfall)).toContain(
      "long stay",
    );
    expect(longStayWarning({ min: 20, max: 28 }, westfall)).toContain(
      "long stay",
    );
    expect(
      longStayWarning({ min: 35, max: 45 }, getZone(zoneId("riverglades"))),
    ).toContain("long stay");
  });

  it("leaves the user's full chosen range intact and remains deterministic", () => {
    const range = Object.freeze({ min: 1, max: 60 });
    const before = structuredClone(westfall);
    const warning = longStayWarning(range, westfall);
    expect(warning).toBe("This plan expects a long stay here. Consider another stop nearby.");
    expect(longStayWarning(range, westfall)).toBe(warning);
    expect(range).toEqual({ min: 1, max: 60 });
    expect(westfall).toEqual(before);
    const guidance = getZoneGuidance(westfall);
    guidance.label = "Changed by caller";
    expect(getZoneGuidance(westfall).label).toBe("Plan alongside other stops");
  });

  it("does not interpret missing or malformed plans as a long stay", () => {
    for (const range of [
      undefined,
      { min: 20, max: 10 },
      { min: 0, max: 20 },
      { min: 1, max: 61 },
      { min: 10.5, max: 20 },
      { min: 1, max: Number.NaN },
    ])
      expect(longStayWarning(range, westfall)).toBeUndefined();
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getZone, zoneCatalogue, zoneId } from "./data/zones";
import { ZoneMotif, zoneMotifFor } from "./ZoneMotif";

describe("original destination motifs", () => {
  it("uses explicit, stable destination assignments", () => {
    expect(zoneMotifFor(getZone(zoneId("elwynn-forest")))).toBe("forest");
    expect(zoneMotifFor(getZone(zoneId("westfall")))).toBe("farmland");
    expect(zoneMotifFor(getZone(zoneId("wetlands")))).toBe("reeds");
    expect(zoneMotifFor(getZone(zoneId("dun-morogh")))).toBe("mountains");
    expect(zoneMotifFor(getZone(zoneId("darkshore")))).toBe("coast");
    expect(zoneMotifFor(getZone(zoneId("tanaris")))).toBe("desert");
  });

  it("uses neutral atlas decoration for unknown and new destinations", () => {
    expect(zoneMotifFor()).toBe("atlas");
    expect(zoneMotifFor({ id: zoneId("unreviewed-forest") })).toBe("atlas");
    expect(zoneMotifFor({ id: zoneId("constructor") })).toBe("atlas");
    expect(zoneMotifFor({ id: "unreviewed:zone:elwynn-forest" })).toBe("atlas");
    expect(zoneMotifFor(getZone(zoneId("riverglades")))).toBe("atlas");
    expect(zoneMotifFor(getZone(zoneId("zephras-isle")))).toBe("atlas");
  });

  it("keeps every motif decorative, unfocusable and free of external assets", () => {
    for (const zone of zoneCatalogue) {
      const markup = renderToStaticMarkup(createElement(ZoneMotif, { zone }));
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('focusable="false"');
      expect(markup).not.toMatch(/<image|<text|<title|href=|tabindex=|https?:/i);
    }
  });
});

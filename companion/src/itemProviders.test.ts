import { describe, expect, it } from "vitest";
import { permittedIcon, providerFrame } from "./itemProviders";

describe("documented provider boundary", () => {
  it("accepts only the supported icon host and numeric assets, never its neutral fallback", () => {
    expect(permittedIcon("https://foreverdb.net/icons/132765.webp")).toBe("https://foreverdb.net/icons/132765.webp");
    for (const url of ["https://foreverdb.net/icons/134400.webp", "https://other.test/icons/1.webp", "javascript:alert(1)", "https://foreverdb.net/icons/1.webp?other=1", "https://foreverdb.net/icons/../secret", undefined]) expect(permittedIcon(url)).toBeUndefined();
  });
  it("normalizes bounded unique IDs and preserves exact provider selection", () => {
    expect(providerFrame("foreverdb", [273052, 273052, -1, NaN, 1.2], true)).toBe("./tooltip-frame.html?provider=foreverdb&ids=273052&icons=1");
    expect(providerFrame("wow-forever", [6335])).toBe("./tooltip-frame.html?provider=wow-forever&ids=6335");
    expect(providerFrame("foreverdb", Array.from({ length: 30 }, (_, i) => i + 1)).split("ids=")[1].split(",")).toHaveLength(12);
  });
});

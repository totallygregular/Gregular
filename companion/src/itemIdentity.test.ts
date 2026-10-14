import { describe, expect, it } from "vitest";
import { FOREVER_VARIANT, isForeverItemIdentity, itemIdentityKey, MAX_GAME_ITEM_ID, parseItemIdentity } from "./itemIdentity";

describe("Forever item identity", () => {
  it.each([
    ["273052", 273052, "id"],
    [" 999991 ", 999991, "id"],
    [String(MAX_GAME_ITEM_ID), MAX_GAME_ITEM_ID, "id"],
    ["https://foreverdb.net/item/273052", 273052, "foreverdb"],
    ["https://foreverdb.net/item/273052-ponderous-orb/", 273052, "foreverdb"],
    ["https://www.wowhead.com/forever/item=273052/ponderous-orb", 273052, "wowhead"],
    ["https://wowhead.com/forever/item=273052", 273052, "wowhead"],
    ["https://wow-forever.gg/db/items/273052-ponderous-orb/", 273052, "wow-forever"],
  ])("extracts identity only from %s", (input, gameId, provider) => {
    expect(parseItemIdentity(String(input))).toMatchObject({ gameVariant: FOREVER_VARIANT, gameId, provider });
    expect(Object.keys(parseItemIdentity(String(input))).sort()).toEqual(provider === "id"
      ? ["gameId", "gameVariant", "provider"] : ["gameId", "gameVariant", "provider", "referenceUrl"]);
  });
  it.each([
    "", "0", "-1", "1.5", "1e4", "000123", "+123", "123junk", String(MAX_GAME_ITEM_ID + 1),
    "https://www.wowhead.com/item=273052", "https://www.wowhead.com/classic/item=273052",
    "https://www.wowhead.com/tbc/item=273052", "https://www.wowhead.com/forever/quest=273052",
    "https://foreverdb.net/quest/273052", "https://foreverdb.net/item/0", "https://foreverdb.net/item/0123",
    "https://foreverdb.net/item/273052?item=2", "https://foreverdb.net/item/273052?x=1&x=2",
    "https://foreverdb.net/item/273052#item=2", "http://foreverdb.net/item/273052",
    "https://foreverdb.net:8080/item/273052", "https://foreverdb.net@evil.example/item/273052",
    "https://evil.example@foreverdb.net/item/273052", "https://user:password@foreverdb.net/item/273052",
    "https://foreverdb.net.evil.example/item/273052", "https://www.foreverdb.net/item/273052",
    "https://evil.example/item/273052", "javascript:alert(273052)", "//foreverdb.net/item/273052",
    "https://foreverdb.net/item/273052/another-item", "https://foreverdb.net/item/1/../273052",
    "https://foreverdb.net/item/%32%37%33%30%35%32", "https://foreverdb.net\\@evil.example/item/273052",
    "https://foreverdb.net/item/273052\n", "https://wow-forever.gg/db/items/273052/",
  ])("rejects malformed, unsupported or wrong-variant input %s", (input) => {
    expect(() => parseItemIdentity(input)).toThrow();
  });
  it("recognises only valid explicit or legacy Forever identity", () => {
    expect(itemIdentityKey({ gameId: 273052 })).toBe("wow-forever:273052");
    expect(itemIdentityKey({ gameId: 273052, gameVariant: FOREVER_VARIANT })).toBe("wow-forever:273052");
    expect(isForeverItemIdentity({ gameId: 273052, gameVariant: "wow-retail" })).toBe(false);
    expect(itemIdentityKey({ gameId: 0 })).toBeUndefined();
    expect(itemIdentityKey({ gameId: 1.2 })).toBeUndefined();
    expect(itemIdentityKey({})).toBeUndefined();
  });
});

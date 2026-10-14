/** The current profile/catalogue contract is exclusively WoW Forever. */
export const FOREVER_VARIANT = "wow-forever" as const;
export const MAX_GAME_ITEM_ID = 2_147_483_647;
export interface ItemIdentity {
  gameVariant: typeof FOREVER_VARIANT;
  gameId: number;
}
export interface ParsedItemIdentity extends ItemIdentity {
  provider: "id" | "foreverdb" | "wowhead" | "wow-forever";
  referenceUrl?: string;
}
export class ItemIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemIdentityError";
  }
}
export function isValidGameItemId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= MAX_GAME_ITEM_ID;
}
/** Legacy variant omissions are Forever only inside this Forever-only schema. */
export function isForeverItemIdentity(value: { gameId?: number; gameVariant?: string }): boolean {
  return isValidGameItemId(value.gameId) && (value.gameVariant === undefined || value.gameVariant === FOREVER_VARIANT);
}
export function itemIdentityKey(value: { gameId?: number; gameVariant?: string }): string | undefined {
  return isForeverItemIdentity(value) ? `${FOREVER_VARIANT}:${value.gameId}` : undefined;
}
/** Decode identity only. No network request, tooltip parsing or metadata inference. */
export function parseItemIdentity(input: string): ParsedItemIdentity {
  if (typeof input !== "string" || input.length > 2000 || /[\u0000-\u001f\u007f\\%]/.test(input) || /\/\.\.?\//.test(input))
    throw new ItemIdentityError("Enter a Forever item ID or a supported HTTPS item link.");
  const value = input.trim();
  const checkedId = (digits: string): number => {
    const id = Number(digits);
    if (!/^[1-9]\d*$/.test(digits) || !isValidGameItemId(id))
      throw new ItemIdentityError(`Item ID must be a whole number from 1 to ${MAX_GAME_ITEM_ID}.`);
    return id;
  };
  if (/^\d+$/.test(value)) return { gameVariant: FOREVER_VARIANT, gameId: checkedId(value), provider: "id" };
  let url: URL;
  try { url = new URL(value); } catch {
    throw new ItemIdentityError("Enter a numeric Forever item ID or a full ForeverDB or Wowhead Forever link.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash)
    throw new ItemIdentityError("Use a plain HTTPS item link without credentials, ports, query parameters or fragments.");
  let match: RegExpMatchArray | null;
  let provider: ParsedItemIdentity["provider"];
  if (url.hostname === "foreverdb.net") {
    match = url.pathname.match(/^\/item\/([1-9]\d*)(?:-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?\/?$/);
    provider = "foreverdb";
  } else if (["wowhead.com", "www.wowhead.com"].includes(url.hostname)) {
    match = url.pathname.match(/^\/forever\/item=([1-9]\d*)(?:\/[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?\/?$/);
    provider = "wowhead";
    if (!url.pathname.startsWith("/forever/"))
      throw new ItemIdentityError("Choose a Wowhead Forever item link. Classic, Retail and other game variants are not supported.");
  } else if (url.hostname === "wow-forever.gg") {
    match = url.pathname.match(/^\/db\/items\/([1-9]\d*)-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*\/$/);
    provider = "wow-forever";
  } else {
    throw new ItemIdentityError("This website is not supported. Use ForeverDB, Wowhead Forever, wow-forever.gg, or enter the Forever item ID directly.");
  }
  if (!match) throw new ItemIdentityError("The link does not match a supported Forever item URL.");
  return { gameVariant: FOREVER_VARIANT, gameId: checkedId(match[1]), provider, referenceUrl: url.href };
}

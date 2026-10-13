export type TooltipProvider = "local" | "foreverdb" | "wow-forever";
export const providerNames: Record<TooltipProvider, string> = {
  local: "Local details only", foreverdb: "ForeverDB icons & tooltips", "wow-forever": "wow-forever.gg tooltips",
};
/** Accept only an actual icon decorated by the documented ForeverDB embed.
 * Their question-mark fallback is never presented as an item's actual art. */
export function permittedIcon(value: unknown): string | undefined {
  return typeof value === "string" && /^https:\/\/foreverdb\.net\/icons\/(?!134400\.webp$)[1-9]\d*\.webp$/.test(value) ? value : undefined;
}
export function providerFrame(provider: Exclude<TooltipProvider, "local">, ids: number[], icons = false) {
  const valid = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 12);
  return `./tooltip-frame.html?provider=${provider}&ids=${valid.join(",")}${icons ? "&icons=1" : ""}`;
}

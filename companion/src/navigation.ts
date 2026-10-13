export const characterSections = [
  { id: "overview", name: "Overview", icon: "journal" },
  { id: "leveling", name: "Leveling Route", icon: "route" },
  { id: "quests", name: "Quests", icon: "journal" },
  { id: "dungeons", name: "Dungeons", icon: "dungeon" },
  { id: "equipment", name: "Equipment", icon: "equipment" },
  { id: "talents", name: "Talents", icon: "talent" },
  { id: "notes", name: "Notes", icon: "notes" },
] as const;

export type CharacterSection = (typeof characterSections)[number]["id"];
export type Route = {
  characterId?: string;
  section: CharacterSection | "roster";
};

/** The old journal bookmark always refers to the progression dashboard. */
export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] !== "character") return { section: "roster" };
  const section =
    characterSections.find((s) => s.id === parts[2])?.id ?? "overview";
  return { characterId: parts[1], section };
}

export function characterHash(
  characterId?: string,
  section: CharacterSection = "overview",
) {
  return characterId ? `/character/${characterId}/${section}` : "/roster";
}

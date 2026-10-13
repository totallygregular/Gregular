import { addCharacter, type CharacterDraft, type CharacterOptions, type Profile } from "./domain";
import { getZone } from "./data/zones";
import { addZone } from "./routeBuilder";

/** A chosen first destination is part of the same atomic profile save. */
export function addPlannedCharacter(
  profile: Profile,
  draft: CharacterDraft,
  options: CharacterOptions & { startingZoneId?: string } = {},
): Profile {
  const next = addCharacter(profile, draft, options);
  if (!options.startingZoneId) return next;
  const character = next.characters.at(-1)!;
  const zone = getZone(options.startingZoneId);
  const min = Math.max(draft.level, zone?.recommendedLevel?.min ?? draft.level);
  const max = Math.max(min, zone?.recommendedLevel?.max ?? min);
  const planner = addZone(character.planner, options.startingZoneId, { min, max });
  return { ...next, characters: next.characters.map((entry) => entry.id === character.id ? { ...entry, planner } : entry) };
}

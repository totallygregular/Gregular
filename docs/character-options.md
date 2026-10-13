# Forever character choices

Reviewed **13 October 2026** against Blizzard's Forever publications. This is an official beta snapshot, not a promise about future availability. `companion/src/data/characterOptions.ts` records the source links, review date and per-class specialisation attribution. No Retail race/class matrix is used.

## Race, class and faction

The dropdown table follows Blizzard's [complete Forever race/class combinations](https://news.blizzard.com/en-us/article/24304075/create-the-hero-you-want-to-be-in-world-of-warcraft-forever). It includes the announced additional combinations: Orc Mage, Troll Warlock, Undead Paladin, Human Hunter, Gnome Priest and Dwarf Shaman.

Faction comes from the selected race option. Skyborne has two explicitly named choices: High Order (Alliance) and Windshaper (Horde), with their different class lists. Both persist the canonical race `Skyborne` alongside the existing faction field, so no profile or import schema change is necessary.

`classesForRace(id)` returns only that option's published classes. `raceOptionFor(race, faction)` resolves saved canonical values; contradictory or unknown legacy values stay unresolved. Neither helper rewrites saved profiles. Existing free-text data must remain intact until the user deliberately changes it.

## Specialisation

These are intended talent paths for the profile, including before talents become available; they do not claim to detect an in-game build. Blank is valid. Helpers return an empty list for unknown classes, never a guessed fallback. Exact Forever names preserve **Feral Combat**, **Elemental Combat** and Rogue **Combat**, rather than substituting modern names.

| Class | Choices | Official evidence |
| --- | --- | --- |
| Druid | Balance, Feral Combat, Restoration | [Hunter and Druid deep dive](https://news.blizzard.com/en-us/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid) |
| Hunter | Beast Mastery, Marksmanship, Survival | Same deep dive |
| Mage | Arcane, Fire, Frost | [Mage and Shaman deep dive](https://news.blizzard.com/en-us/article/24302097/world-of-warcraft-forever-class-deep-dives-mage-and-shaman) |
| Shaman | Elemental Combat, Enhancement, Restoration | Same deep dive |
| Priest | Discipline, Holy, Shadow | [Priest and Warrior deep dive](https://news.blizzard.com/en-us/article/24301514/world-of-warcraft-forever-class-deep-dives-priest-and-warrior) |
| Warrior | Arms, Fury, Protection | Same deep dive |
| Rogue | Assassination, Combat, Subtlety | [Rogue and Warlock deep dive](https://news.blizzard.com/en-us/article/24310968/world-of-warcraft-forever-class-deep-dives-rogue-and-warlock) |
| Warlock | Affliction, Demonology, Destruction | Same deep dive |
| Paladin | Holy, Protection, Retribution | [Forever panel recap](https://news.blizzard.com/en-us/article/24303313/world-of-warcraft-forever-deep-dive-panel-recap) |

Class or specialisation does not justify a different zone level range. Starting-zone suggestions use the separately attributed zone catalogue; the user can choose another destination freely.

New characters default to their optional race start only while their current level fits its suitable range. The first zone is saved atomically with the character; its initial personal range uses the current/suitable entry and suitable upper bound, remains editable, and is not a coverage promise. Manual choices, including a blank route, survive later race and level changes. Editing an existing character does not add or replace route stops.

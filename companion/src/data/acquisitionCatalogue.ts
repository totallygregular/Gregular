import type {
  AcquisitionDataset,
  AcquisitionEvidence,
} from "../acquisitionTypes";

const reviewedAt = "2026-10-14";
const bookOfUr = "https://foreverdb.net/quest/1013-the-book-of-ur";
const dalaran = "https://foreverdb.net/dungeon/2959-city-of-dalaran";
const orb = "https://foreverdb.net/item/273052";
const orbWowhead = "https://www.wowhead.com/forever/item=273052/ponderous-orb";
const mittens = "https://foreverdb.net/item/270030";
const mittensWowhead =
  "https://www.wowhead.com/forever/item=270030/tattered-mittens";
const boots = "https://foreverdb.net/item/6335";
const copperVest = "https://foreverdb.net/item/10421";
const glowingBoots = "https://foreverdb.net/item/250482";
const blacksmithing = "https://foreverdb.net/profession/blacksmithing";

function evidence(
  url: string,
  note: string,
  fields: Record<string, string>,
): AcquisitionEvidence {
  return { kind: "reviewed-forever", url, reviewedAt, note, fields };
}

/**
 * Sparse editorial facts, manually reviewed against explicitly Forever sources.
 * This is a starter catalogue, not a database import or an in-client validation.
 * No source prose, icons, maps, drop rates or Classic fallback facts are copied.
 * Review notes and reuse limits: docs/acquisition-data-feasibility.md and
 * docs/item-data-integration.md. Recipe IDs are local reference identities,
 * never an inferred game spell ID. Material game IDs are unknown here.
 */
export const acquisitionDataset: AcquisitionDataset = {
  version: "forever-acquisition-2026-10-14.3",
  reviewedAt,
  items: [
    {
      id: "forever:item:273052",
      gameId: 273052,
      name: "Ponderous Orb",
      quality: "rare",
      slot: "Off hand",
      equipmentType: "Held in off hand",
      requiredLevel: 30,
      stats: [
        { label: "Intellect", value: "+2" },
        { label: "Spirit", value: "+8" },
        { label: "Healing", value: "+11" },
        { label: "Spell damage", value: "+4" },
      ],
      numericStats: {
        values: { intellect: 2, spirit: 8, healingPower: 11, spellDamage: 4 },
        completeness: "partial",
        mappingNote: "The existing display label Healing maps to healing power for this reviewed item only: ForeverDB item 273052 explicitly labels +11 Healing Power (build 1.60.1.70338; reviewed 2026-10-14). This is not a global label alias or a complete stat inventory.",
      },
      classRestrictions: [],
      sourceIds: ["forever:source:273052-shade"],
      evidence: evidence(
        orbWowhead,
        "Forever item identity, level and these stats agree with ForeverDB (build 1.60.1.70338). Providers report a Forever drop; Gregular has not checked the game client. Class restrictions are unknown. Drop percentages disagree and are omitted.",
        {
          identity: `${orbWowhead} ; ${orb}`,
          stats: `${orbWowhead} ; ${orb}`,
          requiredLevel: `${orbWowhead} ; ${orb}`,
          quality: orb,
        },
      ),
    },
    {
      id: "forever:item:270030",
      gameId: 270030,
      name: "Tattered Mittens",
      quality: "rare",
      slot: "Hands",
      equipmentType: "Cloth",
      stats: [{ label: "Armor", value: "29" }],
      numericStats: { values: { armor: 29 }, completeness: "partial" },
      classRestrictions: [],
      sourceIds: ["forever:source:270030-book-of-ur"],
      evidence: evidence(
        mittens,
        "New Forever item corroborated by Wowhead. ForeverDB reports the reward observed in Forever (item snapshot build 1.60.1.70205). Providers disagree on stamina and spell/healing values, so only matching armor is shown. Required level and class restrictions are unknown.",
        {
          identity: `${mittens} ; ${mittensWowhead}`,
          slot: `${mittens} ; ${mittensWowhead}`,
          quality: mittens,
          armor: `${mittens} ; ${mittensWowhead}`,
        },
      ),
    },
    {
      id: "forever:item:6335",
      gameId: 6335,
      name: "Grizzled Boots",
      quality: "uncommon",
      slot: "Feet",
      equipmentType: "Leather",
      stats: [
        { label: "Armor", value: "82" },
        { label: "Stamina", value: "+7" },
      ],
      numericStats: { values: { armor: 82, stamina: 7 }, completeness: "partial" },
      classRestrictions: [],
      sourceIds: ["forever:source:6335-book-of-ur"],
      evidence: evidence(
        boots,
        "ForeverDB distinguishes the changed Forever values from Classic and reports this reward observed in Forever. This is a provider claim reviewed by Gregular, not an in-client check. Required level and class restrictions are unknown.",
        { identity: boots, quality: boots, stats: boots, slot: boots },
      ),
    },
    {
      id: "forever:item:273088",
      gameId: 273088,
      name: "Snake Eye Kaleidoscope",
      quality: "rare",
      slot: "Neck",
      equipmentType: "Miscellaneous",
      requiredLevel: 17,
      stats: [],
      numericStats: { values: {}, completeness: "unknown" },
      classRestrictions: [],
      sourceIds: [],
      evidence: evidence(
        "https://foreverdb.net/item/273088",
        "ForeverDB identifies this new Forever client item (build 1.60.1.70338); its acquisition source is explicitly unknown. Stats and class restrictions are not included in this starter record. Client presence does not establish availability.",
        {
          identity: "https://foreverdb.net/item/273088",
          requiredLevel: "https://foreverdb.net/item/273088",
          slot: "https://foreverdb.net/item/273088",
          quality: "https://foreverdb.net/item/273088",
        },
      ),
    },
    {
      id: "forever:item:10421",
      gameId: 10421,
      name: "Rough Copper Vest",
      quality: "uncommon",
      slot: "Chest",
      equipmentType: "Mail",
      requiredLevel: 2,
      stats: [
        { label: "Armor", value: "108" },
        { label: "Stamina", value: "+1" },
      ],
      numericStats: { values: { armor: 108, stamina: 1 }, completeness: "partial" },
      classRestrictions: [],
      sourceIds: ["forever:source:10421-craft"],
      evidence: evidence(
        copperVest,
        "ForeverDB's client snapshot (build 1.60.1.70338, extracted 2026-10-13) identifies the changed uncommon Forever vest and these values. Recipe learning source and class restrictions are unknown. Gregular has not checked crafting in the game client.",
        {
          identity: copperVest,
          quality: copperVest,
          slot: copperVest,
          equipmentType: copperVest,
          requiredLevel: copperVest,
          stats: copperVest,
        },
      ),
    },
    {
      id: "forever:item:250482",
      gameId: 250482,
      name: "Glowing Copper Boots",
      quality: "rare",
      slot: "Feet",
      equipmentType: "Mail",
      requiredLevel: 10,
      stats: [
        { label: "Armor", value: "109" },
        { label: "Intellect", value: "+4" },
        { label: "Healing power", value: "+9" },
        { label: "Spell damage", value: "+3" },
      ],
      numericStats: {
        values: { armor: 109, intellect: 4, healingPower: 9, spellDamage: 3 },
        completeness: "partial",
      },
      classRestrictions: [],
      sourceIds: ["forever:source:250482-craft"],
      evidence: evidence(
        glowingBoots,
        "ForeverDB's client snapshot (build 1.60.1.70338, extracted 2026-10-13) identifies these new Forever boots and values. The provider labels them bind-on-pickup; another-crafter planning does not establish transferability. Recipe learning source and class restrictions are unknown. Not independently checked in the game client.",
        {
          identity: glowingBoots,
          quality: glowingBoots,
          slot: glowingBoots,
          equipmentType: glowingBoots,
          requiredLevel: glowingBoots,
          stats: glowingBoots,
          binding: glowingBoots,
        },
      ),
    },
  ],
  sources: [
    {
      id: "forever:source:273052-shade",
      method: "dungeon",
      label: "Shade of the Archmage · City of Dalaran",
      dungeonId: "forever:dungeon:city-of-dalaran",
      npcId: "forever:npc:246020",
      bossName: "Shade of the Archmage",
      availability: "unknown",
      evidence: evidence(
        orb,
        "ForeverDB reports a drop from NPC 246020 seen in Forever; Wowhead names the same item's source as Shade of the Archmage. ForeverDB places that boss in City of Dalaran. Character access requirements are unresolved. Zone labels conflict between the city and a faction entrance, so no route zone is asserted. No drop chance is asserted.",
        { itemToNpc: `${orb} ; ${orbWowhead}`, npcToDungeon: dalaran },
      ),
    },
    ...[
      ["270030", mittens],
      ["6335", boots],
    ].map(([id, url]) => ({
      id: `forever:source:${id}-book-of-ur`,
      method: "quest" as const,
      label: "The Book of Ur · reward choice",
      questId: "forever:quest:1013",
      availability: "unknown" as const,
      evidence: evidence(
        url,
        "ForeverDB explicitly marks this reward choice as seen in Forever. Quest access, faction rules, minimum level and complete prerequisites are not established for this snapshot; Classic fallback details are excluded.",
        { itemToQuest: `${url} ; ${bookOfUr}` },
      ),
    })),
    ...[
      ["10421", "Rough Copper Vest", "rough-copper-vest", copperVest],
      ["250482", "Glowing Copper Boots", "glowing-copper-boots", glowingBoots],
    ].map(([id, name, recipe, url]) => ({
      id: `forever:source:${id}-craft`,
      itemIds: [`forever:item:${id}`],
      method: "craft" as const,
      label: `Blacksmithing · ${name}`,
      recipeId: `forever:recipe:${recipe}`,
      availability: "unknown" as const,
      evidence: evidence(
        url,
        "ForeverDB identifies Blacksmithing as this item's client-derived crafting source. Its profession list supplies the recipe skill and material quantities. Learning source, current character access and special crafting requirements are unknown; no Classic trainer fallback is included.",
        { itemToRecipe: `${url} ; ${blacksmithing}`, profession: blacksmithing },
      ),
    })),
  ],
  recipes: [
    {
      id: "forever:recipe:rough-copper-vest",
      name: "Rough Copper Vest",
      itemId: "forever:item:10421",
      profession: "Blacksmithing",
      requiredSkill: 1,
      sourceIds: [],
      materials: [{ materialId: "forever:material:copper-bar", quantity: 4 }],
      materialCompleteness: "complete",
      evidence: evidence(
        blacksmithing,
        "The reviewed ForeverDB recipe list (build 1.60.1.70338, extracted 2026-10-13) lists Blacksmithing skill 1 and 4 Copper Bar. Complete describes this provider-listed reagent set, not a verified learning source or in-client crafting test. Recipe game ID and special requirements remain unknown.",
        {
          output: copperVest,
          profession: blacksmithing,
          requiredSkill: blacksmithing,
          materials: blacksmithing,
        },
      ),
    },
    {
      id: "forever:recipe:glowing-copper-boots",
      name: "Glowing Copper Boots",
      itemId: "forever:item:250482",
      profession: "Blacksmithing",
      requiredSkill: 35,
      sourceIds: [],
      materials: [
        { materialId: "forever:material:copper-bar", quantity: 2 },
        { materialId: "forever:material:lesser-magic-essence", quantity: 4 },
        { materialId: "forever:material:light-leather", quantity: 2 },
      ],
      materialCompleteness: "complete",
      evidence: evidence(
        blacksmithing,
        "The reviewed ForeverDB recipe list (build 1.60.1.70338, extracted 2026-10-13) lists Blacksmithing skill 35, 2 Copper Bar, 4 Lesser Magic Essence and 2 Light Leather. Complete describes the provider-listed reagent set. Learning source, recipe game ID and special requirements remain unknown. The finished item is labelled bind-on-pickup; transferability is not asserted.",
        {
          output: glowingBoots,
          profession: blacksmithing,
          requiredSkill: blacksmithing,
          materials: blacksmithing,
        },
      ),
    },
  ],
  materials: [
    ["copper-bar", "Copper Bar"],
    ["lesser-magic-essence", "Lesser Magic Essence"],
    ["light-leather", "Light Leather"],
  ].map(([id, name]) => ({
    id: `forever:material:${id}`,
    name,
    evidence: evidence(
      blacksmithing,
      "Material name reviewed in ForeverDB's Forever Blacksmithing recipe list (build 1.60.1.70338, extracted 2026-10-13). Numeric material game ID, acquisition sources and ownership remain unknown. Collected quantities belong to individual character crafting goals.",
      { name: blacksmithing },
    ),
  })),
  quests: [
    {
      id: "forever:quest:1013",
      gameId: 1013,
      name: "The Book of Ur",
      recommendedLevel: 26,
      startingNpc: "Keeper Bel'dugur",
      startingLocation: "Undercity",
      prerequisiteIds: [],
      prerequisiteStatus: "unknown",
      followUpIds: [],
      rewardItemIds: ["forever:item:270030", "forever:item:6335"],
      availability: "unknown",
      evidence: evidence(
        bookOfUr,
        "ForeverDB reports quest level 26 and observed reward choices. Its live browser page marks the Undercity pickup with Keeper Bel'dugur as confirmed by two players. Older reader snapshots omit those observations. Minimum level, faction, objective location and prerequisite completeness remain unknown here. An empty prerequisite list does not mean no prerequisites. Only reviewed starter rewards are listed.",
        {
          identity: bookOfUr,
          recommendedLevel: bookOfUr,
          startingNpc: bookOfUr,
          startingLocation: bookOfUr,
          rewards: `${mittens} ; ${boots} ; ${bookOfUr}`,
          prerequisites:
            "Unknown; do not promote inherited Classic chain details into Forever facts.",
        },
      ),
    },
  ],
  dungeons: [
    {
      id: "forever:dungeon:city-of-dalaran",
      name: "City of Dalaran",
      evidence: evidence(
        dalaran,
        "Blizzard names City of Dalaran as a Forever dungeon. ForeverDB's client-derived list includes Shade of the Archmage. Its lore places Dalaran in Alterac, while its dungeon page labels Silverpine and a Horde entrance; route zone is unresolved. Access and entry minimum are not established here. Local stable ID is not a claimed game identifier.",
        {
          identity:
            "https://worldofwarcraft.blizzard.com/en-us/news/24303862/world-of-warcraft-forever-whats-next-panel-recap",
          boss: dalaran,
          zone:
            "Unresolved geographic / faction-entrance distinction: https://foreverdb.net/lore/place/dalaran ; " +
            dalaran,
        },
      ),
    },
  ],
  npcs: [
    {
      id: "forever:npc:246020",
      gameId: 246020,
      name: "Shade of the Archmage",
      evidence: evidence(
        orb,
        "ForeverDB's Ponderous Orb record identifies NPC 246020; Wowhead names the drop source Shade of the Archmage. No boss abilities, coordinates or drop rate are included.",
        { gameId: orb, name: orbWowhead },
      ),
    },
  ],
};

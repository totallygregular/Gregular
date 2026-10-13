# Zone-range review — 13 October 2026

All **45** catalogue records were reviewed for the character-start and next-zone suggestion follow-up. The **40** existing numeric ranges remain unchanged: one official Forever range, 38 provisional Classic-derived ranges and one owner-supplied editorial range. Five records retain unknown general questing ranges. This review verifies attribution and recorded values; it does not establish new Forever quest XP or promise uninterrupted leveling in any zone.

## Sources and methods

- **F** — [Blizzard: Meet the New Skyborne](https://news.blizzard.com/en-gb/article/24302071/wow-forever-meet-the-new-skyborne), 22 September 2026. Re-read 13 October. Explicitly establishes Zephras Isle's 1–12 starting experience.
- **Q** — [ForeverDB: Leveling to 30](https://foreverdb.net/guide/leveling), updated 2 October 2026; guide build `1.60.1.70170`, footer `1.60.1.70291`. Re-read 13 October. The publisher reports the 10th–90th percentiles of **Classic** quest levels for quests found in its Forever client data. New Forever quest levels are excluded. These selected factual windows remain `classic-derived`, low confidence.
- **C** — [LibTourist Classic Era 1.15.9](https://www.curseforge.com/wow/addons/libtourist-classic-era/files/8865898), 12 September 2026, pinned commit `d2380757a8fe2b1cb2d341817e36e1cd0bccee3a`. Release metadata and the source's `low`/`high` values were inspected on 13 October through the publisher's [Git source](https://www.curseforge.com/wow/addons/libtourist-classic-era/source). MIT notice is retained in [zone-provenance.md](zone-provenance.md). These are broad **Classic Era audience** ranges, not measured Forever quest or XP coverage.
- **E** — [Gregular's owner-requested range](zone-guidance.md): Riverglades 35–45. The re-read [Blizzard Found Photos recap](https://news.blizzard.com/en-gb/article/24304071/world-of-warcraft-forever-found-photos-panel-recap), 13 September 2026, establishes a mid-level, both-faction zone but gives no exact endpoints. Keep the range editorial, low confidence.
- **U** — No reliable general questing window established in the reviewed material. Existing presence/identity evidence stays separate from range evidence. No range is fabricated from map position, a race association, an instance, or a quest outlier.

## Complete catalogue check

The ranges are suitable-content guidance. Personal entry and exit levels remain editable and are never migrated by reference-data updates.

| Zone | Recorded range | Source / evidence |
| --- | --- | --- |
| Elwynn Forest | 1–12 | C — provisional |
| Dun Morogh | 1–12 | C — provisional |
| Teldrassil | 1–12 | C — provisional |
| Durotar | 1–12 | C — provisional |
| Mulgore | 1–12 | C — provisional |
| Tirisfal Glades | 1–12 | C — provisional |
| Zephras Isle | 1–12 | F — Forever confirmed |
| Westfall | 10–18 | Q — provisional |
| Loch Modan | 10–20 | Q — provisional |
| Darkshore | 12–20 | Q — provisional |
| Silverpine Forest | 10–18 | Q — provisional |
| The Barrens | 10–25 | Q — provisional |
| Redridge Mountains | 14–25 | Q — provisional |
| Stonetalon Mountains | 18–28 | Q — provisional |
| Ashenvale | 20–30 | Q — provisional |
| Wetlands | 21–31 | Q — provisional |
| Duskwood | 24–32 | Q — provisional |
| Hillsbrad Foothills | 24–37 | Q — provisional |
| Thousand Needles | 28–41 | Q — provisional |
| Alterac Mountains | 30–40 | C — provisional |
| Arathi Highlands | 30–40 | C — provisional |
| Stranglethorn Vale | 30–45 | C — provisional |
| Desolace | 30–40 | C — provisional |
| Dustwallow Marsh | 35–45 | C — provisional |
| Badlands | 35–45 | C — provisional |
| Swamp of Sorrows | 35–45 | C — provisional |
| The Hinterlands | 40–50 | C — provisional |
| Feralas | 40–50 | C — provisional |
| Tanaris | 40–50 | C — provisional |
| Searing Gorge | 43–50 | C — provisional |
| Blasted Lands | 47–55 | C — provisional |
| Azshara | 48–55 | C — provisional |
| Felwood | 48–55 | C — provisional |
| Un'Goro Crater | 48–55 | C — provisional |
| Western Plaguelands | 50–60 | C — provisional |
| Burning Steppes | 50–60 | C — provisional |
| Eastern Plaguelands | 55–60 | C — provisional |
| Winterspring | 55–60 | C — provisional |
| Silithus | 55–60 | C — provisional |
| Deadwind Pass | Unknown | U |
| Moonglade | Unknown | U |
| Riverglades | 35–45 | E — editorial |
| Mount Hyjal | Unknown | U |
| Shen'dralas | Unknown | U |
| Darkspear Islands | Unknown | U |

## Decisions that affect suggestions

Keep the six original starting zones at **1–12**. Their broad C ranges include the level-1 starting areas. The Q guide's truncated quest percentiles start some of them at 2 or 3; those statistics are not minimum entry levels and would be misleading as character-creation defaults.

The Q guide supports **Troll → Durotar → The Barrens**, with Silverpine Forest another Horde 10–18 option. It also supports the original Undead start in Tirisfal Glades followed by Silverpine Forest. Race associations are optional starting suggestions, not restrictions on personal routes. Travel ordering remains the planner's explicit relative-overhead model, not a researched travel-time claim.

The twelve Q windows deliberately differ from some C intervals because the sources measure different things. They were not blended into apparently more precise averages. In particular, preserve The Barrens **10–25**, Silverpine Forest **10–18**, Stonetalon Mountains **18–28** and Ashenvale **20–30** with their existing source labels. Good follow-up suggestions should arise from the chosen route bracket and supported travel connections, not by changing source ranges until a desired order appears.

LibTourist lists Deadwind Pass at 55–60, but that broad library interval does not establish a useful general solo questing segment. Its catalogue range remains unknown. Moonglade's class utility likewise does not establish a general questing range. New-zone identities do not establish endpoints for Mount Hyjal, Shen'dralas or Darkspear Islands.

No new live client extraction or gameplay review was performed. The ForeverDB map index was unavailable to the research tool during this follow-up; its previously recorded client-presence evidence was preserved. Neither that failure nor stale Classic quest data was treated as confirmation of current Forever quest completeness.

## Verification

`companion/src/data/zones.test.ts` checks the twelve Q intervals, all 26 C intervals, source classifications, the official/editorial distinction, all five unknowns, and the unchanged 35–45 Riverglades correction. Existing catalogue tests retain faction suitability, optional race starts, stable IDs and independence from saved personal ranges.

# Forever progression data

Reviewed **13 October 2026, Pacific/Auckland**. Snapshot: `forever-progression-2026-10-13.1`, edition **WoW Forever**. This is a small factual reference catalogue with editable planning scaffolds, not a complete leveling guide.

## Source and scope

The shipped catalogue uses [Blizzard's beta development notes, Kaivax post 4](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-8/2360696/4), published October 1, 2026 as displayed by the source. The staff-authored post was opened and reviewed during this pass. Its zone changes support beta activity; its dungeon announcements support testing availability and the few bands below. Gregular has not verified these records in-game. The exact client build was not published in this evidence, so `gameRevision` is `null`.

| Catalogue records | Included facts | Explicit unknowns |
| --- | --- | --- |
| Stonetalon Mountains, Ashenvale, Hillsbrad Foothills, Redridge Mountains, Duskwood, Wetlands | Names and activity in Forever beta notes | Zone level ranges, faction quest coverage, prerequisites, game IDs |
| Excavation Site: Wetlands | Testing available; announced band 26–31 | Actual entry minimum, access restrictions, quests, loot, prerequisite chain, game ID |
| Razorfen Downs | Testing available; announced 25+ | Same; upper band also unknown |
| Uldaman | Testing available; announced 30+ | Same; upper band also unknown |

“Confirmed availability” means announced for testing at this source revision. It is not a live server-status check or a claim that any character can enter. An announced dungeon band is separate from `minimumLevel`: this snapshot establishes no entry minimum. The published 26–31 band is retained even though the same notes set the beta cap at 30. The planner's 1–60 input range permits longer-term personal plans and does not assert that all levels are currently playable.

Gregular IDs such as `forever:zone:ashenvale` are stable application keys, not invented Blizzard numeric IDs. Empty prerequisite/relationship arrays are paired with **unknown** evidence; they must not be read as proof that no restrictions or relationships exist. Faction remains `Unknown` where a restriction was not established, rather than a verified claim of access for both factions.

## Facts, editorial plans and player state

`companion/src/data/progression.ts` contains the catalogue. `progressionTypes.ts` defines field-level evidence, source metadata, optional announced bands, faction restrictions, relationships and prerequisite slots. No dataset is hardcoded inside a React component.

The two starter templates are Gregular editorial choices:

| Starter | Editable order | Personal planning windows |
| --- | --- | --- |
| Horde 20–30 | Stonetalon Mountains → Ashenvale → Hillsbrad Foothills | 20–24 → 24–27 → 27–30 |
| Alliance 20–30 | Redridge Mountains → Duskwood → Wetlands | 20–24 → 24–27 → 27–30 |

Their audience, order and windows are **not verified Forever recommendations, optimal routes, experience estimates or travel instructions**. Zone names were checked against Forever evidence; the windows were not copied from Classic Era, Season of Discovery or Retail. The templates make the route editor usable while missing game information stays visible. A blank route is equally supported.

Each saved entry records its origin and target-level source. Verified reference facts, editorial scaffolds, user-created objectives and older illustrative examples are distinct. Generic milestone suggestions are original planning labels, not imported quest names or actual unlock rules. Custom objectives remain user-owned even when associated with a zone or dungeon reference.

Access confirmation belongs to the player's plan. It records the player's decision to plan an activity; it does not upgrade unknown catalogue fields to verified facts. Next Up respects access/prerequisite gates and distinguishes actionable objectives from plans needing review. The dataset stores `currentLevelCap: 30` with separate source evidence. A reference-linked entry is held for review when the character's level or the entry's starting target/verified minimum exceeds that cap, even after personal access confirmation. Personal objectives remain independent and longer-term plans stay editable. Next Up does not invent recommendations when there is no eligible saved work.

## References examined but excluded

[Wowhead Forever zone pages](https://www.wowhead.com/forever/zone=331/ashenvale) exposed inherited comments, including comments dated 2005 and references to later expansions. A `/forever/` URL does not make every comment a Forever observation. Those comments were excluded. Provider quick facts require field-origin review before becoming a verified Gregular range. The [Wowhead terms page](https://www.wowhead.com/tos) did not expose substantive legal text through the reader; no bulk redistribution permission was established.

The [October 8 staff update](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-8/2360696/5) confirms testing of City of Dalaran, but supplies no level band. It is a later catalogue candidate, not a shipped recommendation in this snapshot. Broader API/export and tooltip research remains in [game-data-feasibility.md](game-data-feasibility.md).

## Reuse and attribution

No blanket permission to redistribute game prose, art, maps or third-party database exports was established. This pass imports none of those materials. It manually records a few names and announcement facts, uses original planning labels and provides direct attribution. This conservative scope is not legal clearance from Blizzard or a database provider.

No automated scrape, undocumented endpoint, external tooltip script, credential or runtime data dependency is introduced. Public viewing and a software licence do not establish rights to republish underlying game content. A later export importer requires a source-specific reuse review before shipping, including attribution and any underlying content exclusions.

## Updating the snapshot

1. Select a specific Forever source revision and preserve its publication and review dates. Do not infer a build from another site's newest record.
2. Review each changed fact and access statement. Keep unsupported values explicitly unknown.
3. Author a narrow catalogue change with source links and per-field confidence. Review any new reuse requirements before importing material.
4. Diff names, bands, restrictions, availability and relationships. Validate stable IDs and references, then run the planner/dataset tests.
5. Review the change through a normal pull request and update this report.

Personal titles, notes, target levels, ordering, access confirmation and completed/skipped states are saved independently from reference records. Restoring a starter retains progress. Removed references remain visible for review instead of erasing the personal entry. A new source range is a prompt to review a plan, not permission to reset it.

The next data review should establish faction-specific quest coverage, actual entrance rules, Forever zone ranges and a few class milestones. Until then, the reusable planner is the feature; the catalogue remains deliberately small.

# Connected acquisition model (profile schema 3)

## Canonical records and character state

`companion/src/acquisitionTypes.ts` defines the shared contract. The versioned,
offline catalogue is `companion/src/data/acquisitionCatalogue.ts`; it contains
items, acquisition sources, quests, dungeons and NPCs. IDs are stable app-owned
references. Optional numeric `gameId` values are included only where reviewed.
Existing zone catalogue IDs are used for known zone associations.

An item lists `sourceIds`. A source has a typed method (`quest`, `dungeon`,
`vendor`, `craft`, `world`, `unknown`) and explicit quest, dungeon or NPC IDs
where known. Quests contain prerequisite, follow-up and reward item references.
Multiple items can share one source, quest or dungeon. `prerequisiteStatus`
distinguishes a complete known list from partial and unknown information; an
empty unknown list never establishes that a quest has no prerequisites.

Each character stores an independent `acquisition` object:

| Property | Purpose |
| --- | --- |
| `wishlist` | Stable entry ID, item ID, wanted/acquired/dismissed status, optional preferred source ID, personal notes |
| `questProgress` | Quest ID, planned/completed status, notes, explicit tracking flag |
| `manualItems` | Personal item definitions with user-supplied provenance |
| `manualSources` | Personal relationships, optionally linking `itemIds` without editing catalogue records |
| `manualDungeons` | Personal dungeon records for sources outside the reviewed snapshot |
| `manualQuests` | Personal quest definitions and optional prerequisite references |
| `manualChains` | Named ordered quest-ID sequences, notes and optional HTTP(S) reference |
| `dungeonProgress` | Dungeon ID, completed-run count, notes and explicit tracking flag |

Manual record IDs use the `user:` namespace. Imports cannot claim verified
provenance for these records. Reference provenance is supplied per record, with
optional field-level notes. Reviewed means the documented provider record was
reviewed; it does not imply an independent in-client verification.

## Derived goals and independent progress

`acquisition.ts` supplies immutable commands, validation, search and selectors.
`resolveAcquisition` combines the snapshot with personal definitions and links.
It does not mutate the snapshot. `getQuestGoals` derives linked reward quests
and recursively includes prerequisite references. Iterative graph traversal
handles branching, shared prerequisites, missing records and cycles without
recursion overflow. Cycles and missing references remain visible for review.
`QuestGoal.desiredItems` contains direct selected rewards only;
`supportingItems` identifies equipment goals that depend on a prerequisite,
without claiming that prerequisite rewards the item.

`getDungeonGoals` groups wanted items by their selected source's dungeon ID.
Choosing another source changes the derived planning views while preserving
item notes, status, quest progress and run history. The interface chooses a
sole known source when initially wishlisting an item; multiple sources require
the player's choice. A missing or unrelated preferred source is retained but
does not generate false linked goals.

Quest and dungeon goals are not automatically copied into persisted tasks.
Removing an item removes its derived contribution, while shared goals needed
by another item remain. Explicit quest state and all manual quests remain.
Removing a manual chain or one of its steps preserves the independently
tracked quests and progress. Removing a manual quest record preserves its
progress and dependent IDs so the journal can show an unresolved reference.

Recording a run never changes an item status or completes a quest. Completing
a quest never marks a reward acquired. Marking an item acquired never
completes its source quest or dungeon. Quest status is a personal planning
record: `planned` does not mean accepted in the game client.

## Overview and route eligibility

`getAcquisitionSummary` supplies counts and up to three eligible pending quests.
A quest is eligible only when availability is explicitly available, level
information exists and the character meets the later of its known minimum and
personal target, prerequisite coverage is complete, all known prerequisites
and preceding chain steps are completed, and dependencies contain no cycle or
missing record. Source availability and source level requirements also gate
linked reward suggestions at the reward quest. A later reward's restrictions do not
suppress independently available prerequisite preparation. Unknown facts do not become urgent Next Up goals.
Personal availability confirmation remains labelled user supplied.

`getZoneAcquisitionGoals` supplies outstanding quest, desired item and dungeon
counts for an existing route stop. It resolves known source, quest and dungeon
zone associations, or an explicitly supplied matching zone name. These views
never insert zones, reorder routes, complete content or change existing plans.

## Migration, backups and portable profiles

`domain.ts` advances the profile version from 2 to 3. Version-1 profiles retain
their existing deterministic blank-route migration; version-2 routes are
validated and preserved. Both migrations add a blank acquisition object.
Character IDs, objectives, personal notes, revision and prior planning state
remain unchanged. Migration is read-only until a subsequent user save.

Before the first save of an older stored profile, the repository retains the
exact prior JSON once under `:backup:v1` or `:backup:v2` as appropriate. An
existing migration backup is never overwritten. If the required backup cannot
be written, the profile is not replaced. Existing replacement/restore backups
remain separate, and raw-record/revision checks continue rejecting stale tabs.

Imports accept versions 1, 2 and 3. Version-3 exports include all personal
records, preferred source IDs and acquisition progress. Validation builds fresh
known-shape objects, rejects duplicate IDs, invalid enums, invalid integers,
oversized lists/text and unsafe URL schemes, and preserves unresolved
references. Personal reference URLs allow only absolute HTTP(S) links without
credentials. Failed import preparation makes no storage changes. Transfer
confirmation and recovery retain the existing one-use preview and backup
protections.

The import preview counts persisted wishlist entries, quest progress records,
manual chains and dungeon progress records. These counts are portable even
when the receiving catalogue snapshot differs; derived catalogue-dependent
goal counts are recalculated after import.

## Validation

`acquisition.test.ts` covers search, source choice, shared and branching goals,
independent completion, manual CRUD and ordering, missing records, graph cycles,
safe links, limits and a 12,000-record deep prerequisite graph.
`profileAcquisition.test.ts` covers version-2 migration, exact backups and
failure behavior, multi-tab conflicts, independent characters, complete
relationship export/import into separate storage and non-destructive failures.
Existing version-1, route, objective, backup and recovery tests remain active.

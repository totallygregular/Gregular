# Forever item identity and catalogue contract

Pass 8 delivers **Path B**, a local identity and personal-planning boundary. It imports **zero new shared game records**. The six reviewed equipment records remain the core catalogue. The source and permission decision is recorded in [the Pass 8 decision](forever-item-data-decision.md) and [source licences](source-licenses.md).

## Identity v1

```ts
interface ItemIdentity {
  gameVariant: "wow-forever";
  gameId: number;
}
```

The identity key is `wow-forever:<gameId>`. IDs must be positive safe integers no larger than 2,147,483,647; this is Gregular's validation bound, not a claim about the maximum client item ID. An item level, required level, quest ID, recipe ID, NPC ID and game item ID are different facts. Names, zones and slugs never establish identity or relationships.

The current profile and catalogue schema supports Forever only. Legacy records that omit `gameVariant` retain their existing implicit Forever meaning. Explicit Classic, Retail or other variants are rejected. A future multi-game migration must introduce a versioned contract and must not silently relabel those legacy records.

`companion/src/itemIdentity.ts` validates a bare decimal ID and these exact HTTPS URL forms:

| Provider | Supported shape | Basis |
| --- | --- | --- |
| ForeverDB | `https://foreverdb.net/item/273052` or `/item/273052-ponderous-orb` (optional trailing slash) | Existing reviewed ForeverDB item references |
| Wowhead Forever | `https://www.wowhead.com/forever/item=273052/ponderous-orb` (slug and trailing slash optional; `wowhead.com` also accepted) | Existing reviewed Forever-specific references |
| wow-forever.gg | `https://wow-forever.gg/db/items/273052-ponderous-orb/` | [Provider developers documentation](https://wow-forever.gg/developers/) |

Other hosts and game paths are rejected. Credentials, custom ports, query parameters, fragments, encoded paths, path traversal and control characters are rejected instead of guessed. For a supported item with a copied tracking URL, remove the query/fragment or enter its numeric Forever ID. A bare numeric ID is explicitly entered in this Forever-only workflow; it is not proof that an item exists, is equippable, or exists in another game variant.

Parsing returns only `gameVariant`, `gameId`, the recognised provider and, for a link, its reference URL. It makes no network request and discovers no game facts. URL identity extraction requires no database export or response parsing.

## Shared reference facts and personal choices

`AcquisitionDataset.items` continues to own shared reviewed facts. Each `ItemRecord` has a stable local `id`, optional `gameId`/`gameVariant`, quality, optional equipment slot/category and required level, descriptive `stats`, optional typed `numericStats`, restrictions, explicit source references and evidence. Missing required level, category or statistics stays missing. An empty restrictions list in the sparse catalogue does not establish that there are no restrictions. `numericStats.values.intellect: 0` is an explicit zero; an omitted intellect key is unknown. Descriptive effects stay separate from numeric values and never undergo automatic tooltip/text conversion.

The reviewed core is shipped independently of saved character profiles. A future licensed imported snapshot belongs in shared versioned reference data, with its own pinned revision/build, source licence/attribution, field provenance and validation report. No importer or imported snapshot is claimed by this pass. Existing dataset `version`, `reviewedAt` and evidence fields remain the reference-version boundary; the build can be unknown and must never be guessed from an item ID.

`CharacterAcquisition.manualItems` owns user-authored records only. New identified records use `user:item:forever:<gameId>`, explicit Forever identity and `user-supplied` evidence. An unnamed item becomes `Forever item #<gameId>`, with unknown quality and no implied level, stats, restrictions or sources. User-entered numeric values are marked partial and remain personal observations. `updateManualItem` edits those personal details while preserving its stable identity and source links. Older ID-less personal/crafting records continue to work.

`WishlistEntry` stores an item reference, optional stable game identity, status, notes and an explicitly selected source. Newly created entries carry identity where known, including entries referencing shared catalogue items. It never copies a complete catalogue row into a character. Each character owns its independent wishlist. Duplicate identities are rejected across numeric IDs, provider links, old personal aliases and catalogue aliases, including on JSON validation when identity can be established. Older opaque catalogue references without a saved game identity remain safely unresolved until their reference data returns.

`addIdentifiedWishlistItem(state, dataset, identity, draft)` reuses an existing personal or shared identity before creating a personal record. A known reviewed row is reused without accepting a manual override of its facts; personal wishlist notes remain supported. If a player explicitly supplies additional personal details for a reviewed identity, a separate user-supplied record stores only those typed details, with an identity placeholder when no name was typed. No reviewed fields are copied into it. This allows missing-field observations to be saved and edited independently. Search continues to use the reviewed record's facts when that identity is reviewed; personal values are displayed separately and are not silently merged into reviewed filters. `addWishlistItem` accepts an optional fourth `dataset` argument to perform identity checks for catalogue aliases. Personal detail editing uses `updateManualItem` separately.

All additions are optional fields within existing profile schema **4**. Previous profiles retain their source shape, existing migrations and backups. Profile import/export and conflict handling continue through the existing profile repository; no parallel storage system is introduced.

## Later snapshots and missing references

Resolution is a read-only presentation step. When a later reviewed snapshot contains a previously personal game identity:

1. There is one search result for the identity.
2. The existing personal/saved wishlist item reference remains stable.
3. Reviewed facts are presented with reviewed evidence and a runtime `catalogueReferenceId` identifying the shared row.
4. The original personal record is retained unchanged in `manualItems`, available for separate display and editing. Personal fields are never silently promoted into reviewed facts.
5. Shared source item references, quest rewards and recipe result references are mapped to that stable presentation reference. User-supplied source provenance remains user-supplied.

Removing an optional snapshot preserves saved identities and choices. If a wishlist entry retains a game ID but its reference row is missing, resolution supplies an identity-only placeholder with unknown metadata. It does not save a copied reference row or retain stale numerical facts as current. No source is automatically selected. Personal source links survive catalogue updates.

## Acquisition relationships

Relationships continue to live separately in `AcquisitionSource`, quests and crafting recipes. A user may explicitly attach a personal quest, dungeon, vendor, crafting, world or unknown source to an identified item. Its evidence remains `user-supplied`, availability may remain unknown, and no quest pickup/reward location, dungeon entrance, NPC or recipe relationship is inferred from identity or a zone label. Source location roles require explicit information. Unknown references remain saved for visible review.

## Provider presentation and permission boundary

An ID enables the existing documented provider presentation; it does not guarantee a working icon or tooltip. Item identities remain useful when providers fail or local-only presentation is selected. The shipped service menu offers ForeverDB's supported tooltip/icon embed. wow-forever.gg links identify items, but its tooltip option remains unavailable in the menu because the earlier sandbox smoke found CORS failure. Presentation contracts are not structured data exports. Gregular does not scrape item pages, read private provider endpoints or convert rendered tooltip content into authoritative facts. Player-entered observations stay personal. Provider-generated presentation assets remain with the provider; no new redistributed icon/tooltip dataset is created.

## Future addon boundary

A future addon may report `{ gameVariant: "wow-forever", gameId: 999991 }` for an equipped item even if no catalogue row exists. Validate the identity independently of catalogue membership. Keep equipment position/character choices separate from shared item facts. An unknown ID can be displayed as a provider link or an identity placeholder immediately; catalogue enrichment can arrive later. Do not invent required level, stats, restrictions or sources to make it fit. This pass implements no addon, equipment import, calculation integration or optimisation score.

## Verification

The identity and acquisition tests use synthetic records only as labelled test fixtures. They cover supported provider paths, hostile/malformed/wrong-variant links, identity duplicates, explicit zero versus unknown values, editable personal details, immutable identity, later snapshot collisions, missing snapshots, acquisition source preservation, quest/dungeon/crafting continuity and JSON/profile save/reload. Tests do not call live providers. Existing regression suites continue to cover search, route-aware planning, backups, migrations and multiple-tab conflicts.

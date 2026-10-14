# Gear Discovery data: Pass 7 feasibility

Reviewed **14 October 2026, Pacific/Auckland**. This supplements
[item integration](item-data-integration.md),
[acquisition feasibility](acquisition-data-feasibility.md),
[general game-data feasibility](game-data-feasibility.md), the
[shared acquisition model](connected-acquisition-model.md), and
[zone/travel provenance](zone-provenance.md). The existing six-item reviewed
catalogue remains the shipped data. No provider database or client installation
was imported or independently reproduced during this investigation.

## Decision

Continue with a small, reviewed local index and provider-independent numeric
search. **No inspected source established both a supported structured Forever
equipment export and sufficiently clear reuse permission for the intended
redistributed stat/source index.** That is a selection decision based on the
material inspected, not proof that such a source cannot exist.

Useful structured candidates exist. QuestieDB has meaningful acquisition data;
client-table projects can describe items and recipes; several community sites
display extensive Forever records. Their rights, field semantics, variant
coverage and completeness need separate checks. A rendered tooltip does not
establish a bulk API, and a software licence does not grant rights to all game
data opened with that software.

Consequently this pass includes no third-party ingestion experiment. The
conditional requirement to ingest a permitted source was not met. Existing
reviewed facts are normalized locally; isolated synthetic fixtures exercise
larger indexes and relationships without adding fictional Forever content.
Unavailable bulk data does not block working stat and route search.

## Live source review

These are primary sources for the respective projects' own published contracts,
schemas, provenance and notices. Extraction/completeness claims remain provider
claims. A failed reader request is recorded as unverified access, not a reason
to bypass a restriction.

| Candidate | Established capability | Missing contract or limitation | Selection |
| --- | --- | --- | --- |
| [ForeverDB about](https://foreverdb.net/about) and [documented embed](https://foreverdb.net/embed) | Client/hotfix-derived item facts, maps and recipes; separately observed server relationships; documented item/spell tooltip integration. The about page says beta patches trigger extraction and rebuilds. | Quest details can inherit explicitly labelled CMaNGOS Classic fallback. No inspected bulk stat/source API, download schema, redistribution grant, rate allowance or update SLA. The embed text reader failed in this review; its prior browser verification is recorded in the Pass 6 report. | Keep the functioning optional sandbox embed; review sparse local facts. No tooltip transport adapter, bulk cache or HTML extraction. |
| [wow-forever.gg developer tools](https://wow-forever.gg/developers/) | Documented talent JSON, build-code format, site statistics and tooltip embedding. The inspected page identifies build `1.60.1.70338`. | Explicitly says database items, spells, quests, zones and routes are pages and are not offered as files. Its CC BY 4.0 grant covers owned compilation/statistics and excludes Blizzard names, text and art. | A talent export is not a gear export. No item ingestion. |
| [QuestieDB Forever guide](https://github.com/Questie/QuestieDB/blob/master/docs/forever.md), [item schema](https://github.com/Questie/QuestieDB/blob/master/src/meta/itemMeta.lua) | Structured Lua item identities, levels, class/subclass, quest rewards, NPC/object/container drops, vendors and taught spells; separate quest/NPC/object records and support mappings. Dedicated Forever generation and correction layers. | The inspected 16-field item schema has no full stat array, rarity, equip-slot or recipe-reagent field. Forever includes inherited baselines and does not claim complete new content. It is an addon/library API, not an HTTP service. | Strong acquisition lead after file-specific permission and provenance review; insufficient as a numeric equipment index alone. |
| [WoWDBDefs](https://github.com/wowdev/WoWDBDefs) and [component licences](https://github.com/wowdev/WoWDBDefs/blob/master/LICENSE.md) | Build-specific, machine-readable field definitions for client tables; definitions CC BY-SA 4.0 and code BSD-3-Clause. | Definitions explain binary columns; they do not supply game facts or license Blizzard's table contents. A correct column name does not establish a mechanically correct stat conversion. | Potential decoding tool, with separate notices and build pins. No extracted client tables shipped. |
| [Wago.Tools](https://wago.tools/) | Existing source leads describe build-selected DB2 CSV; the [simulation fork's own pipeline](https://github.com/ryanfitz7/Forever) documents its use. | Direct reader access remained unusable. Official provider export terms, Forever item schema, hotfix behavior, caching, rates and redistribution permission were not verified here. Another project's URL usage is not a provider contract. | Unresolved input candidate. No request workaround, mass download or inferred licence. |
| [ForeverDiff.com methodology](https://foreverdiff.com/methodology/) and [terms](https://foreverdiff.com/terms/) | Describes pinned client/definition builds, hashes, computed item stats and profession recipes. Explicitly disclaims server-side loot/vendor/quest coverage. | Methodology is not a supported export API. Terms identify Blizzard content and provider-owned presentation without an inspected general bulk reuse grant. Computed numeric amounts require validation of the exact formula/build. | Useful methodology/reference lead; no imported output or formula implementation. |
| [ForeverDiff.gg sources](https://foreverdiff.gg/about/data) | Separates client-derived fields, a pinned MIT pfQuest Vanilla/TBC world layer and contributed observations. Publishes provenance claims and explicit withheld/missing-value handling. | No inspected stable public gear export or blanket licence for the assembled Forever index. Its world baseline is not Forever observation. Do not combine this domain's statements with ForeverDiff.com as if they were one verified input. | Reference lead; no inferred shared ownership, rights or data equivalence between domains. |
| [Warcraft Forever item browser](https://warcraftforever.games/items) | Explicit Forever item browsing with name, quality and slot controls. | Public rendering does not establish API/export or bulk reuse permission. Hidden/unavailable fields need independent coverage review. | Attributed reference only. |
| [Warcraft DB Forever](https://forever.warcraftdb.com/) and [Wowhead Forever](https://www.wowhead.com/forever/database) | Forever-specific navigation and concrete record references already used in bounded prior reviews. | No supported structured export/reuse grant was established in this review. A JavaScript shell or successful tooltip is not an acquisition API. | Retain references; no internal-request inspection or bulk scrape. |
| [Blizzard Classic API announcement](https://us.forums.blizzard.com/en/blizzard/t/world-of-warcraft-classic-api-endpoints/346) and [current documentation entry](https://develop.battle.net/documentation/world-of-warcraft-classic/game-data-apis) | Blizzard's announcement establishes Classic item/media, item class, race/class and creature API families. | The announcement is from 2019 and does not establish today's Forever namespace or full stat/source payload. The current portal was unreadable through the reader; no authenticated Forever sample was tested. Classic/Retail ID overlap does not establish matching values. | Future official adapter candidate; no Forever API support claim, credentials or guessed namespace in the static app. |

### Questie rights and field-origin boundary

[QuestieDB provenance](https://github.com/Questie/QuestieDB/blob/master/PROVENANCE.md)
records historical Questie origins and says current build identity comes from
the producing QuestieDB commit and artifact hashes. The migration reference is
historical lineage, not a current input pin. The inspected QuestieDB root did
not expose a dataset licence.

The still-open [Questie licence issue #4447](https://github.com/Questie/Questie/issues/4447)
is material: maintainers explain that the old CurseForge GPL designation did not
resolve historical contributor rights and discuss unfinished relicensing.
Therefore the CurseForge label must not be treated as blanket permission to
redistribute inherited QuestieDB data. This clarifies the earlier reports'
description of Questie as a promising GPL lead; it is **not a selected,
rights-cleared dataset**. An individual downstream project's licence assertion
cannot settle every upstream input's rights.

The [Forever delta-base document](https://github.com/Questie/QuestieDB/blob/master/docs/forever-delta-base.md)
also matters beyond licensing. Its generated additions do not establish complete
objectives or restrictions; missing references remain reported, and capped
source lists are withheld. A quest category is organizational, not physical
geography; an NPC primary-area estimate is not a dungeon entrance or a complete
quest path. Generated fields and inherited baselines require separate origin
labels even when served through the same Forever API.

The [QuestieDB consumer contract](https://github.com/Questie/QuestieDB#for-consumers)
says numeric getters return `0` when unset. A future adapter must determine
whether a field was present and what supplied it before normalizing. A getter's
sentinel zero must not become confirmed zero required level, zero stat, no
restriction, no prerequisite or unrestricted access.

### Client stats and recipes require a separate review

ForeverDiff.com's method describes stat allocations and item-budget tables used
to compute displayed bonuses; raw allocations are not already `+Intellect`.
Its stated cross-check percentages are provider validation, not Gregular's own
client verification. An importer must preserve raw and computed origins and
validate the exact target build before accepting amounts. Spell ratings,
percentages, school-specific damage, healing and combined effects need distinct
semantics. Similar words are insufficient evidence for merging bonuses.

Recipe identities, craft outputs, reagent quantities and skill-line links can
be client-derived candidates. They still do not establish where a recipe is
learned, a trainer's actual stock, character eligibility or material locations.
Crafting sources remain independent of geography unless a separate, supported
location relationship exists. A known profession does not imply a learned
recipe. [ForeverDiff's recipe methodology](https://foreverdiff.com/methodology/)
describes withheld recipe names and profession changes; this is another reason
to pin edition/build and never backfill from Classic automatically.

## Field coverage: what a future input must actually supply

`Candidate` means plausible structured coverage needing permission and a bounded
technical sample. `Reference` means rendered/public records only in this review.
`Absent` means absent from the inspected schema, not proof that the provider can
never supply the field.

| Field group | QuestieDB inspected contract | Client-table candidate | ForeverDB/community pages | Current Gregular |
| --- | --- | --- | --- | --- |
| Item ID/name | Structured; inherited/effective origin review | Candidate, with missing/withheld names | Reference | Six reviewed records; stable app IDs plus known game IDs |
| Numeric stats/effects | Absent from item schema | Candidate; formula/spell-effect review needed | Rendered/reference | Explicit reviewed subset; unrecorded bonuses unknown |
| Slot/quality | Absent from item schema | Candidate | Reference | Reviewed where known |
| Required level/item level | Separate structured fields | Candidate; zero/sentinel review | Reference | Required level remains absent where unknown; no item-level substitution |
| Armor/weapon type | Item class/subclass | Candidate | Reference | Reviewed type where known; no universal Forever proficiency table |
| Quest rewards/prerequisites | Structured; coverage/origin review | Generally requires server observations | Mixed observations and labelled fallback | Small shared graph, explicit incomplete prerequisites |
| Dungeon loot/NPC sources | Item-to-NPC edges plus NPC/support inputs; dungeon/entrance semantics need joins | Loot not established from item tables | Partial observed relationships | Supported source edges; uncertain entrances remain unknown |
| NPC/vendor/zone | Structured candidate; maps/instance conversion needs review | World stock/location not established from item tables | Partial observations and fallback | Sparse explicit relationships, shared zone IDs |
| Recipes/reagents/materials | Taught spell only in item schema, insufficient alone | Candidate spell/skill/reagent relationships | Sparse reviewed profession facts | Two reviewed recipes; unknown learning sources/requirements retained |

## Sustainable static index contract

The search engine operates on normalized items and shared acquisition records;
the UI does not know an upstream provider's labels, table layout or transport.
Existing display labels/effects and provenance survive normalization. Future
imports must target that contract, not add provider-specific branches to filter
components.

The current implementation builds `createGearSearchIndex` once per resolved
catalogue, classifies each shared source once through `getGearRouteIndex` for
the current route/faction and combines those cached relationships per item.
When a player selects an acquisition method, route matching uses only that
method's source IDs, so a nearby vendor cannot satisfy a dungeon-only search.
The Equipment page renders up to 36 results per page; optional provider icon
requests follow the rendered results. These bounds are implemented independently
of any future permitted bulk export.

Use two separately versioned layers: compact searchable equipment facts and
the acquisition/location graph. Item stat updates do not establish source
updates. A tooltip can show newer provider values while the search remains on
its pinned local record; opening a tooltip must never mutate the index or saved
character plan.

A future **permitted local-file** ingestion experiment should follow this
contract. It is a proposed acceptance workflow, not an implemented importer:

1. Select one concrete export and record explicit reuse terms, required notices,
   attribution, exclusions, permission evidence, edition, locale, client build,
   upstream commit/release, definition/formula revision and source URL. No moving
   `latest` dependency. No secrets in browser assets.
2. Start with roughly 10–25 equipment records plus a few source/recipe edges.
   Include changed shared IDs, new Forever IDs, incomplete records, true zero
   values and an unsupported effect. Keep the input file and SHA-256 only when
   redistribution is permitted; otherwise do not commit it or claim
   reproducibility from an unavailable private input.
3. Validate variant before transformation. Classic, TBC, Retail, missing variant,
   unsupported build/formula, invalid IDs, conflicting duplicates and malformed
   numeric values must fail review. Unknown effects remain descriptive. Do not
   parse a chance-on-hit or conditional effect as a permanent numeric bonus.
4. Emit ID-sorted deterministic JSON, a separate version/rights manifest and a
   field/relationship diff. Distinguish missing, explicitly zero, disputed,
   inherited, computed and observed values. Require explicit stat coverage
   before interpreting an omitted field as confirmed absence.
5. Join source entities through stable game IDs and a reviewed mapping to the
   existing zone catalogue. Record quest pickup, objectives and turn-in
   separately; dungeon region is distinct from a faction-specific entrance;
   vendor position is distinct from craft availability. Keep unresolved edges
   as unknown and report conflicting mappings.
6. Compare reviewed output with source evidence and target-build tooltips;
   validate item stats and acquisition edges independently. Run filter,
   relationship and profile round-trip checks offline. Review a second input
   revision to prove changes/deletions are understandable.
7. Promote by reviewed development commit. A removed catalogue record retains
   unresolved saved references. Never rewrite wishlist status, preferred source,
   route stops/order/completion, notes, quest progress or crafting progress.

## Distribution and performance plan

Ship sparse numeric fields and short identifiers in the search layer; avoid
duplicating long descriptions, spell prose, tooltip markup and complete source
entities per item. A manifest can point to immutable content-hashed JSON assets
with edition, schema, build, licence, item count, byte sizes and checksums.
Required notices stay human-readable and linked from the application.

Start with one compressed equipment payload and a separate acquisition graph
once a permitted larger input exists. Load search data on Equipment entry and
reuse the in-memory normalized index. HTTP Brotli/gzip requires no custom
decompressor. Full local details and externally rendered tooltips remain
separate from searchable data; external availability is never required for
filtering.

If measurements justify partitioning, prefer stable equipment-category shards
with a small manifest and shared source tables. Items can match multiple slots
or types, so deduplicate by stable ID. Required-level brackets can be a secondary
manifest filter but must include a separate unknown-level shard; moving item
levels between builds should not change identity. Avoid loading only the
character's class shard when class restrictions are incomplete. Stable ID
shards are simpler for caching/diffs but cannot by themselves avoid unrelated
equipment downloads.

Stat coverage/values are indexed once, and cheap item/character constraints are
evaluated before sorting the matching results by route rank. The current route
index classifies each unique relevant source once with source/location maps,
rather than run a travel-graph search for every item comparator call. It is
rebuilt on route edits, reordering, completion/skipping, faction, catalogue or
source-method changes. Future capability controls must also invalidate their
route index. The implementation reuses the existing graph and its
evidence/unlock rules, with no parallel equipment map. Browser work with many
distinct geographically indexed sources remains a separate performance check.

For tens of thousands of items, measure transfer size, decompression/JSON parse,
index construction, ANY/ALL thresholds, deterministic sorting, route
classification, rendered result count and input responsiveness separately.
Window or paginate large results; rendering all cards and enhancing every
provider icon can dominate otherwise cheap filtering. Add a worker only after
browser measurements show input blocking; do not ship an additional search
dependency merely to filter six records.

Planning arithmetic is **not a measured dataset size**: 30,000 compact rows at
300–600 raw bytes each would be 9–18 MB before compression, shared metadata and
source tables. Repeated synthetic data compresses far more than varied real
names, URLs and effects, so its compression ratio must not be promised for a
future provider export. Record actual generated raw/gzip/Brotli sizes before
selecting shard boundaries or an initial-load budget.

### Reproducible synthetic observation

Run `node scripts/benchmark-gear-search.mjs` from the repository root after
installing the existing dependencies. It generates 30,000 explicitly synthetic
rows in memory, loads the actual `gearSearch.ts` implementation through Vite,
checks result membership against an independent numeric predicate and confirms
repeatable ordered IDs. It does not fetch a provider or write a profile/catalogue.
Route sorting uses synthetic precomputed ranks; graph traversal and UI rendering
are outside this measurement. Timings have no fragile pass/fail threshold.

Observed on 14 October 2026 with Node `v22.18.0`, Windows x64:

| Measurement | Observation |
| --- | ---: |
| Synthetic complete fixture raw / gzip / Brotli | 11,095,805 / 380,723 / 223,467 bytes |
| Synthetic compact equipment rows raw / gzip / Brotli | 6,775,677 / 414,614 / 213,018 bytes |
| JSON parse, median of five | 30.971 ms |
| Gzip decompression, median of five | 8.286 ms |
| One index construction | 15.929 ms |
| ANY, match / selected-stat / route sort, median of seven | 14.589 / 13.484 / 13.558 ms |
| ALL, match / selected-stat / route sort, median of seven | 8.389 / 8.677 / 8.203 ms |
| Strict ANY / ALL result counts | 10,781 / 3,575 |

The query uses Intellect >= 5, Spirit >= 8 and a level-20 character's +10
required-level window. Unknown levels and unknown bonuses are represented in
the generated input. The unusually favorable compression is caused by repeated
synthetic labels and provenance; even the smaller raw projection has slightly
larger gzip output in this run. These are reproducible observations of the
fixture and current engine, not a real dataset-size estimate, mobile performance
guarantee or complete application benchmark. A permitted varied dataset still
needs actual browser transfer, memory, route and rendering measurements.

## Updates, reliability and remaining work

No investigated provider supplied a Gregular update SLA. Refresh on relevant
Forever patches and meaningful corrections through an explicit reviewed
snapshot update. Record both build identity and review/retrieval dates; beta
client presence, provider extraction date and game availability are different
facts. Keep the last accepted input/output hashes and notices to reproduce a
review. No scheduled scraper or automatic profile-rewriting refresh is added.

The next useful data step is a permission-backed, documented export containing
ID/name, slot/type, rarity, required level, numeric stat semantics/coverage and
build identity. Acquisition relationships can be an independently permitted
second input. Ask for allowed redistribution/caching, update cadence, notices,
field-origin labels and deletion/withheld semantics before importing. No provider
was contacted or messaged during this pass.

Until that input exists, disclose the small catalogue and incomplete coverage
in search. Unknown stats fail strict thresholds; optional incomplete results
remain separate. Unknown source location does not mean unavailable on the
route, and no permitted path does not mean physically unreachable. Explainable
stat matches and route convenience are useful even when comprehensive loot,
Forever proficiency rules or overall upgrade calculations remain unavailable.

# WoW Forever game-data feasibility

Research date: **13 October 2026, Pacific/Auckland**. This is a feasibility assessment of the sources observed during this development pass, not a certification of every record they publish. No game data or third-party scripts were imported into the prototype.

## Decision

Use **versioned, reviewed local snapshots behind a game-data adapter**, with Gregular rendering its own accessible tooltips. Start a later data pass with a small talent import and a deliberately narrow dungeon/item catalogue. Keep personal objectives independent of the catalogue so that an upstream correction cannot erase a user's planning.

Do not make the application depend on a live third-party database query for its initial render. Do not equate a record's presence in a beta client with availability in the beta world. Do not infer missing Forever fields from Classic Era, Season of Discovery, or Retail.

A practical talent export exists, but there is **no blanket finding that all required game content is licensed for redistribution**. Compilation/code licences and Blizzard's underlying content rights must remain separate. Public viewing, an available download, and permission to embed a service answer different questions.

## How evidence was assessed

- **Observed**: a page, documented integration, or file was opened during this research.
- **Provider claim**: the site's author describes extraction, completeness, or verification; Gregular has not independently reproduced it.
- **Candidate**: useful next-pass lead that still needs technical or rights validation.
- **Unresolved**: no usable contract, permission, or sufficient evidence was established.

Search-result snapshots and fetched pages sometimes showed different counts/builds or older cached content. Counts below are observations, not an assertion of today's complete catalogue or latest Blizzard build. Search engines' publication/crawl labels are not evidence of the date a game value changed. This report does not treat a community post on a Blizzard forum as a Blizzard staff statement.

## Source assessment

### Blizzard: product identity, announcements and changes

Blizzard's [Forever beta announcement](https://worldofwarcraft.blizzard.com/en-us/news/24304160/the-world-of-warcraft-forever-beta-now-live) was surfaced with a 17 September 2026 date. Its search-readable contents identify the Forever beta and give initial content availability, including named new dungeons and level bands. The [official development-notes thread](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-8/2360696/1) contains detailed class changes. These are authoritative for statements Blizzard actually makes, rather than a complete machine-readable quest/loot/talent database. The announcement's subsequent direct fetch failed; the notes were readable in the search result.

**Use:** release context, beta availability and manual validation evidence. Record the particular post/update, not just a site's home page. Official prose does not by itself establish every numeric prerequisite or drop relationship.

### Wowhead Forever: substantial reference coverage, embedding supported

The [Forever database hub](https://www.wowhead.com/forever/database) explicitly provides Forever categories for items, spells/talents, quests, NPCs, zones and instances. This is a separate game variant; links must retain `/forever/`.

An opened [Forever item record, ID 263015](https://www.wowhead.com/forever/item=263015/skyseers-pants), displayed item stats, equipment slot, required level, a named drop source and a percentage. This proves a concrete Forever page contains those fields, not that every item has them or that an observed drop percentage equals a known server probability. The [Forever spell example](https://www.wowhead.com/forever/spell=8427/blizzard) also states that item statistics remain hidden until discovered and asks for client uploads. That is a material completeness limitation.

Wowhead's [official tooltip documentation](https://www.wowhead.com/tooltips) provides `https://wow.zamimg.com/js/tooltips.js`, ordinary-link integration, domain selection and customization. It describes hover and mobile use and supports multiple entity types. **Forever-specific rendering, correct variant selection, keyboard behavior, privacy characteristics, performance and CSP compatibility were not tested in a browser here.** The [terms page](https://www.wowhead.com/tos) opened but yielded no substantive legal text through this reader. No public bulk-export/API reuse licence was established.

**Use:** attributed external references and a later, optional tooltip integration spike. Do not bulk-copy the database or rely on undocumented internal endpoints merely because pages expose data. Obtain applicable reuse terms before importing.

### wow-forever.gg: strongest observed ready-made talent export

The [tool-maker documentation](https://wow-forever.gg/developers/) explicitly offers a talent export, build-code specification, build embeds and item/spell tooltip embedding. It describes CC BY 4.0 for its compilation/arrangement and its own statistics, while excluding Blizzard names, text, icons and pictures from that grant. It requests attribution and build identification. The export is not a general items/quests/zones dump; those remain site pages. The docs warn that a decoder alone does not validate a build.

Its [talents.json](https://wow-forever.gg/developers/talents.json) was actually opened as JSON. Observed metadata: build `1.60.1.70338`, generated `2026-10-12`. Records include class/tree IDs, talent IDs, grid position, maximum ranks, required tree points, prerequisite IDs, spell/icon IDs and rank descriptions. This is an available machine-readable candidate, not an independently reproduced client extraction. Its documented prerequisite semantics require care: multiple listed dependencies mean any one fully ranked prerequisite suffices.

**Use:** first candidate for a pinned talent-data experiment after checking redistribution of embedded game content. Retain source credit and describe Gregular's transformations. No import is included in this pass.

### ForeverDB: broad coverage with disclosed mixed provenance

[ForeverDB's own about page](https://foreverdb.net/about) says its database comes from the Forever client with hotfixes and covers items, spells, talents, sets, dungeons and maps. It explicitly says quest-giver/location details may use **CMaNGOS Classic data until seen in Forever**, marked as speculation. It also marks unplayable content speculative. This disclosure makes it useful for investigation, but a page being on a Forever site is insufficient evidence that every field is Forever-observed. Its extraction/rebuild workflow is a provider claim, not independently executed here.

Its [embedding documentation](https://foreverdb.net/embed) offers a free item/spell script without an account or key, using links or `data-foreverdb` attributes. It documents keyboard/touch behavior, optional icon/link changes and requests without referrers. These are documented behaviors; no browser integration or network audit was performed. No general bulk-data redistribution licence or supported public query API was established.

**Use:** cross-checking and possible optional tooltips. Import only explicitly permitted data with preserved per-field origin. Speculative Classic details must not become Gregular recommendations.

### Other Forever databases: useful checks, not assumed exports

| Source | Observed evidence and limitation | Suggested role |
| --- | --- | --- |
| [Warcraft Forever item browser](https://warcraftforever.games/items) | Claims extraction from the Forever beta client, showing 21,787 known items and stating hidden-until-drop information is absent. No stable export/API contract or reuse licence was found on the examined page. | Manual reference and completeness cross-check. |
| [Warcraft DB Forever](https://forever.warcraftdb.com/) | A Forever-specific database navigation surface with item, quest, spell, zone and talent-tool categories was observed. A guessed tooltip path was inaccessible; that is not proof no tooltip integration exists. No documented export or reuse permission was established. | Investigate developer documentation/contact before integrating. |
| [WCLBox Forever](https://wowforever.wclbox.com/en) | Describes client-derived talents, spells, items, dungeons and maps, with Classic comparisons. No public API contract or reuse licence was found on the examined home page. Its [dungeon-quest methodology](https://wowforever.wclbox.com/en/fuben-renwu) cites Wowhead Forever plus Questie's quest data and calculated experience adjustments. | Cross-check named records; preserve upstream source chains and avoid treating calculated/Classic-derived fields as observed Forever facts. |
| [The Forever Era item browser](https://theforeverera.com/en/items/) | Explicitly mixes client values, beta-server observations and Classic values for missing items. Equipment usability filters state Classic proficiency assumptions. The opened page showed build `1.60.1.70338`, but internally inconsistent aggregate counts/labels. No bulk reuse grant was established. | Useful warnings and comparisons. Exclude Classic fallback fields from authoritative Forever snapshots. |

### Open-source calculators and extraction tools

| Project | What is actually supported by the examined source | Reuse decision |
| --- | --- | --- |
| [Deradon/wow-forever-talent-calc](https://github.com/Deradon/wow-forever-talent-calc) | Its README describes demo-video extraction, only rank 1 being visible, higher ranks extrapolated using Classic patterns and assumed point rules. It discloses missing/unverified readings. Code is MIT; Blizzard talent text, icons and video crops are excluded. | Potential UI/validation reference with notices. **Do not use its extrapolated data as verified current beta ranks.** |
| [ryanfitz7/Forever](https://github.com/ryanfitz7/Forever) | A simulation fork claims a beta DB2 import pipeline, distinguishes Trait tables from old Talent/TalentTab leftovers and warns of incomplete tooltip-token resolution. It documents Wago endpoint shapes. It also discloses Classic gear substitutes. README says MIT and asks for visible upstream credit. | Candidate extraction-code reference, requiring code/fixture review and pinned revision. Neither sim results nor gear presets are a verified Forever recommendation source. |
| [wowdev/WoWDBDefs](https://github.com/wowdev/WoWDBDefs) | Machine-readable client-table definitions with build-specific structures. Its [licence file](https://github.com/wowdev/WoWDBDefs/blob/master/LICENSE.md) separates CC BY-SA 4.0 definitions/data from BSD-3-Clause code. These are table definitions, not a licence for Blizzard table contents. | Useful if building an importer; preserve licence boundaries and pin definitions to a revision. |
| [Marlamin/wow.tools.local](https://github.com/Marlamin/wow.tools.local) | A locally runnable database/file inspection tool with an MIT software licence, using WoWDBDefs and DBCD. | Possible offline inspection fallback. Not evaluated against a Forever installation during this pass. Do not mistake the tool licence for content permission. |

### Wago.Tools: promising raw tables, access not verified here

The simulation project's README documents `https://wago.tools/api/builds` and `https://wago.tools/db2/<Table>/csv?build=<build>`, selecting product `wow_classic_beta` and version `1.60.x`. It names Trait, curve and spell tables as a candidate route to ranks and dependencies. Those details are **another project's implementation claims**, not a verified Wago service contract.

Direct web-reader access to [Wago.Tools](https://wago.tools/) returned 403. Both the [build endpoint](https://wago.tools/api/builds) and a [TraitTree CSV probe](https://wago.tools/db2/TraitTree/csv?build=1.60.1.70338) were unusable in this environment; a separate read-only HTTP probe could not resolve the host. This does not prove the service is down for ordinary users. It means availability, payload shape, rate limits, CORS, retention, hotfix handling and reuse terms remain **unresolved here**.

**Use:** run a bounded technical spike before selecting it as an import source. Product/version filters and build checks are mandatory; never import the numerically newest unrelated Retail build.

### Blizzard web APIs: do not promise Forever support

The [Classic API documentation](https://develop.battle.net/documentation/world-of-warcraft-classic/game-data-apis) redirected to the community developer portal and could not be read; the [namespace guide](https://develop.battle.net/documentation/world-of-warcraft/guides/namespaces) exposed only a JavaScript shell. No official, tested Forever beta namespace/API contract was verified in this pass.

The [API-access discussion](https://us.forums.blizzard.com/en/blizzard/t/when-will-we-gain-api-access-to-forever-apis/59595) contains community questions and replies, not a staff support guarantee. [Guildbook's own repository](https://github.com/Guildbook/guildbook) documents candidate `classic1x` profile/static namespaces, but an author's configuration is insufficient proof of beta data coverage, official support or production reliability.

**Use:** leave an adapter seam for future official APIs. A later backend spike must verify namespace, region, endpoint coverage, response game identity and terms using a registered application. Do not add credentials to the static client.

## Coverage verdict

| Required capability | Feasibility for a later pass | Evidence still required before shipping as verified |
| --- | --- | --- |
| Item IDs, names, slots and basic stats | Good candidate coverage in Forever-specific sites; completeness varies. | A permitted export or API, per-record build/provenance, discovery/availability state and checks of sample client tooltips. |
| Item acquisition and drop sources | Partial; some concrete pages contain source relationships. | Relationship-level evidence, beta observations and sample sizes. Never derive a drop source solely from the item's client record. |
| Full talent grids, ranks, IDs and prerequisites | Strongest near-term data feature. A ready-made JSON export exists. | Licence/content review, schema validation, all-class sample checks and actual rule validation against the target beta build. |
| Accurate talent/spell tooltips | Feasible but involves rank, level and token/formula semantics. | No unresolved tokens masquerading as numbers; distinguish static text from level-dependent values; test hotfix differences. |
| Dungeon and zone identity/level information | Feasible for a curated small catalogue. | Separate minimum entry level, recommended level band, quest level, content availability and player's own plan. These are distinct fields. |
| Quest prerequisites, givers, travel unlocks and routes | Incomplete; client data alone is insufficient. | Forever-specific observations and editorial review. Validate the entire prerequisite chain and faction/class restrictions. |
| Automatic optimal leveling/BiS recommendations | Not ready to claim from this research. | Reviewed policy, comprehensive relevant data, explainable constraints and in-game validation. Keep prototype examples visibly marked as samples. |

## Integration options

| Option | Decision | Reason |
| --- | --- | --- |
| Live public API from every browser | Defer | No verified complete Forever API contract; adds runtime availability, variant-selection and rights dependencies. |
| Reviewed local snapshot | **Preferred** | Reproducible builds, offline-friendly UI, explicit data versions and controlled review of beta changes. |
| Import/normalize raw exports | **Preferred ingestion pattern**, subject to permission | Keeps upstream format and patch churn outside components. Run in tooling/CI with a reviewed change, not in each user's browser. |
| External tooltip service | Optional later enhancement | Good for linked reference browsing after a bounded compatibility/privacy check. Plain external links must remain usable if the service fails. |
| Gregular tooltip rendering | **Preferred core UI** | Keyboard/touch consistency, visible build/source labels, no third-party script dependency and control over unknown states. Requires permitted, accurate source data. |

These are engineering recommendations, not assertions that a provider has approved Gregular's intended use.

## Proposed data contract and update workflow

Keep game knowledge separate from mutable player state. A profile stores stable character IDs, objective completion, note text and references to catalogue records. The catalogue stores the facts and their sources. A removed upstream record should display as unavailable while retaining a user's wishlist/build reference for review.

Suggested metadata for every snapshot:

```text
schemaVersion, datasetId, gameVariant = "forever-beta", clientBuild,
locale, generatedAt, retrievedAt, sourceUrls[], importerRevision,
contentHash, licenceStatus, attribution[], knownLimitations[]
```

Suggested record provenance:

```text
recordId, kind, gameId, sourceBuild, sourceUrl,
evidence = official | client-derived | server-observed | editorial | mock,
availability = observed-playable | client-only | unavailable | unknown,
verifiedAt, verifiedBy, fieldSources{}, unknownFields[]
```

Do not use a single boolean `verified` to cover stats, loot source, availability and recommendations. An item can have supported stats and an unknown drop source. Represent unknown fields as missing/explicit unknown; never as zero, an empty prerequisite chain, or assumed access. Keep Classic comparisons in a separate optional dataset and never fill Forever gaps automatically.

For talents, save ranks keyed by stable talent/node ID plus the dataset version. Save the user's point order separately for a leveling plan. On data updates, validate the existing build under its original rules, show changes and request correction of invalid allocations. Do not silently reorder positional strings onto a different tree.

Recommended update process:

1. Select an explicitly identified Forever build and locale; retain the last reviewed snapshot.
2. Retrieve permitted inputs with hashes, source dates and licence evidence; do not circumvent inaccessible sources.
3. Normalize into Gregular's schema and reject unknown variants, duplicate IDs, broken references and unsupported field types.
4. Validate talent rank bounds, point thresholds, dependency semantics/cycles and budget/level rules. Check prerequisite removal as well as point addition.
5. Diff changed/removed records, level gates and relationships. Human-review meaningful changes against source evidence.
6. Run a fixed set of in-game/source tooltip checks and label unresolved records appropriately.
7. Promote the snapshot by reviewable commit; record the changelog and preserve old versions needed by saved builds.

## Rights and attribution register

- An MIT/BSD software licence covers the respective project's software under its terms; preserve required notices when code is reused.
- A compilation/definition licence covers only the rights its author can grant. It does not clear Blizzard artwork, icons, descriptions or screenshots.
- A service's published embed instructions support that integration path; they do not establish a bulk-republication licence for the site's database.
- [Blizzard's published Developer API Terms](https://www.blizzard.com/ko-kr/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use) describe conditional, registered API access, distribution limits and restrictions on automated extraction outside authorized API use. The English text was readable at this locale-specific official URL; no determination is made here about which terms govern a separate fan-data source. Review the applicable terms before selecting ingestion.
- Record the applicable licence/version, exact credit, content exclusions and permission evidence for each imported package. **Bulk game-content redistribution remains unresolved.** This pass should use original visual treatments and mock data.

## Prioritized next data pass

1. **Talent-source spike:** retrieve and pin one permitted export; validate one class end to end (including rank decrease that would break a dependent talent), then all nine. Acceptance: every displayed number has source/build evidence, point/level rules are tested, unknowns remain visible and import licensing is recorded.
2. **Small curated dungeon catalogue:** choose two beta-accessible dungeons and a few items/quests with direct evidence. Acceptance: all availability, level, prerequisite and acquisition fields cite Forever sources; missing fields are explicit; no Classic fallback is promoted.
3. **Tooltip spike:** compare own rendering against a small source/client fixture set; optionally evaluate a documented provider embed in an isolated route. Acceptance: variant correctness, keyboard/mobile behavior, failure fallback, request privacy and asset permissions are documented.
4. **Repeatable updates:** add import validation, meaningful diffs and manual promotion. Acceptance: a second beta build can be imported without overwriting user plans, and invalidated references/builds produce review states.
5. **Recommendation policy:** only after sufficient verified coverage. Acceptance: recommendations explain their eligibility and evidence and never assume an unknown prerequisite or unavailable item.

The first frontend pass can therefore remain useful and honest: it demonstrates the interaction model while the real Forever catalogue is established as a separate, reviewable body of work.

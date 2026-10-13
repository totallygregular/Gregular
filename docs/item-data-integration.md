# Item data integration: Pass 6 decision

Reviewed **14 October 2026, Pacific/Auckland**. Read together with
[the acquisition feasibility report](acquisition-data-feasibility.md) and
[the connected acquisition model](connected-acquisition-model.md).
This is a bounded integration investigation, not a full database import or a
claim that provider data was independently verified in the game client.

## Recommendation

Choose **C: hybrid**. Keep Gregular's compact local discovery records and small,
provenanced acquisition graph; offer the documented external tooltip services
as optional detail enhancements. Keep personal items, local accessible details,
neutral icon placeholders and ordinary reference links available offline.

Approach A does not currently have a selected provider: no inspected interface
established a supported public Forever search/acquisition API with the required
coverage, browser contract and reuse permission. A website's search requests or
tooltip transport are not general APIs. Do not reverse-engineer them.

Approach B remains a useful future distribution format, conditional on a
file-specific licence and provenance review. A small local index need not grow
into a copy of the entire database. The current curated records already supply
the contract; unavailable external data does not block crafting or player goals.

## Provider comparison

| Candidate | Public interface actually established | Coverage and limitations | Decision |
| --- | --- | --- | --- |
| [wow-forever.gg developer tools](https://wow-forever.gg/developers/) | Documented talent/statistic files and item/spell tooltip embedding. The developer page explicitly excludes database pages from its offered files. | Its CC BY 4.0 notice covers owned compilation/statistics, explicitly excludes Blizzard names, text and art. This does not license a bulk item index. | Tested comparison; opaque sandbox tooltip request failed CORS, so not offered in the shipped service menu. External references remain useful. |
| [ForeverDB](https://foreverdb.net/about), [embed documentation](https://foreverdb.net/embed) | Documented free item/spell tooltip script and optional icon enhancement, no key/account. | Describes client/hotfix data and player observations. Quest details may be marked Classic/CMaNGOS fallback. No inspected general search/export contract or blanket redistribution grant. | Selected optional tooltip/icon integration after successful Gregular sandbox smoke; no general import. |
| [Wowhead Forever](https://www.wowhead.com/forever/database), [official tooltip documentation](https://www.wowhead.com/tooltips) | Documented tooltip embedding; public Forever reference pages. | Tooltip docs support hover/mobile and numerous entity types, but the inspected domain-variant documentation did not mention Forever. No supported Forever bulk search/API/export grant established. | Reference/cross-check. Do not infer the correct tooltip variant from Classic defaults. |
| [Warcraft Forever items](https://warcraftforever.games/items) | Public searchable item pages, quality/slot filters and alphabetic browsing. | States client-derived names/stats and omission of fields hidden until an item drops. No documented public API, embed contract, bulk reuse terms or SLA found in inspected material. | Reference candidate only. |
| [QuestieDB](https://github.com/Questie/QuestieDB), [Forever maintenance guide](https://github.com/Questie/QuestieDB/blob/master/docs/forever.md) | Structured Lua inputs, documented addon API, explicit Forever generation and release artifacts. | Forever layers combine inherited baseline, generated corrections, traces and authored corrections. The guide explicitly disclaims complete new Forever content. This is an addon/library interface, not an HTTP API. | Strong structured-data lead after rights/field-origin review; no data bundled here. |
| [Warcraft DB Forever](https://forever.warcraftdb.com/) | Forever-labelled item/quest/profession/dungeon categories. | Reader returned a JavaScript shell; footer reserves rights. No supported API/export grant established. | External reference lead, not a selected integration. |
| [Blizzard Classic game-data portal](https://develop.battle.net/documentation/world-of-warcraft-classic/game-data-apis) | Official API documentation lead. | Portal redirected to an inaccessible page in this review. No tested Forever namespace, item response, authentication or coverage contract established. | Revisit official support before designing any authenticated adapter. |

“Not established” describes the inspected documentation, not proof that a
provider has no private or future service. No provider was contacted, no account
was created, and no undocumented endpoint was used.

### Required fields versus supported interfaces

| Requirement | Documented external API selected? | Available starting point |
| --- | --- | --- |
| Search, ID/name, quality, level, slot/type | No | Curated local records; provider reference pages. |
| Actual icons | No general icon API selected | ForeverDB's documented icon option inside its embed; neutral local placeholder when absent/blocked. |
| Full stats/effects | No general API selected | Documented item tooltip; local reviewed subset. |
| Sources, dungeon loot, quest rewards | No | Small reviewed source edges, preserving observation/fallback labels. |
| Complete prerequisite chains | No | Explicitly partial/unknown local graph; manual chains. |
| Recipe/profession/materials | No | Two bounded reviewed factual examples below; manual goals. |

QuestieDB's [actual item schema](https://github.com/Questie/QuestieDB/blob/master/src/meta/itemMeta.lua)
includes names, NPC/object/container drops, quest rewards, item/required levels,
class/subclass, vendors and taught spells. It does **not** expose icon, quality,
equipment-slot, full-stat or recipe-reagent fields in that inspected schema.
It would therefore be an acquisition/reference input, not a complete equipment
search index by itself. Its
[provenance document](https://github.com/Questie/QuestieDB/blob/master/PROVENANCE.md)
records historical Questie lineage separately from current owned inputs; a
historical commit is not a current data pin. No root dataset licence was
identified in the inspected file listing. Questie's historical
[licence issue](https://github.com/Questie/Questie/issues/4447) also documents
repository-versus-distribution ambiguity. Resolve the exact selected files'
notices and inherited rights before redistributing derived JSON.

## Tooltip integration contracts

### wow-forever.gg

The documented tag is:

```html
<script src="https://wow-forever.gg/embed/tooltips.js" defer></script>
```

Use ordinary provider item links of the documented form
`https://wow-forever.gg/db/items/<id>-<name>/`. The documentation describes
non-rewriting links, isolated tooltip styling, focus/Escape, first-tap inspect
and second-tap navigation. It states 17 KB script / 7 KB compressed, free
commercial/noncommercial use with link attribution, and interaction-only
tooltip requests without cookies or referrer. It offers no general item API,
rate allowance, uptime SLA or bulk tooltip-cache permission. These are provider
claims until separately observed in Gregular. See
[the embedding documentation](https://wow-forever.gg/developers/#tooltips).

### ForeverDB

The browser-visible embed page documents:

```html
<script src="https://foreverdb.net/embed/tooltips.js" async></script>
<a href="https://foreverdb.net/item/10421">Rough Copper Vest</a>
```

It also accepts `data-foreverdb="item:<id>"`. Script options `data-icons`,
`data-color-links` and `data-rename-links` enable icons, colour and replacement
text; equivalent configuration and per-link overrides are documented. These
options can mutate links, so do not enable them on React-owned children. The
page describes keyboard/Escape and two-tap touch behavior, no cookies/storage/
analytics, provider-only requests without referrer, and deferred fetching
unless link enhancements are enabled. It does not document response schemas,
rates, SLA, caching grant or a stand-alone icon URL API. Keep provider links as
visible attribution. See [ForeverDB embed](https://foreverdb.net/embed).

### Gregular boundary and operational requirements

The integration must load only the documented script and ordinary documented
links. The app must not fetch provider HTML and inject it into React. Provider
content belongs in a deliberately separate host; the chosen implementation
uses an opt-in sandbox frame with scripts and popups permitted and same-origin
access omitted. The frame cannot read Gregular profiles/storage or rewrite the
parent's wishlist controls. Do not pass character names, notes, inventory,
crafting progress or profile JSON to it. A reviewed numeric item ID and public
name are sufficient.

Keep local inspection and wishlist actions outside the frame. A blocked script,
missing item, failed image or provider outage must retain the same core actions.
An image placeholder must identify unavailable art, not impersonate the item.
External details are current provider data and can differ from Gregular's pinned
local snapshot; display that distinction.

CORS was tested using each ordinary documented embed in Gregular's actual
opaque sandbox (`Origin: null`). ForeverDB's observed script-managed responses
permitted `Access-Control-Allow-Origin: *`; wow-forever.gg's tooltip response did
not, so its script loaded but could not retrieve the item. Gregular neither
proxies that response nor relaxes the sandbox to bypass the restriction. Only
Local and ForeverDB are offered in the shipped service menu.

The frame's restrictive CSP uses `default-src 'none'` and explicit provider
origins for scripts, requests, fonts and images; inline styles are permitted
for the documented renderer. There is no arbitrary script URL or HTML input.
The comparison frame also permits the tested wow-forever.gg origin, although
that provider is excluded from the player-facing menu. Neither provider
published a stable versioned script/SRI contract in the inspected documentation,
so the integration does not claim a pinned third-party payload.

Icons are obtained through ForeverDB's documented `data-icons` script option
inside the sandbox. A narrow bridge accepts messages only from that frame's
`contentWindow`, only for requested reviewed item IDs, and only for validated
ForeverDB icon URLs. Generic provider placeholder art is rejected. React
renders an ordinary image with a neutral failure fallback; it never receives
provider HTML. Gregular makes no direct calls to the script's private transport
or guessed icon endpoints, and no provider script runs in the profile's origin.

Do not persist or prefetch tooltip responses. Let the documented script manage
its own requests and browser caching. Load on explicit opt-in/inspection, avoid
one enhancement request per result on initial page load, and treat provider
availability as an enhancement. Script loading itself still discloses the
reader's network address to that provider; no-tracking claims do not remove
ordinary network metadata. A single successful smoke is not an uptime promise.

## Reviewed crafting examples

Only sparse names, IDs, numeric facts and typed relationships are recorded.
No provider prose, game artwork, complete recipe table or database dump is
copied. Recipe-learning locations remain unknown; Classic trainer rows are
not promoted into Forever observations.

| Record | Reviewed Forever facts | Evidence and limitations |
| --- | --- | --- |
| Rough Copper Vest, item **10421** | Uncommon, mail chest, required level 2, armor 108, stamina +1; Blacksmithing skill 1; **4 Copper Bar**. | [Item page](https://foreverdb.net/item/10421) identifies build **1.60.1.70338**, extracted **2026-10-13**, and changed quality/stats versus Classic. [Profession list](https://foreverdb.net/profession/blacksmithing) supplies skill and quantity. Recipe spell ID, learning source and special requirements were not established. |
| Glowing Copper Boots, item **250482** | New Forever item; rare, mail feet, required level 10, armor 109, intellect +4, healing power +9, spell damage +3; Blacksmithing skill 35; **2 Copper Bar, 4 Lesser Magic Essence, 2 Light Leather**. | [Item page](https://foreverdb.net/item/250482), same reviewed build/date; [profession list](https://foreverdb.net/profession/blacksmithing) supplies skill and quantities. Recipe spell ID, learning source and special requirements remain unknown. |

These are provider-reviewed client facts, not proof that a particular character
can learn, craft or receive the item. Bind-on-pickup restrictions must not be
silently inferred into a promised player-to-player transfer. The general
other-crafter planner is a personal intention, not an assertion of tradeability.
Material identities can be shared reference records, while collected quantities
belong to each goal. The same Copper Bar reference must not create a shared
inventory or complete another goal.

Lionheart Helm was also cross-checked on
[wow-forever.gg](https://wow-forever.gg/db/items/12640-lionheart-helm/) and
[ForeverDB](https://foreverdb.net/item/12640). Both list Blacksmithing 300 and
80 Thorium Bar, 12 Arcanite Bar, 40 Wicked Claw, 10 Blue Sapphire and
4 Azerothian Diamond. It is above the current provider-labelled beta cap and
marked speculative on ForeverDB; the two low-level examples are better initial
demonstrations. The
[generated QuestieDB delta-base limitations](https://github.com/Questie/QuestieDB/blob/master/docs/forever-delta-base.md)
likewise warn that missing references and incomplete source rows are not
evidence of completeness. None of these examples establishes a bulk reuse grant.

## Compact index and reproducible update design

Do not start a bulk importer until a concrete source's terms and Forever
selection are confirmed. A useful next provider request is permission for an
ID/name/quality/required-level/slot/type discovery export, its revision/build,
and update/caching terms. The optional acquisition category can remain unknown
when no relationship is reviewed. This keeps Gregular independent of full-stat
maintenance.

The future importer should consume a permitted local file, never scrape a site
or accept an undocumented URL. Require a manifest with edition `forever`,
locale, client build, exact upstream revision, source URL, input SHA-256,
licence/notice files and permission evidence. Reject Classic, Retail, missing
edition, moving revisions and malformed records before writing output.

Normalize positive integer game IDs separately from stable Gregular reference
IDs. Deduplicate equal item IDs deterministically; conflicting duplicates are
review failures. Keep null/unknown values distinct from zero and unrestricted.
Validate enum values, safe reference URLs, numeric bounds, recipe outputs,
material quantities and source edges. Missing references should produce a
review report and retain unresolved saved IDs, not erase personal data. Never
turn an empty source list into “unobtainable” or an empty prerequisite list into
“no prerequisites”.

Generate stable ID-sorted JSON with no volatile timestamp in record bytes.
Keep build/licence/provenance in a separate version manifest. Generate a
field/relationship diff and deletion report against the prior snapshot; update
acceptance is an explicit reviewed commit. Hash-pinned fixtures can prove
reproducibility without requiring the upstream to remain online.

Lazy-load discovery data only when Equipment opens. Start with one compressed
file and measure transfer/parse/filter time before adding shards. If needed,
shard by stable ID ranges and keep a tiny manifest; HTTP gzip/Brotli avoids
shipping a decompressor. Do not promise a byte size before generating the
selected input. Full details stay in the tooltip/local-detail layer, and the
small source graph remains separately versioned. No search-index refresh
should rewrite a character's route, wishlist, preferred source or manual recipe.

On a relevant Forever patch, explicitly obtain the new permitted input, record
the build/revision and hashes, generate/diff, review changed facts and run local
validation. Provider patch rebuilds are not Gregular update SLAs. Catalogue
removals remain unresolved references in older profiles and exports.

## Verification record

- Documentation was read live on the review date. ForeverDB's embed page was
  accessible in the browser although the web text reader could not fetch it.
- Current browser-visible ForeverDB Blacksmithing list confirmed the two
  example quantities and skill requirements above.
- The initial research process could not inspect scripts through the restricted
  shell/text reader or direct browser navigation. Subsequent integration checks
  successfully read the documented public script URLs with permitted HTTP
  access and loaded the ordinary embeds in Gregular. No provider restriction
  was bypassed and no alternate private interface was invoked by the app.
- The separate live test output (local, ignored `artifacts/pass-6/foreverdb-live.json`) records
  successful cross-origin script-managed data/icon/font/style/renderer responses
  and no captured console errors. All six reviewed catalogue items received
  actual icons. This observation proves the tested requests, not a general API
  or indefinite availability guarantee.
- The [tracked genuine-tooltip screenshot](images/pass-6/forever-tooltip.png)
  shows Grizzled Boots inside Gregular. Live assertions and final shadow-root
  text also establish Ponderous Orb and Glowing Copper Boots. Changed shared ID
  6335 shows **82 armor, +7 stamina** and the Forever-change marker; new 250482
  matches the reviewed stats and Forever-new marker. Focus, hover and Escape
  worked. The provider link did not receive `aria-describedby`, so local
  accessible details remain the authoritative fallback; a human screen-reader
  audit has not been performed.
- The separate wow-forever.gg live test output (local, ignored `artifacts/pass-6/wow-forever-live.json`)
  records the script loading and the item's CORS rejection for opaque origin
  `null`. This is a failed integration in the selected isolation boundary, not
  evidence that the provider fails on every external website.

Observed ForeverDB response `Content-Length` values were **9,090 bytes gzip**
for the entry script, **10,445 bytes gzip** for its renderer, **97,000 bytes
gzip** for provider CSS and **72,920 bytes** for the font. Individual tested
icons were approximately 1.1–1.7 KB. These are response header measurements,
not a sum of actual transferred bytes: caching, repeated frame loads and shared
resources affect real transfer. The integration therefore requests icons only
after opt-in and uses a bounded item batch rather than enhancing every result
on initial app load. The provider CSS/font cost is material and should be
remeasured before expanding the catalogue.

The application [Pass 6 validation report](pass-6.md) records the final mouse,
touch, missing-item, blocked-network, responsive and deterministic-test results.
This report does not substitute provider documentation for those checks or
claim a final test count before that validation finishes.

The deterministic suite should mock optional provider success, blocked loading,
missing images and missing records. Live provider smoke checks remain separate
so an upstream outage cannot fail every local unit test.

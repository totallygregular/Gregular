# Forever equipment data: Pass 8 decision

Reviewed **14 October 2026, Pacific/Auckland**. This is the decision gate for
Pass 8, following the existing [gear feasibility](gear-data-feasibility.md),
[item integration](item-data-integration.md) and
[acquisition feasibility](acquisition-data-feasibility.md) reviews.

## Decision: Path B

Ship **Add item by ID or link**. The focused recheck did not establish a source
that simultaneously offers a supported structured Forever equipment export,
usable equipment statistics and sufficiently clear permission to redistribute
the resulting public static catalogue. This is a bounded selection decision;
it does not assert that no provider could supply such data by agreement.

The investigation stops here for this pass. There is no bulk importer, no
third-party dataset fixture and **zero new reviewed real catalogue records**.
The existing six reviewed equipment records remain the shared catalogue.
Player-authored item identities and details are personal planning data, and do
not increase that reviewed count. A valid ID identifies a requested Forever
item; it does not prove that the item exists, is equippable or is obtainable.

## Focused source comparison

Only the strongest existing leads were rechecked through public documentation
and source repositories. No client installation, protected table, private
endpoint, bulk page scrape, maintainer contact or authenticated API experiment
was used. Reader failures are access limitations of this review, not findings
that a service is unavailable to everyone. Build labels below are source claims,
not Gregular client verification.

| Candidate and primary evidence | Access and Forever coverage | Statistics and acquisition | Public redistribution and repeatability | Build pin and static-site fit |
| --- | --- | --- | --- | --- |
| Local client tables with [CASCExplorer](https://github.com/WoW-Tools/CASCExplorer), [DBCD](https://github.com/wowdev/DBCD), [WoWDBDefs](https://github.com/wowdev/WoWDBDefs) | Documented tooling reads local CASC/DBC/DB2 files. No client input was supplied or extracted. [ItemSparse definitions](https://github.com/wowdev/WoWDBDefs/blob/master/definitions/ItemSparse.dbd) explicitly list Forever builds through `1.60.1.70374`. | The inspected layout names required level, item level, quality, inventory type and stat allocations. It is a schema, not item records or validated final bonuses. Loot/vendor/reward locations need independent evidence. | Tool and definition licences do not license Blizzard table contents. An authorised input and redistribution basis remain unresolved. A build-pinned offline extraction could be repeated after these gates. | Pin client product/build, locale, hotfix set, input hashes and tool/definition revisions. Generated JSON fits static hosting; browser extraction is unnecessary. **Not selected.** |
| [Wago.Tools](https://wago.tools/) and related client-table tooling | Public root returned HTTP 403 through the reader. No supported Forever CSV/API contract was verified. No alternate endpoint or restriction workaround was attempted. | Coverage, computed-stat semantics, withheld rows and hotfix completeness were unverified. Client-table availability alone would not establish acquisition relationships. | Export/reuse terms, rate allowance and an authorised repeatable download method remain unverified. A third-party project's usage does not settle these. | A future export must identify an exact client build and update/hotfix semantics. A permitted offline snapshot would fit; a mandatory live service is unnecessary. **Not selected.** |
| [QuestieDB Forever guide](https://github.com/Questie/QuestieDB/blob/master/docs/forever.md), [item schema](https://github.com/Questie/QuestieDB/blob/master/src/meta/itemMeta.lua) | Accessible Lua source and documented offline Forever generation. Dedicated Forever layers include inherited Classic inputs, generated changes, traces and authored corrections; coverage is explicitly incomplete. | Item schema supplies identity, levels, class/subclass and quest/NPC/object/container/vendor relationships. Its 16 fields omit full equipment stats, quality and equip slot. Craft-reagent relationships need another source. | No dataset licence was identified in the inspected root. [Questie's open licence issue](https://github.com/Questie/Questie/issues/4447) explains historical contributor uncertainty; a CurseForge GPL label is insufficient. Generation is repeatable technically, conditional on selected-file permission. | [Provenance](https://github.com/Questie/QuestieDB/blob/master/PROVENANCE.md) requires current producing commit and artifact hashes; the historical migration commit is not a data pin. Useful future acquisition layer, not a complete numeric equipment source. **Not selected.** |
| [ForeverDB about/provenance](https://foreverdb.net/about), [documented tooltip integration](https://foreverdb.net/embed) | About page accessible: client/hotfix extraction plus server observations and labelled Classic quest fallback. Embed reader failed this recheck; the existing integration was browser-verified in Pass 6. | Rich rendered equipment information and some observed acquisition edges. No documented general structured export/API was established. A rendered tooltip remains presentation. | No inspected bulk redistribution grant or export/update contract. The site describes automatic patch rebuilds; this is not an export SLA. Existing optional embed use is separate from copying a database. | Any agreed export must declare client build plus observation/fallback origin per relationship. Documented presentation works with the existing static app. **Selected only for the existing optional tooltip/icon presentation.** |
| [wow-forever.gg developer tools](https://wow-forever.gg/developers/) | Accessible documented talent/build/statistics exports and tooltip embedding. The page explicitly excludes item/quest/zone database pages from offered files. | Its item presentation does not create an equipment export. Its own population statistics are not equipment bonuses or acquisition relationships. | The scoped CC BY 4.0 grant covers owned compilation/statistics and excludes Blizzard content. No gear-export permission follows from it. | Page identifies `1.60.1.70338`. Permitted talent files are static-friendly but outside this pass. **Not selected for gear ingestion.** |
| [ForeverDiff methodology](https://foreverdiff.com/methodology/), [terms](https://foreverdiff.com/terms/) | Accessible methodological description of client extraction, pinned definitions and output checks. No documented reusable equipment export was established. | Describes computed stat/armor/weapon amounts from allocations and budget tables, and explicitly lacks server-side loot/vendor/quest data. Some client records are withheld or incomplete. | Methodology and publicly displayed results are not a bulk reuse grant. No inspected export licence authorises a redistributed Gregular dataset. | A future input needs raw-table and formula revisions plus validation of the target build. Static snapshots are plausible after permission. **Reference only.** |
| [Blizzard Classic game-data portal](https://develop.battle.net/documentation/world-of-warcraft-classic/game-data-apis) | Both current portal and its community-developer address were unreadable through the reader. No official documented Forever namespace or authenticated Forever item response was verified. | Classic/Retail item ID overlap cannot establish Forever stats or sources. Forever payload and acquisition coverage remain unverified. | API access, current terms, cache/redistribution conditions and Forever support need an official contract; no namespace was guessed. | A future build-time adapter could keep credentials out of browser assets. No suitable official input selected. **Not selected.** |

The client-tools row establishes a plausible technical route without claiming a
permitted dataset. [DBCD's documentation](https://github.com/wowdev/DBCD) supports
build-selected local reads and hotfix application. The
[WoWDBDefs component notices](https://github.com/wowdev/WoWDBDefs/blob/master/LICENSE.md)
license definitions under CC BY-SA 4.0 and code under BSD-3-Clause. Neither
turns Blizzard's actual records into an openly licensed export.

QuestieDB also requires a presence-aware adapter: its
[consumer contract](https://github.com/Questie/QuestieDB#for-consumers) returns
sentinel zero for unset numeric getters. An unset getter must not become a
confirmed zero stat or confirmed zero required level. Origin layers must survive
any future join. NPC area, dungeon region, entrance, quest pickup, objectives
and reward turn-in are separate relationships.

## How the owner can unblock a later import

No provider has been contacted. The owner can use
[ForeverDB's contact page](https://foreverdb.net/contact),
[wow-forever.gg's documented contact route](https://wow-forever.gg/developers/#reach-us),
or the relevant source repository's maintainer channel to request a concrete
export agreement. For Wago, first obtain its supported export documentation and
access route from the operator. For Blizzard, confirm a documented Forever
namespace and applicable API terms through the official developer portal.

Ask for these specific answers before authorising an importer:

1. May Gregular transform and redistribute a bounded equipment sample and later
   versioned JSON snapshots in a public GitHub repository and Cloudflare Pages
   site, including browser search and long-lived cache copies?
2. Which files/fields are provider-owned, Blizzard-derived, inherited from other
   projects or player-contributed, and which licences/permissions cover each?
   Request required attribution, notices, source obligations and exclusions.
3. What supported download/API, authentication, request limits and update
   procedure may Gregular use? Request a documented sample and immutable
   revision/build identifiers rather than access to an internal endpoint.
4. Which variant, client build, locale and hotfix revision does the sample
   represent? Which fields are absent, withheld, computed, inherited or observed?
   Request formulas/definitions and field-level provenance where needed.
5. Are acquisition edges independently observed in Forever, and which stable
   quest/NPC/recipe/location IDs support them? What is unknown or incomplete?

An answer must come from a party with authority over the selected input; one
maintainer cannot necessarily grant all historical contributor or game-content
rights. Preserve the actual permission evidence with the import manifest. These
are engineering acceptance gates, not a claim that every game fact requires the
same legal treatment.

## Practical expansion and next pass

Use personal item entry immediately for uncovered IDs. Keep the reviewed core,
future permitted imported snapshots and character-authored details separate.
Personal metadata and source associations never silently become reviewed game
facts. Tooltip display never changes local search statistics or source edges.

Reopen bulk work only when a concrete permitted export, documented supported
interface or authorised client input changes this gate. Then start with a small
build-pinned equipment sample, independent acquisition edges, deterministic
normalisation, unknown/zero handling and a snapshot diff as described in
[the existing import acceptance contract](gear-data-feasibility.md#sustainable-static-index-contract).
Do not repeat a general database survey in another pass.

The next functional project can proceed to the **character addon**: explicit
Forever game item IDs must remain usable even without a catalogue record.
Addon construction is outside Pass 8. The reusable identity, personal-data and
future-snapshot boundary is documented in [the item-data contract](item-data-contract.md).


# Item source and licence boundaries

Updated **14 October 2026, Pacific/Auckland** for Pass 8. See
[the data-source decision](forever-item-data-decision.md) for the focused access
and coverage assessment and [item integration](item-data-integration.md) for the
existing optional presentation contract.

## What this pass distributes

- Gregular's existing six reviewed equipment records, with their existing sparse
  field evidence and references. No new third-party dataset was imported.
- Gregular-authored identity parsing, personal item planning and tests. Test item
  identities do not constitute an imported game database or add reviewed records.
- Player-authored details in that player's saved profiles. Their origin remains
  personal; a submitted name, stat or source is not provider-verified.
- Public provider links. Optional ForeverDB tooltip/icon presentation continues
  through the documented integration; provider scripts, HTML, artwork and tooltip
  response data are not copied into Gregular's catalogue or repository.

An accessible page, download, addon or software repository does not itself grant
permission to reproduce every underlying dataset or asset. A code licence and a
data licence have separate scopes. This file records the selected engineering
boundaries and does not claim a blanket content licence or legal conclusion.

## Source status

| Source | Applicable evidence | Gregular use and boundary |
| --- | --- | --- |
| ForeverDB | [About/provenance](https://foreverdb.net/about), [embed documentation](https://foreverdb.net/embed) | Bounded existing editorial references and optional documented rendered tooltip/icons. No general structured export or bulk reuse grant established; no HTML/tooltip parsing or bulk cache. Provider attribution links remain visible. |
| Wowhead Forever | [Forever database](https://www.wowhead.com/forever/database), [tooltip documentation](https://www.wowhead.com/tooltips) | Existing record references and accepted Forever item-link identities. No Wowhead script, copied descriptions, image files or structured-response ingestion added. A parsed URL only identifies the user's chosen item. |
| wow-forever.gg | [Developer terms](https://wow-forever.gg/developers/) | Scoped CC BY 4.0 for owned compilation/statistics excludes Blizzard game content; item database files explicitly not offered. Ordinary accepted item-link identities do not import that compilation. No new embed or dataset bundled. |
| QuestieDB / Questie | [Provenance](https://github.com/Questie/QuestieDB/blob/master/PROVENANCE.md), [licence issue #4447](https://github.com/Questie/Questie/issues/4447) | Investigated only. No Lua code/data or derived snapshot included. Resolve selected-file notices and inherited contributor rights before any future use; do not assume the distribution listing licenses all historical repository content. |
| WoWDBDefs / DBCD / CASCExplorer | [WoWDBDefs notices](https://github.com/wowdev/WoWDBDefs/blob/master/LICENSE.md), [DBCD](https://github.com/wowdev/DBCD), [CASCExplorer](https://github.com/WoW-Tools/CASCExplorer) | Investigated tooling only, no copied tools or tables. WoWDBDefs definitions are CC BY-SA 4.0 and its code BSD-3-Clause; DBCD identifies MIT for its code. These notices do not license extracted Blizzard item records. |
| Wago.Tools | [Provider](https://wago.tools/) | Reader access was blocked; no export/redistribution contract verified and no downloaded records. Obtain the operator's supported access and use terms first. |
| ForeverDiff | [Methodology](https://foreverdiff.com/methodology/), [terms](https://foreverdiff.com/terms/) | Reference for data limitations only; no output copied. No general equipment export/reuse grant established. |
| Blizzard | [Official Classic API portal](https://develop.battle.net/documentation/world-of-warcraft-classic/game-data-apis) | No client tables, artwork or authenticated API snapshot imported. Forever namespace/support and the applicable redistribution basis remain unverified. World of Warcraft game content and marks remain the respective owners' property; no endorsement claimed. |

## Future snapshot notices

A permitted snapshot must carry its own manifest: schema/dataset version,
`wow-forever` variant, build/locale/hotfix identity, producing revisions and input
hashes, source URLs, permission evidence, licence text/link, exact attribution,
exclusions and field/relationship provenance. Keep human-readable notices with
the public output. Preserve source obligations when applicable; do not describe
all sources using whichever licence is most convenient.

Do not commit an input file as a test fixture until its redistribution is
permitted. Prefer owned synthetic fixtures for validation and a separate
optional live-provider smoke check. Acceptance of personal item entry or a
documented tooltip does not authorise a future bulk importer.

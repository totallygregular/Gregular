# Zone catalogue and travel provenance

Reviewed **13 October 2026**. Catalogue `forever-zones-2026-10-13.3`; graph `forever-travel-2026-10-13.1`. These are manually curated planning snapshots, not a live game database or an independently played leveling guide. The [complete zone-range review](zone-range-review.md) records the source check for all 45 catalogue records.

## What is established

The catalogue contains **45 zones**, including broad coverage of ordinary 1–60 questing for both factions. **40 zones have approximate recommended ranges**: one Forever-confirmed, 38 provisional Classic-derived and one editorial. Five expose “range unknown” rather than fabricated endpoints. Saved personal entry/exit levels are separate profile data and never replaced by reference data.

| Field | Evidence used | Presentation |
| --- | --- | --- |
| Zephras Isle range, starting association and both factions | Blizzard's Skyborne announcement | Forever confirmed; 1–12 |
| Twelve familiar follow-up zone ranges | ForeverDB's Classic quest-level percentiles for quests present in the Forever client | Classic-derived, provisional |
| Six familiar starting ranges and twenty later-zone ranges | MIT-licensed LibTourist Classic Era 1.15.9 | Classic-derived, provisional |
| Familiar zone presence | ForeverDB's reported Forever client map extraction | Client-derived, unverified in gameplay |
| Original-race suggestions | ForeverDB's Classic associations retained in the Forever client | Classic-derived, optional |
| Faction questing audience | Curated faction guide audience; broader contested Classic zones use editorial guidance | Editorial; independent of physical access |
| Broad regional groups | Editorial grouping for browsing | Does not establish connections |
| Riverglades range | Owner-requested Pass 4.5 planning correction, recorded in [zone-guidance.md](zone-guidance.md) | Editorial estimate, low confidence; 35–45 |
| Deadwind Pass, Moonglade, Mount Hyjal, Shen'dralas, Darkspear Islands ranges | No established general questing range in the reviewed material | Unknown; personal plans remain editable |

**Redridge Mountains, Duskwood and Wetlands are recommended to Alliance** because that is their practical audience in the reviewed guide. Contested territory does not establish a useful Horde quest route. Their walking connections remain available to both factions. No catalogue record currently claims a hard faction entry restriction (`accessFactions` is absent).

The guide's 10th–90th-percentile method omits some low/high quest outliers and new Forever quest levels. The six familiar starting zones instead use LibTourist's documented Classic 1–12 interval so new level-1 characters can find starting content; the percentile tables' higher lower bounds do not make those starting areas unsuitable at level 1. A recommendation is an approximate content window, not an entry requirement, XP promise, or claim that every level can be completed in one zone. Guidance beyond the beta levels covered by the reviewed guide is especially provisional. Soft route-planning advice and the advisory long-stay review prompt are separately editorial; see [zone-guidance.md](zone-guidance.md). They do not upgrade the range evidence or estimate quest XP.

## Sources and research boundaries

| Source | Publication / revision | Review use |
| --- | --- | --- |
| [Blizzard: Found Photos Panel Recap](https://news.blizzard.com/en-gb/article/24304071/world-of-warcraft-forever-found-photos-panel-recap) | 13 September 2026; no client build specified | New-zone identities; named ship services; both-faction Riverglades content |
| [Blizzard: Meet the New Skyborne](https://news.blizzard.com/en-gb/article/24302071/wow-forever-meet-the-new-skyborne) | 22 September 2026; no client build specified | Zephras Isle 1–12, Skywall, faction choice, starting association |
| [ForeverDB: Leveling to 30](https://foreverdb.net/guide/leveling) | Updated 2 October; guide says 1.60.1.70170, review footer 1.60.1.70291 | Selected approximate ranges and race/faction guidance; explicitly Classic quest-level data |
| [ForeverDB: Maps](https://foreverdb.net/maps) | Extraction dated 12 October, reported build 1.60.1.70338; publication date not supplied | Zone names and reported presence. Different estimated ranges are not silently substituted for the guide |
| [ForeverDB: Travel](https://foreverdb.net/travel) | Publication date / exact extraction build not supplied | Selected transport endpoints and factions, described by the author as client-derived |
| [LibTourist Classic Era](https://www.curseforge.com/wow/addons/libtourist-classic-era/files/8865898) | Classic 1.15.9, 12 September; commit `d2380757a8fe2b1cb2d341817e36e1cd0bccee3a` | Permitted Classic numerical ranges and explicit road topology |

The Blizzard News mirrors above returned full article text during the original review. Equivalent `worldofwarcraft.blizzard.com` pages intermittently returned HTTP 403; a blocked page was not treated as evidence. Found Photos establishes Mount Hyjal's identity but no numeric questing range, which remains unknown. Its description of Riverglades as mid-level does not establish exact endpoints. Pass 4.5 uses the owner's requested 35–45 as an explicitly editorial correction, independent of the official identity and faction evidence. No new source or gameplay confirmation of those endpoints is claimed.

[Wowhead's Forever zone index](https://www.wowhead.com/forever/zones) was investigated but inaccessible to the research tool. A [Forever Westfall page](https://www.wowhead.com/forever/de/zone=40/westfall) was readable, but inherited Classic-era comments do not confirm current Forever ranges. No Wowhead dump, map, icon, image or quest text is included.

[Adventure Guide Forever](https://github.com/cjber/adventure-guide-forever) was examined as an open-source research path. It declares GPL-3.0-or-later and mixed upstream data provenance, including Classic-derived data. Its code and datasets were not copied. `nexus-devs/wow-classic-items` was also examined, but its mixed expansion dataset and scraped inputs were unnecessary after the explicitly licensed Classic Era source became available.

ForeverDB is the primary reporter for its own extraction; Gregular did **not** independently extract or run that client. Its build is recorded as *reported*, not gameplay verification. Publication dates remain null where unavailable. Implementation attribution prose is original. Only selected factual values were manually recorded; no bulk protected database content or game art was imported.

The follow-up review re-read the leveling guide, both relevant Blizzard announcements, the CurseForge release metadata and the pinned LibTourist source. All 38 existing Classic-derived ranges matched their cited sources, so no endpoints were changed. Zephras Isle remains the only official numeric range in this reviewed set; Riverglades stays 35–45 with editorial evidence. Five general questing ranges remain unknown. The map-index endpoint could not be retrieved during this follow-up; its earlier client-presence attribution was retained without claiming a fresh extraction or using unseen map ranges.

## Travel model

`companion/src/travel.ts` contains directed edges with stable endpoints, transport mode, eligible factions, prerequisite IDs, unlock IDs, and separate connection/faction evidence. Cities and Blackrock Mountain are transit nodes, not questing candidates. Forty explicitly listed Classic road pairs underpin local walking; no connection is created from coordinates or proximity.

Blizzard announces the Stormwind–Auberdine, Menethil/Southshore/Auberdine and Tanaris–Riverglades services. Access and direction details use community client reporting, so complete results still expose uncertainty. Selected other boats, Horde zeppelins and the tram are client-derived. The reported Menethil → Southshore → Auberdine sequence is directed; reverse regional legs are not inferred. The separately reported Menethil ↔ Auberdine service remains separate.

Classic city connectors are conservatively restricted to the city's own faction for planning. An enemy-capital route is therefore not recommended; this is not a claim that another faction physically cannot enter. Borders remain both-faction edges. No default flight, hearthstone, teleport or class ability is assumed.

### Deterministic relative scoring

Dijkstra's algorithm selects the least weighted supported path over eligible directed edges. Every transition is recomputed from the preceding saved stop. This is a relative-overhead model, **not minutes, a safe-travel guarantee, or an optimal XP route**.

| Edge | Relative weight |
| --- | ---: |
| Walking / direct border | 1 |
| Regional road | 2 |
| Explicitly discovered flight | 2 |
| Tram | 3 |
| Boat / zeppelin | 5 |
| Airship / other supported transport | 6 |
| Extra when an edge changes continent | +4 |

Equal scores resolve by ASCII comparison of the full edge-ID sequence, independent of input edge order. Edges are unavailable for a wrong faction, unknown connection/faction evidence, unmet prerequisite or unmet unlock. Every flight edge must declare at least two endpoint unlocks; an edge omitting them fails closed. `completedPrerequisites` and `unlocks` are separate capabilities; an unlocked key also satisfies the prerequisite with the same ID.

| Classification | Rule | Example |
| --- | --- | --- |
| Easy / green | Same zone, or one local edge of weight at most 2 | Elwynn → Westfall |
| Moderate / amber | Non-cross-continent score at most 6; at most one transport leg | Westfall → Elwynn → Redridge |
| Long / red | A continent crossing, score above 6, or multiple transport legs | Elwynn → Stormwind Harbor → Darkshore |
| Unknown / grey | No supported eligible path, unresolved origin, or unknown faction | Felwood → Winterspring with default capabilities |

Results include a text label, explanation, selected path, sources, confidence and provisional flag. Colour supplements the words. Mixed evidence takes the weakest provenance along the path, including service faction evidence. “Easy” can therefore describe a **provisional Classic connection** without implying gameplay verification.

Intentionally absent: Timbermaw passage access, Loch Modan's gate shortcut, Zephras service direction/access prerequisites, flight meshes, discovered-path settings UI, hearthstone routing, teleports and class shortcuts. Those zones remain valid saved stops. Future capability fields are reserved but ignored until supported routing logic exists. Repeated zones, gaps, overlaps and uncertain transitions never block editing.

## Reproducing and updating the snapshot

1. Review linked primary announcements and extraction notes. Keep field-specific evidence; zone identity does not establish levels or access requirements.
2. Clone `https://repos.curseforge.com/wow/libtourist-classic-era`; inspect `LibTouristClassicEra.lua` at `d2380757a8fe2b1cb2d341817e36e1cd0bccee3a`. Its zone range/path tables and MIT source header establish the permitted baseline. Do not silently use a newer branch head.
3. Edit concise seeds/explicit pairs in `companion/src/data/zones.ts` and reviewed edges in `companion/src/travel.ts`. Bump the relevant version and review date, preserve stable IDs, and record evidence revisions. Leave unknown values absent.
4. Run `npx vitest run --config companion/vite.config.ts companion/src/data/zones.test.ts companion/src/travel.test.ts`, then all required project checks. Review confidence/source details and character filters in the UI.
5. Reference updates must never migrate personal levels, notes or status. Catalogue lookup is separate from saved stops; six legacy zone IDs remain unchanged. A removed reference must retain an alias or display the saved personal title.

Focused tests cover source integrity, uniqueness, supported ranges/level brackets, unknowns, faction guidance, optional starts, legacy IDs, reference-update independence, explicit topology, direct/indirect journeys, continent crossings, directions, access, unlocks/prerequisites, missing evidence, deterministic ties, repeat visits and reorder recalculation.

## Third-party notice

Manually curated Classic range/road facts derive from MIT-licensed LibTourist Classic Era. Its source notice is retained:

```text
Name: LibTouristClassicEra
Revision: $Rev: 246 $
Author(s): Odica; based on LibTourist-3.0 and LibTouristClassic-1.0
Documentation: https://www.wowace.com/projects/libtourist-classic-era/pages/api-reference
Git: https://repos.wowace.com/wow/libtourist-classic-era libtourist-classic-era
Description: A library to provide information about zones and instances for WoW Classic Era
License: MIT
```

MIT permission terms:

```text
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

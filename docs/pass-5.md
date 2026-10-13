# Pass 5 — connected character progression

Assessed and implemented on **14 October 2026**, stacked on draft [PR #6](https://github.com/totallygregular/Gregular/pull/6), base `codex/route-relevance-coverage` at `2e8a85a`. Feature branch: `codex/connected-progression-planner`. Earlier PRs remain intact; no merge, production release, DNS or hosting configuration change is included.

## Working behavior

- **Overview** is the default character dashboard. Legacy `journal` bookmarks still open Overview. **Quests** has a distinct hash route. The navigation order is Overview, Leveling Route, Quests, Dungeons, Equipment, Talents, Notes.
- Existing level, Next Up, objectives, notes and route behavior remain. Compact saved-data cards link to route, equipment, quest and dungeon details. Incomplete access, unknown prerequisites, personal target levels and cycles prevent urgent quest recommendations.
- **Quests** supports personal quests, named ordered chains, add/edit/remove/reorder steps, individual/whole-chain completion, zone/level associations, personal prerequisites, notes and reference links. Expandable chains show completed/total progress. Filters distinguish plans, chains, completed quests, rewards, dungeon quests and unresolved prerequisites. Planned in Gregular never claims accepted in-game.
- **Equipment** searches a limited four-item reviewed Forever snapshot by name, slot, quality, type, known level/class restriction and source method. Local keyboard/touch-accessible disclosures show facts, unknowns, stats, sources and provenance. Personal items and source links remain fully functional offline. Each character owns wishlist state, preferred sources and notes. A sole listed source links immediately; multiple sources require player choice.
- **Dungeons** groups desired items by canonical dungeon ID and shows known bosses, separate completed-run counts and personal notes alongside existing route milestones. A run does not grant equipment. Quest completion does not acquire rewards; acquiring an item does not complete its source.
- Linked quest/dungeon planning is derived from shared references, not duplicated persistent tasks. Shared prerequisites and sources remain shared. Removing a wishlist contribution cannot erase independently saved quest progress, personal chains or dungeon history. Missing catalogue records and source IDs remain reviewable.
- The established route builder is preserved. Supported or explicit personal associations annotate existing stops; no zone insertion, route reordering or completion is automatic.

## Reviewed data and limits

The starter snapshot includes **Ponderous Orb** → **Shade of the Archmage** → **City of Dalaran**, **Tattered Mittens** and **Grizzled Boots** → the shared **The Book of Ur** quest, and **Snake Eye Kaleidoscope** with source unknown. These are sparse provider-reviewed Forever facts, with field links and build notes, not independent game-client validation.

No complete Forever prerequisite chain was established for The Book of Ur. Its prerequisites remain explicitly unknown. Disputed item stats, drop probabilities, inherited Classic restrictions and ambiguous dungeon geography are excluded. Manual chains and test-only dependency fixtures demonstrate complete/shared/branching/missing/cyclic dependencies without claiming fictional catalogue data.

The [data and licensing feasibility report](acquisition-data-feasibility.md) covers all investigated providers, structured sources, update feasibility, field conflicts, reuse restrictions and tooltip behavior. No suitable fully permitted acquisition dump/API was established, so no bulk importer, undocumented API call or protected dataset is shipped. External tooltips remain optional future enhancements; local details are the working fallback and core UI.

## Profile compatibility

Schema **3** adds character-owned acquisition state. Valid v1/v2 profiles migrate on read without writes; old routes, IDs, objectives and notes are preserved. Before the first normal save, exact v1/v2 originals are retained in their respective migration backup keys. Imports accept v1/v2/v3; exports include all new relationships, progress and notes. Replacement/recovery, bounded validation and observed multi-tab conflict checks remain active. Older application builds cannot read v3 exports; keep old exports or the exact migration backups when returning to earlier PRs.

See [model and migration specification](connected-acquisition-model.md). Failed or cancelled import does not replace saved profiles. Different characters/usernames/browser origins remain independent.

## Reproduce the demonstrated flow

1. Open `/companion/`, enter a local username and create/select a character. **Overview** opens. Alternatively import the existing opt-in demo in Profile settings.
2. Open Equipment, search **Ponderous Orb**, inspect **Item details and sources**, then **Add to wishlist**. Its sole listed source is selected. Open Dungeons to see City of Dalaran and Shade of the Archmage.
3. **Record completed run**. The Orb stays Wanted; the player's route is unchanged.
4. In Equipment, add **Tattered Mittens** and **Grizzled Boots**. Open Quests: one shared The Book of Ur goal shows both desired rewards and honestly unresolved prerequisites.
5. **Create quest chain**, give it a personal name, then **Add chain step** twice. Enter personal quest names, optional zones/target levels and notes. Complete one step; the chain shows **1/2**. Edit/reorder steps if desired.
6. Return to Overview to see saved wishlist, quest-chain and dungeon counts. Unknown access/prerequisites keep the reviewed reward quest out of urgent Next Up.
7. In Equipment, change the Orb's **Item status** to Acquired. Switch wishlist Status to All statuses to see it. The recorded dungeon run and quest progress stay independent.
8. **Profile settings → Export profile**. In another browser context or preview origin, **Import profile**, review the username/counts and confirm. All supported character state, preferred sources, chain order/completion and run history survive. Browser automation executes this round trip through real file download/upload, not a bypass of the import UI.
9. Optional personal relationships: add a personal item, or choose **Add personal source** on a reviewed item. Select a quest or dungeon (including a personal dungeon), label the relationship and optionally supply a zone/reference. Choose it in **Preferred acquisition source**. Changing the selection updates the detailed planning views while retaining item notes/state and existing source progress. Such relationships stay labelled User supplied.

## Validation

| Check | Result |
| --- | --- |
| Starting branch unit baseline | 228 passed: 24 class draft + 204 companion |
| Final unit suite | 271 passed: 24 class draft + 247 companion |
| TypeScript and combined production build | Passed |
| Compiled static/HTTP checks | 9 passed |
| Class-draft source browser suite | 21 passed |
| Companion source browser suite | All 93 cases passed across the full run and focused correction rerun |
| Full compiled `/companion/` browser repeat | All 93 passed in 2.4 minutes; 3 focused cases passed again after final accessibility corrections |
| Accessibility/responsive | axe WCAG 2/2.1 A/AA, overflow, keyboard and touch emulation checks included |
| Whitespace | `git diff --check` passed |

The first complete source run exposed six legacy assertions that expected exact schema-2 objects; the updated assertions still compare every old field and additionally require the exact blank schema-3 acquisition state. New source-switching coverage initially required corrected test interactions for disappearing filtered checkboxes and an explicit zone reference in its personal route fixture. Assertions were not removed or relaxed. A sandbox-only HTTP restriction was resolved by running the same tests with local socket access.

New coverage includes default/legacy navigation, manual chains and progress, catalogue search/filters, duplicate wishlists, source changes, unresolved records, shared quest/dungeon goals, independent acquisition, prerequisites/cycles, deep graphs, schema migrations/backups, atomic failed imports, separate-browser round trips, route preservation, mobile dialogs and touch emulation. Existing route, travel, character, import/recovery, multi-tab and root class-draft regressions remain enabled. No lint command is configured in the repository. No human screen-reader, physical mobile device or game-client validation is claimed.

Expanded manual-chain accessibility scans found and corrected a missing progressbar role; the final desktop/mobile chain checks pass. Route acquisition annotations also use an explicit accessible group role.

A separate direct in-app-browser check of the compiled build created a QA character, opened Overview, wishlisted the Orb and Mittens, verified the linked quest, and recorded a dungeon run while the desired item remained pending. No console warnings or errors were observed.

## Screenshots

Final desktop/mobile captures use an isolated fictional QA character with real reviewed catalogue goals. They are not user profiles or evidence of in-game acquisition.

| Page | Desktop | Mobile |
| --- | --- | --- |
| Overview | [View](images/pass-5/overview-desktop.png) | [View](images/pass-5/overview-mobile.png) |
| Quests | [View](images/pass-5/quests-desktop.png) | [View](images/pass-5/quests-mobile.png) |
| Dungeons | [View](images/pass-5/dungeons-desktop.png) | [View](images/pass-5/dungeons-mobile.png) |
| Equipment | [View](images/pass-5/equipment-desktop.png) | [View](images/pass-5/equipment-mobile.png) |

[Mobile personal quest editor](images/pass-5/quest-editor-mobile.png). Captures were visually inspected for readable headings/labels, content fit, established visual style and source disclosure.

[Personal quest chain, desktop](images/pass-5/quest-chain-desktop.png) · [Personal quest chain, mobile](images/pass-5/quest-chain-mobile.png). The exported QA demonstration profile is included with the local deliverables; its characters and manual steps are explicitly personal test plans, not additional game catalogue records.

## Preview and CI

The existing Cloudflare Pages Git integration will build this feature branch. Exact preview URL/commit and remote verification status are recorded in the draft PR after deployment. The pre-existing separate Workers Builds integration failure is distinct from Pages. No production settings or publishing workflow is changed.

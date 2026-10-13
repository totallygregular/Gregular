# Pass 7: Gear Discovery

Reviewed 14 October 2026, Pacific/Auckland. Builds on PR #8 at
`ecb4e7d86af1dd8b43f7346319be28158cbce6d3`, through the new
`codex/gear-discovery` branch targeting `codex/item-browser-crafting`.
The existing stacked draft PRs, production hosting, DNS and class draft are
preserved. This pass uses the existing Cloudflare Pages feature preview.

## Delivered behavior

Equipment combines name search and conventional source/slot/quality/type filters
with selectable numeric statistics, ANY/ALL matching, per-stat minimums, editable
broad presets, character required-level windows and six deterministic sort modes.
Unknown statistics, levels and restrictions do not satisfy strict active filters.
Optional incomplete results appear after confirmed matches with an explicit label.
An empty class restriction list remains unknown; no Classic equipment-training
matrix is silently applied to Forever. Players can select an equipment type
manually. A required-level match establishes only the level condition.

Results retain the existing item portraits, opt-in ForeverDB sandbox, local
inspection, rarity colors and immediately available wishlist action. Numeric
matches are prominent; source locations and travel can be expanded in place.
The five common caster/health stats are directly visible and other supported
fields remain available under More statistics. Grid/list choice is a lightweight
session preference, separate from profile progression. Search criteria reset on
leaving the page; they do not rewrite saved plans.

Best match compares confirmation, number of selected statistics meeting their
minimums, fewer unresolved selected statistics, route category, then stable
name/ID. Highest selected stat compares one explicitly chosen field. Unlike
statistics are never summed into a power or best-in-slot score. Route sort also
retains confirmed active-filter matches ahead of incomplete records.

## Data contracts and persistence

`ItemRecord.numericStats` adds typed numeric values and explicit
complete/partial/unknown coverage. All six reviewed items have pinned numeric
profiles; their existing text statistics and evidence remain intact. Omitted
fields stay unknown for partial records. Explicit zero is preserved and is not
a positive stat bonus. A complete supported numeric set can establish zero for
omitted fields. Percent units are separate from ratings.

The strict legacy adapter recognises reviewed labels, deliberately handles
spelling/abbreviation variants, deduplicates identical aliases, and marks
conflicting aliases unknown. Unsupported descriptive effects are retained for
display. Ambiguous `Healing` or `+healing done` is not a global alias. Ponderous
Orb's existing `Healing` display label has a record-specific mapping to +11
healing power, reviewed against its [ForeverDB page](https://foreverdb.net/item/273052).
Live tooltip changes cannot mutate searchable numeric values or a saved plan.

`AcquisitionSource.locationRole` is optional and validated against the source
method. The personal-source editor can explicitly identify a pickup, reward
turn-in, entrance, vendor, linked enemy, or crafting-related location. Generic
legacy zones remain context only. Imported personal records retain user-supplied
evidence. No profile schema bump is needed: existing schema-4 readers accept
absent fields, while the current validator preserves and validates these optional
fields. Versions 1–3, exact backups, raw-record/revision conflict checks, JSON
transfer and independent completion rules remain covered by existing tests.

## Route and acquisition semantics

My Route and My Route + Nearby use the existing zone catalogue and directed
travel graph. Nearby is one supported connection from an active/planned zone
stop, with faction, prerequisites and unlocks checked. Flights are never assumed
discovered. Provisional Classic/client paths retain their evidence; transport
legs remain explicit. Blocked/uncertain direct detours stay unknown rather than
being described as confirmed inconvenient travel. No exact durations are added.

Location roles distinguish quest pickup/objective/reward turn-in, dungeon
region/boss/entrance, vendor and linked enemy. Crafting has no automatic geography;
only an explicit learning/material/requirement relationship can match. Selecting
an acquisition method intersects that method and the route on the **same source**.
An item with a remote dungeon source cannot borrow an on-route vendor location
to satisfy Dungeon + My Route.

The shipped catalogue has **no confirmed strict item-acquisition locations**.
Book of Ur's reviewed Undercity pickup is contextual; objectives and reward
turn-in remain unresolved. Ponderous Orb's dungeon entrance is unresolved and
the crafting learning/material locations remain unknown. Strict route searches
therefore can correctly show no results. The separate option to include unknown
locations does not label them confirmed matches or unavailable items.

Wishlist additions preserve source references and continue deriving Quests,
Dungeons and Professions goals from the same graph. Overview and pending route
stops gain counts for the player's selected acquisition sources. Alternative
sources do not inflate saved-goal summaries. No route insertion, reordering,
quest completion, crafting completion or item acquisition is automated.
See [the complete route contract](gear-discovery-route.md).

## Scale and external-data decision

Numeric fields are indexed once per resolved snapshot. A shared-source route
index prevents repeated source lookup/travel calculation per item. Search results
are paginated at 36; opt-in icon requests are limited to the visible search page
and at most 36 visible wishlist records. Larger data can enter through the same
typed snapshot/location adapter without replacing filter logic.

The six-item snapshot remains bundled with the application. A genuinely larger
permitted dataset should be versioned and lazy loaded separately; workers/shards
require actual browser measurements. The current application build emits a Vite
chunk-size advisory at roughly 516 kB uncompressed / 148 kB gzip; no threshold is
suppressed. The 30,000-row synthetic numeric benchmark checks membership against
an independent predicate and repeatable ordered IDs. It does not measure full
travel classification, mobile rendering or a real provider export.

No reviewed source established a sufficient bulk Forever numeric-stat export and
redistribution grant. No database was bulk imported, scraped or reverse engineered.
The [updated feasibility report](gear-data-feasibility.md) records primary links,
rights/provenance gaps, QuestieDB's acquisition strengths and missing stat fields,
Blizzard/client compatibility limits, versioning, import gates and measurements.

## Automated validation

- Unit suite: 24 original draft tests and 339 companion tests passed.
- Full browser suite: 21 class-draft tests and 111 companion tests passed, including
  seven new Gear Discovery acceptance cases.
- Build: typecheck and combined build passed; ten static-output checks passed.
- Compiled `/companion/`: full 111-case companion acceptance suite passed; the
  seven discovery cases passed again after the final combined level-cap fix.
- Separate live smoke: existing ForeverDB icon/tooltip check and new stat-search
  icon/tooltip screenshot check passed. Offline tests continue to mock/block
  providers and do not depend on their live availability.
- Desktop/tablet/mobile at 1440/820/390 px: keyboard/touch controls, selection
  states, automated WCAG checks and no horizontal overflow. This is not a human
  screen-reader or in-game gameplay validation.

Final CI/preview outcome is recorded in the draft PR. The pre-existing
`Workers Builds: gregular-preview` failure is separate from the functioning
Cloudflare Pages integration and has not been reconfigured.

## Required demonstration

The test `tests/gear-discovery.spec.mjs` performs these steps through the real UI:

1. Create a Troll Priest at level 24 with The Barrens as its route stop.
2. Open Equipment; select Intellect and Spirit. ANY finds Ponderous Orb and
   Glowing Copper Boots; ALL confirms Ponderous Orb alone.
3. Set Intellect minimum 3: no confirmed ALL match. Change it to 2 and Spirit
   minimum 8: Orb returns.
4. Now and +5 windows exclude required level 30; +10 includes it.
5. My Route finds no confirmed reviewed location. Include unknown locations
   separately, expand to Nearby, and inspect the honest source explanation.
6. Add Orb to the wishlist; open its linked City of Dalaran dungeon goal.
   Also verify the real Glowing Copper Boots crafting and Tattered Mittens quest
   connections. These actions do not complete their activities.
7. Add Stonetalon Mountains to the route, export the profile, reload and import
   into a fresh browser context. All three wishlist entries and both route stops
   persist exactly.
8. In a separate isolated fixture, compare direct Barrens, adjacent Stonetalon,
   distant Tanaris and unknown vendor locations with numeric stat thresholds.
   All item/source names explicitly say **NOT GAME CONTENT**, with user-supplied
   provenance and no game IDs; these records are never shipped in the catalogue.
9. Change the method to Quest to prove it cannot borrow an item's vendor route
   relationship. Expand Nearby and inspect provisional road evidence.
10. Complete Barrens, then plan Stonetalon. Its fixture item changes from nearby
    to directly on route. Export preserves the explicit personal location role,
    wishlist status and independent second character.

Screenshots and exported demo profiles are written only to ignored
`artifacts/pass-7/`. Reviewed screenshots show actual catalogue facts. Fixture
screenshots/exports remain explicitly separate. To rerun:

```powershell
npx playwright test --config playwright.companion.config.mjs tests/gear-discovery.spec.mjs
npx playwright test --config playwright.providers.config.mjs -g 'with Gear Discovery'
node scripts/benchmark-gear-search.mjs
```

For an explicit feature-preview acceptance run, set `GREGULAR_PREVIEW_URL` to
the draft PR's HTTPS `*.gregular.pages.dev/companion/` URL, then run
`npx playwright test --config playwright.review.config.mjs tests/gear-discovery.spec.mjs`.
That config rejects production or unrelated hosts.

Review captures: [desktop](images/pass-7/equipment-desktop.png),
[mobile](images/pass-7/equipment-mobile.png),
[real ForeverDB tooltip](images/pass-7/foreverdb-tooltip.png), and
[isolated route fixture — not game content](images/pass-7/isolated-route-fixture.png).

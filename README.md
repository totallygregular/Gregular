# Gregular — WoW Forever companion

Character management, a visual leveling route, personal quest chains and connected equipment acquisition goals, with browser-local profiles. Pass 5 connects **Overview → Leveling Route → Quests → Dungeons → Equipment**, preserving the existing route builder and profile safeguards. The existing **Party / Roll class draft remains at the root**. This branch does not release the companion to production.

Overview opens by default; old `journal` links still open Overview. Equipment searches a deliberately limited four-item reviewed Forever snapshot and supports personal items and acquisition sources. Desired rewards derive shared quest goals and prerequisite views; desired dungeon items group by dungeon. Quest completion, dungeon runs and item acquisition are independent. Personal quests and named ordered chains work offline without catalogue records. See the [Pass 5 demonstration and validation](docs/pass-5.md), [shared model and schema](docs/connected-acquisition-model.md), and [data/licensing investigation](docs/acquisition-data-feasibility.md).

## Run the companion

Use Node **22.18.0**, pinned in `.node-version`, and npm. The application also supports newer 22.x releases or Node 24+. From the repository directory:

```powershell
npm ci --ignore-scripts
npm run dev
```

Open **http://127.0.0.1:5173/**. Enter a username and choose your character's reviewed Forever race, available class and optional specialisation. Faction follows the race choice. Keep the suggested starting zone, change it to join a friend, or choose a blank route. Open **Leveling** to browse the next suitable bracket near your final zone's recommended upper range, sorted by travel. Personal entry/exit levels remain editable; insert/repeat/reorder visits and track progress freely. Travel updates for the previous and following stops. The journal's **Next Up** follows your level and saved order without automatically completing earlier work. Existing plans and dungeon tools remain under **Objectives & dungeons**. Follow the [zone-route demonstration](docs/zone-route-demo.md).

Reloading restores this tab's active profile; entering the same username later opens the same browser-local data. Names are case-insensitive. Each character has an independent route, and there is no three-character limit. Username entry is **not secure authentication**: profiles are not synced and can be opened by anyone using this browser.

The zone catalogue distinguishes **Forever-confirmed**, **client-derived**, **Classic-derived**, **editorial** and **unknown** guidance per field. Most recommended ranges are explicitly provisional Classic estimates; personal planned ranges are stored independently. Travel uses evidence-backed directed connections and deterministic relative weights, assumes no flight paths unlocked and never claims precise minutes. Talents remain an illustrative placeholder. The acquisition catalogue identifies reviewed provider observations, incomplete prerequisites and disputed fields explicitly; local accessible details need no live tooltip connection. New character choices follow [reviewed official Forever announcements](docs/character-options.md); saved legacy labels remain import-compatible. A planned specialisation does not confirm unlocked talents, and 1–60 planning does not promise beta availability. See [zone-range research](docs/zone-range-review.md), [zone and travel provenance](docs/zone-provenance.md) and [legacy progression references](docs/progression-data.md).

Existing version-1 and version-2 profiles migrate to schema 3 without changing their characters, routes, notes or objective completion. The exact original JSON is backed up locally before the first save of migrated data. **Import profile** accepts versions 1, 2 and 3, previews the named profile, and requires confirmation before replacement. Replacement creates a recoverable local backup; use **Profile settings → Restore backup** or **Download backup**. Failed or canceled imports leave saved profiles intact. **Export profile** includes all acquisition state, relationships, routes and current session changes. Older application builds cannot read schema-3 exports; keep their original export or migration backup. Keep exports outside browser storage for portability; profiles are not automatically synchronized between browsers or preview URLs.

## Build and validate

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:ui
npm run build
npm run test:build
npm run preview
```

Preview the combined build at **http://127.0.0.1:5174/companion/** and the preserved class draft at **http://127.0.0.1:5174/**. `npm run test:build` checks the compiled static output, nested assets, redirects, missing paths and class-draft preservation. To run browser coverage against the compiled companion:

```powershell
$env:COMPANION_BUILT = '1'
npm run test:companion
Remove-Item Env:COMPANION_BUILT
```

Development, build preview and production are different origins, so their local saves are separate. Use a stable Cloudflare branch alias during repeated review, and export/import when changing origins. `npm run serve` starts only the existing draft on port 4175.

On Windows, an installed browser can be used instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:ui
```

The verification workflow runs unit, browser and combined-build checks. It does not deploy. The existing Cloudflare Pages Git integration provides branch previews: see [preview setup](docs/preview-setup.md) and [Pass 3 validation](docs/zone-route-validation.md) for the actual review deployment. GitHub Pages continues serving the source tree from `main` `/`. No DNS or production hosting changes are included.

## Documentation

- [Repository assessment](docs/repository-assessment.md)
- [Architecture and future cloud migration](docs/architecture.md)
- [UX and design specification](docs/ux-design.md)
- [Forever data-source feasibility and licensing gaps](docs/game-data-feasibility.md)
- [Leveling snapshot, provenance and update process](docs/progression-data.md)
- [Zone catalogue and travel graph provenance](docs/zone-provenance.md)
- [Zone-first route demonstration](docs/zone-route-demo.md)
- [Pass 3 validation](docs/zone-route-validation.md)
- [Leveling demonstration](docs/leveling-demo.md)
- [Cloudflare preview setup and stable URLs](docs/preview-setup.md)
- [Manual acceptance checklist and optional demo profile](docs/manual-qa.md)
- [Prioritized roadmap and acceptance criteria](docs/roadmap.md)
- [Validation evidence and limitations](docs/validation.md)

The companion lives in `companion/`. Profile validation/migration, planner mutations/recommendations, asynchronous persistence, UI and reference data are separate modules. Artwork and class crests are original SVG/CSS; no game assets or external tooltip scripts are bundled.

---

## Preserved Party / Roll class draft

A responsive static shared-screen class draft for friends. Enter player names and optional roles, roll d20s, resolve same-role dice ties with random paper-scissors-rock tournaments, and spin for a globally unique eligible class for each player.

## Rules and controls

- Tanks pick first, healers next, DPS last. Higher dice rolls pick first within each role. Unassigned players count as DPS (`Auto: DPS` in the role selector).
- Roll an individual die or roll all. Rolls are editable before locking the party.
- Equal dice inside the same role enter automatic paper-scissors-rock tournaments. Hands are independently uniform. Draws repeat. A newly shuffled knockout bracket selects first place; all remaining players play another bracket for second place, then third, and so on. Every tied player receives a complete unique rank, including all losers. Odd brackets grant seeded byes; seeds are randomly shuffled for each place.
- The wheel samples uniformly from its displayed equal slices using Web Crypto rejection sampling. Each class leaves the shared pool after it is picked.
- A bipartite matching check rejects impossible rosters and excludes a currently eligible class if picking it would strand a later role. The UI lists every such exclusion and explains the reason. Uniform choice is among the safe displayed classes, not among all possible complete-party assignments.
- Editing a locked setup requires confirmation and clears rolls, tournaments and picks. New draft preserves names and pools but clears the draft. Reset saved draft clears the party and restores defaults after confirmation.
- A pending spin and complete tournament outcomes are persisted before their animations. Reload finishes the interrupted operation with its original result/order rather than rolling again.
- Class pools support enabling/disabling, renaming, role eligibility, addition/removal and restoring defaults. Up to 32 players/classes are supported; with the nine standard classes, at most nine players can receive unique classes.
- Copy results uses the clipboard when available and offers a selectable text fallback. OS reduced motion and an explicit Less motion toggle shorten animations. Buttons and dialogs support keyboard use.

## Starting class pools

Nine classes: Druid, Hunter, Mage, Paladin, Priest, Rogue, Shaman, Warlock and Warrior. Starting roles are conservative editable group rules:

| Role   | Classes                        |
| ------ | ------------------------------ |
| Tank   | Warrior, Paladin, Druid        |
| Healer | Priest, Paladin, Druid, Shaman |
| DPS    | All nine                       |

Experimental Shaman tank is an explicit optional toggle, off by default. It is not represented as impossible or as a confirmed launch role. Beta balance and role viability can change; edit the pools for your group.

Official research references: [class overview](https://news.blizzard.com/en-gb/article/24304075/create-the-hero-you-want-to-be-in-world-of-warcraft-forever), [deep dive panel](https://news.blizzard.com/en-gb/article/24303313/world-of-warcraft-forever-deep-dive-panel-recap), [Hunter and Druid](https://news.blizzard.com/en-us/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid), [Priest and Warrior](https://worldofwarcraft.blizzard.com/en-gb/news/24301514/world-of-warcraft-forever-class-deep-dives-priest-and-warrior). No API, game client, race restriction or faction lookup is used at runtime.

## Run and verify

```powershell
npm ci --ignore-scripts
npm run serve
npm test
npx playwright install chromium
npm run test:ui
npm run build
```

Local preview: `http://127.0.0.1:4175`. On Windows, set `PLAYWRIGHT_EXECUTABLE_PATH` to installed Edge or Chrome. CI installs Chromium.

Core tests cover random selection, role ordering, repeated draws, full tournament rankings, largest ties, duplicate prevention, matching against an independent exhaustive solver over every enabled-class subset, many complete random draft paths, schema validation and interruption recovery. Browser tests cover setup, per-player dice, full drafts, animated draws, interruption, editing confirmation, configurable pools, blocked/corrupt storage, clipboard fallback, cross-tab protection, keyboard/mobile play and automated accessibility at 320/360/390/768/1440px.

## Saves and privacy

The versioned browser key is `wow-forever.class-draft.v1`. Saves contain only player-entered names, roles, pools, rolls and draft results. They are local to this browser and origin. No accounts, backend, AI service, analytics or multiplayer network sync exist. Blocked/quota-limited storage leaves the current tab playable; copy results before closing it. Corrupt saves and changes from another tab are protected from overwrite until deliberate reset. This is an unofficial fan tool.

## Hosting and recovery

Existing GitHub Pages branch publishing uses `main` `/` with CNAME `gregular.org` and unchanged DNS. `.github/workflows/site.yml` verifies changes on push/PR; it does not deploy independently. The combined build copies only `index.html`, `assets/`, `CNAME`, `.nojekyll` from the original tool, generates routing/404 files, and adds the compiled `companion/` assets. Cloudflare feature builds add a small companion link to the copied root page. The original root source stays unchanged; GitHub Pages branch publishing can also expose other public source files, which contain no credentials or player saves.

Briarwick was preserved before replacement in the remote branch **`archive/briarwick-2026-10-01`**, verified at **`64ae5b4328296bb4fd20e83f0b9e9f3adf60216e`**. Its original isolated local checkout is also preserved. The class-draft main tree contains no Briarwick game route, story/save modules, town artwork or game preview scripts. No archive copy is deployed. To restore later, create a reviewed restoration branch from that archive and merge it normally; history is never rewritten.

The earlier trading site remains recoverable through `archive/gregular-before-briarwick-2026-10-01`. The separate armory prototype is untouched. No cloud data or unrelated resources are removed.

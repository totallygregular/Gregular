# Gregular — WoW Forever companion

Character management and a functional leveling planner, with browser-local profiles. Pass 2 adds editable routes, zone/dungeon/custom objectives and level-aware Next Up recommendations. The existing **Party / Roll class draft remains unchanged at the root**. This branch does not release the companion to production.

## Run the companion

Use Node **22.18+ (22.x)** or **24+** and npm. From the repository directory:

```powershell
npm ci --ignore-scripts
npm run dev
```

Open **http://127.0.0.1:5173/**. Enter a username, create a character, then open **Leveling**. Start blank or choose a faction starter route; add zones, dungeon milestones and personal objectives, adjust target levels, reorder entries and mark progress. The journal's **Next Up** follows your character level and saved plan. Follow the [Troll Priest demonstration](docs/leveling-demo.md) for a complete example.

Reloading restores this tab's active profile; entering the same username later opens the same browser-local data. Names are case-insensitive. Each character has an independent route, and there is no three-character limit. Username entry is **not secure authentication**: profiles are not synced and can be opened by anyone using this browser.

The leveling catalogue contains a few sourced Forever facts; starter order and level windows are **editorial personal plans**, not verified leveling guides. Zone ranges, access rules and missing prerequisites remain explicit unknowns. Talent/item previews remain illustrative. Race/class combinations and the 1–60 planning input range do not promise beta availability. See [progression sources and limitations](docs/progression-data.md).

Existing version-1 profiles migrate without losing characters, notes or objective completion. Their exact original JSON is backed up locally before the first version-2 save. JSON export includes routes and current session changes. **JSON import/restore is deferred**; keep exports outside browser storage if needed.

## Build and validate

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:ui
npm run build
npm run preview
```

Preview the combined build at **http://127.0.0.1:5174/companion/** and the preserved class draft at **http://127.0.0.1:5174/**. Development, build preview, and production are different origins, so their local saves are separate. Use one origin consistently during evaluation. `npm run serve` starts only the existing draft on port 4175.

On Windows, an installed browser can be used instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:ui
```

The verification workflow runs both unit and browser suites plus the combined build. It does not deploy. Pages currently serves the source tree from `main` `/`; an approved production migration must publish the built `dist/` artifact and verify the custom domain in Pages settings. Simply merging Vite source will not deploy a runnable companion. No DNS or hosting changes are included.

## Documentation

- [Repository assessment](docs/repository-assessment.md)
- [Architecture and future cloud migration](docs/architecture.md)
- [UX and design specification](docs/ux-design.md)
- [Forever data-source feasibility and licensing gaps](docs/game-data-feasibility.md)
- [Leveling snapshot, provenance and update process](docs/progression-data.md)
- [Leveling demonstration](docs/leveling-demo.md)
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

| Role | Classes |
| --- | --- |
| Tank | Warrior, Paladin, Druid |
| Healer | Priest, Paladin, Druid, Shaman |
| DPS | All nine |

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

Existing GitHub Pages branch publishing uses `main` `/` with CNAME `gregular.org` and unchanged DNS. `.github/workflows/site.yml` verifies changes on push/PR; it does not deploy independently. No manual workflow dispatch or trading updater is needed. The public build allowlist is `index.html`, `assets/`, `CNAME`, `.nojekyll`; the existing root publishing setup can also expose other public source files, which contain no credentials or player saves.

Briarwick was preserved before replacement in the remote branch **`archive/briarwick-2026-10-01`**, verified at **`64ae5b4328296bb4fd20e83f0b9e9f3adf60216e`**. Its original isolated local checkout is also preserved. The class-draft main tree contains no Briarwick game route, story/save modules, town artwork or game preview scripts. No archive copy is deployed. To restore later, create a reviewed restoration branch from that archive and merge it normally; history is never rewritten.

The earlier trading site remains recoverable through `archive/gregular-before-briarwick-2026-10-01`. The separate armory prototype is untouched. No cloud data or unrelated resources are removed.

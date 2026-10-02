# Party / Roll — WoW Forever class draft

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

# Leveling planner validation

Pass 2 builds on reviewed prototype commit `7ccd1aa`, on `codex/leveling-planner`, targeting `codex/forever-companion-prototype`. PR #1 remains unmerged. Validation used Windows, Node 22.18.0, npm 10.9.3 and installed Microsoft Edge through Playwright's Chromium engine on 13 October 2026 (Pacific/Auckland).

## Results

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript | Pass | Strict checking across UI, planner, migration and reference types. |
| Clean install | Pass | `npm ci --ignore-scripts`; 50 packages audited, zero reported vulnerabilities at execution time. |
| Original class-draft unit tests | 24 passed | Existing ordering, matching, randomness, persistence and recovery. |
| Companion unit tests | 71 passed | 36 domain/repository tests and 35 planner/dataset tests. |
| Original class-draft browser tests | 21 passed | Existing tool, accessibility, responsive behavior and saved-state recovery. |
| Leveling browser tests | 12 passed | New end-to-end workflows, export, migration, accessibility and responsive checks. |
| Full companion browser tests | 32 passed in 44.8 seconds | Existing 20 scenarios plus 12 leveling workflows, against final compiled `/companion/`. |
| Combined static build | Pass | Legacy public files plus compiled `/companion/`; no deployment. |
| Preservation | Pass | No changes to root `index.html`, `assets/`, `CNAME`, `.nojekyll`, build/server scripts, deployment workflow, package manifests or original draft tests/config. Built root HTML and CNAME hashes match source. |
| Whitespace | Pass | `git diff --check`. |

Planner tests cover blank creation, immutable edits, stable IDs, reordering, completion/skipping, explicit prerequisites, missing prerequisites, faction restrictions, level changes, priorities, empty states, different character levels, announced bands versus entry minima, player access gates, unavailable content, reviewed beta cap, missing/changed records and non-destructive template restoration. Dataset tests enforce source linkage and the distinction between unknown facts and editorial planning windows.

Migration tests preserve profile/character/objective IDs, notes and completed legacy objectives. Version-1 loads do not write storage. The first new save keeps the exact v1 JSON backup before upgrading; failed backups, quota errors, invalid/newer profiles and stale tabs remain protected. Repeated migration reads use stable planner IDs. Missing snapshot references and older dataset versions survive saves.

Browser workflows exercise a test-created Horde Troll Priest at level 24, personal/zone/dungeon CRUD, route renaming/reordering, template restoration, completion/skipping, level-driven Next Up, access and prerequisites, character/username isolation, reload, real seeded v1 migration, invalid ranges, missing references, export, multi-tab conflicts and keyboard focus. No test character is seeded into user profiles.

## Reproduce

```powershell
npm ci --ignore-scripts
npm run typecheck
npm test
npx playwright install chromium
npm run test:ui
npm run build
$env:COMPANION_BUILT = '1'
npm run test:companion
```

On Windows, `PLAYWRIGHT_EXECUTABLE_PATH` can point to installed Edge instead of downloading Chromium; see the README. Built mode starts the combined preview on port 5174 with the companion at `/companion/`. Development uses port 5173; these are different local-storage origins. Use one origin consistently for personal testing.

This environment requires escalated execution for local sockets and browser processes. No production publication or settings changes were performed. Browser runs use separate output folders when run concurrently so Playwright does not delete another suite's trace artifacts.

## Visual and accessibility review

New roadmap screenshots are generated under ignored `artifacts/leveling-{desktop,tablet,mobile}.png` at 1440x1000, 820x1100 and 390x844 viewports. Copies accompany the chat deliverables. Existing browser coverage also checks 320, 390, 768 and 1440px companion layouts and the original draft's five responsive widths.

Automated axe WCAG 2 A/AA and 2.1 AA checks cover the roadmap, populated editor and Next Up at all three new sizes, alongside existing entry/roster/journal/notes/mock screens. Page overflow is checked separately. Native disclosures, selects and named arrow buttons support keyboard/touch without drag-and-drop. Reduced motion is enabled in new browser workflows. Completing a Next Up entry restores focus to a remaining action or the panel.

The compiled entry uses system fonts and existing original SVG/CSS. No artwork downloads, game-data requests, analytics, external tooltip scripts, credentials or new runtime packages are introduced.

Final asset sizes: HTML 0.69 kB (0.40 kB gzip), CSS 43.89 kB (10.01 kB gzip), JavaScript 293.06 kB (89.51 kB gzip). Combined compressed entry is about 100 kB, excluding the small existing favicon.

## Limits and follow-up

- Game facts are source-reviewed, not verified in a game client. Six zones and three dungeons are linked to official beta notes; no zone level ranges, entrance minima, quest chains, rewards or faction quest coverage are inferred. Two starter routes are explicitly editorial scaffolds. See [progression-data.md](progression-data.md).
- The reviewed beta cap is 30. The 1–60 personal planning range remains provisional; reference recommendations beyond the reviewed cap are blocked. User-created plans can describe future activities.
- JSON export includes schema 2 and routes. Import/restore remains deferred so replacement previews, validation and recovery can be implemented together. The v1 browser backup is not a cross-device backup.
- Browser-local raw/revision checks reject observed stale writes; exactly simultaneous writes are not atomic. No backend, multiplayer or authenticated accounts exist.
- Local checks use Windows Edge/Chromium. CI uses Linux Chromium. Firefox, Safari, real touch hardware and a manual screen-reader review are not covered.
- Automated accessibility checks cover examined states, not all possible assistive-technology behavior.
- Notes still save explicitly; leaving unsaved notes has no navigation guard. Planner objective dialogs preserve their draft on validation errors.
- Talent, item and standalone dungeon previews remain illustrative. Actual loot tables, talent allocation and automatic game synchronization remain outside this pass.
- Production still serves the unchanged class draft from `main`. Main, archive branches, Pages configuration and DNS must remain unchanged. The draft review does not authorize deployment.

## Final compiled and remote verification

The final compiled companion passed all 32 scenarios, including export, migration, template restoration and the three screenshot/accessibility workflows. The original tool passed all 21 browser cases separately. Both root and companion preview entries were checked for HTTP responses; root HTML and CNAME hashes match source. Screenshots were visually inspected at desktop, tablet and mobile sizes.

Remote checks confirmed the prototype still at `7ccd1aa`, main at `c150706` and the Briarwick archive at `64ae5b4` before publication of the new branch. Draft-PR CI status is reported in the PR and final handoff separately; local results do not imply remote CI completion. First-pass evidence remains available in the prototype base commit `7ccd1aa`.

The first Linux CI run passed all new leveling workflows but caught the existing mock-section accessibility scan during a section opacity animation. The test now waits for the selected navigation state and rendering frames before enumerating and awaiting animations, and asserts full opacity before scanning. The contrast rule remains enabled; the check measures the fully rendered screen. This change addresses a render-timing race rather than excluding the affected content. The final focused accessibility workflow passed three consecutive compiled runs after this correction.

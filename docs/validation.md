# Preview and profile recovery validation

Pass 2.5 builds on `codex/leveling-planner` at `7a04b75`, on `codex/pr-previews-profile-import`, targeting the leveling branch. PR #1 and PR #2 remain unmerged. Validation used Node 22.18.0, Windows and installed Edge through Playwright's Chromium engine on 13 October 2026 (Pacific/Auckland).

## Results

| Check                            | Result                    | Scope                                                                                                                      |
| -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                       | Pass                      | Strict checking across the companion and new transfer UI/model.                                                            |
| Original unit tests              | 24 passed                 | Preserved class-draft behavior.                                                                                            |
| Companion unit tests             | 117 passed                | Existing planner/domain/repository coverage plus transfer, recovery and optional demo validation.                          |
| Compiled output                  | 9 passed                  | Root preservation, nested assets/MIME types, redirects, queries, hash documents, demo download, 404s and output allowlist. |
| Ordinary build                   | Pass                      | Original draft at `/`, companion at `/companion/`; no deployment.                                                          |
| Simulated Cloudflare build       | Pass                      | `CF_PAGES=1` feature build; 9 output checks and desktop/mobile browser smoke checks.                                       |
| Full browser suite               | 66 passed                 | Original 21 cases and companion 45 cases, including 13 new import/recovery cases.                                          |
| Compiled companion browser suite | 45 passed in 51.0 seconds | All 45 cases against the nested compiled `/companion/` route.                                                              |
| Whitespace                       | Pass                      | `git diff --check`.                                                                                                        |

The 44 new transfer/repository tests cover v1 migration, v2 round-trip, stable IDs and supported data, malformed/newer/duplicate records, no writes during preview, single-use confirmation, exact backup, restore reversal, quota/read failures, revision overflow, target/backup interference, invalidated review tokens and stale normal saves after replacement. Two demo tests validate its shape and distinct Next Up results. Existing planner policy and catalogue tests remain unchanged.

Browser coverage includes actual file selection and demo download, cancellation and keyboard confirmation, export into an independent browser context, invalid-file preservation, v1 import, exact backup download, restore/cancel, another-tab edits, backup failure, username isolation, direct hash navigation and reload. New accessibility checks scan import and recovery at 1440, 820, 390 and 320px. They retain axe WCAG 2 A/AA and 2.1 AA rules and separate horizontal-overflow assertions. Existing class-draft, character CRUD, planner, keyboard and mock-section checks still run.

The file-picker description was separated from its accessible label. The demo link has a persistent underline so users do not need to distinguish it by text color alone. Review also caught a temporary-change warning that needed to cover switching to another imported username; confirmation now warns before leaving any temporary current state behind.

## Reproduce

Follow [manual-qa.md](manual-qa.md) for commands and acceptance checks. Run `npm test`, `npm run test:ui`, `npm run build`, `npm run test:build`, then `COMPANION_BUILT=1 npm run test:companion` (use the documented PowerShell environment syntax on Windows). CI performs the same verification, including compiled browser tests. It publishes nothing.

The optional fixture is `companion/public/demo-profile-v2.json`; it is downloadable through Profile settings and never loaded by default. Browser tests use isolated contexts rather than real user profiles. Generated screenshots are ignored under `artifacts/profile-{import,recovery}-{desktop,tablet,mobile,compact mobile}.png`; final copies accompany the deliverables.

Final compiled sizes: HTML 0.69 kB (0.40 kB gzip), CSS 46.03 kB (10.46 kB gzip), JavaScript 304.27 kB (92.38 kB gzip). Entry assets total about 103 kB compressed, excluding the small favicon and opt-in demo download. No runtime packages, credentials, artwork, remote APIs or game-data expansion were added.

## Preservation and remote limits

The root `index.html`, `assets/`, `CNAME`, `.nojekyll`, legacy tests and draft save namespace are unchanged. Ordinary build output retains original root asset bytes; only Cloudflare feature builds add a small companion link to the root artifact. Existing verification CI gained Node pinning and compiled checks, with read-only permissions and no deployment jobs.

Read-only GitHub checks confirmed main `c150706`, prototype `7ccd1aa`, leveling `7a04b75` and archive `64ae5b4`. GitHub Pages remains legacy publishing from `main` `/`, custom domain `gregular.org`. No branch merge, production publishing, Pages setting, DNS or archive change was performed.

No authenticated Cloudflare dashboard or preview deployment checks were available. Native setup, stable aliases and PR-specific instructions are in [preview-setup.md](preview-setup.md). A local simulation verifies repository behavior, not Cloudflare's deployed redirects, actual hostname, GitHub App authorization or remote build status. The owner must connect the account and complete the documented first remote acceptance checks. Remote GitHub CI status is reported separately in the PR and handoff.

## Remaining limitations

- Profiles remain browser-local lookup data, without secure authentication or automatic synchronization. Stable aliases retain an origin but do not share data with other previews/devices.
- Replacement is deliberate, not a merge. Import opens the file's username. Only the most recent replacement backup is retained per username; export for lasting recovery. The original v1 migration backup stays separate.
- Exactly simultaneous local-storage writes are not atomic. Observed stale target/backup content is checked before and after backup creation. A backend must eventually supply atomic conditional writes.
- Backups contain saved records, not unsaved notes or temporary session edits. Export those before replacement or switching profiles.
- Browser coverage uses Chromium/Edge locally and Chromium in CI; Safari, Firefox, actual touch hardware and manual screen-reader validation are not covered.
- Forever data limitations, editorial template labels and illustrative talent/item/dungeon previews are unchanged; see [progression-data.md](progression-data.md).

Earlier Pass 2 validation remains in base commit `7a04b75`; this report records the current pass.

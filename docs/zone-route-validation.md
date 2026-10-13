# Development Pass 3 validation

Reviewed 13 October 2026. Feature branch `codex/zone-first-route-builder`, stacked on the still-open PR #3 branch `codex/pr-previews-profile-import` (base snapshot `bd1f881687df06a2ec059e850aa164ec9bb0336e`). No production branch, DNS, custom domain or hosting configuration is changed.

## Automated evidence

| Check | Result |
| --- | --- |
| TypeScript typecheck and combined production build | Pass |
| Existing class-draft unit tests | 24 pass |
| Companion unit tests, including route/persistence/catalogue/graph | 151 pass |
| Existing class-draft browser tests | 21 pass |
| Compiled companion browser tests at `/companion/` | 58 pass; includes all 45 previous tests and 13 new zone-route cases |
| Static build/HTTP routing and asset checks | 9 pass |

Windows browser checks use installed Microsoft Edge (Chromium). CI installs Chromium separately. The complete browser suite exercises desktop, tablet and mobile layouts, reduced motion, keyboard focus/activation, native dialog dismissal, touch taps, horizontal overflow and automated axe accessibility. Automated accessibility is useful coverage, not a substitute for human assistive-technology testing.

The Human Priest scenario covers optional Elwynn start, planned exit, nearby Westfall versus cross-continent Darkshore, reorder recalculation, range edits, completion, character-level edits, dashboard progression, reload and export/import. Horde coverage checks Durotar/The Barrens, default faction separation, intentionally browsing all factions, and changing the same character's faction without leaving a stale browser filter. Additional cases cover insertion on both sides, repeated visits, overlaps, gaps, skip/reactivate, removal, renaming, blanking while retaining objectives/dungeons, independent characters and observed stale-tab conflicts.

Persistence unit/browser checks retain the existing v1 migration, exact migration backup, schema validation, review-before-replacement, recovery and quota/conflict protections. New route fields use the existing schema-2 shape. No old test case or assertion was removed; legacy navigation helpers now expand **Objectives & dungeons**, including after reload.

The local sandbox initially prevented temporary HTTP test servers being reached. The same checks passed with local network access. This was an environment restriction, not an application failure.

## Visual evidence

The browser suite produces `artifacts/zone-route-desktop.png` (1440 px), `zone-route-tablet.png` (820 px) and `zone-route-mobile.png` (390 px). Screenshots show the actual compiled interface, and were visually reviewed for hierarchy, range distinction, travel labels, responsive layout and readable controls. Generated artifacts and browser profiles are ignored by Git; user-facing copies are delivered separately.

## Preview and limits

The existing Cloudflare Pages Git integration supplies this branch's own preview when pushed. Use the successful **Cloudflare Pages** check or the draft PR's delivery links, appending `/companion/`. The unrelated `Workers Builds: gregular-preview` integration already reports a failure on PR #3; report its status separately from Pages and GitHub verification. No Cloudflare credentials, deploy action, DNS change or production release is introduced.

Remote checks and the actual working preview URL are reported in the draft PR and delivery once the integration finishes. The exact preview origin owns separate local storage; use reviewed JSON import/export to transfer profiles. PR #3 can preserve the schema-2 plan as generic entries but may show new catalogue references as missing. PR #1 cannot load schema-2 exports.

No in-game quest, road or transport was independently played. Catalogue evidence is one Forever-confirmed range, 38 explicitly provisional Classic-derived ranges and six unknown ranges. The 120 directed graph edges combine official announcements, community-reported client transports and provisional Classic roads; uncertainty is visible in the selected path. Unsupported flight paths, prerequisite-dependent shortcuts and missing routes remain unavailable. See [zone-provenance.md](zone-provenance.md) for exact sources, weights and boundaries.

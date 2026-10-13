# Pass 4.5: destination relevance and planning clarity

Stacked on PR #5, `codex/leveling-journey-visuals` at `c276b984`. This pass keeps the existing journey layout, profile schema, persistence, route editing and graph. No production hosting changes or merge are included.

## Behaviour

The previous browser deliberately used distance to the whole recommended range, then incoming travel difficulty, then alphabetical names. Every in-range zone tied at zero level distance. It did not rank using personal insertion levels, the following travel leg or repeated visits.

Suggestions now use an explicit, independently testable additive cost, with ASCII zone-ID tie-breaking. The selected insertion's personal planning level and both travel legs affect order. Visible labels/reasons distinguish current fits, later options, awkward visits and uncertainty. The full 45-zone catalogue remains available through the existing filters. Browser-level suitability badges name their level so they cannot be mistaken for insertion-level relevance. See [the scoring terms and context rules](route-relevance.md).

Suitable content levels, personal planned levels and coverage advice remain separate. Soft notes do not claim a measured XP yield or typical duration. A known zone planned for eight or more level gains gets an editorial review prompt; all valid personal ranges can still be saved. Unknown guidance stays explicit. Riverglades is now 35–45, recorded as a low-confidence owner-requested editorial correction rather than official confirmation. See [guidance and its limits](zone-guidance.md) and [field provenance](zone-provenance.md).

Six original SVG landscape families and a neutral atlas motif occupy reserved header space, with smaller mobile sizing. They never sit behind text. Unmapped/new zones use the neutral ornament rather than inferred geography. These are decorative journal sketches, not maps or game assets; there are no external images, downloads or new dependencies. Travel labels and manual route states retain their text, controls and prominence.

## Executed validation

- `npm test`: **208 passed** (24 class draft + 184 companion; 30 new cases).
- `npm run build`: TypeScript and combined static production build passed.
- `npm run test:build`: **9 passed**, including compiled nested assets, redirects, direct links and publishing allowlist.
- `npm run test:ui`: **96 passed** (21 class draft + 75 companion; 6 new cases).
- Full companion suite repeated against compiled `/companion/`: **75 passed**. An ignored local configuration used port 5274 because another checkout already served 5174; no existing process was stopped or reused.
- New browser cases cover current relevance, full-catalogue/faction freedom, deterministic reload ordering, personal insertion levels, onward travel, repeats, Riverglades confidence/display, long-stay save/reload, unknown guidance, motif/text separation, manual states and travel labels.
- Existing suites retain route CRUD/reorder, travel recomputation, Next Up, character/profile isolation, export/import, migration, backups, observed multi-tab conflicts, touch, keyboard, reduced motion and responsive layouts. The prior unknown-range screenshot fixture now uses Moonglade because Riverglades has a range.
- WCAG AA automated checks and overflow checks pass, including desktop/mobile motif checks. Local rendered tests use installed Edge (Chromium). No human screen-reader audit or gameplay verification is claimed.
- Direct in-app-browser inspection exercised a level-35 journal, current suggestions, Riverglades 35–45, saving a personal 35–55 stay despite advisories, and suggestions following that personal exit. The four captures below were opened and visually inspected.
- `git diff --check`: passed.

## Rendered captures

Desktop viewport 1440 px; mobile 390 px. Crops retain the complete destination cards so names, personal/recommended levels, guidance, travel and actions can be assessed.

| | Route card | Browser card |
| --- | --- | --- |
| Desktop | ![Desktop route card](images/relevance-pass/desktop-route.png) | ![Desktop browser card](images/relevance-pass/desktop-browser.png) |
| Mobile | ![Mobile route card](images/relevance-pass/mobile-route.png) | ![Mobile browser card](images/relevance-pass/mobile-browser.png) |

Cloudflare preview and exact-head CI outcomes are recorded in the draft PR after publication. Production `main` and its site remain unchanged.

# Gregular companion implementation roadmap

Build in reviewable passes, each ending with a runnable artifact and acceptance evidence. Progression planning has deliberately moved ahead of the original persistence/talent sequence. Pass 2 delivers a useful personal planner with a narrow reviewed reference catalogue; broader data and shared persistence follow after their requirements are resolved.

## Pass 1 Local companion prototype

Scope: additive React, TypeScript and Vite application; local username profiles; character creation, editing, selection and removal; quest journal navigation; objectives and notes; JSON profile export; clearly labelled mock talent, dungeon and equipment treatments. Preserve the class draft, its saves, Pages settings, custom domain and archive branches.

Acceptance criteria:

- A clean install can run the documented development command and build a static review artifact.
- A new username opens an empty profile, can create a Troll Priest or another character, and can add more than three characters.
- Character edits retain a stable ID; selecting, navigating, completing objectives and reloading preserves the intended state.
- Local profiles remain isolated and username entry is clearly described as local lookup rather than secure login.
- A JSON export includes the current profile and any temporary session changes; import is clearly reserved for a later pass.
- Removal is explicit and recoverable by cancellation; invalid inputs and storage failures have useful states.
- Desktop shows three character cards across at an appropriate width; phone layouts remain usable without page overflow.
- Unit tests cover domain and persistence behavior; browser tests cover the real flows, responsive layouts and automated accessibility.
- The legacy public files and draft tests remain intact. No production deployment or merge occurs in this pass.

Review the actual test outcomes and limits in [validation.md](validation.md). Prototype acceptance does not certify game data or a fully usable talent calculator.

## Pass 2 Leveling planner

Scope: character-specific editable routes; zone, dungeon and custom objectives; level brackets; completion/skipping; deterministic Next Up; two editorial starter routes; a small source-reviewed Forever snapshot; schema-1 migration to schema 2 with original-save backup. Preserve notes, legacy objectives, draft-tool saves and conflict protection. This pass does not add a backend or a complete game guide.

Acceptance criteria:

- A level-24 Troll Priest can select a Horde starter or start blank, inspect current/upcoming plans, add a dungeon milestone and personal goal, complete an objective and see Next Up change after a level edit.
- Route entries can be edited, reordered, removed, completed and skipped with keyboard/touch controls. Restoring a template retains personal entries and existing progress.
- Each character owns its own route; switching characters, usernames and reloading preserves the correct state.
- Next Up excludes completed/skipped, unavailable, faction-incompatible and unmet-prerequisite activities from actionable recommendations; overdue high-priority goals remain discoverable and reasons explain selection.
- Earlier/later brackets and blocked/upcoming activities are inspectable without forcing every suggestion into a linear chain.
- Version-1 profiles retain character/objective IDs, notes and completion. Migration does not write on load, and failure to back up the original prevents its replacement.
- Invalid saved planner data is protected; stale tabs cannot silently overwrite known newer content. JSON export includes schema-2 routes.
- Snapshot identity, source revision and field confidence are visible. Unknown ranges/prerequisites stay unknown; editorial windows and user data remain distinct from game facts.
- Tests cover route mutations, recommendations, faction/prerequisite gates, migration, reference changes, persistence and browser flows at desktop/tablet/mobile sizes.

See [progression-data.md](progression-data.md), [leveling-demo.md](leveling-demo.md) and [validation.md](validation.md) for scope and evidence. JSON import/restore is deliberately deferred to keep this pass focused; no restore control is implied by export or the local migration backup.

## Pass 3 Recovery and progression data review

Scope: validated JSON import/restore with a replacement preview and backup; explicit recovery UX; review Forever zone ranges, faction quest coverage, dungeon entrance rules and a few class milestones. Add a reproducible importer only when a permitted source is available. Keep personal plans independent of changing catalogue records.

Acceptance criteria:

- A user can restore a valid export into a clean browser. Invalid/newer input changes nothing; replacing an existing profile is previewed and deliberate.
- Recovery preserves an existing readable profile and gives useful errors for corruption, quota limits and conflicts.
- Every new game field/relationship has Forever-specific provenance, a reviewed revision and an appropriate reuse basis.
- Imported changes produce a reviewable diff, reject broken references and identify removed records without resetting personal progress.
- No Classic Era, Season of Discovery or Retail fallback becomes a Forever fact.
- In-game/source checks validate a small useful set of route details before the templates are presented as verified guidance.

Dependency: credible data and permitted reuse. If unavailable, keep the editable planner and external references; do not fabricate catalogue coverage.

## Pass 4 Accurate talent planning

Scope: one verified class first, then expand through the same data contract. Add accessible node details, rank-aware allocation, point budgets, prerequisites, reset/undo, named saved builds and a level-by-level plan.

Acceptance criteria:

- Every displayed rank and prerequisite is traceable to the selected Forever snapshot.
- Allocation cannot exceed ranks or available points, violate tier requirements, or leave a dependent talent allocated after prerequisite removal.
- Tests include multi-rank dependencies, tier boundaries, invalid imported builds and allocation at each supported level.
- The calculator works with keyboard and touch, and details do not require hover.
- A build retains its snapshot version; data updates offer an explicit migration comparison rather than silently changing it.

Dependency: confirmed talent structure, spell/rank relationships, level rules and reuse rights. A cosmetic talent canvas alone does not meet this pass.

## Pass 5 Equipment and dungeon detail

Scope: permitted, verified items and drop sources; personal wishlists/acquisition state; dungeon quests and prerequisites; source-aware tooltips. Connect these details to existing planner entries instead of creating a parallel progression system. Introduce class-aware suggestions only where supported.

Acceptance criteria:

- Dungeon and quest records expose confirmed requirements and unresolved values distinctly.
- Every item preview identifies its edition, ID, source and snapshot, and can render without an external tooltip service.
- A user can add a wishlist item, inspect its source, mark it acquired and retain that state after a snapshot update.
- A recommendation explains why it appears and does not suggest a completed or unmet-prerequisite objective as immediately ready.
- Changes to beta content generate an auditable data diff and preserve user-authored notes.

## Pass 6 Accounts and cloud synchronization

Scope: choose a backend, implement authenticated identity, private profile authorization, explicit local-profile import, server revisions, basic conflict recovery, backups and deletion. Retain the frontend repository boundary and Pages-compatible build.

Acceptance criteria:

- An account UID is separate from a display username; entering another username never grants access.
- Server tests prove a user cannot read or change another user's private profile.
- Local import is deliberate, previews its effect, preserves stable IDs where safe and keeps a backup.
- Two-device edits either save against the expected revision or surface a recoverable conflict.
- Privacy, retention, deletion, failure handling and recovery are documented; no server credentials reach the browser bundle.

Avoid adding real-time collaboration until basic sync is dependable.

## Pass 7 Shared group planning

Scope: opt-in character sharing, group membership and invitations, level comparisons, common dungeon objectives, combined wishlists and shared session plans. Add professions after the shared planning model proves useful.

Acceptance criteria:

- Membership and permissions are enforced by the server, including revoked access.
- Character owners choose what is shared and can withdraw it.
- Group suggestions account for each participating character's completion and prerequisite state.
- Personal notes stay private unless explicitly shared.
- Shared edits use revision protection and a clear conflict experience.

## Production release gate

A prototype review does not authorize a release. Before changing the live site, obtain explicit approval for the landing route and hosting migration. Then configure one Pages build-artifact deployment, preserve `CNAME` and `.nojekyll`, test the legacy draft route and existing save namespace, verify deep links and asset paths, and check the live custom domain after deployment. Preserve the prior commit as a documented rollback point and keep archive branches untouched.

## Priorities within each pass

Resolve data truth and persistence integrity before adding breadth. Prefer one accurate class calculator or a small set of verified dungeon plans over a large unverified catalogue. Address failures and usability issues found in the first pass before expanding the number of screens. Introduce dependencies only when they solve an observed need, and keep every phase independently reviewable.

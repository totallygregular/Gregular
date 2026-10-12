# Gregular companion implementation roadmap

Build in reviewable passes. The first release decision is whether the local companion is useful and visually convincing; accurate game content and shared persistence follow only after their data and operational requirements are resolved. Each pass ends with a runnable artifact and acceptance evidence.

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

## Pass 2 Persistence hardening and validated content foundation

Scope: import and recovery UX building on the existing JSON export; schema migrations with fixtures; stronger multi-tab conflict recovery; choose initial Forever data source after permissions review; build reproducible snapshot imports and provenance views. Select a deliberately narrow content slice, such as one class and a small set of confirmed records.

Acceptance criteria:

- A user can export a profile, restore it into a clean browser, and inspect a meaningful error for invalid or newer schema data without losing an existing save.
- Two tabs cannot silently overwrite a known newer revision; the user can reload or preserve a local copy.
- Each imported dataset identifies Forever edition, build or revision, source, retrieval date, license or permission basis and transformation version.
- An importer is repeatable, rejects broken relationships and produces a reviewable diff between snapshots.
- Unsupported Forever fields remain explicitly unknown; no Classic Era or Retail fallback is used.
- Sample content and verified content are visually distinguishable at record level.

Dependency: a usable data source and permitted reuse. If unavailable, improve user-authored planning and links rather than fabricating a database.

## Pass 3 Accurate talent planning

Scope: one verified class first, then expand through the same data contract. Add accessible node details, rank-aware allocation, point budgets, prerequisites, reset/undo, named saved builds and a level-by-level plan.

Acceptance criteria:

- Every displayed rank and prerequisite is traceable to the selected Forever snapshot.
- Allocation cannot exceed ranks or available points, violate tier requirements, or leave a dependent talent allocated after prerequisite removal.
- Tests include multi-rank dependencies, tier boundaries, invalid imported builds and allocation at each supported level.
- The calculator works with keyboard and touch, and details do not require hover.
- A build retains its snapshot version; data updates offer an explicit migration comparison rather than silently changing it.

Dependency: confirmed talent structure, spell/rank relationships, level rules and reuse rights. A cosmetic talent canvas alone does not meet this pass.

## Pass 4 Progression and equipment planning

Scope: verified zones, dungeons, quests, prerequisites, items and drop sources; personal wishlists and acquisition state; class-aware milestones and explainable suggestions. Introduce editorial recommendations only where supported, with source and revision dates.

Acceptance criteria:

- Dungeon and quest records expose confirmed requirements and unresolved values distinctly.
- Every item preview identifies its edition, ID, source and snapshot, and can render without an external tooltip service.
- A user can add a wishlist item, inspect its source, mark it acquired and retain that state after a snapshot update.
- A recommendation explains why it appears and does not suggest a completed or unmet-prerequisite objective as immediately ready.
- Changes to beta content generate an auditable data diff and preserve user-authored notes.

## Pass 5 Accounts and cloud synchronization

Scope: choose a backend, implement authenticated identity, private profile authorization, explicit local-profile import, server revisions, basic conflict recovery, backups and deletion. Retain the frontend repository boundary and Pages-compatible build.

Acceptance criteria:

- An account UID is separate from a display username; entering another username never grants access.
- Server tests prove a user cannot read or change another user's private profile.
- Local import is deliberate, previews its effect, preserves stable IDs where safe and keeps a backup.
- Two-device edits either save against the expected revision or surface a recoverable conflict.
- Privacy, retention, deletion, failure handling and recovery are documented; no server credentials reach the browser bundle.

Avoid adding real-time collaboration until basic sync is dependable.

## Pass 6 Shared group planning

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

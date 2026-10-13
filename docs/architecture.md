# Gregular companion architecture

Gregular is a static React and TypeScript companion with browser-local profiles, stable character IDs and an isolated game-data layer. Pass 3 makes a visual, zone-first route builder the primary Leveling interaction, building on the planner and safe import/recovery in Passes 2 and 2.5. The class draft remains an independent application at the repository root.

## Frontend boundaries

| Boundary           | Responsibility                                                                                | Excludes                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Reusable UI        | Buttons, fields, dialogs, character treatments, cards, status and empty states                | Storage access and game-data fetching                      |
| Screens            | Profile entry, character selection and character dashboard sections                           | Direct serialization and backend assumptions               |
| Application state  | Active profile, selected character, CRUD commands, objective and note edits                   | DOM-specific behavior and imported game records            |
| Domain model       | Versioned profile records, stable IDs, validation, migrations and immutable planner mutations | React hooks and remote service details                     |
| Profile repository | Asynchronous load/save boundary, serialization, revision checks and storage failures          | Rendering and game recommendations                         |
| Game data          | Versioned zone catalogue, explicit travel graph, reviewed dungeon references and illustrative talent/item previews | User completion state and unlabelled Era or Retail fallbacks |

`companion/src/progressionTypes.ts` defines serializable planning and reference models. `planner.ts` owns validation, generic mutations and recommendations. `routeBuilder.ts` provides zone insertion, independent personal ranges, starting suggestions and derived transitions; `routeProgress.ts` derives current/upcoming and earlier unfinished stops without changing saved state. `data/zones.ts` supplies the versioned catalogue and per-field provenance; `travel.ts` owns the directed graph and weighted path policy. These modules have no React dependency. `ZoneRouteBuilder.tsx` renders the route timeline and searchable browser. `LevelingPlanner.tsx` retains Next Up and the existing objective/dungeon editor inside an expandable secondary area. All mutations pass through the existing profile save boundary; UI components never write directly to local storage.

This component and state split follows React's guidance to decompose the UI into components, keep changing state minimal and derive values such as objective counts from that state. [React component and state guidance](https://react.dev/learn/thinking-in-react).

Vite runs the companion development server on port 5173 and compiles browser assets. The existing draft server on port 4175 continues supporting its tests. A combined production build places the legacy public files at `dist/` and the companion under `dist/companion/`; generated files are not committed.

The companion uses Vite's relative `base: './'` so generated asset URLs resolve relative to their output files. This supports the nested review artifact without fixing the eventual production landing route. [Vite production build and public base paths](https://vite.dev/guide/build.html#public-base-path).

Use hash-based routes for the prototype. Routes identify a character by its stable ID and a section, never by an array index or mutable name. Unknown characters and invalid routes return a useful selection or recovery screen instead of an exception. Switching a local profile must not retain another profile's selected character or unsaved application state.

## Local identity and persistence

A username is a convenient lookup label in one browser, not authentication. The entry and profile UI must say that anyone using the same browser can open that local profile. No password, account verification, network sync or data confidentiality is implied.

The companion storage key remains `gregular:forever:profile:<encoded normalized username>`, separate from the draft's `wow-forever.class-draft.v1`. The current profile has `schemaVersion: 2`, a stable UUID, display username, normalized lookup key, revision, timestamps and an array of characters. Usernames use Unicode NFKC normalization, trimming and lowercase lookup, so case variations open the same local profile. Each character has a stable UUID independent of its name, plus editable race, class, faction, planned specialization, current level, progression status, existing objectives, notes and a personal planner. Arrays allow additional characters without schema changes; three desktop cards are a layout decision, not a capacity limit.

Persist user-entered values separately from presentation and reference data. Do not save computed card colors, rendered tooltips or duplicated item descriptions in each character. Future references should identify both a data record and its snapshot version so a beta update cannot silently change a saved plan.

The repository interface is asynchronous even when the implementation uses synchronous local storage. UI commands await a save result and surface failure. Schema validation must reject malformed or unsupported versions before mutation. A failed read must not be treated as a new empty save that can overwrite the original. A conflicting revision must stop an accidental stale-tab write and offer recovery; the local adapter is best-effort conflict protection, not a distributed transaction system.

Version-1 profiles pass through an explicit validating migration. Their profile, character and objective IDs, timestamps, revision, notes and completion values are retained; each character receives an empty planner. A deterministic planner ID makes repeated migration reads stable. Loading does not overwrite the old JSON. Before the first version-2 save, the repository retains the exact original JSON once at the profile key plus `:backup:v1`; if the backup cannot be saved, the original profile is protected from mutation. Existing raw-content and revision checks still apply before and after backup creation.

Storage may be disabled, full or cleared by the browser. An explicit visible warning is preferable to claiming a successful save. A newly created profile is saved when opened, then valid mutations are persisted. The current session remains usable after a failed save with a visible temporary-changes warning. JSON export includes schema 2, routes and the current in-memory profile, including temporary changes.

`profileTransfer.ts` validates bounded JSON input (10 MB maximum) through the same version-1 migration and version-2 validator as saved profiles. It returns a known-shape model and counts for the import preview. Unknown properties are discarded; names, notes and titles remain text rendered by React. Duplicate character, journal objective and route entry IDs are rejected within their existing lookup scopes, including UUID case variations. No schema change is needed.

`ProfileSettings.tsx` handles file selection, summary, explicit confirmation, export and recovery. Imports target the username embedded in the file, which is shown before confirmation. Another currently open username stays saved. Character, objective, route and profile IDs, creation time and supported character data are retained; revision becomes one greater than the larger source/target revision and the save timestamp is refreshed. Version-1 imports receive deterministic empty planners through the existing migration. This is deliberate replacement, not a merge.

The repository prepares an opaque, single-use token containing private validated JSON and the exact target raw content. Preparation does not write storage or silently refresh the active editing snapshot. Confirmation rechecks the target, saves its exact prior JSON at `:backup:replacement`, verifies target and backup again, then writes the imported model and updates its editing snapshot. If validation, backup, quota or conflict checks fail, the existing profile remains. Replacing unreadable target data also requires the preview warning and preserves its original JSON. The immutable `:backup:v1` migration copy remains separate.

Recovery reviews the latest replacement backup through the same confirmation path, also checking that the reviewed backup has not changed. Restoring saves the current record as the next backup, allowing reversal. The interface offers backup download; a malformed backup can be downloaded even when it cannot be restored in the app. Only one replacement backup per username is retained, so export a file for lasting recovery. A failed confirmation requires a fresh preview. Temporary in-memory changes are not included in a saved replacement backup; the UI prompts users to export them first. Browser local storage has no atomic compare-and-set primitive: these checks protect observed conflicts, not exactly simultaneous writes.

## Character and planning model

Character identity and the user's declared plan are authoritative user input. Race and class fields in the prototype support planning; they do not prove current Forever character-creation legality. The 1–60 input range is a provisional prototype bound, not a verified current beta level cap. A planned specialization is a label, not a validated build. Progression status is manually chosen from planned, leveling and paused.

Existing journal objectives keep their IDs, title, completion state and high or normal priority. Sample objectives are clearly labelled illustrative examples and added deliberately. They do not become verified recommendations. Personal notes remain plain text, rendered safely by React rather than injected as HTML.

Each character owns one editable planner with a stable ID, name, optional originating template ID, dataset version and ordered entries. Entries distinguish zones, dungeon milestones and custom objectives. They contain stable IDs, user-owned title/notes, priority, status, optional target level window, optional reference/association, explicit prerequisite entry IDs, origin and access confirmation. Entries can be planned, active, completed or skipped. The ordered array defines the player's route without implying a quest chain.

Templates copy into the character's planner with new personal entry IDs. Restoring a template adds missing template entries and retains personal entries and existing progress. It does not replace another character's route or reset completed/skipped work. Missing or changed catalogue records retain the saved personal plan for editing and review.

Next Up is derived by a pure policy from current level, saved route order/state, personal ranges, faction, travel, access and prerequisites. Reaching a personal exit level suggests a following eligible stop without completing the previous one. Overlaps use saved order and active state; gaps remain future plans. Completed/skipped stops are excluded. Earlier unfinished stops and their associated objectives appear separately from the current route recommendation. Overdue high-priority standalone objectives retain their priority. Known unavailable access and unsatisfied prerequisites block guidance. A personal catalogue zone can receive a clearly qualified route suggestion with unverified access; it is never described as verified beta eligibility. The reviewed level-30 beta cap still gates reference eligibility. Future 1–60 routes remain editable. Reasons explain every recommendation; no AI service or invented experience-gain estimates are used.

The sections remain Quest journal, Leveling, Dungeons, Talents, Equipment and Notes. Leveling is functional; the main journal derives Next Up from the same planner policy. The talent canvas, equipment and standalone dungeon previews remain illustrative. The planner's dungeon milestones are personal plans around a small factual reference catalogue, not loot tables or imported quest chains.

## Versioned game-data layer

Prefer a reviewed local snapshot over runtime scraping. Pass 3 adds a broad 1–60 zone catalogue with source publication/review dates, reported client revisions and field-specific evidence. Forever-confirmed, client-derived, Classic-derived, editorial and unknown facts are distinct. Recommended questing ranges live only in this reference layer; `PlannerEntry.targetLevel` always remains the player's independent plan. See [zone-provenance.md](zone-provenance.md) for records, licences, uncertainty and the reproducible review procedure. The existing Pass 2 snapshot remains available for legacy templates and dungeon references; `currentLevelCap: 30` retains its own source evidence. Its announced dungeon bands remain testing bands, not entry minimums.

Two legacy Horde/Alliance starter templates retain visibly editorial order and personal level windows. The primary empty route instead offers an optional race-aware starting zone, with provisional associations explicitly labelled. User-authored plans remain independent of both. Classic guidance fills selected catalogue gaps only with an explicit Classic-derived label. Unknown ranges and disconnected locations remain unknown.

## Pass 3 route compatibility and graph policy

The profile stays at schema 2 because the new route uses the existing ordered `planner.entries`: `kind: "zone"`, stable visit UUID, `recordId`, `targetLevel`, notes and status. Repeated visits have separate UUIDs. There is no destructive v2-to-v3 conversion, automatic ID reassignment or copying of recommended values into old plans. Legacy exact-name personal zones can resolve at read time; a missing explicit reference remains unresolved. Removing a visit retains its associated personal objectives. Starting blank clears only zone visits and keeps dungeon/custom entries.

PR #3 can import new exports through its existing schema-2 validator and show them as generic entries. New catalogue IDs may appear as missing references there; titles, user ranges, state and IDs still round-trip. PR #1 cannot read schema-2 exports. The existing v1 migration and exact raw backup remain unchanged; replacement imports retain reviewed confirmation, backup recovery and observed multi-tab conflict protection. Import is replacement, not a merge, so it never duplicates route entries.

Travel is recomputed from saved order on every render and insertion (both incoming and outgoing). Custom objectives do not move the character; skipped stops are bypassed. An unresolved dungeon location interrupts location knowledge. The graph never joins zones merely because they look close on a map. Deterministic shortest paths use documented relative transport weights and stable tie-breaking, not minutes or an optimal leveling claim. Unlock-dependent edges are excluded unless capabilities explicitly permit them. Capabilities are a future extension boundary; no comprehensive transport simulator is implemented. Details and weight thresholds are documented with the dataset in [zone-provenance.md](zone-provenance.md).

A later imported snapshot should also record permitted reuse, transformation version and content checksum. Keep records typed and normalized:

- Items: ID, names by locale, equipment restrictions, stats, source references and source confidence.
- Spells and talents: spell IDs, ranks, tree positions, rank effects, points requirements and explicit prerequisite edges.
- Zones, dungeons and quests: IDs, relationships, level restrictions, prerequisites and evidence for edition-specific recommendations.
- Provenance: which source supports each field or relationship, and whether it is verified, inferred or unresolved.

Edition is a required discriminator. Missing Forever records remain missing; the loader must not fill them with Classic Era or Retail records. Distinguish observed data from editorial guidance: an item drop relationship does not alone make the item a recommended reward for a particular character.

Import adapters should validate raw source exports and produce a reproducible diff before publishing a snapshot. The browser consumes only the normalized public output. Preserve old snapshots while saved builds reference them, with an explicit migration preview when ranks or prerequisites change. License and attribution review is a release gate for each source, including icons and artwork.

Use first-party tooltip rendering once licensed structured data is available. It provides predictable accessibility, edition labelling and offline behavior. External tooltip scripts are optional later integrations only after their Forever coverage, permitted use, privacy impact and fallback behavior are verified. The prototype ships no external tooltip script.

## Future cloud and group planning

Keep the profile repository contract while replacing its adapter with an authenticated service. A backend UID must be distinct from the display username and local profile ID. Provide an explicit claim/import action so a user chooses which local profile enters their account, preserving character and objective IDs where safe.

Use server-enforced ownership or row-level authorization for private profiles. Model groups, memberships, roles, invitations and shared session plans separately from personal character records. A group view reads only characters the owner has chosen to share; knowing a username grants no access. Protect writes with expected revisions or equivalent conditional updates and return conflicts to the UI. A backend must enforce this atomically; the browser-local revision check is not sufficient.

The first cloud pass should use a simple server-authoritative model with explicit conflict recovery. Planner/entry IDs and user-owned plan snapshots can migrate with the existing characters; the reviewed catalogue stays public reference data. Group/session records should reference character and objective IDs rather than absorbing personal routes. Offline queues, real-time presence, collaborative editing and automatic merges can wait until there is evidence they are needed. Define retention, account deletion, backups and recovery before presenting the service as dependable shared storage.

## Hosting and production approval

GitHub Pages is suitable for the frontend because this application can be compiled into static assets. An eventual backend can live elsewhere without changing the frontend hosting choice. No credentials belong in Vite environment variables exposed to the client bundle.

The current Pages source remains `main` `/` and the custom-domain configuration remains unchanged. The current workflow verifies but does not deploy `dist/`. GitHub supports either a branch source or a configured Actions publishing workflow; a build-artifact release requires upload and deploy steps in addition to verification. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Cloudflare Pages is a separate optional review project connected through its native GitHub integration. It builds the same combined static artifact with `npm run build`, using the root `.node-version`, and publishes `dist`. `/` still contains the class draft and `/companion/` contains the companion; hash routes support character/section refresh without server-side application routing. Build output supplies a canonical companion slash redirect and a genuine 404 page. A Cloudflare feature-branch build adds a small companion link to the root artifact without editing the original draft source. Native Cloudflare checks and GitHub's verification workflow have separate roles; neither introduces another production publishing workflow. No custom domain is attached to the review project. See [preview-setup.md](preview-setup.md) for dashboard settings, stable aliases, account authorization and limits.

Preview origins and the real site have separate local storage. Reusing a stable branch alias keeps local data through branch updates; importing a JSON export is the explicit transfer mechanism between origins. An opt-in demo JSON file is a public, fictional test fixture, never a default profile. Development/Cloudflare builds show only a short public commit, app version and dataset version; ordinary static builds hide this display. No credentials or runtime environment variables are exposed.

Moving production to the companion requires explicit approval, route selection, a single build-artifact publishing workflow, Pages source configuration and live checks of asset paths, direct navigation, the draft route and the custom domain. Preserve the existing `CNAME` file for repository compatibility, but verify the custom domain in Pages settings: GitHub documents that an existing `CNAME` file is ignored for a custom Actions deployment. No DNS change is inherently required by a frontend build migration. [GitHub Pages custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). This prototype branch does not perform that release.

## Trade-offs for this pass

Local storage is appropriate for the current planner, but browser-local data is not a cloud backup. Hash navigation is robust on Pages. Keeping the draft separate reduces migration risk. Original CSS and vector motifs avoid external artwork dependencies. The narrow reference catalogue deliberately leaves uncertain game facts unknown. Reviewed replacement and backups provide portable recovery without the complexity or ambiguity of automatic merging; broader data validation and cloud synchronization remain later work.

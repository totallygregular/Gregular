# Gregular companion architecture

The first pass is a static React and TypeScript companion with browser-local profiles, stable character IDs and an isolated game-data layer. It evaluates the product without committing to a backend provider or treating uncertain beta data as fact. The class draft remains an independent application at the repository root.

## Frontend boundaries

| Boundary | Responsibility | Excludes |
| --- | --- | --- |
| Reusable UI | Buttons, fields, dialogs, character treatments, cards, status and empty states | Storage access and game-data fetching |
| Screens | Profile entry, character selection and character dashboard sections | Direct serialization and backend assumptions |
| Application state | Active profile, selected character, CRUD commands, objective and note edits | DOM-specific behavior and imported game records |
| Domain model | Versioned profile records, stable IDs, validation and mutations | React hooks and remote service details |
| Profile repository | Asynchronous load/save boundary, serialization, revision checks and storage failures | Rendering and game recommendations |
| Game data | Explicit mock records now; versioned normalized snapshots later | User completion state and implicit Era or Retail fallbacks |

This component and state split follows React's guidance to decompose the UI into components, keep changing state minimal and derive values such as objective counts from that state. [React component and state guidance](https://react.dev/learn/thinking-in-react).

Vite runs the companion development server on port 5173 and compiles browser assets. The existing draft server on port 4175 continues supporting its tests. A combined production build places the legacy public files at `dist/` and the companion under `dist/companion/`; generated files are not committed.

The companion uses Vite's relative `base: './'` so generated asset URLs resolve relative to their output files. This supports the nested review artifact without fixing the eventual production landing route. [Vite production build and public base paths](https://vite.dev/guide/build.html#public-base-path).

Use hash-based routes for the prototype. Routes identify a character by its stable ID and a section, never by an array index or mutable name. Unknown characters and invalid routes return a useful selection or recovery screen instead of an exception. Switching a local profile must not retain another profile's selected character or unsaved application state.

## Local identity and persistence

A username is a convenient lookup label in one browser, not authentication. The entry and profile UI must say that anyone using the same browser can open that local profile. No password, account verification, network sync or data confidentiality is implied.

The companion storage key is `gregular:forever:profile:<encoded normalized username>`, separate from the draft's `wow-forever.class-draft.v1`. The profile record has `schemaVersion: 1`, a stable UUID, display username, normalized lookup key, revision, timestamps and an array of characters. Usernames use Unicode NFKC normalization, trimming and lowercase lookup, so case variations open the same local profile. Each character has a stable UUID independent of its name, plus editable race, class, faction, planned specialization, current level, progression status, objectives and notes. Objective IDs are stable too. Arrays allow additional characters without schema changes; three desktop cards are a layout decision, not a capacity limit.

Persist user-entered values separately from presentation and reference data. Do not save computed card colors, rendered tooltips or duplicated item descriptions in each character. Future references should identify both a data record and its snapshot version so a beta update cannot silently change a saved plan.

The repository interface is asynchronous even when the implementation uses synchronous local storage. UI commands await a save result and surface failure. Schema validation must reject malformed or unsupported versions before mutation. A failed read must not be treated as a new empty save that can overwrite the original. A conflicting revision must stop an accidental stale-tab write and offer recovery; the local adapter is best-effort conflict protection, not a distributed transaction system.

Storage may be disabled, full or cleared by the browser. An explicit visible warning is preferable to claiming a successful save. A newly created profile is saved when opened, then valid mutations are persisted. The current session remains usable after a failed save with a visible temporary-changes warning. JSON export is available through the footer and storage warning; import, schema migration and stronger recovery remain next-pass work. An export contains the current in-memory profile, including temporary changes, rather than a copy of unreadable protected storage.

## Character and planning model

Character identity and the user's declared plan are authoritative user input. Race and class fields in the prototype support planning; they do not prove current Forever character-creation legality. The 1–60 input range is a provisional prototype bound, not a verified current beta level cap. A planned specialization is a label, not a validated build. Progression status is manually chosen from planned, leveling and paused.

Objectives are user-owned records with an ID, title, completion state and high or normal priority. Sample objectives are clearly labelled illustrative examples and added deliberately. They must not silently become verified recommendations. Personal notes remain plain text, rendered safely by React rather than injected as HTML. Categories and structured game-record references can be introduced through a later schema migration when real content is available.

The initial sections are Quest journal, Leveling, Dungeons, Talents, Equipment and Notes. Navigation and representative interactions are real. The talent canvas and item previews demonstrate the interface only; no unverified ranks, prerequisites, item stats, rewards or dungeon level requirements are asserted.

## Versioned game-data layer

Prefer a reviewed local snapshot over runtime scraping. A future snapshot should record game edition, client build, source URLs, retrieval date, source license or permission status, transformation version and content checksum. Keep records typed and normalized:

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

The first cloud pass should use a simple server-authoritative model with explicit conflict recovery. Offline queues, real-time presence, collaborative editing and automatic merges can wait until there is evidence they are needed. Define retention, account deletion, backups and recovery before presenting the service as dependable shared storage.

## Hosting and production approval

GitHub Pages is suitable for the frontend because this application can be compiled into static assets. An eventual backend can live elsewhere without changing the frontend hosting choice. No credentials belong in Vite environment variables exposed to the client bundle.

The current Pages source remains `main` `/` and the custom-domain configuration remains unchanged. The current workflow verifies but does not deploy `dist/`. GitHub supports either a branch source or a configured Actions publishing workflow; a build-artifact release requires upload and deploy steps in addition to verification. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Moving production to the companion requires explicit approval, route selection, a single build-artifact publishing workflow, Pages source configuration and live checks of asset paths, direct navigation, the draft route and the custom domain. Preserve the existing `CNAME` file for repository compatibility, but verify the custom domain in Pages settings: GitHub documents that an existing `CNAME` file is ignored for a custom Actions deployment. No DNS change is inherently required by a frontend build migration. [GitHub Pages custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). This prototype branch does not perform that release.

## Trade-offs for this pass

Local storage is simple and appropriate for evaluation, but browser-local data is not a cloud backup. Hash navigation is robust on Pages, but less elegant than server-supported routes. Keeping the draft separate duplicates a small amount of shell styling, but sharply reduces migration risk. Original CSS and vector motifs avoid external artwork dependencies while leaving room for licensed art later. The mock-only data boundary delays content richness in exchange for an honest, maintainable beta foundation.

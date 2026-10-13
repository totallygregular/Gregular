# Gregular companion UX and design specification

Gregular should feel like a quiet place to prepare the next adventure. The interface pairs a character-selection stage with an expedition journal: dark stone surfaces, restrained aged gold, class-colored details and readable contemporary type. The prototype prioritizes character identity and the next useful action over dashboard metrics.

## Navigation and main flows

1. Enter a username to open or create a local browser profile. Explain local-only identity and persistence beside the entry field.
2. View the character selection screen. Start empty for a new profile, with a clear create-character action and optional illustrative content.
3. Create a character through a labelled form: name, reviewed Forever race, available class, optional class-specific specialisation, level, progression status and starting zone. Faction follows the selected race affiliation. The suggested race start is optional: change it to join a friend or choose a blank route. Existing imported labels remain intact until deliberately replaced.
4. Select a character to enter its journal. Keep the character's identity visible while switching Quest journal, Leveling, Dungeons, Talents, Equipment and Notes.
5. Complete or add planning objectives, edit notes, and return to the character selection screen. Saves report their actual status.
6. Edit a character without changing its identity; confirm removal with the character's name and the scope of deletion.

A persistent link exposes the preserved class draft as a secondary tool. The existing profile control returns to local username entry; Profile settings opens export, file import and previous-profile recovery. Export and Import are also available in the footer, and import is available before username entry. Group planning remains future scope.

File selection opens a separate review state showing the file's username, characters, levels and progress counts. No save occurs until the user confirms Import profile or Replace current profile. The review identifies which saved username will be replaced, promises a backup only where a saved target exists, and warns about temporary changes. Importing another username preserves the current saved profile and opens the imported one. Errors retain the current profile; a failed confirmation requires a fresh review. Recovery uses the same review/confirm flow and retains the replaced record as the next backup. Backup download is available even for unreadable original data.

The opt-in demo download uses a distinct Gregular Demo username. New profiles always start empty. A short portability note explains that JSON can move data between browsers and preview origins, while local profiles do not synchronize. Development/Cloudflare footer metadata identifies the build and dataset without altering ordinary static screens. Existing cards, roadmap, colors, typography and navigation remain intact.

## Character selection

Use three prominent character cards across the desktop content area, each wide enough for a class treatment, name, race/class, faction, level, planned specialization and progression status. Additional characters flow into subsequent rows. Avoid three empty fixed slots that could imply a permanent character cap.

Cards use original geometric class glyphs, layered CSS shapes and subtle texture instead of game portraits. Class accent color supports recognition while a text label carries the same information. The primary card action enters the journal; editing and removal are separate accessible controls. Do not nest interactive controls inside another button or link.

Hover gently lifts the card and strengthens its border; focus receives an equally visible outline. Selection uses a short transition rather than a long character reveal. New profiles have a deliberate empty state explaining what a first character unlocks, without seeding user-specific characters.

## Character dashboard

The header shows the chosen character and a clear return action. The journal area uses a calm reading hierarchy: page title, current context, then primary planning cards. Side navigation becomes a compact, horizontally scrollable navigation strip on small screens without creating page overflow.

| Section       | Prototype experience                                                                             | Future behavior                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Quest journal | Level-aware Next Up from route state and existing personal objectives                            | Broader reviewed class and travel milestones                                    |
| Leveling      | Character-owned roadmap, editable route, zone/dungeon/personal entries, status and prerequisites | More reviewed Forever records and unlocks                                       |
| Dungeons      | Fictional expedition card, preparation steps and example loot                                    | Level-aware dungeon recommendations, prerequisites and rewards                  |
| Talents       | Clearly labelled visual planning placeholder                                                     | Rank allocation, prerequisite validation, saved builds and progression timeline |
| Equipment     | Example wishlist/item treatment with explicit mock status                                        | Licensed item data, source links and acquisition tracking                       |
| Notes         | Editable personal notes; custom objectives live in the journal                                   | Richer prioritization and session planning                                      |

“Next Up” uses a deterministic planner engine. It prioritizes overdue high-priority personal tasks, active zones and eligible saved work, with a short reason per entry. It excludes completed, skipped, illustrative, inaccessible and blocked content. It shows an empty state when there is no eligible work. Reference readiness is confirmed by the player and never upgrades source confidence. Illustrative talent/item previews retain nearby mock labels.

## Leveling roadmap

The level, completion summary and Add objective action sit above route controls. Players start blank or merge a faction-specific editorial starter. Restoration adds missing starter entries while preserving existing IDs, edits, personal tasks and completed/skipped progress. Every entry is optional; route order creates no implicit quest chain.

A connected vertical list shows the current level through the next eight levels. Earlier and later groups expand with native keyboard-accessible disclosure controls; untimed tasks remain visible. Status text and distinct border/node treatments identify active, completed and skipped entries without relying on color. Up/down buttons reorder entries within each level view, without requiring dragging. Target windows determine which view contains an entry.

Each entry has a title, kind, target range, origin, status, optional notes and a concise readiness reason. Zones and dungeons can link to the reviewed catalogue; personal milestones can associate with either without becoming external records. The editor supports priority, readiness and explicit personal prerequisites. Skipping a prerequisite does not satisfy it; removing one leaves a visible review requirement.

Published beta bands, editorial windows and user targets carry different labels beside the entry. Source details are available in the editor and a compact reference disclosure. No invented quest, loot or entrance requirement fills gaps. A blank or unsupported faction route offers personal planning actions. New character forms start with blank race/class labels rather than example user data.

Dialogs preserve entered values on validation errors, support Escape and return focus. Completing a Next Up entry moves keyboard focus to another action or the panel. The roadmap wraps its controls on phones and uses the existing design tokens, with no additional animation or game artwork.

## Visual system

| Token or treatment  | Direction                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Main background     | Deep blue-green charcoal, approximately `#101718`                                                                                         |
| Surfaces            | Warm charcoal stone with gently varied values                                                                                             |
| Accent              | Muted gold, approximately `#d8b66d`, used for primary action and selected navigation                                                      |
| Text                | Warm off-white for primary copy; readable muted stone for supporting text                                                                 |
| Typography          | A restrained editorial or fantasy-influenced display treatment paired with a readable system sans-serif; no required remote font download |
| Borders and texture | Fine inset lines, low-opacity CSS grain or gradients; preserve text contrast                                                              |
| Class identity      | Consistent class accents and original glyphs, always paired with text                                                                     |
| Shape and spacing   | Detailed but restrained cards, generous internal padding, consistent spacing increments                                                   |
| Motion              | Short hover, focus and selection transitions, disabled or reduced under reduced-motion preference                                         |

Avoid oversized glowing borders, dense dashboard charts, tiny uppercase labels as body copy and decorative lore that obscures task completion. The product's personality comes from typography, composition, character treatments and the journal language.

## Responsive behavior

At wide desktop sizes, show three character cards per row and a readable journal navigation/content composition. At tablet widths, reduce to two columns where space allows. On phones, use a single column, keep the primary character action visible, let labels wrap and prevent horizontal page scrolling. Dialogs fit within the viewport with internal scrolling where needed. Form fields and action targets remain comfortable for touch input.

Use content-driven breakpoints and verify at least narrow phone, standard phone, tablet and desktop sizes. Do not hide required character fields or actions on mobile. Tooltips must also open by keyboard focus and touch or a dedicated details control; hover alone is insufficient.

## Accessibility and state behavior

Provide semantic landmarks, a skip link, logical heading order, visible focus, named navigation and labelled inputs. Mark the selected section programmatically. Completion controls expose their checked state; success and storage warnings use restrained live announcements. Native dialogs or an equivalent implementation must trap focus, support Escape and return focus to the invoking control.

Validation belongs near the relevant field and preserves entered values. A stale character route shows a recovery action. A storage failure stays visible until resolved and never claims the profile was saved. Corrupt or unsupported saves remain protected. Confirm only destructive removal; routine edits and checklist completion should remain quick.

Automated accessibility checks support the review but do not replace manual keyboard and screen-reader evaluation. Contrast must be checked for every class treatment, especially pale Priest and yellow Rogue accents against the chosen surface.

## Asset and content policy

The prototype uses original CSS and vector motifs, system fonts and no copied game artwork. Do not introduce fan art or remotely hotlinked portraits without documented permission. Future icons, illustrations and tooltip services need provenance and reuse review alongside their game-data sources. The interface is an unofficial companion and must not imply Blizzard endorsement.

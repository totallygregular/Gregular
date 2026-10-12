# Gregular companion UX and design specification

Gregular should feel like a quiet place to prepare the next adventure. The interface pairs a character-selection stage with an expedition journal: dark stone surfaces, restrained aged gold, class-colored details and readable contemporary type. The prototype prioritizes character identity and the next useful action over dashboard metrics.

## Navigation and main flows

1. Enter a username to open or create a local browser profile. Explain local-only identity and persistence beside the entry field.
2. View the character selection screen. Start empty for a new profile, with a clear create-character action and optional illustrative content.
3. Create a character through a labelled form: name, race, class, faction, planned specialization, level and progression status. Troll Priest must be straightforward to enter. The prototype does not validate current beta race/class restrictions.
4. Select a character to enter its journal. Keep the character's identity visible while switching Quest journal, Leveling, Dungeons, Talents, Equipment and Notes.
5. Complete or add planning objectives, edit notes, and return to the character selection screen. Saves report their actual status.
6. Edit a character without changing its identity; confirm removal with the character's name and the scope of deletion.

A persistent link exposes the preserved class draft as a secondary tool. A profile control allows returning to local username entry. JSON profile export is available in the footer and beside a storage warning; import and restoration are planned next. Group planning is described as future scope without an active invitation or multiplayer control.

## Character selection

Use three prominent character cards across the desktop content area, each wide enough for a class treatment, name, race/class, faction, level, planned specialization and progression status. Additional characters flow into subsequent rows. Avoid three empty fixed slots that could imply a permanent character cap.

Cards use original geometric class glyphs, layered CSS shapes and subtle texture instead of game portraits. Class accent color supports recognition while a text label carries the same information. The primary card action enters the journal; editing and removal are separate accessible controls. Do not nest interactive controls inside another button or link.

Hover gently lifts the card and strengthens its border; focus receives an equally visible outline. Selection uses a short transition rather than a long character reveal. New profiles have a deliberate empty state explaining what a first character unlocks, without seeding user-specific characters.

## Character dashboard

The header shows the chosen character and a clear return action. The journal area uses a calm reading hierarchy: page title, current context, then primary planning cards. Side navigation becomes a compact, horizontally scrollable navigation strip on small screens without creating page overflow.

| Section | Prototype experience | Future behavior |
| --- | --- | --- |
| Quest journal | Character summary and next incomplete personal objectives | Evidence-backed next activities based on progression |
| Leveling | Editable current level and illustrative milestone cards | Verified routes, milestones, unlocks and class quests |
| Dungeons | Fictional expedition card, preparation steps and example loot | Level-aware dungeon recommendations, prerequisites and rewards |
| Talents | Clearly labelled visual planning placeholder | Rank allocation, prerequisite validation, saved builds and progression timeline |
| Equipment | Example wishlist/item treatment with explicit mock status | Licensed item data, source links and acquisition tracking |
| Notes | Editable personal notes; custom objectives live in the journal | Richer prioritization and session planning |

“Next Up” is derived from the user's incomplete objectives in this pass. It must not imply a game recommendation engine. Illustrative game cards carry a nearby mock label, and mock tooltips identify their status in the tooltip itself. A single footer disclaimer is insufficient when a user encounters the card out of context.

## Visual system

| Token or treatment | Direction |
| --- | --- |
| Main background | Deep blue-green charcoal, approximately `#101718` |
| Surfaces | Warm charcoal stone with gently varied values |
| Accent | Muted gold, approximately `#d8b66d`, used for primary action and selected navigation |
| Text | Warm off-white for primary copy; readable muted stone for supporting text |
| Typography | A restrained editorial or fantasy-influenced display treatment paired with a readable system sans-serif; no required remote font download |
| Borders and texture | Fine inset lines, low-opacity CSS grain or gradients; preserve text contrast |
| Class identity | Consistent class accents and original glyphs, always paired with text |
| Shape and spacing | Detailed but restrained cards, generous internal padding, consistent spacing increments |
| Motion | Short hover, focus and selection transitions, disabled or reduced under reduced-motion preference |

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

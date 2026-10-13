# Zone-first route builder: review scenario

Use the new branch preview at `/companion/`. Profiles are browser-origin local; export before changing previews. This pass retains profile schema 2 and the existing reviewed import/replacement flow.

1. Open a local profile and create a Human Priest, Alliance, level 1. Race/class fields remain planning labels rather than a complete game-legality validator.
2. Open Leveling. The blank route offers Elwynn Forest as an optional starting suggestion. Choose **Plan Elwynn Forest**, set your entry/exit levels (for example 1–12), and add it. The recommended band and your own band are distinct.
3. Search Westfall in the Zone Browser. Its incoming transition is Easy over a sourced, provisional Classic road connection. Search Darkshore; this is Long, using a supported cross-continent ship route. Inspect the sources; this does not claim all roads are verified in Forever gameplay.
4. Add Westfall at 12–18, then Redridge Mountains at 18–24. Use the arrows to change saved order and observe travel recompute immediately. Restore the order. Use **Insert zone** to see both sides of a proposed insertion.
5. Edit your planned levels. Overlaps, gaps, repeated visits and windows beyond the recommendation are allowed. A substantially out-of-range window produces advice, not a blocked save.
6. Mark Elwynn Forest completed and Westfall current. At level 18, the dashboard suggests the following ready route stop and leaves Westfall's saved status untouched. Earlier unfinished work appears separately.
7. Reload, export JSON through Profile settings, then import in a separate browser context/origin. Compare character/route/visit IDs, notes, ranges, status and saved order.
8. Create an Orc or Troll Horde character and repeat with Durotar and The Barrens. Alliance-only suitability records are excluded by the default faction filter; **All factions** makes them browsable for intentional plans.
9. Use the full flow at desktop, tablet and mobile sizes, and with Tab/Enter/Escape. Reorder controls provide a keyboard/touch alternative to dragging. Reduced motion disables animation and smooth scrolling.

Existing objectives, generic zones and dungeon milestones remain accessible under **Objectives & dungeons**. Clearing zone visits preserves those objectives and dungeon milestones. Export a profile for a lasting copy before clearing a plan.

The browser tests automate this scenario plus empty/partial routes, independent character plans, stale-tab protection, import/export, accessibility and compiled `/companion/` paths. These checks do not establish in-game quest or transport availability.

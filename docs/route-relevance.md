# Next suggested zone ordering

The Zone Browser retains the full catalogue and compares explicit categories in
order. Filters are separate. Ranking never edits a route, personal range, saved
status, Next Up, or travel rule. It uses no randomness, AI ranking or blended
relevance score.

## What changed

The previous sort intentionally combined level distance, travel, faction and
repeat-visit penalties into one weighted cost. It also advanced the planning
point to the previous **personal exit level**. A broad or unusually long personal
stay could therefore jump the suggestions several brackets ahead. Entry-distance
and travel penalties could compete with the desired bracket progression. The
new sort makes the next bracket the first decision and compares travel within it.

## Planning context

`getSuggestionContext` reuses insertion travel's preceding and following stops.
An append uses the last non-skipped zone or dungeon stop; a middle insertion uses
its selected neighbours. Custom objectives and skipped stops do not establish a
location. Completed preceding stops retain their location. A completed following
stop does not cap the planning window.

For a preceding zone with a reviewed suitable range, the next-bracket window is
the final three integer levels of that range (`maximum − 2` through `maximum`).
The browser level is its lower bound. For example, Durotar's suitable **1–12**
range gives a **10–12** next-bracket window; a browser level of 12 gives **12–12**.
A personal **1–60** stay in that zone still gives the same next-bracket window.
The range describes relevant content, not earned XP or guaranteed coverage.

If the character or browser level exceeds that suitable range, use that level
through three levels ahead instead. This keeps a higher-level character's
suggestions useful, even when their last saved stop is an old starting zone.
With no preceding stop, use the browser level through three levels ahead. A stop
without a reviewed zone range may fall back to its explicit personal exit, while
its unresolved geography remains unknown.

A following pending stop's personal entry caps the window. Overlapping or
backwards surrounding plans show an advisory; the window never reverses and the
personal plans remain unchanged. All windows stop at 60. These small windows are
sorting conventions, not a new gameplay system or estimates of how long to stay.

At the beginning of a route, a recognised race's suggested starting zone comes
first while the browser level is inside its suitable range. This is optional;
other starting zones remain available. Already planned, completed or skipped
starts are treated as repeat options rather than promoted again.

## Comparison order

The following comparisons are lexicographic: a later comparison cannot outweigh
an earlier one.

1. **Faction fit:** known suitable audience, unverified audience, then the other
   faction. Territory is not a hard access restriction; filters can show all.
2. **Bracket group:**
   - Optional fresh race starting-zone suggestion, when applicable.
   - **Next suggested zone:** a fresh range overlapping the planning window,
     with an upper bound beyond the preceding suitable range. Its lower bound
     may be shared or earlier; a broad range can still provide onward content.
     When the browser level has passed that range, or there is no reviewed
     predecessor, it must extend beyond the planning level instead.
   - **Suitable alternative:** another fresh overlapping range that does not
     extend the upper bound. It remains usable, with limited onward progression.
   - **Later option:** a fresh suitable range beginning after the window.
   - **Repeat option:** an overlapping or later stop already planned, completed
     or skipped anywhere in this route.
   - **Earlier option:** a range ending before the window.
   - **Unknown range:** no invented suitable bounds.
3. **Bracket gap:** later options compare levels until entry; earlier options
   compare levels since exit. This keeps nearby later brackets ahead of distant
   ones. All overlapping next-bracket options have a zero gap.
4. **Travel certainty:** fewer unknown applicable travel legs first.
5. **Travel overhead:** the existing graph's relative incoming plus outgoing
   costs, with both sides included for middle insertion. A first stop has no
   incoming travel cost. These costs are not minutes or confirmed in-game access.
6. **Entry proximity:** the recommended lower bound closest to the window's start.
7. **Stable tie:** zone ID in ASCII order, independent of name, catalogue order,
   locale, repeated calls or browser session.

For a Troll route ending in Durotar, The Barrens **10–25** and Silverpine Forest
**10–18** both fit the next bracket. The existing Horde travel graph places The
Barrens first and Silverpine second. Silverpine still qualifies as a next bracket
option; its separate **Long travel** label explains the less convenient journey.
After Silverpine, The Barrens is again a next-bracket option because its upper
bound advances from 18 to 25, even though both ranges begin at 10.

## Visible guidance and limits

A bracket's fit and its travel difficulty are distinct. A long journey does not
make an otherwise suitable next bracket disappear. Unknown travel remains
explicit and never counts as easy. Other factions, repeat visits, earlier zones,
and unverified destinations all remain selectable. Every destination accepts any
valid personal planned range, including a long stay or return visit.

The browser's **Suitable now/later** badge describes its selected browser level.
The **Next suggested zone** label describes route progression near the end of the
selected predecessor's suitable range. These can differ for a future route stop.
Coverage notes remain broad editorial prompts, not quest counts or XP estimates.

The source audit and limitations are recorded in `docs/zone-range-review.md`.
Existing ranges mix provisional Classic-derived and community client-derived
facts. This ordering preserves those confidence labels and does not promote them
to official Forever level or gameplay verification.

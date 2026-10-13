# Zone suggestion relevance

The Zone Browser ranks every destination by a deterministic relative planning
cost. Filters are applied separately, and ranking never changes personal plans,
access, saved status, Next Up, or travel rules. Lower costs sort first. Ties use
the zone ID's ASCII order, independently of catalogue order and browser locale.

## Insertion context

`getSuggestionContext` uses the same before/after stops as insertion travel.
Custom objectives and skipped stops do not establish a location or a level
anchor. Completed stops still establish the preceding location; a completed
following stop does not limit future planning. Dungeon milestones retain their
personal level bounds but their unverified location keeps travel unknown.

The planning level is the greater of the browser level (initially the character
level) and the previous stop's personal exit, when present. This lets an appended
stop fit the future route rather than suggesting level-one starts. The planning
window reaches three levels ahead, capped at 60 and at the following pending
stop's personal entry. It never runs backwards when personal windows overlap.
The window is a sorting convenience, not an XP forecast or expected stay.

## Cost terms

| Consideration | Cost |
| --- | --- |
| Distance from the zone's recommended entry | 1.5 per level, capped at 18 |
| Suitable at the planning level | No extra cost |
| Suitable later | 24 + 14 per level until entry, distance term capped at 200 |
| Entry within the next three planning levels / before the following stop | Reduce later cost by 8 |
| Recommended range already passed | 48 + 16 per level past exit, distance term capped at 200 |
| Suitable range unknown | 120, without inventing a range |
| Each applicable incoming / outgoing travel leg | Easy 0, moderate 6, long 18, unknown 30; plus half the graph's relative cost, capped at 8 |
| Known faction mismatch | 160 |
| Zone or character faction unknown | 18 |
| Existing non-skipped visits | 28 per pending/active visit; 12 per completed visit; combined cap 48 |

The first stop has no incoming travel penalty because no starting location is
known. Unknown travel between established stops has a cost; it is never treated
as easy and costs more than the maximum known long leg (26). Both sides are scored in a middle insertion. Existing graph weights
represent relative overhead, never minutes or confirmed in-game access. All
terms are bounded, additive, editorial preferences rather than probabilities.

Within a suitable bracket, a fresh entry usually beats the end of an older
bracket; nearby travel can still outweigh a small level advantage. A known
current fit generally beats distant future or exhausted options. Repeat visits,
other factions and unverified destinations remain available.

## Visible fit labels

`rankZoneSuggestions` returns the full catalogue with its existing insertion
travel, a cost, concise reasons, and a fit label. Suitable current choices are
**Good next fit**. Future choices are **Later option**. Earlier ranges, repeat
visits, faction mismatch or long travel are marked as awkward with a specific
label. Missing suitable levels/faction or unknown current travel are marked
unverified. These describe the selected insertion context. The separate
**Suitable now/later** badge continues to describe the browser level, printed directly in the badge. Earlier options say **Past suitable range** so they remain distinct from the existing earlier-objectives disclosure.

These labels guide ordering and scanning only. Every destination can still be
added with any valid personal range, including a longer stay or return visit.

# Zone range and planning guidance

Pass 4.5, **13 October 2026**. `companion/src/zoneGuidance.ts` keeps three ideas separate:

- **Suitable levels** (`ZoneRecord.recommendedLevel`) describe the approximate level audience of relevant content. Field-specific source evidence remains in the catalogue. This window is not a promise that one zone provides every level within it.
- **Your plan** (`LevelRange` on a saved stop) is the player's intended entry and exit level. It remains freely editable, including plans that exceed the suitable window.
- **Planning guidance** (`getZoneGuidance`) is soft editorial advice, not measured quest coverage, expected XP, travel evidence or a validated leveling guide.

## Soft guidance model

`getZoneGuidance(zone)` returns `{ kind, label, note }`. Known suitable ranges receive “Plan alongside other stops” and a reminder that suitable levels describe relevant content rather than levels gained. Zones with a recorded starting-race association receive “Starting route segment” and a suggestion to plan a follow-up as needed. That association identifies a starting role; it does not establish how many levels the zone alone supplies.

A missing zone or missing suitable range returns `kind: "unknown"`, “Guidance unknown” and “Coverage is not established. Choose your own planned range.” Unknown information is not presented as a short stay, a long stay or a reason to reject the stop.

The current evidence does not establish per-zone XP capacity or typical stay lengths, so this pass deliberately supplies no numeric typical-stay estimate and does not claim that a broad suitable range implies extensive coverage. The wording offers planning flexibility without fabricating a duration taxonomy. All guidance objects are separate from sourced range fields and saved profile data.

## Advisory long-stay review

`longStayWarning(range, zone)` suggests reviewing a known zone's plan when **exit level minus entry level is at least 8**. For example, 10–18 crosses the threshold; 10–17 does not. Eight level gains is an intentionally simple **editorial review trigger**, not a measured typical stay, quota, recommended maximum, or fact derived from the suitable range width. It is independent of the endpoints so a later catalogue correction cannot silently change the meaning of a user's plan.

The message is: “This plan expects a long stay here. Consider another stop nearby.” It never blocks, clamps or changes a personal range. Missing guidance or an absent/malformed range produces no coverage warning; ordinary range validation remains with the existing planner. The helper is pure, deterministic and independently tested.

## Riverglades correction and provenance

The owner explicitly requested **Riverglades 35–45** in Pass 4.5. Catalogue `forever-zones-2026-10-13.2` records that range with `kind: "editorial"`, `confidence: "low"`, and source ID `gregular-editorial-2026-10-13`, pointing to this project record. It is a project planning correction, not an external research source.

The previously reviewed official material establishes the zone's identity and both-faction content, but does not establish those exact range endpoints. Those independent identity/faction fields retain their evidence; transport links, starting associations and geography are unchanged. No new official announcement, client extraction, or gameplay validation is implied. Five other zones retain unknown ranges, and no saved personal levels are migrated.

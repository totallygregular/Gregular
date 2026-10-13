# Gear Discovery route semantics

Pass 7 uses the existing zone catalogue and directed travel graph. Route search
does not create a second map, infer connections from coordinates, or edit a
character's stops, personal levels, wishlist source choice or progression.

`companion/src/gearRoute.ts` exposes a read-only route index built from a resolved
acquisition dataset and the current character. The index groups location facts
by source and classifies shared sources once. It should be rebuilt after route,
faction, travel-capability, acquisition-method or catalogue changes; results are never saved in the
profile. Item suitability and stat matches are compared before route convenience.

An optional `acquisitionMethod` intersects the method and route filters on the
same source. A quest source outside the route cannot borrow a vendor source's
on-route location. The method-scoped index omits items without that method;
unknown-method searches include unresolved source references and source-less
records. `getSourceIdsForMethod` exposes the same deterministic filtering for
single-item adapters. No copied/shadow acquisition dataset is needed.

## Location relationships

Generic `zoneId`/`zoneName` fields do not establish what happens there. An
explicit `SourceLocationRole` supplies the missing relationship. The optional
`AcquisitionSource.locationRole` is preserved by the existing schema-4 validator
and JSON transfer. Legacy sources remain valid without it. Personal records
retain user-supplied evidence, and incompatible method/role pairs are rejected.

| Source method | Can qualify for the strict route scope | Context only |
| --- | --- | --- |
| Quest | Reward turn-in | Pickup, objective |
| Dungeon | Entrance, with known access and explicit faction coverage | Dungeon region, boss location |
| Vendor | Vendor location | Unspecified zone |
| World drop | Explicit linked enemy location | Unspecified zone |
| Crafting | Recipe-learning source, material source, crafting requirement | The crafting profession by itself |

A matching reward turn-in does not imply that every quest step is in that zone.
An enemy relationship does not imply that every zone enemy drops the item.
Crafting matches identify the relevant preparation or requirement, rather than
asserting that the finished item is immediately available. Owning a profession,
learning a recipe, collecting materials, crafting and possessing gear remain
separate facts.

The field-specific `GearSourceLocation` adapter also supports evidence,
known/unknown location certainty, graph-node identity and explicit source access
requirements. It is reference metadata, separate from character state, so a
future permitted static index can supply reviewed facts without another search
implementation. Explicit personal source roles use the same adapter at read
time. Unknown or unsupported node IDs remain unknown.

## Classification and nearby bound

Only pending (`planned` or `active`), non-illustrative zone stops establish route
origins. Completed/skipped stops are excluded; custom tasks and unresolved
dungeon geography do not establish locations. Saved route order provides the
stable order among otherwise equivalent source matches.

- **On my route:** an eligible acquisition location is the same known graph
  node as a pending zone stop.
- **Nearby detour:** exactly one supported directed graph edge connects a
  pending zone stop to that location. This bound is simple to explain and
  prevents an arbitrary chain of individually short connections from becoming
  “nearby.” It describes connection count rather than distance or minutes.
- **Elsewhere:** a known eligible location has no direct or supported
  one-connection match. This says nothing about undisclosed alternative sources.
- **Location unknown:** no eligible acquisition location is known, a reference
  is missing, or required location/access/travel facts are unresolved. A known distant
  source plus an unknown alternative remains unknown at item level.

The existing `findTravel` function checks each candidate edge's faction,
connection/faction evidence, unlocks and prerequisites. Flights require both
endpoint unlocks; none are assumed discovered. Boat/zeppelin/tram detours remain
explicitly labelled, and Classic/client-derived connections retain their
provisional evidence. An ineligible or unverified edge never qualifies as a
nearby match. A direct candidate edge whose access, unlocks or connection evidence
are unresolved has unknown classification and displays “Travel uncertain,” while
retaining the known source location. It does not become “Elsewhere” simply
because the detour cannot currently be established. A supported eligible detour
from another pending stop can still establish a nearby match. No travel duration
is calculated.

Strict **My Route** includes direct matches. **My Route + Nearby** adds supported
one-connection detours. Unknowns can be included separately and remain labelled;
they never become confirmed matches. **Anywhere** retains the entire indexed
catalogue subject to the player's other filters.

## Reviewed snapshot and user fixtures

The current six-item catalogue contains no sufficiently established acquisition
locations for a strict route match. The Book of Ur's reviewed Undercity pickup
is a contextual marker only: objectives and reward turn-in remain unknown.
Undercity is the existing travel transit node. The Dalaran region/entrance
conflict remains unresolved, and the crafting records establish no recipe
learning location. Tooltip content does not change these searchable facts.

The route tests use clearly isolated fixtures for vendors, world enemies,
reward turn-ins, entrances and crafting preparation. The browser demonstration
can attach an explicitly user-supplied source role and known catalogue zone to
an item through the normal personal-source editor; this relationship remains
labelled personal and portable through profile export/import. No extra
real-looking Forever items or acquisition claims are added to the shipped data.

`getRouteWishlistSummary` considers only wanted entries and their explicitly
selected source. A direct source adds a read-only count at the corresponding
pending route stop; Overview also separates direct, nearby and unknown counts.
Alternative sources never inflate the selected-source goal count, and changing
a source or route only recomputes these views. Acquiring gear does not complete
any route, quest, dungeon or craft.

`gearRoute.test.ts` covers directed one-connection detours, known and unknown
locations, incomplete alternatives, role distinctions, source access, factions,
flights/unlocks, graph provenance, transport explanations, deterministic ties,
route edits/completion/skipping, shared-source indexing, personal source JSON
round-trips, selected-source summaries and character isolation. Method/route
intersection tests cover multiple source methods, incomplete selected sources,
unknown references, stable source selection and a 20,000-item isolated fixture
whose shared acquisition sources are classified once. The scale test checks
correctness and result reuse without imposing a machine-dependent timing limit.

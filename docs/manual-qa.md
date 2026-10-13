# Manual acceptance checks

Use a dedicated preview branch alias and a disposable profile. Saves are local to this browser and origin. Export real profiles before replacement or changing browsers/environments.

## Start with optional demo data

1. Open the current companion at `/companion/`.
2. Open **Import profile**, choose **Download demo profile**, and select the downloaded JSON with **Profile JSON**. The fixture is committed at `companion/public/demo-profile-v2.json`.
3. Review username **Gregular Demo**, character names, levels and progression counts. Confirm **Import profile**, or **Replace current profile** if that demo username already exists. Cancel first if the existing profile should be retained.

The fixture is explicit test data, with Horde and Alliance characters, different levels, notes, and completed/skipped/pending objectives. Its plans are personal test scenarios, not verified game recommendations. Importing it does not modify a differently named profile or create default characters for normal users.

## Checklist

- [ ] **Profile entry:** open a new disposable username; it starts empty. Switch usernames and return to confirm isolation. Case variations open the same normalized username.
- [ ] **Character creation:** create a Horde Troll Priest at level 24; edit its name/spec/level and select it. Confirm other characters remain unchanged.
- [ ] **Route editing:** select a starter or blank route; add an objective, edit notes/target levels, move it up/down, complete one entry, skip another, and remove an unwanted entry.
- [ ] **Next Up:** verify unfinished relevant objectives appear with reasons. Change level and verify priorities update; completed/skipped entries stay excluded. Unconfirmed reference access is not silently actionable.
- [ ] **Reload:** refresh the character's Leveling page and reopen its direct hash URL; character, route, order, notes and completion survive.
- [ ] **Export:** choose **Export profile**. Inspect or keep the JSON, including current characters, routes, IDs and notes.
- [ ] **Import:** in another browser/origin, select that JSON. Review the username and counts, cancel once, then confirm. The imported profile opens with the same supported progression.
- [ ] **Replacement:** modify the imported profile, then import its earlier export. No saved change occurs until **Replace current profile** is confirmed; **Backup created** follows successful replacement.
- [ ] **Recovery:** open **Profile settings → Restore backup**, review and confirm. Confirm the replaced data returns. **Download backup** provides a portable recovery copy.
- [ ] **Failure safety:** try malformed JSON, a newer schema version, and duplicate IDs. **Import failed** leaves the current profile intact. Canceling a valid preview also leaves it intact.
- [ ] **Multiple tabs:** prepare a replacement in one tab; change the same profile in another. Confirming the stale replacement must be rejected; reload before retrying.
- [ ] **Mobile/touch:** repeat import, route editing and navigation around 390px wide; no sideways scrolling, clipped buttons or inaccessible dialogs. Check tablet around 820px and desktop around 1440px.
- [ ] **Keyboard:** use Tab/Shift+Tab through profile actions, file input and confirmation; Escape closes dialogs and focus returns to the opener. Use Enter/Space for actions.
- [ ] **Preserved class draft:** open `/`, draft a small party, refresh; the companion and draft remain separate tools with separate save keys.

## Automated local commands

Use the Node version in `.node-version`:

```powershell
npm ci --ignore-scripts
npm run typecheck
npm test
npx playwright install chromium
npm run test:ui
npm run build
npm run test:build
$env:COMPANION_BUILT = '1'
npm run test:companion
Remove-Item Env:COMPANION_BUILT
```

On Windows, set `PLAYWRIGHT_EXECUTABLE_PATH` to installed Edge/Chrome if required, as documented in the README. Compiled checks use the combined server on port 5174 and the nested `/companion/` route. Browser tests use isolated browser contexts and do not access your normal browser's real profiles.

CI verifies code and builds; Cloudflare independently builds branch previews. Both checks should be successful before review. Browser and accessibility automation provide regression coverage; complete the checklist on the actual deployed alias after one-time Cloudflare setup.

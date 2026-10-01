# Briarwick — Matters of Little Consequence

A complete, small, authored fantasy browser adventure: one town, five revisitable places, four recurring locals (and a magpie), three interconnected jobs, three outcomes per job, an ending that reflects all three choices, and playable aftermath.

## Play and preview

```powershell
npm ci --ignore-scripts
npm run serve
```

Open `http://127.0.0.1:4174`. Take notices in the square, inspect objects at the indicated locations, and choose actions. Every job can be completed in any order. The journal records clues and past actions. Crowns, items, injury, local reactions and subsequent notices reflect your choices. Nothing is timed.

When all three jobs are finished, attend the town meeting. Afterwards you can revisit the locals, repair harmful decisions, or stay for another morning. The story has a definite first-adventure ending; it does not generate unlimited quests or accept free-text roleplay. There is no AI API, account, backend, analytics or audio.

`npm run preview:artifact` produces **`artifacts/Briarwick - Playable Preview.html`**, a self-contained offline game with the image, style, story and save system embedded. Open it in a normal browser. If file-origin storage is unsupported by that browser, the game still works and offers save export/import. The preview’s local save does not automatically transfer to the eventual published site; export and import it to continue there.

## Saving

- Versioned save key: `briarwick.story.v1`.
- Automatic local saving on every action, with a visible save-status message.
- Reload restores location, clues, belongings, jobs, outcomes, journal, coins, day and town memory.
- Blocked storage/quota failure leaves a playable in-memory session and an export route.
- Corrupt, unsupported and cross-tab-changed saves are protected from accidental overwrite.
- Import validates size/schema and asks for confirmation before replacing the current session.
- Reset requires a separate explicit confirmation; cancel preserves the story.
- Exported saves contain only adventure state. No passwords, identifiers or network tokens.

## Verification

```powershell
npm test
npx playwright install chromium
npm run test:ui
npm run build
npm run preview:artifact
```

Node tests exercise every **27 outcome combinations × 6 job orders = 162 full playthroughs**, all endings, continued play, meaningful cross-job consequences, aftercare, invalid/duplicate actions, zero-crown completion and save robustness. Browser tests play all nine individual job outcomes, the meeting and next morning, mobile play, reload, reset, import/export, blocked/corrupt storage, cross-tab protection and keyboard dialogs. Responsive QA covers 360, 390, 768 and 1440px with axe WCAG AA automated checks.

For local Windows QA, `PLAYWRIGHT_EXECUTABLE_PATH` can point at installed Edge or Chrome. CI installs Chromium. Dependencies are development-only; the actual game is plain HTML/CSS/JavaScript.

After generating the offline preview, `node scripts/check-offline.mjs` checks a full adventure, aftermath and reload using the standalone file, and asserts that it makes zero HTTP requests. It uses the same optional browser executable setting.

## Publishing proposal — not executed

This isolated branch preserves Git history and keeps the live/original Gregular checkout and the separate armory prototype unchanged. It is based on current remote `main` at `5445bcee668d68d73b7d1cf6e86aeb8853ea7b25`.

After user review and publication approval:

1. Preserve a recoverable pre-migration Git reference, review/commit this branch, and merge/push the approved replacement to `main`.
2. Keep existing GitHub Pages branch publishing from `main` `/`, existing `CNAME` (`gregular.org`) and DNS. No new credentials, servers, domains, Pages source switch or persistent access grants are needed.
3. Removal of `daily-update.yml` stops future trading updates once merged. Check for any old update run already in flight and stop it at cutover to avoid it rewriting retired data.
4. Verify the resulting Pages build, domain, paths, browser save and mobile gameplay. HTTPS currently works, but the inspected Pages setting did not enforce it; enabling enforcement can be a separately approved live setting change.

The proposed `site.yml` runs verification only. No cron, trading bot or secret is used. Publishing still occurs through the repository’s established branch-based Pages setup. `npm run build` produces an explicit public-file allowlist; the existing root-based Pages setup may also serve other public repository source files. No saved player state or credentials enter the repository or deployment.

## Artwork

The original Briarwick town illustration was created with the built-in image generation tool, then converted to an approximately 640 KB JPEG for the browser. Project asset: `assets/town.jpg`; full generated source is retained in ignored `artifacts/briarwick-town-source.png`. The final prompt is recorded in `artifacts/art-prompt.txt`. No existing game art or copyrighted characters were used as references.

# Gregular repository assessment

The existing class draft is a small, well-tested static application. The companion should be added beside it, preserving the working draft and its browser saves while the new experience is evaluated. React, TypeScript and Vite are appropriate for the larger companion, but adopting them does not by itself change the current GitHub Pages publishing source.

## Baseline inspected on 13 October 2026

The repository baseline is `main` at `c150706c80acdcb606d1ccf12da2b7c182a55b1a`. Development takes place on `codex/forever-companion-prototype`; production changes require a separate approval.

| Area | Existing implementation | Consequence |
| --- | --- | --- |
| Entry and UI | Root `index.html`, `assets/app.js`, `assets/styles.css` | Plain HTML and ES modules; no framework migration is needed for the draft. |
| Draft rules | `assets/draft.js` with defaults in `assets/defaults.js` | Isolated, tested game-independent rules should remain intact. |
| Runtime | Browser JavaScript; Node 22 or newer for development | No application server or database currently exists. |
| Dependencies | Exact-pinned Playwright and axe development dependencies | Existing browser and accessibility testing infrastructure is reusable. |
| Unit tests | Node test runner in `tests/draft.test.mjs` | Protects draft ordering, matching, randomness, persistence and interrupted operations. |
| Browser tests | Playwright `tests/ui.spec.mjs` | Protects the existing UI, saves, keyboard use, responsive layouts and automated accessibility. |
| Local server | `scripts/serve.mjs`, port 4175 | Preserve it for the unchanged draft and its browser tests. |
| Build | `scripts/build.mjs` copies a small public-file allowlist into `dist/` | Extend the build additively to include the compiled companion. |
| Hosting | GitHub Pages branch source `main`, `/`; `CNAME` is `gregular.org` | Keep DNS, custom-domain file and production publishing settings unchanged in this pass. |
| Workflow | `.github/workflows/site.yml` runs install, tests and build | Verification only: it does not upload or deploy a Pages artifact. |
| Storage | `wow-forever.class-draft.v1` in local storage | The companion needs a separate namespace and must not mutate this key. |
| Licensing | No repository-wide license was present in the inspected baseline | Publicly readable source is not automatically licensed for redistribution. Confirm intended licensing before broader reuse. |

The live root is the Party / Roll class draft. It has no accounts, cloud persistence, external game API or shared lobby. The new prototype must preserve that distinction.

## Reuse and replacement

Reuse the repository, custom domain, Pages compatibility, Node development environment, test tooling, static build discipline and accessibility expectations. Keep the draft at the root for now and expose it as a secondary tool from the companion. Its existing vanilla implementation is small enough to retain independently; wrapping or rewriting it in React would create risk without helping the companion.

Add the companion under `companion/` with a separate application entry. React provides reusable stateful UI for character management and several dashboard sections. TypeScript makes persistence records and future game-data contracts explicit. Vite produces ordinary static files compatible with Pages, and avoids a server framework that this phase does not need.

The new interface replaces neither the root draft nor its storage schema in this branch. Avoid importing draft state into character profiles: a completed random class assignment is not a character record and lacks a reliable player identity.

## Safe migration sequence

1. Review the additive prototype and documentation on the development branch. Run the old tests alongside companion tests and compare the old public files against the baseline.
2. Build one reviewable static artifact containing the unchanged draft files at `dist/` and the compiled companion at `dist/companion/`. Preserve `CNAME` and `.nojekyll` in the artifact.
3. After explicit approval, choose a production landing route and publishing method. The recommended eventual method is a single Pages Action that publishes the tested build artifact, with the root companion and draft under a stable tool route. Implement redirects and route compatibility deliberately.
4. Change the Pages source only in that approved release. A merge of Vite source files into the current `main` branch publishing source would not publish the compiled companion by magic. The present CI workflow only verifies the build.

Hash navigation in the companion avoids reliance on server rewrite rules. A direct link to the static companion entry can then reload safely on Pages. Asset base paths must be validated against whichever production route is approved; a custom domain root and a project subpath are different deployment environments.

## Preserved history and boundaries

The remote `archive/briarwick-2026-10-01` remains at `64ae5b4328296bb4fd20e83f0b9e9f3adf60216e`. Earlier archive references and unrelated projects are outside this pass. No archive is restored or deployed, no history is rewritten, and the separate local Gregular checkout is not used for development.

## Requirements for cloud persistence later

Introduce a backend identity separate from the display username, an authenticated profile service, authorization on each profile and group record, revision-aware writes, migrations and a deliberate local-save import flow. Keep API secrets on the server. Pages can continue hosting the frontend while an independently operated service stores private data. See [architecture.md](architecture.md) for the proposed boundaries and [roadmap.md](roadmap.md) for release gates.

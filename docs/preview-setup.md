# Cloudflare pull-request previews

Cloudflare Pages is a separate review environment. **gregular.org stays on GitHub Pages** with its current `main` branch, custom domain and DNS. This pass prepares the repository; no Cloudflare deployment was verified because an authenticated Cloudflare account was unavailable.

## One-time account setup

The repository owner must complete the Cloudflare account and GitHub App authorization. In **Cloudflare → Workers & Pages → Create application → Pages → Connect to Git**, choose GitHub and authorize **Cloudflare Workers & Pages** for only `totallygregular/Gregular`. Choose Git integration, rather than Direct Upload or a Workers project. [Cloudflare setup guide](https://developers.cloudflare.com/pages/get-started/git-integration/)

Use these settings:

| Setting                                          | Value                                                        |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Repository                                       | `totallygregular/Gregular`                                   |
| Project name                                     | Choose an available name identifying it as a preview project |
| Production branch                                | `main`                                                       |
| Framework preset                                 | None; enter the values below explicitly                      |
| Root directory                                   | Leave blank: repository root                                 |
| Build command                                    | `npm run build`                                              |
| Build output directory                           | `dist`                                                       |
| Build system                                     | Current v3 image                                             |
| Environment variable, **Production and Preview** | `NODE_VERSION` = `22.18.0`                                   |
| Preview branch control                           | Custom: include `*`, exclude `archive/*`                     |
| Custom domains                                   | None                                                         |
| Functions, bindings, API tokens, deploy hooks    | None needed                                                  |

Select **Save and Deploy**. The project receives its own `pages.dev` hostname; record the actual name after creation. Keep `main` as this project's production branch. Its initial build contains the existing class draft, so `/companion/` on the project's main hostname is not the feature preview. Do not attach `gregular.org` or change GitHub Pages settings.

Under project **Settings → Builds / Builds & deployments → Branch control**, apply the preview branch rules above. Excluding archive branches prevents preview builds without changing those branches. Automatic main-branch builds may be disabled after initial setup if only feature previews are wanted; this does not disable preview builds. [Branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)

The root `.node-version` pins the tested runtime. Cloudflare's documented v3 default is currently **22.16.0**, below this application's minimum; its v3 image does not infer Node from `package.json` engines. Set `NODE_VERSION` in both environments because the older open PR branches do not yet contain the version file. Keep the dashboard variable and version file aligned when updating Node. [Build image and overrides](https://developers.cloudflare.com/pages/configuration/build-image/)

## Open a PR preview

Native integration creates GitHub deployment checks and preview links for same-repository branches. No extra publishing Action or personal access token is needed. Existing GitHub Actions remain independent verification checks. A skipped Cloudflare build produces no Cloudflare check; fork PRs do not receive native previews. [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)

1. Open the PR's Cloudflare check/deployment link after a successful build.
2. On this branch and its descendants, choose **Open companion preview** at the top of the root class draft. The application is at `/companion/`.
3. In Cloudflare **Deployments → preview deployment → View build**, find its branch alias. Bookmark that alias with `/companion/` for repeat testing.

| PR                                                       | Source branch                       | Expected alias label*               |
| -------------------------------------------------------- | ----------------------------------- | ----------------------------------- |
| [#1](https://github.com/totallygregular/Gregular/pull/1) | `codex/forever-companion-prototype` | `codex-forever-companion-prototype` |
| [#2](https://github.com/totallygregular/Gregular/pull/2) | `codex/leveling-planner`            | `codex-leveling-planner`            |
| Pass 2.5                                                 | `codex/pr-previews-profile-import`  | `codex-pr-previews-profile-import`  |

*These are alias labels, not provisioned hostnames. Confirm actual aliases in deployment details. Existing PR #1/#2 builds lack the new root link; append `/companion/` to their deployment URL. The PR's base branch does not select the preview: Cloudflare builds its source branch.

Cloudflare issues an immutable `<deployment>.<project>.pages.dev` URL and updates `<branch-alias>.<project>.pages.dev` to the branch's latest successful deployment. Alias labels are lowercase with non-alphanumeric characters replaced by hyphens; avoid branch names that normalize to the same label. Use the immutable URL to review an exact commit, and the stable alias for ongoing testing. [Preview URLs and aliases](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

If an already-open PR has no deployment after setup, push the next normal change to its **source branch**. If no change is needed, an empty commit on that source branch triggers the native push integration. Do not change `main`, merge, force-push or recreate the PR. If a deployment already exists, retry that preview deployment in Cloudflare. Re-running GitHub Actions alone does not trigger Cloudflare.

## Browser storage and build checks

Local profiles belong to a browser **origin**: hostname, scheme and port. A branch alias, an immutable deployment URL, another branch, localhost and `gregular.org` have separate storage even for the same username. Paths on the same origin share storage. A stable alias keeps the origin when the branch updates; it does not synchronize profiles. Export JSON before switching environments, then import and confirm its preview in the current companion. Older PRs do not gain the new import interface until they contain this implementation.

The combined build preserves the class draft at `/`, compiles the companion into `dist/companion/`, and uses relative JavaScript, CSS and icon URLs. Hash navigation such as `/companion/#/character/<id>/leveling` survives refresh without server rewrites. A generated `_redirects` canonicalizes `/companion` to `/companion/`; a root `404.html` prevents missing paths being served as the class draft. The source `CNAME` remains intact; Cloudflare custom domains are configured in its dashboard. [Static routing](https://developers.cloudflare.com/pages/configuration/serving-pages/), [redirect rules](https://developers.cloudflare.com/pages/configuration/redirects/)

Development and Cloudflare builds display a small environment/commit/dataset label. Ordinary static builds omit the environment label. Only public build metadata is injected.

## Troubleshooting and first remote acceptance

| Symptom                      | Check                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Node engine/build failure    | Both `NODE_VERSION` values; build log should show 22.18.0, not 22.16.0                                             |
| Class draft opens            | Correct preview source branch, then `/companion/`; project main contains only the draft                            |
| Blank companion or asset 404 | Output `dist`, root left blank, trailing slash; do not use `dist/companion` as output                              |
| No preview check             | GitHub App repository access, preview branch rules, build-watch exclusions, skipped commit prefix, fork limitation |
| Old build appears            | Deployment commit, successful build status, branch alias; a failed build does not advance it                       |
| Profile appears missing      | Exact browser origin and username; import an exported JSON file                                                    |

After account setup, verify an actual feature deployment: open its branch alias `/companion/`, enter a test username, follow a character's Leveling hash link, refresh, confirm persistence, and test mobile layout. Verify `/` still runs the class draft and `gregular.org` still points to GitHub Pages. Record the real deployment URL and commit in the PR; local validation does not prove Cloudflare deployment success.

For local compiled verification, run `npm run build`, `npm run test:build`, then `npm run preview`. Run the companion browser suite with `COMPANION_BUILT=1` against `/companion/` (see [manual QA](manual-qa.md)).

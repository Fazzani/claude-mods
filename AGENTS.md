<!-- FOR AI AGENTS - Human readability is a side effect, not a goal -->
<!-- Managed by agent: keep sections and order; edit content, not structure -->
<!-- Last updated: 2026-10-05 | Last verified: 2026-10-05 -->

# AGENTS.md

A Claude Code **plugin marketplace** of mods: TypeScript plugins built on Claude Code *function hooks* (panes, status lines, transcript rendering). No package.json, no build step. The engine compiles each plugin's `hooks/*.tsx` at load time.

**Precedence:** the `AGENTS.md` closest to the files you're changing wins. This root file holds the global defaults.

## Commands

Run plugin commands from the plugin folder (`cd plugins/<name>`). The others run from the repo root.

| Task | Command | ~Time |
|------|---------|-------|
| Validate marketplace | `claude plugin validate . --strict` | 3s |
| Check versions, marketplace entries, changelogs | `node .github/scripts/check-versions.mjs origin/main` | 1s |
| Plugins changed since a ref (CI matrix) | `node .github/scripts/changed-plugins.mjs origin/main` | 1s |
| Preview releases | `node .github/scripts/release.mjs --dry-run` | 1s |
| Validate one plugin | `claude plugin validate plugins/<name> --strict` | 3s |
| Typecheck one plugin | `tsc -p .` | 5s |
| Test one plugin | `claude plugin test .` | 2s |
| Run a plugin from disk (hot reload) | `claude --plugin-dir plugins/<name>` | – |
| Refresh installed copy after push | `claude plugin marketplace update claude-mods` | 5s |
| Install a plugin | `claude plugin install <name>@claude-mods` | 5s |

`tsc` reads the plugin API from `types/claude-code.d.ts` at the root, shared by every plugin's `tsconfig.json`. Its first line names the Claude Code version that wrote it, and CI installs exactly that version. To update it, run `/plugin-types types` in a Claude Code session at the repo root and commit **only** `types/claude-code.d.ts` (the other files it writes are git-ignored because they describe your machine). Don't edit it by hand.

## Workflow

1. **Before coding**, read the plugin's `README.md` and the golden sample for the surface you're touching.
2. **After each change**, run `tsc -p .`, then `claude plugin validate . --strict`, then `claude plugin test .` in that plugin.
3. **Before committing**, every plugin you touched must pass all three, and at the root both `claude plugin validate . --strict` and `node .github/scripts/check-versions.mjs origin/main` must pass.
4. **Before claiming done**, paste the command output as evidence.
5. **Release** (a plugin's shipped files changed: anything except `tests/`, `README.md`, `CHANGELOG.md` and `tsconfig.json`):
   1. Bump `version` with semver in **both** `plugins/<name>/.claude-plugin/plugin.json` and the plugin's entry in `.claude-plugin/marketplace.json`.
   2. Add a `## [<version>] - YYYY-MM-DD` section at the top of `plugins/<name>/CHANGELOG.md` (Keep a Changelog: `### Added`, `### Changed`, `### Fixed`, `### Removed`).
   3. Push to `main`. Once CI passes, the Release workflow tags `<name>-v<version>` and publishes a GitHub release with that changelog section. Never create these tags by hand.

## File Map

```
.claude-plugin/marketplace.json     marketplace catalog: one entry per plugin (name, source, description, version, license)
plugins/<name>/
  .claude-plugin/plugin.json        manifest: name, version, description, author, license, types, userConfig
  hooks/hooks.json                  { "modules": ["./register.tsx"] } (exactly one module)
  hooks/register.tsx                hooks module: export const register: Register = (on, options) => …
  hooks/i18n.ts                     LOCALES, Locale, pickLocale (pure: no $)
  hooks/*.ts                        pure helpers (pricing, patterns)
  locales/en.ts                     source catalog: `export const en = {…}` + `export type Messages = typeof en`
  locales/fr.ts                     `export const fr: Messages = {…}`
  types/index.d.ts                  $.state contract (only if the plugin keeps state)
  tests/*.test.ts(x)                claude plugin test suites
  tsconfig.json                     include: ../../types/claude-code.d.ts, types, hooks, tests, locales
  CHANGELOG.md                      per-plugin history; one section per released version
  README.md                         user-facing doc
types/claude-code.d.ts              plugin API declarations (committed, shared, pins the CI Claude Code version)
.github/workflows/ci.yml            changes → matrix of changed plugins (validate, tsc, test) + marketplace/versions job + `CI OK` gate
.github/workflows/release.yml       after CI on main: tag + release each new plugin version
.github/scripts/*.mjs               Node helpers the workflows run (no dependencies)
LICENSE                             MIT
```

## Golden Samples

| For | Reference | Key patterns |
|-----|-----------|--------------|
| Docked pane + state + command | `plugins/tools-usage/hooks/register.tsx` | `atom`/`read`/`update`, `$.ui.open({ columns })`, `Button plain`, state-driven sort, `tool.call` wrap with `try/finally` |
| Status line + timer | `plugins/rtk-gain/hooks/register.tsx` | `$.ui.status`, resolve-once locale |
| Transcript rendering + hover reveal | `plugins/secret-mask/hooks/register.tsx` | `ui.render` per component, `next(e)` when there's nothing to change, keyed `Box` + `position="absolute"` + `hover={{ display: 'flex' }}` |
| State contract | `plugins/tools-usage/types/index.d.ts` | `declare module 'claude-code' { interface PluginState { '<plugin>': {…} } }` |
| UI tests on two surfaces | `plugins/secret-mask/tests/render.test.tsx` | `for (const surface of ['terminal', 'desktop'] as const)` + `$.ui.mount` + `find({ key })` |
| i18n | `plugins/tools-usage/locales/`, `hooks/i18n.ts`, `tests/i18n.test.ts` | typed catalogs, `pickLocale`, key-parity test |

API reference: `types/claude-code.d.ts` (grep the event or noun name). It is the only authority, because the API is early access and changes between releases.

## Hooks-module rules (the engine refuses to load modules that break them)

| Rule | Why |
|------|-----|
| Spell `$` only as `$.noun.method(...)`. Pass `$` only to functions declared **in the same file** | The validator does not follow `$` across imports. That is why `resolveLocale` lives in `register.tsx` and `i18n.ts` stays pure |
| `$.env.get('NAME')` takes a string literal | Names are read off the source |
| `ui.render` hooks never write state. Write from handlers (`onPress`) or other events | `$.state.set` is refused while drawing |
| Take elements from `$.ui.resolve(e)`. No DOM, no Node, no `require` | The module runs in an isolated environment |
| Keep drawing state in `$.state` (declared in `types/index.d.ts`), never in module variables | A hot reload resets module variables. `session.start` re-runs, so values derived there (the locale) may live in module variables |
| Streaming events (`turn.step`) use `async function*` and `return yield* next(e)` | It's the only form that loads |
| Keys of keyed `Box`es are unique within one site | A duplicate key disables hover scopes |

## i18n (mandatory)

| Rule | Detail |
|------|--------|
| No user-facing literal in `hooks/` | Every string a person reads comes from `locales/<lang>.ts`: pane text, status line, toasts, command descriptions and replies, labels. Glyphs (`●`, `⏱`), numbers, identifiers (`builtin`, `mcp`), slash-command names and internal sentinels stay in code |
| English is the source | `locales/en.ts` defines the keys. `export type Messages = typeof en` |
| Every locale is typed | `export const fr: Messages = {…}`, so a missing key fails `tsc` |
| Parameterised text is a function | `summary: (working: number, done: number) => …`. Handle plurals inside it. Never concatenate translated fragments in the view |
| Supported locales | `en`, `fr`. To add one: create `locales/<xx>.ts`, register it in `LOCALES` and in `pickLocale`'s `match` of **every** plugin, add it to `userConfig.language.options`, and update the READMEs |
| Locale resolution | The plugin's `language` option (`auto`/`en`/`fr`), then Claude Code's `language` setting, then `LC_ALL`, `LC_MESSAGES`, `LANG`, then `en`. It is resolved once in `session.start` |
| Each plugin owns its copy | Plugins install independently, so there are no cross-plugin imports. `hooks/i18n.ts` is the same in every plugin; keep the copies identical |
| Tests | `tests/i18n.test.ts` (key parity plus `pickLocale`) must stay green |
| Docs | READMEs stay in English. Model-facing text (tool descriptions, `context`) stays in English |

## Heuristics

| When | Do |
|------|-----|
| Adding a plugin | Copy the closest golden sample's layout, add `userConfig.language`, `locales/`, `hooks/i18n.ts`, `tests/` and a `CHANGELOG.md` with its first version, register it in `marketplace.json` and the root `README.md` table. CI picks it up automatically |
| CI says "changed but the version is still X" | Do the release steps above, or move the change into an unshipped file if it really ships nothing |
| Changing `.github/`, `types/` or `.claude-plugin/` | CI then checks every plugin, not only the changed ones |
| Adding a pane | `$.ui.open({ id, title: t().title, columns })` in `session.start` and in a `/command`. Size the tree to `e.props.bodyColumns` |
| Hooking a transcript component | Return `next(e)` fast when there's nothing to change. Prefer `next({ ...e, props })` over a full redraw |
| Wrapping `tool.call` / `turn.step` | Use `try/finally` so counters settle on errors and aborts |
| A value the engine doesn't give (cost, tokens) | Estimate it, mark it `≈` in the UI, and say so in the README |
| Adding a dependency | Not possible: modules can't import packages. Write a small helper in `hooks/` |
| Unsure about an API | Grep `claude-code.d.ts`. Don't guess |

## Boundaries

**Always:** run validate, tsc and test for each touched plugin. Bump both version fields together and add the CHANGELOG section in the same commit. Follow the i18n rules. Write commits as an imperative summary, end them with a `Co-Authored-By` trailer when an agent wrote them, and push to `main`.

**Ask first:** renaming a plugin or a slash command (it breaks installs and its tag series), changing the marketplace `name`, changing a `$.state` key shape, removing a locale.

**Never:** commit `.claude/types/` or the machine-specific files `/plugin-types` writes next to `types/claude-code.d.ts`, create or move `<plugin>-v*` tags by hand, rewrite a released CHANGELOG section, force-push `main`, hard-code user-facing strings, store secrets or real tokens in tests (use obvious fakes like `AKIAIOSFODNN7EXAMPLE`), make `secret-mask` send detected values anywhere.

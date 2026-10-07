# claude-mods

[![CI](https://github.com/Fazzani/claude-mods/actions/workflows/ci.yml/badge.svg)](https://github.com/Fazzani/claude-mods/actions/workflows/ci.yml)

A Claude Code plugin marketplace of **mods**: live panes, bands and status lines built on Claude Code function hooks.

## Install

```bash
claude plugin marketplace add Fazzani/claude-mods
claude plugin install subagents-monitor@claude-mods
claude plugin install secret-mask@claude-mods
claude plugin install tools-usage@claude-mods
claude plugin install rtk-gain@claude-mods
```

From a local clone:

```bash
claude plugin marketplace add D:\Work\GitHub\claude-mods
```

## Plugins

| Plugin | What it does |
| --- | --- |
| [subagents-monitor](plugins/subagents-monitor) | A side pane listing every subagent of the session: status (Working / Done / Failed), elapsed time, working time, model, effort and estimated cost. `/subagents` opens it and `/subagents clear` removes finished agents. |
| [secret-mask](plugins/secret-mask) | Masks secrets (API keys, tokens, passwords, private keys) in the transcript. Hover a masked value to reveal it. |
| [tools-usage](plugins/tools-usage) | A side pane listing the tools used (built-in, MCP, skill, agent, plugin, hook) with call counts and token consumption. `/tools-usage` opens it and `/tools-usage reset` clears the counts. |
| [rtk-gain](plugins/rtk-gain) | The tokens [RTK](https://www.rtk-ai.app) has saved, in the status line. `/rtk-gain` draws the full `rtk gain` report as a card with a gauge and per-command bars. |

## Layout

```
.claude-plugin/marketplace.json   the marketplace catalog
plugins/<name>/                   one folder per plugin
  .claude-plugin/plugin.json
  hooks/hooks.json                { "modules": ["./register.tsx"] }
  hooks/register.tsx              the hooks module: export register(on, options)
  types/index.d.ts                its $.state contract
```

## Developing a plugin

```bash
claude --plugin-dir ./plugins/subagents-monitor
```

This loads the plugin from disk and hot-reloads it on save. Before committing, check it with:

```bash
claude plugin validate ./plugins/subagents-monitor --strict
```

To type-check it and run its tests:

```bash
cd plugins/tools-usage && tsc -p . && claude plugin test .
```

The plugin API types live in `types/claude-code.d.ts`. To update them, run `/plugin-types types` in a Claude session at the repo root. CI runs the same checks on every plugin a change touches.

## Language

Every plugin's UI is available in English and French. Set it per plugin through the `language` option in `/config`. The default, `auto`, follows Claude Code's `language` setting and then `LC_ALL`, `LC_MESSAGES` or `LANG`.

## Versions

Each plugin has its own version, its own `CHANGELOG.md` and its own release tags (`<plugin>-v<version>`), because plugins install separately. See [Releases](https://github.com/Fazzani/claude-mods/releases).

## Contributing

See [AGENTS.md](AGENTS.md) for the conventions: layout, checks, i18n and releases.

## License

[MIT](LICENSE)

# Changelog

All notable changes to `subagents-monitor` are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). Each version is released as the tag `subagents-monitor-v<version>`.

## [0.2.0] - 2026-10-05

### Added
- English and French UI, with a `language` option (`auto`, `en` or `fr`). `auto` follows Claude Code's `language` setting, then `LC_ALL`, `LC_MESSAGES` or `LANG`.

## [0.1.0] - 2026-10-05

### Added
- A side pane with one card per subagent: status, elapsed time, working time, model, effort, tokens and estimated cost. Nested subagents are indented under their parent.
- A status line summary: working and done counts, with the estimated subagent cost next to the session's actual cost.
- The `/subagents` command (`/subagents clear` removes finished agents).

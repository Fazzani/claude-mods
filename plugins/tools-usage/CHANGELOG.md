# Changelog

All notable changes to `tools-usage` are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). Each version is released as the tag `tools-usage-v<version>`.

## [0.2.0] - 2026-10-05

### Added
- English and French UI, with a `language` option (`auto`, `en` or `fr`). `auto` follows Claude Code's `language` setting, then `LC_ALL`, `LC_MESSAGES` or `LANG`.

## [0.1.0] - 2026-10-05

### Added
- A side pane listing every tool used in the session, by kind: builtin, MCP, skill, agent, plugin and hook.
- For each tool: calls, errors, estimated tokens for arguments (↑), results (↓) and schema (⌂), plus a breakdown bar by kind.
- Sorting by tokens, calls or name, and the `/tools-usage` command (`/tools-usage reset` clears the counts).

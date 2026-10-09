# logstrip-gain

Read-only LogStrip statistics display for Claude Code. Based on `rtk-gain` and the official [LogStrip](https://mrwogu.github.io/logstrip/) CLI telemetry.

## Install

```bash
npm install -g logstrip
claude plugin marketplace add Fazzani/claude-mods
claude plugin install logstrip-gain@claude-mods
```

## Statistics

| Surface | Behaviour |
| --- | --- |
| Status line | Estimated LogStrip tokens saved, cumulative savings percentage, total CLI runs |
| `/logstrip-gain` | A card with gauge, totals, last execution and up to five recent runs |

The plugin reads `logstrip --telemetry`. LogStrip stores cumulative statistics in `~/.logstrip/telemetry.json` (or `LOGSTRIP_TELEMETRY_DIR`). These figures include LogStrip invocations from Codex or other local programs. Token savings are LogStrip estimates, **not measured model billing savings**.

The status refreshes on session start and after Bash or PowerShell tool calls. If LogStrip is missing, the status remains blank, and `/logstrip-gain` displays installation guidance.

**This mod only displays statistics. It does not compress logs, alter tool output, inject context, install packages, or send telemetry elsewhere.**

Language: `auto` (default), `en`, or `fr` through `/config`.

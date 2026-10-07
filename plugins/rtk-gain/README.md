# rtk-gain

Shows the tokens [RTK](https://www.rtk-ai.app) has saved, inside Claude Code.

```
RTK: 10.2K tokens saved (23.0%, 66 cmds)

╭──────────────────────────────────────────────────────────╮
│ ⚡ RTK token savings                                     │
│                                                          │
│ 10.2K saved  ██████░░░░░░░░░░░░░░░░░░  23.0%             │
│ 66 commands · 44.3K in → 34.1K out · 8.2s (avg 124ms)    │
│                                                          │
│ Command                     Saved         Runs   Rate    │
│ rtk grep                    ████████ 8.4K ×19    31.9%   │
│ rtk read                    ░░░░░░░░ 426  ×8     6.1%    │
╰──────────────────────────────────────────────────────────╯
```

## What it does

| Where | Behaviour |
| --- | --- |
| Status line | Totals from `rtk gain -f json`, refreshed at session start and after each Bash command (RTK only counts shell commands) |
| `/rtk-gain` | Runs `rtk gain` and draws it as a card: total saved with a gauge, totals, and the per-command table with bars scaled to the top command and rates colored green (≥ 50 %), yellow (≥ 20 %) or gray |

The transcript keeps the raw `rtk gain` text, which is what the model reads. If the report's layout isn't recognised, the raw text is shown instead of the card.

## Requirements

`rtk` on the `PATH`. Without it the status line stays empty and `/rtk-gain` reports the error.

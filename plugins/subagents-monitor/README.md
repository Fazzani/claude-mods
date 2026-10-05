# subagents-monitor

A side pane, docked to the right of the transcript, showing every subagent of the current Claude Code session as a live card:

```
◆ Subagents                         ◐ 2 ✓ 3
──────────────────────────────────────────
╭────────────────────────────────────────╮
│ ◐ Explore auth flow           WORKING  │
│ Explore · sonnet 5.5 · medium          │
│ ▰▰▰▰▰▰▱▱▱▱            ⏱ 01:42 ⚡ 00:58 │
│ 312k tok                        ≈$0.08 │
╰────────────────────────────────────────╯
```

| Field | Source |
| --- | --- |
| Status | `turn.complete` of the agent's loop (Done / Aborted / Failed), reconciled with `$.agent.list()` (Failed / Killed) |
| ⏱ Elapsed | Wall-clock time from spawn to end, live while the agent is working |
| ⚡ Working | Time spent in model requests and tool runs, with overlapping work counted once |
| Model, effort | Each `turn.step` of the agent's loop |
| Cost | Token usage of each step multiplied by list prices (`hooks/pricing.ts`). This is an estimate; the footer shows the session's actual total. |

The status line shows `⚙ 2 working · 3 done · ≈$0.41 / $1.20`.

## Commands

- `/subagents`: open the pane
- `/subagents clear`: remove finished subagents from the pane

The pane docks beside the transcript in the terminal's fullscreen layout (110+ columns) and in the desktop app; on a narrower terminal it opens above the prompt.

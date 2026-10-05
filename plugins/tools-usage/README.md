# tools-usage

A side pane listing every tool the session used, grouped by kind, with calls and token consumption.

```
◆ Tools                       42 calls · ≈118k tok
████████████████▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▆▆▆▆▆▆▅▅▅▅
■ builtin 61k  ■ mcp 38k  ■ skill 12k  ■ hook 7k
Sort tokens calls name
────────────────────────────────────────────────
● Read                           builtin  14×   31k
  ▰▰▰▰▰▰▰▰▰▰                       ↑1.2k ↓30k ⌂2.1k
● search_code github                 mcp   6×   22k
  ▰▰▰▰▰▰▰▱▱▱                        ↑0.4k ↓21k ⌂0.6k
```

| Kind | What it counts |
| --- | --- |
| `builtin` | Claude Code's own tools (Bash, Read, Edit, …) |
| `mcp` | `mcp__<server>__<tool>`, labelled with the server |
| `skill` | Each skill invoked through the Skill tool |
| `agent` | Each subagent type launched through the Agent tool |
| `plugin` | Tools a plugin registered |
| `hook` | Context that settings hooks injected into the conversation, per hook event |

- **↑** the arguments the model wrote (output tokens)
- **↓** the result the model read back (input tokens)
- **⌂** the tool's description, which is sent with every request

Token counts are estimates (about 4 characters per token). Subagents' tool calls are included.

Commands: `/tools-usage` opens the pane, `/tools-usage reset` clears the counts.

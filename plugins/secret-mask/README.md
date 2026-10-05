# secret-mask

Masks secrets in the Claude Code transcript. Hover a masked value with the mouse to reveal it.

```
● Your key is sk-a••••••••      ← hover → sk-ant-api03-AbCd…
```

## What is detected

Private key blocks, Anthropic / OpenAI / GitHub / GitLab / Slack / Google / Stripe / npm tokens, AWS access keys and secret keys, JWTs, Azure `AccountKey=` / `SharedAccessKey=` / `sig=`, passwords in URLs (`postgres://user:pass@host`), `Bearer` tokens, and generic assignments (`password=…`, `api_key: …`, `client_secret=…`). References and placeholders (`${TOKEN}`, `<key>`, `process.env.X`, `xxxx`) are left alone. The rules live in [hooks/patterns.ts](hooks/patterns.ts).

## Where

| Row | Behaviour |
| --- | --- |
| Assistant replies, your prompts | Masked, with hover reveal (a reply that contains a secret is drawn as plain text, not markdown) |
| Bash output and other text results | Masked, with hover reveal (first 12 lines; ctrl+o shows the rest) |
| Tool call arguments, structured results, messages from other agents | Masked, no reveal |

Masking only changes what the screen shows. The model and the transcript file still see the real values.

Hover needs a surface that reports the pointer: the desktop app, or the terminal's fullscreen layout.

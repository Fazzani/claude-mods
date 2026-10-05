# Changelog

All notable changes to `secret-mask` are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). Each version is released as the tag `secret-mask-v<version>`.

## [0.2.0] - 2026-10-05

### Added
- English and French UI, with a `language` option (`auto`, `en` or `fr`). `auto` follows Claude Code's `language` setting, then `LC_ALL`, `LC_MESSAGES` or `LANG`.

## [0.1.0] - 2026-10-05

### Added
- Masks secrets in assistant replies, your prompts and Bash output. Hover a masked value to reveal it.
- Masks secrets in tool arguments and structured results, without a reveal.
- Detection rules for private keys; Anthropic, OpenAI, GitHub, GitLab, Slack, Google, Stripe and npm tokens; AWS keys; JWTs; Azure connection strings; URL passwords; bearer tokens; and generic `password=` / `api_key:` assignments.

export type SecretRange = { start: number; end: number; kind: string }

/** `group` names the capture holding the secret; without it the whole match is the secret. */
type Rule = { kind: string; pattern: RegExp; group?: number }

const RULES: Rule[] = [
  {
    kind: 'private key',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  { kind: 'anthropic', pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: 'openai', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { kind: 'github', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/g },
  { kind: 'gitlab', pattern: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { kind: 'aws key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: 'aws secret', pattern: /aws_secret_access_key["']?\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})/gi, group: 1 },
  { kind: 'slack', pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g },
  { kind: 'google', pattern: /\bAIza[0-9A-Za-z_-]{35}/g },
  { kind: 'stripe', pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { kind: 'npm', pattern: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { kind: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { kind: 'azure', pattern: /\b(?:AccountKey|SharedAccessKey|sig)=([A-Za-z0-9%/+=]{20,})/g, group: 1 },
  { kind: 'url password', pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:([^\s@/]{3,})@/gi, group: 1 },
  { kind: 'bearer', pattern: /\bBearer\s+([A-Za-z0-9._~+/-]{20,}=*)/g, group: 1 },
  {
    kind: 'secret',
    pattern:
      /\b[\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|client[_-]?secret|private[_-]?key)[\w.-]*["']?\s*[:=]\s*["']?([^\s"'`,;)}\]]{8,})/gi,
    group: 1,
  },
]

/** Values the generic rule catches that are not secrets: references, placeholders, masks. */
const PLACEHOLDER = /^(?:\$\{?|<|%|\{\{|process\.env|env\.|os\.environ|getenv|x{4,}|\*{3,}|•|\.{3}|null|undefined|true|false|none|changeme|your[_-])/i

export function findSecrets(text: string): SecretRange[] {
  const found: SecretRange[] = []

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0
    for (const match of text.matchAll(rule.pattern)) {
      const whole = match[0]
      const value = rule.group === undefined ? whole : match[rule.group]
      if (!value || (rule.group !== undefined && PLACEHOLDER.test(value))) {
        continue
      }
      const start = (match.index ?? 0) + (rule.group === undefined ? 0 : whole.lastIndexOf(value))
      found.push({ start, end: start + value.length, kind: rule.kind })
    }
  }

  found.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: SecretRange[] = []
  for (const range of found) {
    const last = merged[merged.length - 1]
    if (last && range.start < last.end) {
      last.end = Math.max(last.end, range.end)
    } else {
      merged.push({ ...range })
    }
  }

  return merged
}

/** What a secret shows as: a short hint of its start, then dots. */
export function maskOf(value: string): string {
  const hint = value.length >= 16 && !value.startsWith('-----') ? value.slice(0, 4) : ''

  return `${hint}••••••••`
}

export function maskText(text: string): string {
  const ranges = findSecrets(text)
  let out = ''
  let at = 0
  for (const range of ranges) {
    out += text.slice(at, range.start) + maskOf(text.slice(range.start, range.end))
    at = range.end
  }

  return out + text.slice(at)
}

/** Every string inside a value masked, its shape kept. */
export function maskDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return maskText(value) as T
  }
  if (Array.isArray(value)) {
    return value.map(item => maskDeep(item)) as T
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskDeep(item)])) as T
  }

  return value
}

export function hasSecretDeep(value: unknown): boolean {
  if (typeof value === 'string') {
    return findSecrets(value).length > 0
  }
  if (Array.isArray(value)) {
    return value.some(hasSecretDeep)
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasSecretDeep)
  }

  return false
}

export type Segment = { text: string; secret?: string; kind?: string }

/** The text cut into lines, each a run of plain and secret segments. */
export function segmentLines(text: string): Segment[][] {
  const ranges = findSecrets(text)
  const segments: Segment[] = []
  let at = 0
  for (const range of ranges) {
    if (range.start > at) {
      segments.push({ text: text.slice(at, range.start) })
    }
    const value = text.slice(range.start, range.end)
    segments.push({ text: maskOf(value), secret: value, kind: range.kind })
    at = range.end
  }
  if (at < text.length) {
    segments.push({ text: text.slice(at) })
  }

  const lines: Segment[][] = [[]]
  for (const segment of segments) {
    if (segment.secret !== undefined) {
      // A multi-line secret (a private key) stays one mark; its reveal shows the first line.
      lines[lines.length - 1]?.push(segment)
      continue
    }
    const parts = segment.text.split('\n')
    parts.forEach((part, index) => {
      if (index > 0) {
        lines.push([])
      }
      if (part) {
        lines[lines.length - 1]?.push({ text: part })
      }
    })
  }

  return lines
}

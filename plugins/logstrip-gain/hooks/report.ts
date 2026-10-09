export type RecentRun = { timestamp: string; saved: number; percent: number }
export type Telemetry = {
  runs: number
  input: number
  output: number
  saved: number
  percent: number
  lastRun: string
  recent: RecentRun[]
}

/** Parse the --telemetry report that LogStrip writes to stderr. */
export function parseTelemetry(text: string): Telemetry | undefined {
  const parseInteger = (value: string): number | undefined => {
    const digits = value.replace(/[^0-9]/g, '')
    if (!digits) return undefined
    const n = Number(digits)
    return Number.isSafeInteger(n) ? n : undefined
  }

  function field(name: string): number | undefined {
    const match = text.match(new RegExp('^[ \\t]*' + name + '[ \\t]*:[ \\t]*([0-9][0-9,. \\t\\u00a0\\u202f]*)[ \\t]*$', 'mi'))
    return match?.[1] ? parseInteger(match[1]) : undefined
  }

  const runs = field('total runs')
  const input = field('input tokens')
  const output = field('output tokens')
  const saved = field('saved tokens')
  if (runs === undefined || input === undefined || output === undefined || saved === undefined) {
    return undefined
  }

  const lastRun = text.match(/^[ \t]*last run[ \t]*:[ \t]*(\S.*?)[ \t]*$/mi)?.[1] ?? ''
  const recent = [...text.matchAll(
    /^[ \t]*(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)[ \t]+saved=([0-9][0-9,. \u00a0\u202f]*)[ \t]+\((\d+(?:\.\d+)?)%\)[ \t]*$/gm,
  )].slice(0, 5).flatMap(([, timestamp, amount, rate]) => {
    const saved = parseInteger(amount ?? '')
    const percent = Number(rate)
    return saved === undefined || !Number.isFinite(percent) || timestamp === undefined
      ? []
      : [{ timestamp, saved, percent }]
  })

  return {
    runs, input, output, saved,
    percent: input > 0 ? Math.min(100, (saved / input) * 100) : 0,
    lastRun, recent,
  }
}

export function compact(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

export function bar(percent: number, width: number): readonly [string, string] {
  const filled = Math.max(0, Math.min(width, Math.round(percent / 100 * width)))
  return ['█'.repeat(filled), '░'.repeat(width - filled)]
}

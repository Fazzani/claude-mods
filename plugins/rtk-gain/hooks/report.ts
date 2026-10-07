/** What the status line shows, read from `rtk gain -f json`. */
export type Summary = { saved: string; pct: string; commands: number }

type Row = { name: string; count: string; saved: string; pct: number }

/** What the `/rtk-gain` card shows, read from the text report of `rtk gain`. */
export type Report = {
  commands: string
  input: string
  output: string
  saved: string
  pct: number
  time: string
  avg: string
  rows: Row[]
}

type GainJson = { summary: { total_commands: number; total_saved: number; avg_savings_pct: number } }

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))

export function parseSummary(json: string): Summary {
  const { summary } = JSON.parse(json) as GainJson

  return {
    saved: compact(summary.total_saved),
    pct: summary.avg_savings_pct.toFixed(1),
    commands: summary.total_commands,
  }
}

/**
 * Parses the text report of `rtk gain`; the JSON format has no per-command
 * table. Returns undefined when the layout is not recognised, so the caller
 * can fall back to the raw text.
 */
export function parseReport(text: string): Report | undefined {
  const pick = (re: RegExp) => text.match(re)?.slice(1)
  const commands = pick(/Total commands:\s+(\S+)/)
  const input = pick(/Input tokens:\s+(\S+)/)
  const output = pick(/Output tokens:\s+(\S+)/)
  const saved = pick(/Tokens saved:\s+(\S+)\s+\(([\d.]+)%\)/)
  const time = pick(/Total exec time:\s+(\S+)\s+\(avg (\S+)\)/)
  if (!commands || !input || !output || !saved || !time) {
    return undefined
  }

  const rows = [...text.matchAll(/^[ \t]*\d+\.[ \t]+(.+?)[ \t]{2,}(\d+)[ \t]+(\S+)[ \t]+([\d.]+)%/gm)].map(
    ([, name = '', count = '', tokens = '', pct = '0']) => ({ name, count, saved: tokens, pct: Number(pct) }),
  )

  return {
    commands: commands[0] ?? '',
    input: input[0] ?? '',
    output: output[0] ?? '',
    saved: saved[0] ?? '',
    pct: Number(saved[1]),
    time: time[0] ?? '',
    avg: time[1] ?? '',
    rows,
  }
}

/** "8.4K" → 8400, so rows can be scaled against each other. */
export const tokens = (s: string) => parseFloat(s) * (/M$/.test(s) ? 1e6 : /K$/.test(s) ? 1e3 : 1)

/** A bar of `width` cells, split into its filled and empty parts. */
export function bar(ratio: number, width: number): readonly [string, string] {
  const full = Math.round(Math.min(1, Math.max(0, ratio)) * width)

  return ['█'.repeat(full), '░'.repeat(width - full)]
}

export const rateColor = (pct: number) => (pct >= 50 ? 'green' : pct >= 20 ? 'yellow' : 'gray')

import type { AgentTokens } from '../types'

/** USD per million tokens: input, output, cache read. Cache writes bill at 1.25x input. */
type Price = { input: number; output: number; cacheRead: number }

// Anthropic first-party list prices (cached 2026-09-25). First match wins.
const PRICES: [RegExp, Price][] = [
  [/fable-5|mythos-5/, { input: 10, output: 50, cacheRead: 0.25 }],
  [/opus-5-5/, { input: 4, output: 20, cacheRead: 0.2 }],
  [/opus-(5|4-[5-8])/, { input: 5, output: 25, cacheRead: 0.5 }],
  [/opus/, { input: 15, output: 75, cacheRead: 1.5 }],
  [/sonnet-5/, { input: 2, output: 10, cacheRead: 0.2 }],
  [/sonnet/, { input: 3, output: 15, cacheRead: 0.3 }],
  [/haiku-4/, { input: 1, output: 5, cacheRead: 0.1 }],
  [/haiku/, { input: 0.8, output: 4, cacheRead: 0.08 }],
]

const FALLBACK: Price = { input: 4, output: 20, cacheRead: 0.2 }

export function priceOf(model: string | null): Price {
  const id = (model ?? '').toLowerCase()

  return PRICES.find(([pattern]) => pattern.test(id))?.[1] ?? FALLBACK
}

export function costOf(model: string | null, tokens: AgentTokens): number {
  const price = priceOf(model)

  return (
    (tokens.input * price.input +
      tokens.output * price.output +
      tokens.cacheRead * price.cacheRead +
      tokens.cacheWrite * price.input * 1.25) /
    1_000_000
  )
}

/** `claude-sonnet-5-5` → `sonnet 5.5`; anything else is shown as given. */
export function shortModel(model: string | null): string {
  if (!model) {
    return '—'
  }
  const match = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d))?/.exec(model)

  return match ? `${match[1]} ${match[2]}${match[3] ? `.${match[3]}` : ''}` : model
}

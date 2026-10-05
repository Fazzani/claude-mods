export type AgentStatus = 'working' | 'done' | 'aborted' | 'failed' | 'killed'

export type AgentTokens = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type AgentRow = {
  /** The id `$.agent.list()` and every event of its loop carry. */
  id: string
  description: string
  type: string
  parentId: string | null
  isBackground: boolean
  status: AgentStatus
  /** Last model that answered (or was asked), short form. */
  model: string | null
  effort: string | null
  startedAt: number
  endedAt: number | null
  /** Time spent in model requests and tool runs, overlaps counted once. */
  workingMs: number
  /** Model requests and tool runs in flight right now. */
  inFlight: number
  /** When `inFlight` last went from 0 to 1; null while idle. */
  activeSince: number | null
  tokens: AgentTokens
  /** Estimated from `tokens` and list prices. */
  costUsd: number
}

declare module 'claude-code' {
  interface PluginState {
    'subagents-monitor': {
      agents: AgentRow[]
      /** Wall clock the pane last ticked at, so live timers redraw. */
      now: number
      /** Real session total from the cost ledger. */
      sessionUsd: number | null
    }
  }
}

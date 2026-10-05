import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow, AgentStatus, AgentTokens } from '../types'
import { costOf, shortModel } from './pricing'

const PANE = 'subagents'
const TITLE = 'Subagents'
const PANE_COLUMNS = 54

const agents = atom({ plugin: 'subagents-monitor', key: 'agents' } as const, [])
const now = atom({ plugin: 'subagents-monitor', key: 'now' } as const, 0)
const sessionUsd = atom({ plugin: 'subagents-monitor', key: 'sessionUsd' } as const, null)

const COLORS: Record<AgentStatus, string> = {
  working: '#58A6FF',
  done: '#3FB950',
  aborted: '#D29922',
  failed: '#F85149',
  killed: '#F85149',
}
const GLYPHS: Record<AgentStatus, string> = {
  working: '●',
  done: '✓',
  aborted: '◌',
  failed: '✗',
  killed: '✗',
}
const LABELS: Record<AgentStatus, string> = {
  working: 'WORKING',
  done: 'DONE',
  aborted: 'ABORTED',
  failed: 'FAILED',
  killed: 'KILLED',
}
const ACCENT = '#D97757'
const SPINNER = ['◐', '◓', '◑', '◒']

const ZERO: AgentTokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

function blankRow(id: string, at: number): AgentRow {
  return {
    id,
    description: 'subagent',
    type: 'agent',
    parentId: null,
    isBackground: false,
    status: 'working',
    model: null,
    effort: null,
    startedAt: at,
    endedAt: null,
    workingMs: 0,
    inFlight: 0,
    activeSince: null,
    tokens: ZERO,
    costUsd: 0,
  }
}

async function patch(
  $: EngineInterface,
  id: string,
  fn: (row: AgentRow, at: number) => AgentRow,
): Promise<void> {
  const at = await $.clock.now()
  await update($, agents, list => {
    const rows = list ?? []
    const known = rows.some(row => row.id === id)
    const next = known ? rows : [...rows, blankRow(id, at)]

    return next.map(row => (row.id === id ? fn(row, at) : row)).slice(-100)
  })
}

/** A model request or tool run of the agent starts: it is working again. */
function begin(row: AgentRow, at: number): AgentRow {
  return {
    ...row,
    status: 'working',
    endedAt: null,
    inFlight: row.inFlight + 1,
    activeSince: row.inFlight === 0 ? at : row.activeSince,
  }
}

function end(row: AgentRow, at: number): AgentRow {
  const inFlight = Math.max(0, row.inFlight - 1)
  if (inFlight > 0 || row.activeSince === null) {
    return { ...row, inFlight }
  }

  return { ...row, inFlight, activeSince: null, workingMs: row.workingMs + (at - row.activeSince) }
}

function finish(row: AgentRow, at: number, status: AgentStatus): AgentRow {
  const working = row.activeSince === null ? row.workingMs : row.workingMs + (at - row.activeSince)

  return { ...row, status, endedAt: row.endedAt ?? at, inFlight: 0, activeSince: null, workingMs: working }
}

function elapsedOf(row: AgentRow, at: number): number {
  return Math.max(0, (row.endedAt ?? at) - row.startedAt)
}

function workingOf(row: AgentRow, at: number): number {
  return row.workingMs + (row.activeSince === null ? 0 : Math.max(0, at - row.activeSince))
}

function clock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function usd(value: number): string {
  if (value === 0) {
    return '$0'
  }

  return value < 0.01 ? '<$0.01' : `$${value.toFixed(2)}`
}

function tokens(t: AgentTokens): string {
  const total = t.input + t.output + t.cacheRead + t.cacheWrite

  return total >= 1_000_000
    ? `${(total / 1_000_000).toFixed(1)}M`
    : total >= 1000
      ? `${Math.round(total / 1000)}k`
      : String(total)
}

function bar(ratio: number, cells: number): [string, string] {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * cells)

  return ['▰'.repeat(filled), '▱'.repeat(cells - filled)]
}

function depthOf(row: AgentRow, byId: Map<string, AgentRow>): number {
  let depth = 0
  let parent = row.parentId
  while (parent && byId.has(parent) && depth < 4) {
    depth += 1
    parent = byId.get(parent)?.parentId ?? null
  }

  return depth
}

function summary(list: AgentRow[], total: number | null): string | undefined {
  if (list.length === 0) {
    return undefined
  }
  const working = list.filter(row => row.status === 'working').length
  const done = list.length - working
  const cost = list.reduce((sum, row) => sum + row.costUsd, 0)

  return `⚙ ${working} working · ${done} done · ≈${usd(cost)}${total === null ? '' : ` / ${usd(total)}`}`
}

const STATUSES: Record<string, AgentStatus> = {
  completed: 'done',
  failed: 'failed',
  killed: 'killed',
  stopped: 'killed',
  cancelled: 'killed',
}

/** Once a second: advance live timers, reconcile with the engine's list, refresh the status line. */
async function tick($: EngineInterface): Promise<void> {
  const at = await $.clock.now()
  const list = (await read($, agents)) ?? []
  const isAnyWorking = list.some(row => row.status === 'working')

  if (isAnyWorking) {
    await update($, now, () => at)
    const engine = await $.agent.list()
    const byId = new Map(engine.map(info => [info.id, info]))
    await update($, agents, rows =>
      (rows ?? []).map(row => {
        const info = byId.get(row.id)
        if (!info) {
          return row
        }
        const named = row.description === 'subagent' ? { ...row, description: info.description, type: info.type } : row
        const status = STATUSES[info.status]

        return row.status === 'working' && status ? finish(named, at, status) : named
      }),
    )
  }

  const usage = await $.session.usage()
  const total = usage.cost?.usd ?? null
  await update($, sessionUsd, () => total)
  $.ui.status(summary((await read($, agents)) ?? [], total))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'subagents',
      description: 'Show the subagents pane (`/subagents clear` drops finished ones)',
    })
    await update($, now, () => Date.now())
    $.clock.every(1000, () => void tick($))
    void $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })

    return next(e)
  })

  on('command.run', { command: 'subagents' }, async ($, e) => {
    if (e.args.trim() === 'clear') {
      await update($, agents, list => (list ?? []).filter(row => row.status === 'working'))

      return { text: 'Finished subagents cleared.' }
    }
    await $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })

    return { text: 'Subagents pane opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await $.clock.now()
    const result = await next(e)
    if (result.agentId) {
      const model = e.fork ? e.parentModel : result.model
      await patch($, result.agentId, row => ({
        ...row,
        description: e.description || row.description,
        type: e.fork ? 'fork' : e.subagentType,
        parentId: e.parentAgentId ?? null,
        isBackground: e.background,
        model: row.model ?? model,
        startedAt: Math.min(row.startedAt, started),
      }))
      await update($, now, () => started)
    }

    return result
  })

  on('turn.step', async function* ($, e, next) {
    const id = e.agentId
    if (!id) {
      return yield* next(e)
    }
    await patch($, id, (row, at) => ({
      ...begin(row, at),
      model: e.model,
      effort: e.effort === undefined ? row.effort : String(e.effort),
    }))
    try {
      const result = yield* next(e)
      const used = result.usage
      if (used) {
        const step: AgentTokens = {
          input: used.input_tokens,
          output: used.output_tokens,
          cacheRead: used.cache_read_input_tokens,
          cacheWrite: used.cache_creation_input_tokens,
        }
        await patch($, id, row => ({
          ...row,
          model: used.model,
          tokens: {
            input: row.tokens.input + step.input,
            output: row.tokens.output + step.output,
            cacheRead: row.tokens.cacheRead + step.cacheRead,
            cacheWrite: row.tokens.cacheWrite + step.cacheWrite,
          },
          costUsd: row.costUsd + costOf(used.model, step),
        }))
      }

      return result
    } finally {
      await patch($, id, end)
    }
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (!id) {
      return next(e)
    }
    await patch($, id, begin)
    try {
      return await next(e)
    } finally {
      await patch($, id, end)
    }
  })

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      const status: AgentStatus =
        e.reason === 'aborted' ? 'aborted' : e.reason === 'error' ? 'failed' : 'done'
      await patch($, id, (row, at) => finish(row, at, status))
      await tick($)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = (await read($, agents)) ?? []
    const at = Math.max(await read($, now), ...list.map(row => row.endedAt ?? row.startedAt))
    const total = await read($, sessionUsd)
    const width = Math.max(28, e.props.bodyColumns)
    const isNarrow = width < 44

    const working = list.filter(row => row.status === 'working').length
    const done = list.filter(row => row.status === 'done').length
    const failed = list.length - working - done
    const estimated = list.reduce((sum, row) => sum + row.costUsd, 0)

    const byId = new Map(list.map(row => [row.id, row]))
    const ordered = [...list].sort((a, b) => {
      const live = Number(b.status === 'working') - Number(a.status === 'working')

      return live !== 0 ? live : b.startedAt - a.startedAt
    })
    const spin = SPINNER[Math.floor(at / 1000) % SPINNER.length]

    return (
      <Box flexDirection="column" width={width}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={ACCENT}>
            ◆ Subagents
          </Text>
          <Box flexDirection="row" gap={1}>
            <Text color={COLORS.working}>
              {working > 0 ? spin : '●'} {working}
            </Text>
            <Text color={COLORS.done}>✓ {done}</Text>
            {failed > 0 && <Text color={COLORS.failed}>✗ {failed}</Text>}
          </Box>
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>

        {list.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text dimColor>No subagents yet.</Text>
            <Text dimColor>They show up here the moment one starts.</Text>
          </Box>
        )}

        {ordered.map(row => {
          const color = COLORS[row.status]
          const isLive = row.status === 'working'
          const elapsed = elapsedOf(row, at)
          const work = workingOf(row, at)
          const [full, empty] = bar(elapsed === 0 ? 0 : work / elapsed, isNarrow ? 6 : 10)
          const indent = depthOf(row, byId) * 2

          return (
            <Box
              key={`agent-${row.id}`}
              flexDirection="column"
              borderStyle="round"
              borderColor={color}
              borderDimColor={!isLive}
              paddingX={1}
              marginLeft={indent}
            >
              <Box flexDirection="row" justifyContent="space-between">
                <Box flexShrink={1}>
                  <Text color={color} bold>
                    {isLive ? spin : GLYPHS[row.status]}{' '}
                  </Text>
                  <Text bold={isLive} wrap="truncate-end">
                    {row.description}
                  </Text>
                </Box>
                <Text color={color} bold>
                  {' '}
                  {LABELS[row.status]}
                </Text>
              </Box>

              <Box flexDirection="row" gap={1}>
                <Text color={ACCENT}>{row.type}</Text>
                <Text dimColor>·</Text>
                <Text>{shortModel(row.model)}</Text>
                {row.effort && (
                  <>
                    <Text dimColor>·</Text>
                    <Text italic>{row.effort}</Text>
                  </>
                )}
                {row.isBackground && <Text dimColor>· bg</Text>}
              </Box>

              <Box flexDirection="row" justifyContent="space-between">
                <Box flexDirection="row">
                  <Text color={color}>{full}</Text>
                  <Text dimColor>{empty}</Text>
                </Box>
                <Box flexDirection="row" gap={1}>
                  <Text dimColor>⏱</Text>
                  <Text>{clock(elapsed)}</Text>
                  <Text dimColor>⚡</Text>
                  <Text>{clock(work)}</Text>
                </Box>
              </Box>

              <Box flexDirection="row" justifyContent="space-between">
                <Text dimColor>{tokens(row.tokens)} tok</Text>
                <Text color={COLORS.done}>≈{usd(row.costUsd)}</Text>
              </Box>
            </Box>
          )
        })}

        {list.length > 0 && (
          <>
            <Text dimColor>{'─'.repeat(width)}</Text>
            <Box flexDirection="row" justifyContent="space-between">
              <Text dimColor>Subagents ≈{usd(estimated)}</Text>
              {total !== null && <Text dimColor>Session {usd(total)}</Text>}
            </Box>
            <Text dimColor>⏱ elapsed · ⚡ working · /subagents clear</Text>
          </>
        )}
      </Box>
    )
  })
}

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ToolKind, ToolStat, ToolsSort } from '../types'

const PANE = 'tools-usage'
const TITLE = 'Tools'
const PANE_COLUMNS = 58

const tools = atom({ plugin: 'tools-usage', key: 'tools' } as const, [])
const sort = atom({ plugin: 'tools-usage', key: 'sort' } as const, 'tokens')

const KINDS: ToolKind[] = ['builtin', 'mcp', 'skill', 'agent', 'plugin', 'hook']
const COLORS: Record<ToolKind, string> = {
  builtin: '#58A6FF',
  mcp: '#BC8CFF',
  skill: '#3FB950',
  agent: '#D97757',
  plugin: '#39C5CF',
  hook: '#E5A50A',
}
const ACCENT = '#D97757'

/** Rough count: about four characters per token. */
function estimate(text: string): number {
  return Math.ceil(text.length / 4)
}

function argumentsOf(e: Record<string, unknown>): string {
  const { tool: _tool, tool_use_id: _id, agentId: _agent, ...args } = e

  return JSON.stringify(args)
}

/** Which row a call counts under, and what kind of tool it is. */
function classify(
  tool: string,
  e: Record<string, unknown>,
  providers: Record<string, string>,
): Pick<ToolStat, 'key' | 'label' | 'kind' | 'source'> {
  if (tool === 'Skill') {
    const skill = String(e.skill ?? e.command ?? 'skill')
    const [namespace, name] = skill.includes(':') ? skill.split(':', 2) : [null, skill]

    return { key: `skill:${skill}`, label: name ?? skill, kind: 'skill', source: namespace ?? null }
  }
  if (tool === 'Agent' || tool === 'Task') {
    const type = String(e.subagent_type ?? 'general-purpose')

    return { key: `agent:${type}`, label: type, kind: 'agent', source: null }
  }
  if (tool.startsWith('mcp__')) {
    const [, server = '', ...rest] = tool.split('__')
    const label = rest.join('__') || tool
    const provider = providers[tool]
    const isPlugin = provider !== undefined && provider !== 'engine'

    return { key: tool, label, kind: isPlugin ? 'plugin' : 'mcp', source: server }
  }
  const provider = providers[tool]
  if (provider !== undefined && provider !== 'engine') {
    return { key: tool, label: tool, kind: 'plugin', source: provider }
  }

  return { key: tool, label: tool, kind: 'builtin', source: null }
}

function blank(identity: Pick<ToolStat, 'key' | 'label' | 'kind' | 'source'>): ToolStat {
  return { ...identity, calls: 0, errors: 0, running: 0, inTokens: 0, outTokens: 0, defTokens: 0, lastAt: 0 }
}

async function patch(
  $: EngineInterface,
  identity: Pick<ToolStat, 'key' | 'label' | 'kind' | 'source'>,
  fn: (stat: ToolStat) => ToolStat,
): Promise<void> {
  await update($, tools, list => {
    const rows = list ?? []
    const found = rows.some(row => row.key === identity.key)
    const next = found ? rows : [...rows, blank(identity)]

    return next.map(row => (row.key === identity.key ? fn(row) : row))
  })
}

function total(stat: ToolStat): number {
  return stat.inTokens + stat.outTokens
}

function compact(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`
  }
  if (n >= 10_000) {
    return `${Math.round(n / 1000)}k`
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`
  }

  return String(n)
}

function sorted(list: ToolStat[], by: ToolsSort): ToolStat[] {
  return [...list].sort((a, b) =>
    by === 'calls'
      ? b.calls - a.calls || total(b) - total(a)
      : by === 'name'
        ? a.label.localeCompare(b.label)
        : total(b) - total(a) || b.calls - a.calls,
  )
}

export const register: Register = on => {
  /** Who provides each tool (`engine` for built-ins and MCP servers), from its description. */
  const providers: Record<string, string> = {}
  const definitions: Record<string, number> = {}

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tools-usage',
      description: 'Show the tools pane (`/tools-usage reset` clears the counts)',
    })
    void $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })

    return next(e)
  })

  on('command.run', { command: 'tools-usage' }, async ($, e) => {
    if (e.args.trim() === 'reset') {
      await update($, tools, () => [])

      return { text: 'Tool counts cleared.' }
    }
    await $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })

    return { text: 'Tools pane opened.' }
  })

  on('tool.describe', async ($, e, next) => {
    const result = await next(e)
    providers[e.tool] = e.provider.plugin
    const tokens = estimate(result.description)
    if (definitions[e.tool] !== tokens && !result.isDeferred) {
      definitions[e.tool] = tokens
      const args = { tool: e.tool } as Record<string, unknown>
      const identity = classify(e.tool, args, providers)
      if (identity.kind !== 'skill' && identity.kind !== 'agent') {
        await patch($, identity, stat => ({ ...stat, defTokens: tokens }))
      }
    }

    return result
  })

  on('tool.call', async ($, e, next) => {
    const args = e as unknown as Record<string, unknown>
    const identity = classify(e.tool, args, providers)
    const inTokens = estimate(argumentsOf(args))
    await patch($, identity, stat => ({
      ...stat,
      calls: stat.calls + 1,
      running: stat.running + 1,
      inTokens: stat.inTokens + inTokens,
    }))

    let outTokens = 0
    let isError = false
    try {
      const result = await next(e)
      isError = result.isError === true || result.deny !== undefined
      outTokens = estimate(result.text ?? result.deny ?? '')

      return result
    } catch (error) {
      isError = true
      throw error
    } finally {
      const at = await $.clock.now()
      await patch($, identity, stat => ({
        ...stat,
        running: Math.max(0, stat.running - 1),
        outTokens: stat.outTokens + outTokens,
        errors: stat.errors + (isError ? 1 : 0),
        lastAt: at,
      }))
    }
  })

  // What a settings hook adds to the conversation is context the model reads: count it per event.
  on('session.append', async ($, e, next) => {
    const result = await next(e)
    if (e.origin.kind === 'hook' || e.door === 'hook-context') {
      const event = e.origin.kind === 'hook' ? e.origin.event : (e.message.name ?? 'hook')
      const text = e.message.content
        .map(block => (typeof block.text === 'string' ? block.text : JSON.stringify(block)))
        .join('\n')
      const at = await $.clock.now()
      await patch($, { key: `hook:${event}`, label: event, kind: 'hook', source: null }, stat => ({
        ...stat,
        calls: stat.calls + 1,
        outTokens: stat.outTokens + estimate(text),
        lastAt: at,
      }))
    }

    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = (await read($, tools)) ?? []
    const by = await read($, sort)
    const width = Math.max(30, e.props.bodyColumns)
    const isNarrow = width < 48

    const used = list.filter(stat => stat.calls > 0)
    const grand = used.reduce((sum, stat) => sum + total(stat), 0)
    const calls = used.reduce((sum, stat) => sum + stat.calls, 0)
    const definitionsTotal = list.reduce((sum, stat) => sum + stat.defTokens, 0)
    const byKind = KINDS.map(kind => {
      const rows = used.filter(stat => stat.kind === kind)

      return { kind, tokens: rows.reduce((sum, stat) => sum + total(stat), 0), calls: rows.reduce((s, r) => s + r.calls, 0) }
    }).filter(group => group.calls > 0)

    const barWidth = width
    const cells = byKind.map(group => ({
      kind: group.kind,
      cells: grand === 0 ? 0 : Math.max(1, Math.round((group.tokens / grand) * barWidth)),
    }))
    const overflow = cells.reduce((sum, cell) => sum + cell.cells, 0) - barWidth
    const widest = cells.reduce((best, cell) => (cell.cells > (best?.cells ?? -1) ? cell : best), cells[0])
    if (widest && overflow > 0) {
      widest.cells -= overflow
    }

    const max = Math.max(1, ...used.map(total))
    const nameWidth = isNarrow ? width - 16 : width - 30
    const rows = sorted(used, by)

    return (
      <Box flexDirection="column" width={width}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={ACCENT}>
            ◆ Tools
          </Text>
          <Text>
            <Text bold>{calls}</Text>
            <Text dimColor> calls · </Text>
            <Text bold>≈{compact(grand)}</Text>
            <Text dimColor> tok</Text>
          </Text>
        </Box>

        {grand > 0 && (
          <Box flexDirection="row" marginTop={1}>
            {cells.map(cell => (
              <Text color={COLORS[cell.kind]}>{'█'.repeat(Math.max(0, cell.cells))}</Text>
            ))}
          </Box>
        )}
        <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
          {byKind.map(group => (
            <Text>
              <Text color={COLORS[group.kind]}>■ </Text>
              <Text>{group.kind}</Text>
              <Text dimColor> {compact(group.tokens)}</Text>
            </Text>
          ))}
        </Box>

        <Box flexDirection="row" gap={1} marginTop={1}>
          <Text dimColor>Sort</Text>
          {(['tokens', 'calls', 'name'] as const).map(option => (
            <Button
              key={`sort-${option}`}
              label={option}
              plain
              dimColor={option !== by}
              onPress={() => update($, sort, () => option)}
            />
          ))}
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>

        {rows.length === 0 && <Text dimColor>No tool calls yet.</Text>}

        {rows.map(stat => {
          const color = COLORS[stat.kind]
          const share = Math.max(1, Math.round((total(stat) / max) * 10))

          return (
            <Box key={`tool-${stat.key}`} flexDirection="column" marginBottom={isNarrow ? 1 : 0}>
              <Box flexDirection="row" justifyContent="space-between">
                <Box flexDirection="row" width={nameWidth} flexShrink={1}>
                  <Text color={color}>{stat.running > 0 ? '◐ ' : '● '}</Text>
                  <Text bold wrap="truncate-end">
                    {stat.label}
                  </Text>
                  {stat.source && (
                    <Text dimColor wrap="truncate-end">
                      {' '}
                      {stat.source}
                    </Text>
                  )}
                </Box>
                <Box flexDirection="row" gap={1}>
                  <Text color={color}>{stat.kind}</Text>
                  <Text>{String(stat.calls).padStart(3)}×</Text>
                  {!isNarrow && <Text bold>{compact(total(stat)).padStart(5)}</Text>}
                </Box>
              </Box>
              <Box flexDirection="row" justifyContent="space-between" paddingLeft={2}>
                <Text>
                  <Text color={color}>{'▰'.repeat(share)}</Text>
                  <Text dimColor>{'▱'.repeat(10 - share)}</Text>
                </Text>
                <Text dimColor>
                  ↑{compact(stat.inTokens)} ↓{compact(stat.outTokens)}
                  {stat.defTokens > 0 ? ` ⌂${compact(stat.defTokens)}` : ''}
                </Text>
                {stat.errors > 0 && <Text color="#F85149">✗{stat.errors}</Text>}
              </Box>
            </Box>
          )
        })}

        <Text dimColor>{'─'.repeat(width)}</Text>
        <Text dimColor>↑ args written · ↓ results read · ⌂ schema per request</Text>
        {definitionsTotal > 0 && (
          <Text dimColor>Tool schemas ≈{compact(definitionsTotal)} tok sent with every request</Text>
        )}
        <Text dimColor>Estimates (~4 chars/token) · /tools-usage reset</Text>
      </Box>
    )
  })
}

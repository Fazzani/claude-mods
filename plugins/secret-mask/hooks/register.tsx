import type { EngineInterface, Register, RenderNode } from 'claude-code'

import { LOCALES, pickLocale } from './i18n'
import type { Locale, Messages } from './i18n'
import { hasSecretDeep, maskDeep, segmentLines } from './patterns'
import type { Segment } from './patterns'

const MASK_COLOR = '#E5A50A'
const REVEAL_FG = '#1F1F1F'
const REVEAL_BG = '#F6C744'
/** Lines of a tool's output drawn before the rest is folded, as the engine folds them. */
const OUTPUT_LINES = 12

type Elements = ReturnType<EngineInterface['ui']['resolve']>

/** One line of segments; each secret is a keyed Box whose reveal paints over the mask on hover. */
function Line(ui: Elements, segments: Segment[], row: number, color?: string): RenderNode {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" flexWrap="wrap">
      {segments.length === 0 && <Text> </Text>}
      {segments.map((segment, index) =>
        segment.secret === undefined ? (
          <Text color={color}>{segment.text}</Text>
        ) : (
          <Box key={`secret-${row}-${index}`}>
            <Text color={MASK_COLOR} bold>
              {segment.text}
            </Text>
            <Box position="absolute" top={0} left={0} display="none" hover={{ display: 'flex' }}>
              <Text color={REVEAL_FG} backgroundColor={REVEAL_BG}>
                {segment.secret}
              </Text>
            </Box>
          </Box>
        ),
      )}
    </Box>
  )
}

function Lines(
  ui: Elements,
  m: Messages,
  text: string,
  options: { color?: string; limit?: number; offset?: number } = {},
) {
  const { Box, Text } = ui
  const lines = segmentLines(text)
  const shown = options.limit === undefined ? lines : lines.slice(0, options.limit)
  const hidden = lines.length - shown.length

  return (
    <Box flexDirection="column">
      {shown.map((segments, row) => Line(ui, segments, (options.offset ?? 0) + row, options.color))}
      {hidden > 0 && <Text dimColor>{m.moreLines(hidden)}</Text>}
    </Box>
  )
}

function hasSecretText(text: string): boolean {
  return hasSecretDeep(text)
}

/** The text a tool's output shows as, when it is text the transcript prints. */
function printedOf(output: unknown): { stdout: string; stderr: string } | null {
  if (typeof output === 'string') {
    return { stdout: output, stderr: '' }
  }
  if (output !== null && typeof output === 'object' && 'stdout' in output) {
    const { stdout, stderr } = output as { stdout?: unknown; stderr?: unknown }

    return {
      stdout: typeof stdout === 'string' ? stdout : '',
      stderr: typeof stderr === 'string' ? stderr : '',
    }
  }

  return null
}

/** The plugin's option, Claude Code's `language` setting, then the process locale. */
async function resolveLocale($: EngineInterface, option: unknown): Promise<Locale> {
  const settings = await $.settings.read()

  return pickLocale(
    option,
    settings.language,
    await $.env.get('LC_ALL'),
    await $.env.get('LC_MESSAGES'),
    await $.env.get('LANG'),
  )
}

export const register: Register = (on, options) => {
  let m: Messages = LOCALES.en

  on('session.start', async ($, e, next) => {
    m = LOCALES[await resolveLocale($, options.language)]

    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (!hasSecretText(e.props.text)) {
      return next(e)
    }
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui

    return (
      <Box flexDirection="row">
        <Text>{e.props.isFirstOfReply ? '● ' : '  '}</Text>
        <Box flexDirection="column" flexShrink={1}>
          {Lines(ui, m, e.props.text)}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (!hasSecretText(e.props.text)) {
      return next(e)
    }
    if (e.props.origin.kind !== 'composer') {
      return next({ ...e, props: { ...e.props, text: maskDeep(e.props.text) } })
    }
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui

    return (
      <Box flexDirection="row">
        <Text dimColor>{'> '}</Text>
        <Box flexDirection="column" flexShrink={1}>
          {Lines(ui, m, e.props.text)}
        </Box>
      </Box>
    )
  })

  // The call's row keeps the engine's drawing; its arguments are masked in place.
  on('ui.render', { component: 'ToolUse' }, ($, e, next) => {
    if (!hasSecretDeep(e.props.input) && !hasSecretDeep(e.props.output)) {
      return next(e)
    }

    return next({
      ...e,
      props: { ...e.props, input: maskDeep(e.props.input), output: maskDeep(e.props.output) },
    })
  })

  on('ui.render', { component: 'ToolResult' }, ($, e, next) => {
    if (!hasSecretDeep(e.props.output)) {
      return next(e)
    }
    const printed = e.props.isErrored ? null : printedOf(e.props.output)
    if (!printed) {
      return next({ ...e, props: { ...e.props, output: maskDeep(e.props.output) } })
    }
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const outLines = printed.stdout.replace(/\n$/, '')
    const errLines = printed.stderr.replace(/\n$/, '')

    return (
      <Box flexDirection="row">
        <Text dimColor>{'  ⎿  '}</Text>
        <Box flexDirection="column" flexShrink={1}>
          {outLines && Lines(ui, m, outLines, { limit: OUTPUT_LINES })}
          {errLines && Lines(ui, m, errLines, { color: '#F85149', limit: OUTPUT_LINES, offset: 10_000 })}
        </Box>
      </Box>
    )
  })
}

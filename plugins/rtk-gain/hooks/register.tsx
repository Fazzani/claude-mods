import type { EngineInterface, Register } from 'claude-code'

import { type Locale, LOCALES, pickLocale } from './i18n'
import { bar, parseReport, parseSummary, rateColor, tokens } from './report'

const COMMAND = 'rtk-gain'

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

/** rtk missing or failing must never break the session: the line is cleared instead. */
async function refresh($: EngineInterface, locale: Locale) {
  try {
    const { exitCode, stdout } = await $.process.run(['rtk', 'gain', '-f', 'json'])
    if (exitCode !== 0) {
      $.ui.status(undefined)
      return
    }
    const { saved, pct, commands } = parseSummary(stdout)
    $.ui.status(LOCALES[locale].status(saved, pct, commands))
  } catch {
    $.ui.status(undefined)
  }
}

export const register: Register = (on, options) => {
  let locale: Locale = 'en'
  const t = () => LOCALES[locale]

  on('session.start', async ($, e, next) => {
    locale = await resolveLocale($, options.language)
    await $.command.register({ name: COMMAND, description: t().commandDescription })
    void refresh($, locale)

    return next(e)
  })

  // RTK records savings only through shell commands, so refresh after each one.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    try {
      return await next(e)
    } finally {
      void refresh($, locale)
    }
  })

  // The row keeps rtk's raw text, which the model reads; ui.render draws it as a card.
  on('command.run', { command: COMMAND }, async $ => {
    try {
      const { stdout, stderr } = await $.process.run(['rtk', 'gain'])

      return { text: stdout || stderr }
    } catch (err) {
      return { text: t().failed(String(err)) }
    }
  })

  on('ui.render', { component: 'CommandOutput', props: { command: COMMAND } }, ($, e, next) => {
    const report = e.props.isErrored ? undefined : parseReport(e.props.text)
    if (!report) {
      return next(e)
    }

    const m = t()
    const { Box, Text } = $.ui.resolve(e)
    const [gaugeFill, gaugeRest] = bar(report.pct / 100, 24)
    const top = Math.max(1, ...report.rows.map(row => tokens(row.saved)))

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        <Box gap={1}>
          <Text color="cyan" bold>⚡ RTK</Text>
          <Text dimColor>{m.heading}</Text>
        </Box>
        <Box gap={2} marginTop={1}>
          <Text color="green" bold>{m.saved(report.saved)}</Text>
          <Box>
            <Text color="green">{gaugeFill}</Text>
            <Text dimColor>{gaugeRest}</Text>
          </Box>
          <Text color={rateColor(report.pct)} bold>{report.pct.toFixed(1)}%</Text>
        </Box>
        <Text dimColor>{m.details(report.commands, report.input, report.output, report.time, report.avg)}</Text>
        {report.rows.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Box width={28}><Text dimColor bold>{m.columns.command}</Text></Box>
              <Box width={14}><Text dimColor bold>{m.columns.saved}</Text></Box>
              <Box width={7}><Text dimColor bold>{m.columns.runs}</Text></Box>
              <Box width={7}><Text dimColor bold>{m.columns.rate}</Text></Box>
            </Box>
            {report.rows.map(row => {
              const [fill, rest] = bar(tokens(row.saved) / top, 8)

              return (
                <Box>
                  <Box width={28}><Text wrap="truncate-end">{row.name}</Text></Box>
                  <Box width={14}>
                    <Text color="cyan">{fill}</Text>
                    <Text dimColor>{rest}</Text>
                    <Text> {row.saved}</Text>
                  </Box>
                  <Box width={7}><Text dimColor>×{row.count}</Text></Box>
                  <Box width={7}><Text color={rateColor(row.pct)}>{row.pct.toFixed(1)}%</Text></Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })
}

import type { EngineInterface, Register } from 'claude-code'

import { type Locale, LOCALES, pickLocale } from './i18n'
import { bar, compact, parseTelemetry } from './report'

const COMMAND = 'logstrip-gain'

/** Plugin setting, Claude Code language, then process locale. */
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

/** Read-only: telemetry belongs to the global LogStrip CLI. */
async function refresh($: EngineInterface, locale: Locale): Promise<void> {
  try {
    const run = await $.process.run(['logstrip', '--telemetry'], { timeoutMs: 3000 })
    const report = run.exitCode === 0 && !run.isStderrTruncated
      ? parseTelemetry(run.stderr)
      : undefined
    $.ui.status(report
      ? LOCALES[locale].status(compact(report.saved), report.percent.toFixed(1), report.runs)
      : undefined)
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

  // Refresh only the display after shell commands. Preserve tool arguments and results.
  on('tool.call', async ($, e, next) => {
    try {
      return await next(e)
    } finally {
      if (e.tool === 'Bash' || e.tool === 'PowerShell') void refresh($, locale)
    }
  })

  on('command.run', { command: COMMAND }, async $ => {
    try {
      const run = await $.process.run(['logstrip', '--telemetry'], { timeoutMs: 3000 })
      if (run.exitCode !== 0 || run.isStderrTruncated) return { text: t().failed(run.stderr) }
      return { text: run.stderr }
    } catch {
      return { text: t().notInstalled }
    }
  })

  on('ui.render', { component: 'CommandOutput', props: { command: COMMAND } }, ($, e, next) => {
    const report = e.props.isErrored ? undefined : parseTelemetry(e.props.text)
    if (!report) return next(e)

    const m = t()
    const { Box, Text } = $.ui.resolve(e)
    const [fill, rest] = bar(report.percent, 24)

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        <Box gap={1}>
          <Text color="cyan" bold>LogStrip</Text>
          <Text dimColor>{m.heading}</Text>
        </Box>
        <Box gap={2} marginTop={1}>
          <Text color="green" bold>{m.saved(compact(report.saved))}</Text>
          <Box>
            <Text color="green">{fill}</Text>
            <Text dimColor>{rest}</Text>
          </Box>
          <Text color="cyan" bold>{report.percent.toFixed(1)}%</Text>
        </Box>
        <Text dimColor>{m.details(report.runs, compact(report.input), compact(report.output))}</Text>
        <Text dimColor>{m.lastRun(report.lastRun)}</Text>
        {report.recent.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor bold>{m.recentHeading}</Text>
            {report.recent.map(run => (
              <Text dimColor>{m.recent(run.timestamp.replace('T', ' '), compact(run.saved), run.percent.toFixed(1))}</Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}

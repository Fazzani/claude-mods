import { expect, test } from 'claude-code/testing'

import { bar, compact, parseTelemetry } from '../hooks/report'

const REPORT = [
  'LogStrip Telemetry',
  '  total runs       : 66',
  '  input tokens     : 44,300',
  '  output tokens    : 34,100',
  '  saved tokens     : 10,200',
  '  average savings  : 23.02%',
  '  last run         : 2026-10-09T19:03:00.000Z',
  '',
  '  Last 2 runs:',
  '    2026-10-09T19:03:00  saved=8,400  (31.9%)',
  '    2026-10-09T18:00:00  saved=1,800  (18.4%)',
].join('\n')

test('parses cumulative telemetry and recent runs', async () => {
  const report = parseTelemetry(REPORT)
  expect(report?.runs).toBe(66)
  expect(report?.input).toBe(44300)
  expect(report?.output).toBe(34100)
  expect(report?.saved).toBe(10200)
  expect(report?.percent.toFixed(1)).toBe('23.0')
  expect(report?.recent).toEqual([
    { timestamp: '2026-10-09T19:03:00', saved: 8400, percent: 31.9 },
    { timestamp: '2026-10-09T18:00:00', saved: 1800, percent: 18.4 },
  ])
})

test('handles uninitialized telemetry and malformed reports', async () => {
  expect(parseTelemetry('not LogStrip telemetry')).toBeUndefined()
  expect(parseTelemetry('LogStrip Telemetry\n total runs : 0\n input tokens : 0\n output tokens : 0\n saved tokens : 0\n last run : never')?.percent).toBe(0)
  expect(compact(12500)).toBe('12.5K')
  expect(bar(25, 8)).toEqual(['██', '░░░░░░'])
})

for (const surface of ['terminal', 'desktop'] as const) {
  test('shows telemetry card on ' + surface, { options: { language: 'en' } }, async $ => {
    const drawn = await $.ui.mount({
      plugin: 'logstrip-gain',
      surface,
      component: 'CommandOutput',
      props: { command: 'logstrip-gain', args: '', text: REPORT, isErrored: false },
    })
    expect(await drawn.find({ text: '≈10.2K saved' })).toBeDefined()
    expect(await drawn.find({ text: 'Recent runs' })).toBeDefined()
  })
}

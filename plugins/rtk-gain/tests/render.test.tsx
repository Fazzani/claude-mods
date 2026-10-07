import { expect, test } from 'claude-code/testing'

import { parseReport, parseSummary } from '../hooks/report'

const REPORT = String.raw`RTK Token Savings (Global Scope)
Total commands:    66
Input tokens:      44.3K
Output tokens:     34.1K
Tokens saved:      10.2K (23.0%)
Total exec time:   8.2s (avg 124ms)
 1.  rtk grep                     19   8.4K   31.9%   244ms  ██████████
 3.  rtk ls -la D:\Work\re...      1    296   63.4%    48ms  ░░░░░░░░░░
`

test('reads the json summary', async () => {
  const json = JSON.stringify({ summary: { total_commands: 57, total_saved: 7321, avg_savings_pct: 18.43 } })
  expect(parseSummary(json)).toEqual({ saved: '7.3K', pct: '18.4', commands: 57 })
})

test('parses the text report', async () => {
  const report = parseReport(REPORT)
  expect(report?.saved).toBe('10.2K')
  expect(report?.pct).toBe(23)
  expect(report?.avg).toBe('124ms')
  expect(report?.rows).toEqual([
    { name: 'rtk grep', count: '19', saved: '8.4K', pct: 31.9 },
    { name: String.raw`rtk ls -la D:\Work\re...`, count: '1', saved: '296', pct: 63.4 },
  ])
})

test('leaves unknown text to the raw row', async () => {
  expect(parseReport('rtk gain failed')).toBeUndefined()
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws the report as a card on ${surface}`, { options: { language: 'en' } }, async $ => {
    const drawn = await $.ui.mount({
      plugin: 'rtk-gain',
      surface,
      component: 'CommandOutput',
      props: { command: 'rtk-gain', args: '', text: REPORT, isErrored: false },
    })
    expect(await drawn.find({ text: '10.2K saved' })).toBeDefined()
    expect(await drawn.find({ text: 'rtk grep' })).toBeDefined()
  })
}

export const en = {
  commandDescription: 'Show LogStrip token savings statistics',
  status: (saved: string, pct: string, runs: number) =>
    'LogStrip: ≈' + saved + ' tokens saved (' + pct + '%, ' + runs + (runs === 1 ? ' run)' : ' runs)'),
  heading: 'estimated token savings',
  saved: (amount: string) => '≈' + amount + ' saved',
  details: (runs: number, input: string, output: string) =>
    runs + ' runs · ' + input + ' in → ' + output + ' out',
  lastRun: (value: string) => 'Last run: ' + value,
  recentHeading: 'Recent runs',
  recent: (at: string, amount: string, rate: string) => at + ' · ≈' + amount + ' · ' + rate + '%',
  failed: (reason: string) => 'LogStrip telemetry failed: ' + (reason || 'unknown error'),
  notInstalled: 'LogStrip is unavailable. Install it with npm install -g logstrip.',
}

export type Messages = typeof en

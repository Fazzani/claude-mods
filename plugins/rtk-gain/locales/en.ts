export const en = {
  commandDescription: 'Show the RTK token savings report',
  status: (saved: string, pct: string, commands: number) =>
    `RTK: ${saved} tokens saved (${pct}%, ${commands} cmd${commands === 1 ? '' : 's'})`,
  heading: 'token savings',
  saved: (tokens: string) => `${tokens} saved`,
  details: (commands: string, input: string, output: string, time: string, avg: string) =>
    `${commands} commands · ${input} in → ${output} out · ${time} (avg ${avg})`,
  columns: { command: 'Command', saved: 'Saved', runs: 'Runs', rate: 'Rate' },
  failed: (reason: string) => `rtk gain failed: ${reason}`,
}

export type Messages = typeof en

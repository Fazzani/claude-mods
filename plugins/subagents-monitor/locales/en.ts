export const en = {
  commandDescription: 'Show the subagents pane (`/subagents clear` drops finished ones)',
  cleared: 'Finished subagents cleared.',
  opened: 'Subagents pane opened.',
  title: 'Subagents',
  heading: '◆ Subagents',
  emptyTitle: 'No subagents yet.',
  emptyHint: 'They show up here the moment one starts.',
  status: {
    working: 'WORKING',
    done: 'DONE',
    aborted: 'ABORTED',
    failed: 'FAILED',
    killed: 'KILLED',
  },
  tokens: 'tok',
  background: 'bg',
  footerSubagents: 'Subagents',
  footerSession: 'Session',
  legend: '⏱ elapsed · ⚡ working · /subagents clear',
  summary: (working: number, done: number) => `⚙ ${working} working · ${done} done`,
}

export type Messages = typeof en

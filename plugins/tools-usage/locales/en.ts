export const en = {
  commandDescription: 'Show the tools pane (`/tools-usage reset` clears the counts)',
  cleared: 'Tool counts cleared.',
  opened: 'Tools pane opened.',
  title: 'Tools',
  heading: '◆ Tools',
  calls: 'calls',
  tokens: 'tok',
  sort: 'Sort',
  sortBy: { tokens: 'tokens', calls: 'calls', name: 'name' },
  empty: 'No tool calls yet.',
  legend: '↑ args written · ↓ results read · ⌂ schema per request',
  schemas: (tokens: string) => `Tool schemas ≈${tokens} tok sent with every request`,
  footer: 'Estimates (~4 chars/token) · /tools-usage reset',
}

export type Messages = typeof en

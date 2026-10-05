import type { Messages } from './en'

export const fr: Messages = {
  commandDescription: 'Affiche le panneau des sous-agents (`/subagents clear` retire les terminés)',
  cleared: 'Sous-agents terminés retirés.',
  opened: 'Panneau des sous-agents ouvert.',
  title: 'Sous-agents',
  heading: '◆ Sous-agents',
  emptyTitle: 'Aucun sous-agent pour le moment.',
  emptyHint: 'Ils apparaissent ici dès que l’un démarre.',
  status: {
    working: 'EN COURS',
    done: 'TERMINÉ',
    aborted: 'INTERROMPU',
    failed: 'ÉCHEC',
    killed: 'ARRÊTÉ',
  },
  tokens: 'tok',
  background: 'arr.-plan',
  footerSubagents: 'Sous-agents',
  footerSession: 'Session',
  legend: '⏱ écoulé · ⚡ travail · /subagents clear',
  summary: (working: number, done: number) => `⚙ ${working} en cours · ${done} terminé${done > 1 ? 's' : ''}`,
}

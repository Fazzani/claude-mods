import type { Messages } from './en'

export const fr: Messages = {
  commandDescription: 'Afficher les statistiques des tokens économisés par LogStrip',
  status: (saved: string, pct: string, runs: number) =>
    'LogStrip : ≈' + saved + ' tokens économisés (' + pct + ' %, ' + runs + ' exéc.)',
  heading: 'économies estimées de tokens',
  saved: (amount: string) => '≈' + amount + ' économisés',
  details: (runs: number, input: string, output: string) =>
    runs + ' exécutions · ' + input + ' entrée → ' + output + ' sortie',
  lastRun: (value: string) => 'Dernière exécution : ' + value,
  recentHeading: 'Dernières exécutions',
  recent: (at: string, amount: string, rate: string) => at + ' · ≈' + amount + ' · ' + rate + ' %',
  failed: (reason: string) => 'Échec de la télémétrie LogStrip : ' + (reason || 'erreur inconnue'),
  notInstalled: 'LogStrip est indisponible. Installer avec npm install -g logstrip.',
}

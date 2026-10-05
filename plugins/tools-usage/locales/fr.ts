import type { Messages } from './en'

export const fr: Messages = {
  commandDescription: 'Affiche le panneau des outils (`/tools-usage reset` remet les compteurs à zéro)',
  cleared: 'Compteurs des outils remis à zéro.',
  opened: 'Panneau des outils ouvert.',
  title: 'Outils',
  heading: '◆ Outils',
  calls: 'appels',
  tokens: 'tok',
  sort: 'Tri',
  sortBy: { tokens: 'tokens', calls: 'appels', name: 'nom' },
  empty: 'Aucun appel d’outil pour le moment.',
  legend: '↑ arguments écrits · ↓ résultats lus · ⌂ schéma par requête',
  schemas: (tokens: string) => `Schémas d’outils ≈${tokens} tok envoyés à chaque requête`,
  footer: 'Estimations (~4 caractères/token) · /tools-usage reset',
}

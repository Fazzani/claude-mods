import type { Messages } from './en'

export const fr: Messages = {
  commandDescription: 'Afficher le rapport des tokens économisés par RTK',
  status: (saved: string, pct: string, commands: number) =>
    `RTK : ${saved} tokens économisés (${pct} %, ${commands} cmd)`,
  heading: 'tokens économisés',
  saved: (tokens: string) => `${tokens} économisés`,
  details: (commands: string, input: string, output: string, time: string, avg: string) =>
    `${commands} commandes · ${input} en entrée → ${output} en sortie · ${time} (moy. ${avg})`,
  columns: { command: 'Commande', saved: 'Économisé', runs: 'Exéc.', rate: 'Taux' },
  failed: (reason: string) => `échec de rtk gain : ${reason}`,
}

import type { Messages } from './en'

export const fr: Messages = {
  moreLines: (count: number) => `… +${count} ligne${count > 1 ? 's' : ''} (ctrl+o pour tout afficher)`,
}

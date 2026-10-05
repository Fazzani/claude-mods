import { en } from '../locales/en'
import { fr } from '../locales/fr'

export type { Messages } from '../locales/en'

export const LOCALES = { en, fr }

export type Locale = keyof typeof LOCALES

function match(value: unknown): Locale | null {
  if (typeof value !== 'string') {
    return null
  }
  const tag = value.trim().toLowerCase()
  if (tag.startsWith('fr')) {
    return 'fr'
  }
  if (tag.startsWith('en')) {
    return 'en'
  }

  return null
}

/**
 * The first candidate naming a supported locale, English otherwise. Callers pass,
 * in order: the plugin's `language` option, Claude Code's `language` setting,
 * then LC_ALL, LC_MESSAGES and LANG.
 */
export function pickLocale(...candidates: unknown[]): Locale {
  for (const candidate of candidates) {
    const locale = match(candidate)
    if (locale) {
      return locale
    }
  }

  return 'en'
}

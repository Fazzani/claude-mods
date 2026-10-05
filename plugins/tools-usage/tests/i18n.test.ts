import { expect, test } from 'claude-code/testing'

import { LOCALES, pickLocale } from '../hooks/i18n'

function shape(value: unknown): unknown {
  if (typeof value === 'function') {
    return 'function'
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]))
  }

  return typeof value
}

test('every locale has the same keys as English', async () => {
  for (const messages of Object.values(LOCALES)) {
    expect(JSON.stringify(shape(messages))).toBe(JSON.stringify(shape(LOCALES.en)))
  }
})

test('picks the first supported locale, English otherwise', async () => {
  expect(pickLocale('fr')).toBe('fr')
  expect(pickLocale('auto', 'french')).toBe('fr')
  expect(pickLocale('auto', undefined, undefined, undefined, 'fr_FR.UTF-8')).toBe('fr')
  expect(pickLocale('auto', 'en', 'fr_FR')).toBe('en')
  expect(pickLocale('auto', 'de_DE.UTF-8')).toBe('en')
})

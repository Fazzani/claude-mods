// Shared helpers for the CI scripts: the plugins of this marketplace and their manifests.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PLUGINS_DIR = join(ROOT, 'plugins')
export const MARKETPLACE = join(ROOT, '.claude-plugin', 'marketplace.json')
export const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

/** Folder names under plugins/ that hold a plugin manifest. */
export function listPlugins() {
  return readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(PLUGINS_DIR, entry.name, '.claude-plugin', 'plugin.json')))
    .map(entry => entry.name)
    .sort()
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function manifestOf(plugin) {
  return readJson(join(PLUGINS_DIR, plugin, '.claude-plugin', 'plugin.json'))
}

export function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** A file's content at a commit, or null when it did not exist there. */
export function showAt(ref, path) {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

/** True when `ref` names a commit this clone has; a zero sha (a branch's first push) is not one. */
export function isCommit(ref) {
  if (!ref || /^0+$/.test(ref)) {
    return false
  }
  try {
    git('cat-file', '-e', `${ref}^{commit}`)

    return true
  } catch {
    return false
  }
}

/** The body of a CHANGELOG.md's `## [version]` section; null when it is absent or empty. */
export function changelogSection(text, version) {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex(line => line.startsWith(`## [${version}]`))
  if (start === -1) {
    return null
  }
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## ['))
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim()

  return body || null
}

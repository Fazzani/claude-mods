// Checks every plugin's release metadata: semver, plugin.json and marketplace.json agree,
// a CHANGELOG entry for the current version. With a base ref, also checks that each plugin
// whose shipped files changed since the base has a new version.
// Usage: node check-versions.mjs [base-ref]
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  changelogSection,
  git,
  isCommit,
  listPlugins,
  manifestOf,
  MARKETPLACE,
  PLUGINS_DIR,
  readJson,
  SEMVER,
  showAt,
} from './plugins.mjs'

const base = process.argv[2]
const hasBase = isCommit(base)
const errors = []
const plugins = listPlugins()
const marketplace = readJson(MARKETPLACE)
const entries = new Map(marketplace.plugins.map(entry => [entry.name, entry]))

// Files whose change ships nothing new to someone who installed the plugin.
const UNSHIPPED = [/^tests\//, /^README\.md$/, /^CHANGELOG\.md$/, /^tsconfig\.json$/]

for (const plugin of plugins) {
  const manifest = manifestOf(plugin)
  const entry = entries.get(plugin)
  const version = manifest.version

  if (manifest.name !== plugin) {
    errors.push(`${plugin}: plugin.json name "${manifest.name}" differs from its folder`)
  }
  if (!SEMVER.test(version ?? '')) {
    errors.push(`${plugin}: plugin.json version "${version}" is not semver`)
  }
  if (!entry) {
    errors.push(`${plugin}: missing from .claude-plugin/marketplace.json`)
  } else {
    if (entry.version !== version) {
      errors.push(`${plugin}: marketplace.json says ${entry.version}, plugin.json says ${version}`)
    }
    if (entry.source !== `./plugins/${plugin}`) {
      errors.push(`${plugin}: marketplace.json source should be ./plugins/${plugin}`)
    }
  }

  const changelog = join(PLUGINS_DIR, plugin, 'CHANGELOG.md')
  if (!existsSync(changelog)) {
    errors.push(`${plugin}: CHANGELOG.md is missing`)
  } else if (!changelogSection(readFileSync(changelog, 'utf8'), version)) {
    errors.push(`${plugin}: CHANGELOG.md has no "## [${version}]" section with content`)
  }

  if (hasBase) {
    const before = showAt(base, `plugins/${plugin}/.claude-plugin/plugin.json`)
    if (before) {
      const prefix = `plugins/${plugin}/`
      const shipped = git('diff', '--name-only', `${base}...HEAD`, '--', prefix)
        .split('\n')
        .filter(Boolean)
        .map(file => file.slice(prefix.length))
        .filter(file => !UNSHIPPED.some(pattern => pattern.test(file)))
      const previous = JSON.parse(before).version
      if (shipped.length > 0 && previous === version) {
        errors.push(`${plugin}: ${shipped.join(', ')} changed but the version is still ${version}; bump it`)
      }
    }
  }
}

for (const entry of marketplace.plugins) {
  if (!plugins.includes(entry.name)) {
    errors.push(`marketplace.json lists "${entry.name}", which has no plugins/${entry.name}/ folder`)
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`::error::${error}`)
  }
  process.exit(1)
}
const scope = hasBase ? ` (version bumps checked against ${git('rev-parse', '--short', base)})` : ''
console.log(`Release metadata OK for ${plugins.length} plugins${scope}.`)

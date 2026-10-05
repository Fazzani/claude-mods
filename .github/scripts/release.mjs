// Tags and releases every plugin whose current version has no tag yet, as <plugin>-v<version>,
// with that version's CHANGELOG section as the notes. `gh` needs GH_TOKEN.
// Usage: node release.mjs [--dry-run]
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { changelogSection, git, listPlugins, manifestOf, PLUGINS_DIR, ROOT } from './plugins.mjs'

const isDryRun = process.argv.includes('--dry-run')
const tags = new Set(git('tag', '--list').split('\n').filter(Boolean))
const head = git('rev-parse', 'HEAD')

for (const plugin of listPlugins()) {
  const { version } = manifestOf(plugin)
  const tag = `${plugin}-v${version}`
  if (tags.has(tag)) {
    console.log(`${tag}: already released`)
    continue
  }
  const changelog = readFileSync(join(PLUGINS_DIR, plugin, 'CHANGELOG.md'), 'utf8')
  const notes = changelogSection(changelog, version)
  if (!notes) {
    throw new Error(`${tag}: CHANGELOG.md has no section for ${version}`)
  }
  const install = [
    '',
    '',
    '**Install**',
    '',
    '```bash',
    'claude plugin marketplace add Fazzani/claude-mods',
    `claude plugin install ${plugin}@claude-mods`,
    '```',
  ].join('\n')
  if (isDryRun) {
    console.log(`${tag}: would be released at ${head.slice(0, 7)} with notes:\n${notes}${install}\n`)
    continue
  }
  const file = join(tmpdir(), `${tag}.md`)
  writeFileSync(file, notes + install)
  execFileSync('gh', ['release', 'create', tag, '--title', `${plugin} v${version}`, '--notes-file', file, '--target', head], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  console.log(`${tag}: released`)
}

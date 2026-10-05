// Prints, as JSON, the plugins a change touches: the CI matrix.
// Usage: node changed-plugins.mjs <base-ref> [head-ref]
// Every plugin when the base is unknown (a first push, a manual run) or a shared file changed.
import { appendFileSync } from 'node:fs'

import { git, isCommit, listPlugins } from './plugins.mjs'

const [base, head = 'HEAD'] = process.argv.slice(2)
const all = listPlugins()
const SHARED = [/^\.github\//, /^types\//, /^\.claude-plugin\//]

let selected = all
if (isCommit(base)) {
  const files = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean)
  const isShared = files.some(file => SHARED.some(pattern => pattern.test(file)))
  if (!isShared) {
    selected = all.filter(plugin => files.some(file => file.startsWith(`plugins/${plugin}/`)))
  }
}

const json = JSON.stringify(selected)
console.log(json)
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `plugins=${json}\nany=${selected.length > 0}\n`)
}

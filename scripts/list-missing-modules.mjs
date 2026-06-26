import fs from 'node:fs'

const log = fs.readFileSync('build-log.txt', 'utf8')
const mods = new Set()
for (const m of log.matchAll(/Cannot find module '([^']+)'/g)) {
  mods.add(m[1])
}
const sorted = [...mods].sort()
console.log('count', sorted.length)
for (const mod of sorted) console.log(mod)

import fs from 'node:fs'
import path from 'node:path'

const srcRoot = process.argv[2]
const destRoot = process.argv[3]
if (!srcRoot || !destRoot) {
  console.error('Usage: node copy-missing.mjs <srcRoot> <destRoot>')
  process.exit(1)
}

let copied = 0
let skipped = 0

function walk(rel = '') {
  const abs = path.join(srcRoot, rel)
  if (!fs.existsSync(abs)) return
  for (const name of fs.readdirSync(abs, { withFileTypes: true })) {
    const nextRel = rel ? path.join(rel, name.name) : name.name
    const nextAbs = path.join(srcRoot, nextRel)
    if (name.isDirectory()) walk(nextRel)
    else {
      const dest = path.join(destRoot, nextRel)
      if (fs.existsSync(dest)) {
        skipped++
        continue
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(nextAbs, dest)
      copied++
      console.log('copied', nextRel)
    }
  }
}

walk()
console.log('done copied', copied, 'skipped existing', skipped)

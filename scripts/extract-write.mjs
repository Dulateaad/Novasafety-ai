import fs from 'node:fs'
import path from 'node:path'

const transcriptsRoot =
  'C:/Users/dulat/.cursor/projects/c-Users-dulat-OneDrive-Desktop-gp-2026-cad26/agent-transcripts'
const relTarget = process.argv[2]
const outFile = process.argv[3]
const applyPatches = process.argv.includes('--patch')

if (!relTarget || !outFile) {
  console.error('Usage: node extract-write.mjs src/pages/Foo.tsx out/Foo.tsx [--patch]')
  process.exit(1)
}

const targetSuffix = relTarget.replace(/\\/g, '/').toLowerCase()
const jsonlFiles = []

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else if (name.name.endsWith('.jsonl')) jsonlFiles.push(full)
  }
}

walk(transcriptsRoot)
jsonlFiles.sort()

let body = ''
for (const file of jsonlFiles) {
  for (const line of fs.readFileSync(file, 'utf8').trim().split('\n')) {
    try {
      const o = JSON.parse(line)
      const content = o.message?.content
      if (!Array.isArray(content)) continue
      for (const x of content) {
        if (x.type !== 'tool_use' || x.name !== 'Write') continue
        const filePath = (x.input?.path ?? '').replace(/\\/g, '/').toLowerCase()
        if (!filePath.endsWith(targetSuffix)) continue
        const next = x.input?.contents ?? ''
        if (next.length >= body.length) body = next
      }
    } catch {}
  }
}

if (!body) {
  console.error('No Write found for', relTarget)
  process.exit(1)
}

let applied = 0
let failed = 0
if (applyPatches) {
  for (const file of jsonlFiles) {
    for (const line of fs.readFileSync(file, 'utf8').trim().split('\n')) {
      try {
        const o = JSON.parse(line)
        const content = o.message?.content
        if (!Array.isArray(content)) continue
        for (const x of content) {
          if (x.type !== 'tool_use' || x.name !== 'StrReplace') continue
          const filePath = (x.input?.path ?? '').replace(/\\/g, '/').toLowerCase()
          if (!filePath.endsWith(targetSuffix)) continue
          const oldStr = x.input?.old_string
          const newStr = x.input?.new_string
          if (typeof oldStr !== 'string' || typeof newStr !== 'string') continue
          if (!body.includes(oldStr)) {
            failed++
            continue
          }
          body = body.replace(oldStr, newStr)
          applied++
        }
      } catch {}
    }
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, body, 'utf8')
console.log('Wrote', outFile, body.length, 'bytes', applyPatches ? `applied ${applied} failed ${failed}` : '')

import fs from 'node:fs'
import path from 'node:path'

const transcriptsRoot = process.argv[2]
const outRoot = process.argv[3] ?? path.join('recovery', 'all-transcripts')
if (!transcriptsRoot) {
  console.error('Usage: node recover-from-transcripts.mjs <agent-transcripts-dir> [outRoot]')
  process.exit(1)
}

const written = new Map()

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else if (name.name.endsWith('.jsonl')) ingest(full)
  }
}

function ingest(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
  for (const line of lines) {
    try {
      const o = JSON.parse(line)
      const content = o.message?.content
      if (!Array.isArray(content)) continue
      for (const x of content) {
        if (x.type !== 'tool_use' || x.name !== 'Write') continue
        const filePath = x.input?.path
        const body = x.input?.contents
        if (!filePath || typeof body !== 'string') continue
        const norm = filePath.replace(/\\/g, '/').toLowerCase()
        if (!norm.includes('/e-ptw/') && !norm.endsWith('/e-ptw')) continue
        written.set(filePath.replace(/\\/g, '/'), body)
      }
    } catch {
      // ignore
    }
  }
}

walk(transcriptsRoot)
fs.mkdirSync(outRoot, { recursive: true })

let count = 0
for (const [filePath, body] of written) {
  const idx = filePath.toLowerCase().indexOf('/e-ptw/')
  if (idx < 0) continue
  const rel = filePath.slice(idx + '/e-ptw/'.length)
  const target = path.join(outRoot, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, body, 'utf8')
  count++
}

console.log('extracted', count, 'files to', outRoot)
for (const p of [...written.keys()].sort()) console.log(' -', p)

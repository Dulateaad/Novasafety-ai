import fs from 'node:fs'
import path from 'node:path'

const transcript = process.argv[2]
const outDir = process.argv[3] ?? path.join('recovery', 'transcript')
if (!transcript) {
  console.error('Usage: node extract-transcript-writes.mjs <transcript.jsonl> [outDir]')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
const lines = fs.readFileSync(transcript, 'utf8').trim().split('\n')
const written = new Map()

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
      if (!filePath.includes('e-ptw')) continue
      written.set(filePath, body)
    }
  } catch {
    // ignore bad lines
  }
}

let count = 0
for (const [filePath, body] of written) {
  const rel = filePath.replace(/^.*e-ptw[\\/]/, '')
  const target = path.join(outDir, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, body, 'utf8')
  count++
  console.log('wrote', rel)
}

console.log('total', count, 'files ->', outDir)

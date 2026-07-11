import fs from 'node:fs'
import path from 'node:path'

const transcript = process.argv[2]
const outRoot = process.argv[3]
const targets = new Set(
  (process.argv[4] ?? '').split(',').filter(Boolean).map((p) => p.replace(/\\/g, '/')),
)

const best = new Map()

for (const line of fs.readFileSync(transcript, 'utf8').trim().split('\n')) {
  try {
    const o = JSON.parse(line)
    const content = o.message?.content
    if (!Array.isArray(content)) continue
    for (const x of content) {
      if (x.type !== 'tool_use' || x.name !== 'Write') continue
      const filePath = String(x.input?.path ?? '').replace(/\\/g, '/')
      const rel = filePath.replace(/^.*\/e-ptw\//, '')
      if (targets.size && !targets.has(rel)) continue
      const body = x.input?.contents ?? ''
      const prev = best.get(rel)
      if (!prev || body.length > prev.length) best.set(rel, body)
    }
  } catch {
    /* ignore */
  }
}

fs.mkdirSync(outRoot, { recursive: true })
for (const [rel, body] of best) {
  const dest = path.join(outRoot, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, body)
  console.log(`${rel} (${body.length} bytes)`)
}

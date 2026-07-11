import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
const targetName = process.argv[3] ?? 'PermitDetailPage.tsx'
let best = { len: 0, path: '', body: '' }

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
        const filePath = x.input?.path ?? ''
        if (!filePath.replace(/\\/g, '/').endsWith(targetName)) continue
        const body = x.input?.contents ?? ''
        if (body.length > best.len) best = { len: body.length, path: filePath, body }
      }
    } catch {}
  }
}

walk(root)
console.log('best', best.len, 'from', best.path)
if (best.body) {
  const out = process.argv[4]
  if (out) fs.writeFileSync(out, best.body, 'utf8')
}

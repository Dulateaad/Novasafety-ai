import fs from 'node:fs'
import path from 'node:path'

const transcriptsRoot = process.argv[2]
const targetName = process.argv[3] ?? 'PermitDetailPage.tsx'
const out = process.argv[4]
let best = { len: 0, body: '', from: '' }

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else if (name.name.endsWith('.jsonl')) ingest(full)
  }
}

function ingest(file) {
  for (const line of fs.readFileSync(file, 'utf8').trim().split('\n')) {
    try {
      const o = JSON.parse(line)
      const content = o.message?.content
      if (!Array.isArray(content)) continue
      for (const x of content) {
        if (x.type !== 'tool_use' || x.name !== 'Write') continue
        const filePath = String(x.input?.path ?? '').replace(/\\/g, '/')
        if (!filePath.endsWith(targetName)) continue
        const body = x.input?.contents ?? ''
        if (body.length > best.len) best = { len: body.length, body, from: filePath }
      }
    } catch {
      /* ignore */
    }
  }
}

walk(transcriptsRoot)
console.log('best', best.len, 'from', best.from)
if (out && best.body) fs.writeFileSync(out, best.body, 'utf8')

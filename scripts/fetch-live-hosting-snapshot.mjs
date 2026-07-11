/**
 * Download the currently live Firebase Hosting bundle into releases/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = 'https://naryad-67194.web.app'
const releaseId = process.argv[2] ?? '6c61f9'
const outRoot = path.join(root, 'releases', `snapshot-2026-06-28-${releaseId}`)

async function download(relativePath) {
  const normalized = relativePath.replace(/^\//, '')
  const url = `${base}/${normalized}`
  const dest = path.join(outRoot, normalized)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
  return { relativePath: normalized, bytes: buf.length }
}

function collectPrecacheUrls(swText) {
  const urls = new Set()
  for (const m of swText.matchAll(/url:"([^"]+)"/g)) urls.add(m[1])
  urls.add('sw.js')
  urls.add('workbox-9c191d2f.js')
  urls.add('manifest.webmanifest')
  return [...urls]
}

if (fs.existsSync(outRoot)) fs.rmSync(outRoot, { recursive: true, force: true })
fs.mkdirSync(outRoot, { recursive: true })

const swText = await (await fetch(`${base}/sw.js`, { cache: 'no-store' })).text()
const html = await (await fetch(`${base}/index.html`, { cache: 'no-store' })).text()
const bundle = html.match(/index-[A-Za-z0-9_-]+\.js/)?.[0]
if (!bundle) {
  console.error('Could not detect live bundle from index.html')
  process.exit(1)
}

const paths = collectPrecacheUrls(swText)
const downloaded = []
for (const p of paths.sort()) {
  const item = await download(p)
  downloaded.push(item)
  console.log('OK', item.relativePath, item.bytes)
}

const manifest = {
  releaseId,
  firebaseVersionName: releaseId,
  assembledAt: new Date().toISOString(),
  hostingUrl: base,
  bundle: { indexJs: `assets/${bundle}` },
  fileCount: downloaded.length,
  files: downloaded.map((d) => d.relativePath),
  notes: 'Downloaded from live Firebase Hosting CDN.',
}
fs.writeFileSync(path.join(outRoot, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`\nSnapshot saved → ${outRoot}`)
console.log(`Files: ${downloaded.length}, bundle: ${bundle}`)

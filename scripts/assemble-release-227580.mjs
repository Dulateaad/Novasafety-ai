/**
 * Assemble Firebase Hosting release 227580 (a0bb14cae4227580) into releases/227580/dist
 * Core bundle recovered from recovery/hosting-227580 (2026-06-26 ~10:52).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseRoot = path.join(root, 'releases', '227580-a0bb14cae4227580')
const outDist = path.join(releaseRoot, 'dist')
const core = path.join(root, 'recovery', 'hosting-227580')
const liveDist = path.join(root, 'dist')
const publicDir = path.join(root, 'public')
const baseUrl = 'https://naryad-67194.web.app'

function copyTree(src, dest, filter) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, name.name)
    const d = path.join(dest, name.name)
    if (name.isDirectory()) copyTree(s, d, filter)
    else if (!filter || filter(s)) fs.copyFileSync(s, d)
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

async function download(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500 && buf.toString('utf8', 0, 20).includes('<!doctype')) {
    throw new Error(`GET ${url} returned HTML (asset missing on CDN)`)
  }
  fs.writeFileSync(dest, buf)
  return buf.length
}

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

rmDir(outDist)
fs.mkdirSync(outDist, { recursive: true })

if (!fs.existsSync(path.join(core, 'index.html'))) {
  console.error('Missing recovery/hosting-227580 — run recovery first.')
  process.exit(1)
}

copyTree(core, outDist)

const cdnAssets = [
  'assets/lottie-CHqRz0sE.js',
  'assets/pdfmake-cqszUjON.js',
  'assets/vfs_fonts-BMirvy0U.js',
  'assets/workbox-window.prod.es5-Di3ct3up.js',
]

for (const rel of cdnAssets) {
  const dest = path.join(outDist, rel.replace(/\//g, path.sep))
  if (fs.existsSync(dest)) continue
  const bytes = await download(`${baseUrl}/${rel}`, dest)
  console.log(`CDN OK ${rel} (${bytes} bytes)`)
}

const fromLiveDist = [
  'assets/app-logo-BITPYPIi.png',
  'sw.js',
  'workbox-9c191d2f.js',
  'manifest.webmanifest',
  'firebase-messaging-sw.js',
  'favicon.svg',
  'icons.svg',
  'pwa-192.png',
  'pwa-512.png',
  'registerSW.js',
]

for (const rel of fromLiveDist) {
  const src = path.join(liveDist, rel)
  const dest = path.join(outDist, rel)
  if (fs.existsSync(src)) {
    copyFile(src, dest)
    console.log(`dist copy ${rel}`)
  } else if (fs.existsSync(path.join(publicDir, rel))) {
    copyFile(path.join(publicDir, rel), dest)
    console.log(`public copy ${rel}`)
  }
}

copyTree(path.join(publicDir, 'animations'), path.join(outDist, 'animations'))
copyTree(path.join(publicDir, 'samples'), path.join(outDist, 'samples'))
copyTree(path.join(publicDir, 'certificates'), path.join(outDist, 'certificates'))
copyTree(path.join(publicDir, 'assets', 'abr'), path.join(outDist, 'assets', 'abr'))

const manifest = {
  releaseId: '227580',
  firebaseVersionName: 'a0bb14cae4227580',
  deployedAt: '2026-06-26T10:52:00+05:00',
  deployedBy: 'dulatea.re@gmail.com',
  bundle: {
    indexJs: 'assets/index-uHv8gsD8.js',
    indexCss: 'assets/index-DB9Q8wtE.css',
    getLocale: 'assets/getLocale-LQ-IKux0.js',
    buildWorkPermissionPdf: 'assets/buildWorkPermissionPdf-hkaRoSSY.js',
  },
  hostingUrl: 'https://naryad-67194.web.app',
  assembledAt: new Date().toISOString(),
  notes:
    'Pinned production snapshot. Deploy with: npm run deploy:release-227580 (hosting only). Functions baseline: releases/227580-a0bb14cae4227580/functions/',
}

const fnSnap = path.join(releaseRoot, 'functions')
const fnSrc = path.join(root, 'recovery', 'all-transcripts', 'functions')
if (fs.existsSync(fnSrc) && !fs.existsSync(fnSnap)) {
  copyTree(fnSrc, fnSnap, (p) => !p.includes(`${path.sep}node_modules${path.sep}`))
  console.log('Functions snapshot copied from recovery/all-transcripts/functions')
}

fs.writeFileSync(path.join(releaseRoot, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n')

console.log(`\nRelease assembled → ${outDist}`)
console.log(`Manifest → ${path.join(releaseRoot, 'MANIFEST.json')}`)

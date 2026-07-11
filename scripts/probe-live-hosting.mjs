/**
 * Probe live Firebase Hosting bundle and download referenced root assets.
 */
const base = 'https://naryad-67194.web.app'

const html = await (await fetch(`${base}/index.html`, { cache: 'no-store' })).text()
const bundleMatch = html.match(/index-[A-Za-z0-9_-]+\.js/)
console.log('live bundle:', bundleMatch?.[0])

const urls = new Set([
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/workbox-9c191d2f.js',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/icons.svg',
])
for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) urls.add(m[1])

let ok = 0
let fail = 0
for (const u of [...urls].sort()) {
  const r = await fetch(`${base}${u}`, { cache: 'no-store' })
  const len = (await r.arrayBuffer()).byteLength
  if (r.ok) ok++
  else fail++
  console.log(r.status, u, len)
}
console.log(`\nindex refs: ${urls.size}, ok: ${ok}, fail: ${fail}`)

const sw = await (await fetch(`${base}/sw.js`, { cache: 'no-store' })).text()
const precache = [...new Set([...sw.matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]))]
console.log(`\nprecache urls in sw.js: ${precache.length}`)
let pOk = 0
let pMiss = 0
for (const u of precache.sort()) {
  const r = await fetch(`${base}${u}`, { cache: 'no-store' })
  if (r.ok) pOk++
  else {
    pMiss++
    console.log('MISS', r.status, u)
  }
}
console.log(`precache ok: ${pOk}, miss: ${pMiss}`)
console.log(
  'bundles:',
  precache.filter((u) => /index-[A-Za-z0-9_-]+\.(js|css)/.test(u)).join(', '),
)

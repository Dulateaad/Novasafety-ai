/**
 * Deploy pinned live snapshot 6c61f9 to Firebase Hosting (no rebuild from src).
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseId = '6c61f9'
const releaseDist = path.join(root, 'releases', `snapshot-2026-06-28-${releaseId}`)
const liveDist = path.join(root, 'dist')
const backupDist = path.join(releaseDist, 'dist-backup-before-deploy')
const expectedBundle = 'index-CXa-5q-X.js'

if (!fs.existsSync(path.join(releaseDist, 'index.html'))) {
  console.error(`Missing snapshot. Run: node scripts/fetch-live-hosting-snapshot.mjs ${releaseId}`)
  process.exit(1)
}

const index = fs.readFileSync(path.join(releaseDist, 'index.html'), 'utf8')
if (!index.includes(expectedBundle)) {
  console.error(`Snapshot does not reference ${expectedBundle} — aborting.`)
  process.exit(1)
}

if (fs.existsSync(liveDist)) {
  fs.rmSync(backupDist, { recursive: true, force: true })
  fs.cpSync(liveDist, backupDist, { recursive: true })
}

fs.rmSync(liveDist, { recursive: true, force: true })
fs.cpSync(releaseDist, liveDist, {
  recursive: true,
  filter: (src) =>
    !src.endsWith(`${path.sep}MANIFEST.json`) &&
    !src.includes(`${path.sep}dist-backup-before-deploy`),
})

console.log(`Deploying snapshot ${releaseId} (${expectedBundle}) to Firebase Hosting…`)
execSync('firebase deploy --only hosting --non-interactive', { cwd: root, stdio: 'inherit' })

console.log(`\nDone. Live bundle: ${expectedBundle}`)

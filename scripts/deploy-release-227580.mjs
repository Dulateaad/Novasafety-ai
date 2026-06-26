/**
 * Deploy pinned release 227580 to Firebase Hosting (no rebuild from src).
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDist = path.join(root, 'releases', '227580-a0bb14cae4227580', 'dist')
const liveDist = path.join(root, 'dist')
const backupDist = path.join(root, 'releases', '227580-a0bb14cae4227580', 'dist-backup-before-deploy')

if (!fs.existsSync(path.join(releaseDist, 'index.html'))) {
  console.error('Run npm run release:227580:assemble first.')
  process.exit(1)
}

const index = fs.readFileSync(path.join(releaseDist, 'index.html'), 'utf8')
if (!index.includes('index-uHv8gsD8.js')) {
  console.error('Release dist does not reference index-uHv8gsD8.js — aborting.')
  process.exit(1)
}

if (fs.existsSync(liveDist)) {
  fs.rmSync(backupDist, { recursive: true, force: true })
  fs.cpSync(liveDist, backupDist, { recursive: true })
}

fs.rmSync(liveDist, { recursive: true, force: true })
fs.cpSync(releaseDist, liveDist, { recursive: true })

console.log('Deploying release 227580 (a0bb14cae4227580) to Firebase Hosting…')
execSync('firebase deploy --only hosting', { cwd: root, stdio: 'inherit' })

console.log('\nDone. Live bundle: index-uHv8gsD8.js')

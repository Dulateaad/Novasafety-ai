/**
 * Дописывает VITE_FIREBASE_VAPID_KEY в .env.
 *
 *   node scripts/register-fcm-vapid.mjs <PUBLIC_KEY>
 *   node scripts/register-fcm-vapid.mjs --generate
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const envPath = join(root, '.env')

function upsertEnv(publicKey) {
  const line = `VITE_FIREBASE_VAPID_KEY=${publicKey}`
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, 'utf8')
    return line
  }
  const raw = readFileSync(envPath, 'utf8')
  if (/^VITE_FIREBASE_VAPID_KEY=/m.test(raw)) {
    writeFileSync(
      envPath,
      raw.replace(/^VITE_FIREBASE_VAPID_KEY=.*$/m, line),
      'utf8',
    )
  } else {
    const sep = raw.endsWith('\n') ? '' : '\n'
    writeFileSync(envPath, `${raw}${sep}${line}\n`, 'utf8')
  }
  return line
}

function generatePair() {
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', 'web-push', 'generate-vapid-keys', '--json'],
    { cwd: root, encoding: 'utf8' },
  )
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || 'web-push generate failed')
  }
  return JSON.parse(r.stdout.trim())
}

const args = process.argv.slice(2)
const generate = args.includes('--generate')
const publicKey = args.find((a) => !a.startsWith('--'))?.trim()

if (generate) {
  const pair = generatePair()
  const line = upsertEnv(pair.publicKey)
  console.log(`OK: ${line}`)
  console.log('')
  console.log('Импортируйте private key в Firebase Console (один раз):')
  console.log('  naryad-67194 → ⚙ Project settings → Cloud Messaging')
  console.log('  → Web Push certificates → Import key pair')
  console.log('')
  console.log(`Public:  ${pair.publicKey}`)
  console.log(`Private: ${pair.privateKey}`)
  console.log('')
  console.log('Дальше: npm run build && firebase deploy --only hosting')
  process.exit(0)
}

if (!publicKey) {
  console.error(`Usage:
  node scripts/register-fcm-vapid.mjs <VAPID_PUBLIC_KEY>
  node scripts/register-fcm-vapid.mjs --generate

Получить ключ из Console:
  Firebase → naryad-67194 → Project settings → Cloud Messaging
  → Web Push certificates → Generate key pair`)
  process.exit(1)
}

const line = upsertEnv(publicKey)
console.log(`OK: ${line}`)
console.log('Дальше: npm run build && firebase deploy --only hosting')

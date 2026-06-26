/**
 * Дописывает VITE_FIREBASE_VAPID_KEY в .env.
 *
 * Public key берётся из Firebase Console:
 *   Project settings → Cloud Messaging → Web Push certificates → Key pair
 *
 *   node scripts/register-fcm-vapid.mjs <PUBLIC_KEY>
 *   node scripts/register-fcm-vapid.mjs --print-env-line <PUBLIC_KEY>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
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

const args = process.argv.slice(2).filter((a) => a !== '--print-env-line')
const publicKey = args[0]?.trim()

if (!publicKey) {
  console.error(`Usage:
  node scripts/register-fcm-vapid.mjs <VAPID_PUBLIC_KEY>

Получить ключ:
  Firebase Console → naryad-67194 → ⚙ Project settings → Cloud Messaging
  → Web Push certificates → Generate key pair (или скопируйте существующий public key)`)
  process.exit(1)
}

const line = upsertEnv(publicKey)
if (process.argv.includes('--print-env-line')) {
  console.log(line)
} else {
  console.log(`OK: ${line}`)
  console.log('Дальше: npm run build && firebase deploy --only hosting')
}

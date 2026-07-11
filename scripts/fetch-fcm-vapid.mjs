/**
 * Пытается прочитать Web Push public key из Firebase (getConfig) и записать в .env.
 *   node scripts/fetch-fcm-vapid.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  getAccessToken,
  getProjectDefaultAccount,
  getGlobalDefaultAccount,
  setActiveAccount,
} = require('firebase-tools/lib/auth')

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const envPath = join(root, '.env')

const PROJECT_ID = 'naryad-67194'
const APP_ID = '1:688966629116:web:d77beb5473020c02d24979'

function upsertEnv(publicKey) {
  const line = `VITE_FIREBASE_VAPID_KEY=${publicKey}`
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, 'utf8')
    return
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
}

function findPublicKey(obj, depth = 0) {
  if (!obj || depth > 8) return null
  if (typeof obj === 'string') {
    if (/^[A-Za-z0-9_-]{80,}$/.test(obj) && obj.length >= 80 && obj.length <= 120) {
      return obj
    }
    return null
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findPublicKey(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (/publicKey|vapid|webPush/i.test(key) && typeof val === 'string' && val.length > 40) {
        return val
      }
      const found = findPublicKey(val, depth + 1)
      if (found) return found
    }
  }
  return null
}

async function main() {
  const account = getProjectDefaultAccount(root) ?? getGlobalDefaultAccount()
  if (!account?.tokens?.refresh_token) throw new Error('firebase login required')
  const options = {}
  setActiveAccount(options, account)
  const tokenResult = await getAccessToken(
    account.tokens.refresh_token,
    account.tokens.scopes ?? [],
  )
  const token = tokenResult?.access_token
  if (!token) throw new Error('Unable to get Firebase access token')

  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${APP_ID}/config`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`getConfig failed: ${JSON.stringify(body)}`)
  }

  const publicKey = findPublicKey(body)
  if (!publicKey) {
    console.error('Public VAPID key не найден в getConfig.')
    console.error('Сгенерируйте пару в Firebase Console → Cloud Messaging → Web Push certificates')
    console.error('Затем: node scripts/register-fcm-vapid.mjs <PUBLIC_KEY>')
    process.exit(1)
  }

  upsertEnv(publicKey)
  console.log('OK: VITE_FIREBASE_VAPID_KEY записан в .env')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

/**
 * Удаляет учётную запись abylay2@nova.local из Auth и Firestore.
 *   firebase login
 *   node scripts/delete-abylay2-user.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const PROJECT_ID = 'naryad-67194'
const EMAIL = 'abylay2@nova.local'

function loadAccessToken() {
  const cfgPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  if (!existsSync(cfgPath)) {
    console.error('Сначала выполните: firebase login')
    process.exit(1)
  }
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  const token = cfg?.tokens?.access_token
  if (!token) {
    console.error('Нет access_token. Выполните: firebase login')
    process.exit(1)
  }
  return token
}

async function authRequest(path, body) {
  const token = loadAccessToken()
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json?.error?.message ?? res.statusText
    throw new Error(msg)
  }
  return json
}

async function firestoreDelete(uid, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Firestore delete: ${err}`)
  }
}

async function main() {
  const token = loadAccessToken()
  const lookup = await authRequest(`projects/${PROJECT_ID}/accounts:lookup`, {
    email: [EMAIL],
  })
  const found = lookup.users?.[0]
  if (!found?.localId) {
    console.log(`Аккаунт ${EMAIL} не найден — пропуск.`)
    return
  }

  const uid = found.localId
  await authRequest(`projects/${PROJECT_ID}/accounts:delete`, { localId: uid })
  console.log(`✓ Удалён из Auth: ${EMAIL} (${uid})`)

  await firestoreDelete(uid, token)
  console.log(`✓ Удалён профиль Firestore: users/${uid}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

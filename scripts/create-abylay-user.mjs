/**
 * Создаёт учётную запись производителя abylay@nova.local в Auth + Firestore.
 *   firebase login
 *   node scripts/create-abylay-user.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const PROJECT_ID = 'naryad-67194'

const USER = {
  email: 'abylay@nova.local',
  password: 'Abylay123',
  displayName: 'Абылай Акмалиев',
  role: 'performer',
  badgeNo: '009',
}

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

async function firestorePatch(uid, data, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=displayName&updateMask.fieldPaths=role&updateMask.fieldPaths=email&updateMask.fieldPaths=badgeNo`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        displayName: { stringValue: data.displayName },
        role: { stringValue: data.role },
        email: { stringValue: data.email },
        badgeNo: { stringValue: data.badgeNo ?? '' },
      },
    }),
  })
  if (!res.ok) {
    const urlCreate = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${uid}`
    const resCreate = await fetch(urlCreate, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          displayName: { stringValue: data.displayName },
          role: { stringValue: data.role },
          email: { stringValue: data.email },
          badgeNo: { stringValue: data.badgeNo ?? '' },
        },
      }),
    })
    if (!resCreate.ok) {
      const err = await resCreate.text()
      throw new Error(`Firestore: ${err}`)
    }
  }
}

async function main() {
  const existing = await authRequest(`projects/${PROJECT_ID}/accounts:lookup`, {
    email: [USER.email],
  })
  const found = existing.users?.[0]
  let uid

  if (found?.localId) {
    await authRequest(`projects/${PROJECT_ID}/accounts:update`, {
      localId: found.localId,
      email: USER.email,
      password: USER.password,
      displayName: USER.displayName,
      emailVerified: true,
    })
    uid = found.localId
    console.log(`↻ Обновлён: ${USER.email} (${uid})`)
  } else {
    const created = await authRequest(`projects/${PROJECT_ID}/accounts`, {
      email: USER.email,
      password: USER.password,
      displayName: USER.displayName,
      emailVerified: true,
    })
    uid = created.localId
    console.log(`+ Создан: ${USER.email} (${uid})`)
  }

  await firestorePatch(uid, USER, loadAccessToken())

  console.log('')
  console.log('=== Вход на сайте ===')
  console.log(`Логин:   ${USER.email}`)
  console.log(`Пароль:  ${USER.password}`)
  console.log(`Роль:    Производитель работ`)
  console.log(`ФИО:     ${USER.displayName}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

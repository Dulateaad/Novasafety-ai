/**
 * Создаёт/обновляет учётные записи ролей через Firebase Admin REST API
 * (использует access_token из firebase login).
 *
 *   firebase login
 *   npm run bootstrap-roles:firebase
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const PROJECT_ID = 'naryad-67194'

const ROLE_USERS = [
  {
    email: 'performer@nova.local',
    password: 'Performer123',
    displayName: 'Сидоров — производитель работ',
    role: 'performer',
  },
  {
    email: 'performer2@nova.local',
    password: 'Performer223',
    displayName: 'Каменов — производитель работ',
    role: 'performer',
  },
  {
    email: 'performer3@nova.local',
    password: 'Performer323',
    displayName: 'Токаев — производитель работ',
    role: 'performer',
  },
  {
    email: 'performer4@nova.local',
    password: 'Performer423',
    displayName: 'Байжанов — производитель работ',
    role: 'performer',
  },
  {
    email: 'temirlan@nova.local',
    password: 'Temirlan523',
    displayName: 'Темирлан Уахитов',
    role: 'issuer',
  },
  {
    email: 'abylay2@nova.local',
    password: 'Abylay2523',
    displayName: 'Абылай Акмалиев',
    role: 'performer',
  },
  {
    email: 'nurkhan@nova.local',
    password: 'Nurkhan523',
    displayName: 'Нурхан Каниев',
    role: 'performer',
  },
  {
    email: 'permitter@nova.local',
    password: 'Permitter123',
    displayName: 'Ибат Габитжан',
    role: 'permitter',
  },
  {
    email: 'lead@nova.local',
    password: 'Lead123',
    displayName: 'Али Зайнуллин',
    role: 'leadExpert',
  },
  {
    email: 'worker1@nova.local',
    password: 'Worker123',
    displayName: 'Алибек К. — слесарь-монтажник',
    role: 'executor',
  },
  {
    email: 'worker2@nova.local',
    password: 'Worker223',
    displayName: 'Бахыт А. — электромонтер',
    role: 'executor',
  },
  {
    email: 'worker3@nova.local',
    password: 'Worker323',
    displayName: 'Серик Н. — сварщик',
    role: 'executor',
  },
  {
    email: 'worker4@nova.local',
    password: 'Worker423',
    displayName: 'Ерлан Ж. — аппаратчик',
    role: 'executor',
  },
  {
    email: 'worker5@nova.local',
    password: 'Worker523',
    displayName: 'Марат О. — машинист крана',
    role: 'executor',
  },
  {
    email: 'worker6@nova.local',
    password: 'Worker623',
    displayName: 'Данияр Т. — газорезчик',
    role: 'executor',
  },
  {
    email: 'worker7@nova.local',
    password: 'Worker723',
    displayName: 'Гульнара С. — оператор установки',
    role: 'executor',
  },
]

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

async function lookupEmail(email) {
  const data = await authRequest(`projects/${PROJECT_ID}/accounts:lookup`, {
    email: [email],
  })
  return data.users?.[0] ?? null
}

async function upsertUser(spec) {
  const existing = await lookupEmail(spec.email)
  if (existing?.localId) {
    await authRequest(`projects/${PROJECT_ID}/accounts:update`, {
      localId: existing.localId,
      email: spec.email,
      password: spec.password,
      displayName: spec.displayName,
      emailVerified: true,
    })
    await firestorePatch(existing.localId, spec, loadAccessToken())
    console.log(`↻ Обновлён ${spec.role}: ${spec.email}`)
    return existing.localId
  }

  const created = await authRequest(`projects/${PROJECT_ID}/accounts`, {
    email: spec.email,
    password: spec.password,
    displayName: spec.displayName,
    emailVerified: true,
  })
  const uid = created.localId
  await firestorePatch(uid, spec, loadAccessToken())
  console.log(`+ Создан ${spec.role}: ${spec.email} (${uid})`)
  return uid
}

function formatBadge(n) {
  return String(n).padStart(3, '0')
}

async function main() {
  console.log(`Проект: ${PROJECT_ID}`)
  for (let i = 0; i < ROLE_USERS.length; i += 1) {
    await upsertUser({ ...ROLE_USERS[i], badgeNo: formatBadge(i + 1) })
  }
  console.log('\nГотово. Пример: performer@nova.local / Performer123')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

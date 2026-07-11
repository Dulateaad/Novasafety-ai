/**
 * Создаёт/обновляет учётку инспектора Рахат Алиев в Firebase Auth + Firestore.
 * Запуск: node scripts/ensureInspector.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const INSPECTOR = {
  email: 'rahataliev@nova.local',
  password: 'Rahat523',
  displayName: 'Рахат Алиев',
  role: 'safety',
  badgeNo: '018',
  inspectorSites: ['12 скважина', '21 скважина'],
}

function initAdmin() {
  if (getApps().length) return
  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    join(__dirname, '..', 'serviceAccountKey.json')
  try {
    const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'))
    initializeApp({ credential: cert(serviceAccount) })
  } catch {
    initializeApp()
  }
}

async function main() {
  initAdmin()
  const auth = getAuth()
  const db = getFirestore()

  let userRecord
  let created = false
  try {
    userRecord = await auth.getUserByEmail(INSPECTOR.email)
    await auth.updateUser(userRecord.uid, {
      displayName: INSPECTOR.displayName,
      password: INSPECTOR.password,
      emailVerified: true,
    })
    console.log('Обновлён существующий пользователь:', userRecord.uid)
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
    if (code !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email: INSPECTOR.email,
      password: INSPECTOR.password,
      displayName: INSPECTOR.displayName,
      emailVerified: true,
    })
    created = true
    console.log('Создан новый пользователь:', userRecord.uid)
  }

  await db.collection('users').doc(userRecord.uid).set(
    {
      displayName: INSPECTOR.displayName,
      role: INSPECTOR.role,
      email: INSPECTOR.email,
      badgeNo: INSPECTOR.badgeNo,
      inspectorSites: INSPECTOR.inspectorSites,
    },
    { merge: true },
  )

  console.log('')
  console.log('Инспектор по ОТ, ТБ и ООС — Рахат Алиев')
  console.log('  Email:   ', INSPECTOR.email)
  console.log('  Пароль:  ', INSPECTOR.password)
  console.log('  UID:     ', userRecord.uid)
  console.log('  Создан:  ', created ? 'да' : 'нет (обновлён)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

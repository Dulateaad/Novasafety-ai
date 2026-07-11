/**
 * Создаёт/обновляет учётку ERT (ПАС Ардак Сабитов).
 * Запуск: node scripts/ensureErt.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ERT = {
  email: 'ert@nova.local',
  password: 'Ert235',
  displayName: 'ERT Nash',
  role: 'ert',
  badgeNo: '022',
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
    userRecord = await auth.getUserByEmail(ERT.email)
    await auth.updateUser(userRecord.uid, {
      displayName: ERT.displayName,
      password: ERT.password,
      emailVerified: true,
    })
    console.log('Обновлён:', userRecord.uid)
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
    if (code !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email: ERT.email,
      password: ERT.password,
      displayName: ERT.displayName,
      emailVerified: true,
    })
    created = true
    console.log('Создан:', userRecord.uid)
  }

  await db.collection('users').doc(userRecord.uid).set(ERT, { merge: true })

  console.log('')
  console.log('Emergency Response Team — ERT Nash')
  console.log('  Email:  ', ERT.email)
  console.log('  Пароль: ', ERT.password)
  console.log('  Роль:   ', 'Emergency Response Team (ert)')
  console.log('  UID:    ', userRecord.uid)
  console.log('  Создан: ', created ? 'да' : 'нет (обновлён)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

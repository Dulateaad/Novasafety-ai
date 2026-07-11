/**
 * Создаёт администратора NOVA Safety в Firebase Auth и документ users/{uid}.
 *
 * Требуется ключ сервисного аккаунта (не коммитить в репозиторий):
 * Firebase Console → Проект → Параметры (шестерёнка) → Учётные записи служб
 * → Firebase Admin SDK → создать новый закрытый ключ → JSON.
 *
 * PowerShell:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\to\serviceAccount.json"
 *   npm run bootstrap-admin
 *
 * Вход в веб-приложении (Email/Password): Admin@nova.local / Admin123
 * (Firebase не принимает «логин без @», поэтому используется такой email.)
 */

import { readFileSync, existsSync } from 'fs'
import admin from 'firebase-admin'

const ADMIN_EMAIL = 'Admin@nova.local'
const ADMIN_PASSWORD = 'Admin123'
const ADMIN_DISPLAY = 'Администратор'

function loadServiceAccount() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!path || !existsSync(path)) {
    console.error(
      'Укажите переменную окружения GOOGLE_APPLICATION_CREDENTIALS — полный путь к JSON ключу сервисного аккаунта.',
    )
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function main() {
  const sa = loadServiceAccount()
  admin.initializeApp({
    credential: admin.credential.cert(sa),
  })

  let userRecord
  try {
    userRecord = await admin.auth().createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      emailVerified: true,
      displayName: ADMIN_DISPLAY,
    })
    console.log('Создан пользователь Authentication:', userRecord.uid)
  } catch (e) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String(e.code)
        : ''
    if (code === 'auth/email-already-exists') {
      userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL)
      console.log('Пользователь уже есть, UID:', userRecord.uid)
      await admin.auth().updateUser(userRecord.uid, {
        password: ADMIN_PASSWORD,
        displayName: ADMIN_DISPLAY,
      })
      console.log('Обновлены пароль и имя в Authentication.')
    } else throw e
  }

  await admin
    .firestore()
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName: ADMIN_DISPLAY,
        role: 'coordinator',
        email: ADMIN_EMAIL,
      },
      { merge: true },
    )

  console.log('')
  console.log('Готово. Вход на сайте:')
  console.log('  Email:    ', ADMIN_EMAIL)
  console.log('  Пароль:   ', ADMIN_PASSWORD)
  console.log('  Роль:     coordinator (полный координатор)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

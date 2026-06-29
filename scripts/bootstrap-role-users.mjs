/**
 * Создаёт учётные записи ролей процесса НДПР в Firebase Auth + users/{uid}.
 *
 * PowerShell:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\to\serviceAccount.json"
 *   npm run bootstrap-roles
 */

import { readFileSync, existsSync } from 'fs'
import admin from 'firebase-admin'

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
    email: 'temirlan-safety@nova.local',
    password: 'Safety523',
    displayName: 'Уахитов Темирлан — инженер по ОТ, ТБ и ООС',
    role: 'safety',
  },
  {
    email: 'worker1@nova.local',
    password: 'Worker123',
    displayName: 'Алибек Ким — слесарь-монтажник',
    role: 'executor',
  },
  {
    email: 'worker2@nova.local',
    password: 'Worker223',
    displayName: 'Бахыт Алиев — электромонтер',
    role: 'executor',
  },
  {
    email: 'worker3@nova.local',
    password: 'Worker323',
    displayName: 'Серик Нурланов — сварщик',
    role: 'executor',
  },
  {
    email: 'worker4@nova.local',
    password: 'Worker423',
    displayName: 'Ерлан Жумабеков — аппаратчик',
    role: 'executor',
  },
  {
    email: 'worker5@nova.local',
    password: 'Worker523',
    displayName: 'Марат Оразов — машинист крана',
    role: 'executor',
  },
  {
    email: 'worker6@nova.local',
    password: 'Worker623',
    displayName: 'Данияр Тлеуберген — газорезчик',
    role: 'executor',
  },
  {
    email: 'worker7@nova.local',
    password: 'Worker723',
    displayName: 'Гульнара Сейтова — оператор установки',
    role: 'executor',
  },
]

function loadServiceAccount() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!path || !existsSync(path)) {
    console.error(
      'Укажите GOOGLE_APPLICATION_CREDENTIALS — полный путь к JSON ключу сервисного аккаунта Firebase.',
    )
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function upsertRoleUser(auth, firestore, spec) {
  let userRecord
  try {
    userRecord = await auth.createUser({
      email: spec.email,
      password: spec.password,
      emailVerified: true,
      displayName: spec.displayName,
    })
    console.log(`+ Создан ${spec.role}: ${spec.email} (${userRecord.uid})`)
  } catch (e) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
    if (code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(spec.email)
      await auth.updateUser(userRecord.uid, {
        password: spec.password,
        displayName: spec.displayName,
      })
      console.log(`↻ Обновлён ${spec.role}: ${spec.email} (${userRecord.uid})`)
    } else {
      throw e
    }
  }

  await firestore
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName: spec.displayName,
        role: spec.role,
        email: spec.email,
        badgeNo: spec.badgeNo,
        ...(spec.iin ? { iin: spec.iin } : {}),
      },
      { merge: true },
    )
}

function formatBadge(n) {
  return String(n).padStart(3, '0')
}

async function main() {
  const sa = loadServiceAccount()
  admin.initializeApp({ credential: admin.credential.cert(sa) })

  const auth = admin.auth()
  const firestore = admin.firestore()

  for (let i = 0; i < ROLE_USERS.length; i += 1) {
    await upsertRoleUser(auth, firestore, {
      ...ROLE_USERS[i],
      badgeNo: formatBadge(i + 1),
    })
  }

  console.log('')
  console.log('=== Учётные записи для входа на сайте ===')
  console.log('')
  for (const u of ROLE_USERS) {
    console.log(`${u.displayName}`)
    console.log(`  Email:   ${u.email}`)
    console.log(`  Пароль:  ${u.password}`)
    console.log(`  Роль:    ${u.role}`)
    console.log(`  Пропуск: ${formatBadge(ROLE_USERS.indexOf(u) + 1)}`)
    console.log('')
  }
  console.log('Администратор (если уже создан): Admin@nova.local / Admin123')
  console.log('')
  console.log(
    'Порядок согласования: допускающий → выдающий → утверждающий (кат. 1) → выдающий переводит в «Выдан».',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

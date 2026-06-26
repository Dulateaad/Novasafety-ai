import { readFileSync, existsSync } from 'fs'
import admin from 'firebase-admin'

const PROJECT_ID = 'naryad-67194'

export function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin

  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (saPath && existsSync(saPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(readFileSync(saPath, 'utf8'))),
      projectId: PROJECT_ID,
    })
    return admin
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    })
    return admin
  } catch {
    console.error(
      'Нужен ключ сервисного аккаунта Firebase:\n' +
        '  $env:GOOGLE_APPLICATION_CREDENTIALS="D:\\path\\to\\serviceAccount.json"\n' +
        'или выполните: gcloud auth application-default login',
    )
    process.exit(1)
  }
}

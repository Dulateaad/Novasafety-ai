/**
 * Удаляет все документы из коллекции permits (и подколлекции journal).
 *
 * PowerShell:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\to\serviceAccount.json"
 *   npm run clear-permits
 */

import { readFileSync, existsSync } from 'fs'
import admin from 'firebase-admin'

function loadServiceAccount() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!path || !existsSync(path)) {
    console.error(
      'Укажите GOOGLE_APPLICATION_CREDENTIALS — путь к JSON ключу сервисного аккаунта Firebase.',
    )
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function deletePermit(db, permitId) {
  const journalSnap = await db
    .collection('permits')
    .doc(permitId)
    .collection('journal')
    .get()
  const batch = db.batch()
  journalSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(db.collection('permits').doc(permitId))
  await batch.commit()
}

async function main() {
  const sa = loadServiceAccount()
  admin.initializeApp({ credential: admin.credential.cert(sa) })
  const db = admin.firestore()

  const snap = await db.collection('permits').get()
  if (snap.empty) {
    console.log('Коллекция permits пуста — нечего удалять.')
    return
  }

  console.log(`Найдено нарядов: ${snap.size}. Удаляю…`)
  for (const doc of snap.docs) {
    await deletePermit(db, doc.id)
    console.log('  удалён', doc.id)
  }
  console.log('Готово.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

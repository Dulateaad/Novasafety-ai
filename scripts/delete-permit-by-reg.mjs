/**
 * Удалить наряд по registrationRefNo (например 003).
 *   node scripts/delete-permit-by-reg.mjs 003
 */

import { initFirebaseAdmin } from './firebaseAdminInit.mjs'

async function deletePermit(db, permitId) {
  const journalSnap = await db.collection('permits').doc(permitId).collection('journal').get()
  const batch = db.batch()
  journalSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(db.collection('permits').doc(permitId))
  await batch.commit()
}

async function main() {
  const reg = String(process.argv[2] ?? '').trim()
  if (!reg) {
    console.error('Укажите номер: node scripts/delete-permit-by-reg.mjs 003')
    process.exit(1)
  }

  const admin = initFirebaseAdmin()
  const db = admin.firestore()
  const snap = await db.collection('permits').get()
  const matches = snap.docs.filter((d) => {
    const data = d.data()
    const ref = String(data.registrationRefNo ?? '').trim()
    return ref === reg || ref === reg.padStart(3, '0')
  })

  if (!matches.length) {
    console.log(`Наряд № ${reg} не найден в Firestore (всего нарядов: ${snap.size}).`)
    return
  }

  for (const doc of matches) {
    const data = doc.data()
    console.log(`Удаляю № ${data.registrationRefNo ?? reg} (id=${doc.id}, status=${data.status ?? '?'})…`)
    await deletePermit(db, doc.id)
    console.log('  готово')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

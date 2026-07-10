import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, firebaseConfigured } from './firebase'

const LOCAL_EMAIL = /@(?:nova\.local|localhost|example\.(?:com|org|net))$/i

export function isNotificationEmailValid(raw: string): boolean {
  const email = raw.trim()
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !LOCAL_EMAIL.test(email)
}

export async function saveNotificationEmail(uid: string, email: string): Promise<void> {
  if (!firebaseConfigured || !db) {
    throw new Error('Firebase не настроен')
  }
  const cleanUid = uid.trim()
  if (!cleanUid) {
    throw new Error('Не указан пользователь')
  }
  const trimmed = email.trim()
  if (trimmed && !isNotificationEmailValid(trimmed)) {
    throw new Error('Укажите реальный адрес (не @nova.local)')
  }

  const ref = doc(db, 'users', cleanUid)
  await setDoc(
    ref,
    {
      notificationEmail: trimmed,
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  )

  const snap = await getDoc(ref)
  const saved = String(snap.data()?.notificationEmail ?? '').trim()
  if (saved !== trimmed) {
    throw new Error('Email не сохранился в Firestore — проверьте права координатора')
  }
}

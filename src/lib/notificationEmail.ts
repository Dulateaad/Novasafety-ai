import { doc, setDoc } from 'firebase/firestore'
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
  const trimmed = email.trim()
  if (trimmed && !isNotificationEmailValid(trimmed)) {
    throw new Error('Укажите реальный адрес (не @nova.local)')
  }
  await setDoc(
    doc(db, 'users', uid),
    {
      notificationEmail: trimmed,
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  )
}

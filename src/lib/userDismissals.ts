import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'
import { db, firebaseConfigured } from './firebase'

/** Стабильный id документа dismissals (без / и странных символов). */
export function dismissalDocId(kind: string, key: string): string {
  const raw = `${kind}__${key}`
  return raw.replace(/[/\s]/g, '_').slice(0, 700)
}

function localStorageKey(userId: string): string {
  return `nova_user_dismissals_v1_${userId}`
}

function readLocal(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(localStorageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeLocal(userId: string, keys: Set<string>): void {
  try {
    localStorage.setItem(localStorageKey(userId), JSON.stringify([...keys]))
  } catch {
    /* private mode / quota */
  }
}

/** Загрузить скрытые ключи: localStorage + Firestore. */
export async function loadUserDismissals(userId: string): Promise<Set<string>> {
  const local = readLocal(userId)
  if (!firebaseConfigured || !db || !userId.trim()) return local
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'dismissals'))
    const next = new Set(local)
    snap.forEach((d) => {
      const key = String(d.data()?.key ?? d.id)
      if (key) next.add(key)
    })
    writeLocal(userId, next)
    return next
  } catch (e) {
    console.warn('[NOVA] loadUserDismissals failed', e)
    return local
  }
}

/** Скрыть уведомление навсегда (для этого пользователя). */
export async function persistUserDismissal(
  userId: string,
  kind: string,
  key: string,
): Promise<Set<string>> {
  const cleanUid = userId.trim()
  const cleanKey = key.trim()
  if (!cleanUid || !cleanKey) return readLocal(cleanUid)

  const fullKey = `${kind}:${cleanKey}`
  const next = readLocal(cleanUid)
  next.add(fullKey)
  writeLocal(cleanUid, next)

  if (firebaseConfigured && db) {
    try {
      await setDoc(
        doc(db, 'users', cleanUid, 'dismissals', dismissalDocId(kind, cleanKey)),
        {
          key: fullKey,
          kind,
          rawKey: cleanKey,
          updatedAtIso: new Date().toISOString(),
        },
        { merge: true },
      )
    } catch (e) {
      console.warn('[NOVA] persistUserDismissal failed', e)
    }
  }
  return next
}

export function hasUserDismissal(
  dismissed: ReadonlySet<string>,
  kind: string,
  key: string,
): boolean {
  return dismissed.has(`${kind}:${key}`)
}

/** Для тестов / сброса. */
export async function clearUserDismissal(
  userId: string,
  kind: string,
  key: string,
): Promise<void> {
  const fullKey = `${kind}:${key}`
  const next = readLocal(userId)
  next.delete(fullKey)
  writeLocal(userId, next)
  if (firebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'dismissals', dismissalDocId(kind, key)))
    } catch {
      /* ignore */
    }
  }
}

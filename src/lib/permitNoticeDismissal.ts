import { doc, setDoc } from 'firebase/firestore'
import type { PermitNotice } from '../types/permitNotice'
import { db, firebaseConfigured } from './firebase'

type DismissStore = Record<string, string> // noticeId -> dismissedAtIso

function storageKey(userId: string): string {
  return `nova_permit_notice_dismissed_v2_${userId}`
}

function readStore(userId: string): DismissStore {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as DismissStore
  } catch {
    return {}
  }
}

function writeStore(userId: string, store: DismissStore): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(store))
  } catch {
    /* private mode / quota */
  }
}

/** Ids, которые сейчас нужно скрыть (с учётом повторной рассылки). */
export function loadDismissedPermitNoticeIds(
  userId: string,
  notices: readonly PermitNotice[] = [],
): Set<string> {
  const store = readStore(userId)
  // legacy v1: массив id
  try {
    const legacy = localStorage.getItem(`nova_permit_notice_dismissed_v1_${userId}`)
    if (legacy) {
      const arr = JSON.parse(legacy) as string[]
      if (Array.isArray(arr)) {
        for (const id of arr) {
          if (id && !store[id]) store[id] = '1970-01-01T00:00:00.000Z'
        }
      }
    }
  } catch {
    /* ignore */
  }

  const hidden = new Set<string>()
  for (const [id, dismissedAt] of Object.entries(store)) {
    const notice = notices.find((n) => n.id === id)
    if (!notice) {
      // Нет в выдаче (status dismissed на сервере) — оставляем скрытым
      hidden.add(id)
      continue
    }
    const updated = notice.updatedAtIso ?? notice.createdAtIso
    // Повторная рассылка обновила updatedAtIso → показать снова
    if (updated && dismissedAt && updated > dismissedAt) continue
    hidden.add(id)
  }
  return hidden
}

export async function dismissPermitNotice(
  userId: string,
  notice: PermitNotice,
): Promise<Set<string>> {
  const id = notice.id.trim()
  if (!id) return loadDismissedPermitNoticeIds(userId)

  const at = new Date().toISOString()

  if (firebaseConfigured && db) {
    try {
      await setDoc(
        doc(db, 'permitNotices', id),
        { status: 'dismissed', updatedAtIso: at },
        { merge: true },
      )
    } catch (e) {
      console.warn('[NOVA] dismissPermitNotice firestore failed', e)
    }
  }

  try {
    const LOCAL_KEY = 'nova_permit_notices_v1'
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      const list = JSON.parse(raw) as PermitNotice[]
      if (Array.isArray(list)) {
        localStorage.setItem(
          LOCAL_KEY,
          JSON.stringify(
            list.map((n) =>
              n.id === id ? { ...n, status: 'dismissed' as const, updatedAtIso: at } : n,
            ),
          ),
        )
      }
    }
  } catch {
    /* ignore */
  }

  const store = readStore(userId)
  store[id] = at
  writeStore(userId, store)
  return loadDismissedPermitNoticeIds(userId)
}

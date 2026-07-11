import type { Firestore } from 'firebase-admin/firestore'
import type { InspectorNotifyMode } from '../workStop/types'

const SETTINGS_DOC = 'settings/app'

export type SigningAppSettings = {
  verifyEgovFio: boolean
  inspectorNotifyMode: InspectorNotifyMode
  updatedAtIso: string
  updatedByUid?: string
}

export const DEFAULT_SIGNING_APP_SETTINGS: SigningAppSettings = {
  verifyEgovFio: true,
  inspectorNotifyMode: 'global',
  updatedAtIso: '',
}

export async function getSigningAppSettings(
  db: Firestore,
): Promise<SigningAppSettings> {
  const snap = await db.doc(SETTINGS_DOC).get()
  if (!snap.exists) return { ...DEFAULT_SIGNING_APP_SETTINGS }
  const data = snap.data()!
  return {
    verifyEgovFio: data.verifyEgovFio !== false,
    inspectorNotifyMode:
      data.inspectorNotifyMode === 'site_bound' ? 'site_bound' : 'global',
    updatedAtIso: String(data.updatedAtIso ?? ''),
    updatedByUid: typeof data.updatedByUid === 'string' ? data.updatedByUid : undefined,
  }
}

export async function setSigningAppSettings(
  db: Firestore,
  patch: { verifyEgovFio: boolean },
  updatedByUid: string,
): Promise<SigningAppSettings> {
  const cur = await getSigningAppSettings(db)
  const next: SigningAppSettings = {
    ...cur,
    verifyEgovFio: patch.verifyEgovFio,
    updatedAtIso: new Date().toISOString(),
    updatedByUid,
  }
  await db.doc(SETTINGS_DOC).set(next, { merge: true })
  return next
}

export async function setInspectorNotifyMode(
  db: Firestore,
  inspectorNotifyMode: InspectorNotifyMode,
  updatedByUid: string,
): Promise<SigningAppSettings> {
  const cur = await getSigningAppSettings(db)
  const next: SigningAppSettings = {
    ...cur,
    inspectorNotifyMode,
    updatedAtIso: new Date().toISOString(),
    updatedByUid,
  }
  await db.doc(SETTINGS_DOC).set(next, { merge: true })
  return next
}

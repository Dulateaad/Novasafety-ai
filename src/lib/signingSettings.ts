import { doc, getDoc, setDoc } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db, firebaseConfigured } from './firebase'

const SETTINGS_DOC = 'settings/app'
const REGION = 'europe-west1'
const LOCAL_KEY = 'nova-signing-settings'

export type SigningAppSettings = {
  verifyEgovFio: boolean
  updatedAtIso: string
  updatedByUid?: string
}

export const DEFAULT_SIGNING_SETTINGS: SigningAppSettings = {
  verifyEgovFio: true,
  updatedAtIso: '',
}

function parseSigningSettings(data: Record<string, unknown> | undefined): SigningAppSettings {
  if (!data) return { ...DEFAULT_SIGNING_SETTINGS }
  return {
    verifyEgovFio: data.verifyEgovFio !== false,
    updatedAtIso: String(data.updatedAtIso ?? ''),
    updatedByUid: typeof data.updatedByUid === 'string' ? data.updatedByUid : undefined,
  }
}

function loadLocalSigningSettings(): SigningAppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return { ...DEFAULT_SIGNING_SETTINGS }
    return parseSigningSettings(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    return { ...DEFAULT_SIGNING_SETTINGS }
  }
}

function saveLocalSigningSettings(settings: SigningAppSettings): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings))
}

export async function fetchSigningSettings(): Promise<SigningAppSettings> {
  if (!firebaseConfigured || !db) {
    return loadLocalSigningSettings()
  }
  try {
    const snap = await getDoc(doc(db, SETTINGS_DOC))
    if (!snap.exists()) return { ...DEFAULT_SIGNING_SETTINGS }
    return parseSigningSettings(snap.data() as Record<string, unknown>)
  } catch {
    return { ...DEFAULT_SIGNING_SETTINGS }
  }
}

export async function updateSigningSettings(
  verifyEgovFio: boolean,
  updatedByUid: string,
): Promise<SigningAppSettings> {
  const next: SigningAppSettings = {
    verifyEgovFio,
    updatedAtIso: new Date().toISOString(),
    updatedByUid,
  }

  if (!firebaseConfigured || !db) {
    saveLocalSigningSettings(next)
    return next
  }

  if (app) {
    try {
      const fn = httpsCallable<{ verifyEgovFio: boolean }, SigningAppSettings>(
        getFunctions(app, REGION),
        'setSigningSettingsFn',
      )
      const res = await fn({ verifyEgovFio })
      return res.data
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : ''
      const retryDirect =
        code === 'functions/not-found' ||
        code === 'functions/unavailable' ||
        code === 'functions/internal'
      if (!retryDirect) {
        throw e instanceof Error ? e : new Error(String(e))
      }
    }
  }

  await setDoc(doc(db, SETTINGS_DOC), next, { merge: true })
  return fetchSigningSettings()
}

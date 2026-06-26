import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'

export type SigningAppSettings = {
  verifyEgovFio: boolean
  updatedAtIso: string
  updatedByUid?: string
}

export async function fetchSigningSettings(): Promise<SigningAppSettings | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<Record<string, never>, SigningAppSettings>(
    getFunctions(app, REGION),
    'getSigningSettingsFn',
  )
  const res = await fn({})
  return res.data
}

export async function updateSigningSettings(
  verifyEgovFio: boolean,
): Promise<SigningAppSettings | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<{ verifyEgovFio: boolean }, SigningAppSettings>(
    getFunctions(app, REGION),
    'setSigningSettingsFn',
  )
  const res = await fn({ verifyEgovFio })
  return res.data
}

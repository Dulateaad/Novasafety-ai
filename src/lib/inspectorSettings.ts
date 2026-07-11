import { doc, getDoc, type Firestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db, firebaseConfigured } from './firebase'
import type { InspectorNotifyMode } from '../types/workStop'

const SETTINGS_DOC = 'settings/app'
const REGION = 'europe-west1'

export type InspectorAppSettings = {
  inspectorNotifyMode: InspectorNotifyMode
}

export const DEFAULT_INSPECTOR_SETTINGS: InspectorAppSettings = {
  inspectorNotifyMode: 'global',
}

export async function fetchInspectorSettings(): Promise<InspectorAppSettings> {
  if (!firebaseConfigured || !db) return { ...DEFAULT_INSPECTOR_SETTINGS }
  try {
    const snap = await getDoc(doc(db, SETTINGS_DOC))
    if (!snap.exists()) return { ...DEFAULT_INSPECTOR_SETTINGS }
    const mode = snap.data().inspectorNotifyMode
    return {
      inspectorNotifyMode: mode === 'site_bound' ? 'site_bound' : 'global',
    }
  } catch {
    return { ...DEFAULT_INSPECTOR_SETTINGS }
  }
}

export async function updateInspectorNotifyMode(
  mode: InspectorNotifyMode,
): Promise<InspectorAppSettings | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<
    { inspectorNotifyMode: InspectorNotifyMode },
    InspectorAppSettings
  >(getFunctions(app, REGION), 'setInspectorSettingsFn')
  const res = await fn({ inspectorNotifyMode: mode })
  return res.data
}

export async function fetchInspectorSettingsAdmin(
  fs: Firestore,
): Promise<InspectorAppSettings> {
  try {
    const snap = await getDoc(doc(fs, SETTINGS_DOC))
    if (!snap.exists()) return { ...DEFAULT_INSPECTOR_SETTINGS }
    const mode = snap.data().inspectorNotifyMode
    return {
      inspectorNotifyMode: mode === 'site_bound' ? 'site_bound' : 'global',
    }
  } catch {
    return { ...DEFAULT_INSPECTOR_SETTINGS }
  }
}

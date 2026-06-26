import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'
import type { WorkStopPhoto } from '../types/workStop'

const REGION = 'europe-west1'

export type WorkStopResolveAction = 'lift' | 'annul'

export async function requestWorkStopClient(
  permitId: string,
  reason: string,
  photo?: WorkStopPhoto,
): Promise<{ ok: true } | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<
    { permitId: string; reason: string; photo?: WorkStopPhoto },
    { ok: true }
  >(getFunctions(app, REGION), 'requestWorkStopFn')
  const res = await fn({ permitId, reason, photo })
  return res.data
}

export async function resolveWorkStopClient(
  permitId: string,
  action: WorkStopResolveAction,
  comment: string,
): Promise<{ ok: true; status: string } | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<
    { permitId: string; action: WorkStopResolveAction; comment: string },
    { ok: true; status: string }
  >(getFunctions(app, REGION), 'resolveWorkStopFn')
  const res = await fn({ permitId, action, comment })
  return res.data
}

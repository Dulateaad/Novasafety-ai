import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'

export type RenumberPermitsResult = {
  total: number
  updated: number
  invitesUpdated: number
  mapping: { permitId: string; from: string; to: string }[]
}

export async function renumberPermitsClient(): Promise<RenumberPermitsResult | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<Record<string, never>, RenumberPermitsResult>(
    getFunctions(app, REGION),
    'renumberPermitsFn',
  )
  const res = await fn({})
  return res.data
}

export type CleanupOrphanInvitesResult = {
  deleted: number
  scanned: number
}

export async function cleanupOrphanSigningInvitesClient(): Promise<CleanupOrphanInvitesResult | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<Record<string, never>, CleanupOrphanInvitesResult>(
    getFunctions(app, REGION),
    'cleanupOrphanSigningInvitesFn',
  )
  const res = await fn({})
  return res.data
}

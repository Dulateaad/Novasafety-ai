import { getFunctions, httpsCallable } from 'firebase/functions'
import type { DemoUser } from '../types/domain'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'

export type EnsureWorkerAccount = {
  uid: string
  email: string
  displayName: string
  role: 'executor'
  badgeNo: string
  created: boolean
}

export async function ensureDefaultWorkersClient(): Promise<EnsureWorkerAccount[] | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<Record<string, never>, { accounts: EnsureWorkerAccount[] }>(
    getFunctions(app, REGION),
    'ensureDefaultWorkersFn',
  )
  const res = await fn({})
  return res.data.accounts
}

export function mergeEnsuredWorkersIntoDirectory(
  directory: DemoUser[],
  accounts: EnsureWorkerAccount[],
): DemoUser[] {
  const byUid = new Map(directory.map((u) => [u.id, u]))
  for (const account of accounts) {
    byUid.set(account.uid, {
      id: account.uid,
      displayName: account.displayName,
      email: account.email,
      role: 'executor',
      badgeNo: account.badgeNo,
    })
  }
  return [...byUid.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'ru'),
  )
}

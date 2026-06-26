import { getFunctions, httpsCallable } from 'firebase/functions'
import type { DemoUser } from '../types/domain'
import { DEFAULT_NDPR_SIGNERS } from '../config/defaultNdprSigners'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'

export type EnsureDefaultSignerAccount = {
  slot: 'performer' | 'permitter' | 'issuer' | 'leadExpert'
  uid: string
  email: string
  displayName: string
  role: string
  badgeNo: string
  created: boolean
}

export type EnsureDefaultSignersResponse = {
  accounts: EnsureDefaultSignerAccount[]
  inspector?: {
    uid: string
    email: string
    displayName: string
    role: 'safety'
    badgeNo: string
    inspectorSites?: string[]
    created: boolean
  }
  ert?: {
    uid: string
    email: string
    displayName: string
    role: 'ert'
    badgeNo: string
    created: boolean
  }
}

export async function ensureDefaultNdprSignersClient(): Promise<EnsureDefaultSignersResponse | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<Record<string, never>, EnsureDefaultSignersResponse>(
    getFunctions(app, REGION),
    'ensureDefaultNdprSignersFn',
  )
  const res = await fn({})
  return res.data
}

export function mergeEnsuredInspectorIntoDirectory(
  directory: DemoUser[],
  inspector: NonNullable<EnsureDefaultSignersResponse['inspector']>,
): DemoUser[] {
  const byUid = new Map(directory.map((u) => [u.id, u]))
  byUid.set(inspector.uid, {
    id: inspector.uid,
    displayName: inspector.displayName,
    email: inspector.email,
    role: 'safety',
    badgeNo: inspector.badgeNo,
    inspectorSites: inspector.inspectorSites,
  })
  return [...byUid.values()]
}

export function mergeEnsuredErtIntoDirectory(
  directory: DemoUser[],
  ert: NonNullable<EnsureDefaultSignersResponse['ert']>,
): DemoUser[] {
  const byUid = new Map(directory.map((u) => [u.id, u]))
  byUid.set(ert.uid, {
    id: ert.uid,
    displayName: ert.displayName,
    email: ert.email,
    role: 'ert',
    badgeNo: ert.badgeNo,
  })
  return [...byUid.values()]
}

export async function ensureDefaultNdprSignersClientLegacy(): Promise<EnsureDefaultSignerAccount[] | null> {
  const res = await ensureDefaultNdprSignersClient()
  return res?.accounts ?? null
}

export function mergeEnsuredSignersIntoDirectory(
  directory: DemoUser[],
  accounts: EnsureDefaultSignerAccount[],
): DemoUser[] {
  const byUid = new Map(directory.map((u) => [u.id, u]))
  for (const account of accounts) {
    const role =
      (account.role as DemoUser['role']) ||
      (DEFAULT_NDPR_SIGNERS.find((s) => s.slot === account.slot)?.roles[0] as DemoUser['role']) ||
      'performer'
    byUid.set(account.uid, {
      id: account.uid,
      displayName: account.displayName,
      email: account.email,
      role,
      badgeNo: account.badgeNo,
    })
  }
  return [...byUid.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'ru'),
  )
}

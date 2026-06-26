import type { DemoUser, Permit } from '../types/domain'
import type { StoredCrewAckSignature } from '../types/crewAck'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import { mergePermitAfterEgovSign } from './approvalSequence'
import { assigneeUidForRole, isRoleSigned } from './signatureStatus'
import { resolveUserBadgeNo } from './userBadgeNumbers'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'
const GOD_CMS = 'R09ELU1PREU=' // base64 "GOD-MODE"

const APPROVER_ROLES: EgovSignRole[] = ['performer', 'issuer', 'permitter', 'leadExpert']

export type GodModeSignSummary = {
  permitId: string
  crewSigned: number
  approversSigned: number
  skippedProducer: boolean
  skippedErt: number
}

function stubEgovSignature(
  role: EgovSignRole,
  uid: string,
  displayName: string,
  documentHash: string,
): StoredEgovSignature {
  return {
    role,
    signedAtIso: new Date().toISOString(),
    signedByUid: uid,
    signedByDisplayName: `${displayName} (GOD MODE)`,
    documentHash,
    cmsBase64: GOD_CMS,
    provider: 'unknown',
    sigexVerified: false,
  }
}

function stubCrewAck(
  uid: string,
  displayName: string,
  documentHash: string,
): StoredCrewAckSignature {
  return {
    signedAtIso: new Date().toISOString(),
    signedByUid: uid,
    signedByDisplayName: `${displayName} (GOD MODE)`,
    documentHash,
    cmsBase64: GOD_CMS,
    provider: 'unknown',
  }
}

function shouldSkipExecutor(
  permit: Permit,
  uid: string,
  resolveUser: (id: string) => DemoUser | undefined,
): boolean {
  if (!uid) return true
  if (uid === permit.performerUid?.trim()) return true
  const role = resolveUser(uid)?.role
  return role === 'ert' || role === 'performer' || role === 'safety'
}

/** Локальный патч: работники + 3 согласующих (без производителя и ERT). */
export function buildGodModePermitPatch(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  userDirectory: DemoUser[],
): { patch: Partial<Permit>; summary: Omit<GodModeSignSummary, 'permitId'> } {
  const documentHash = permit.packagePdf?.documentHash ?? 'god-mode'
  const iso = new Date().toISOString()
  const dateIso = iso.slice(0, 10)

  let crewSigned = 0
  let skippedErt = 0
  const crewAckSignatures = { ...(permit.crewAckSignatures ?? {}) }

  const executors = permit.executors.map((ex) => {
    const uid = ex.userUid?.trim()
    if (!uid) return ex
    if (shouldSkipExecutor(permit, uid, resolveUser)) {
      if (resolveUser(uid)?.role === 'ert') skippedErt += 1
      return ex
    }
    if (ex.briefingAcknowledged || crewAckSignatures[uid]?.cmsBase64?.trim()) {
      return ex
    }
    const name = resolveUser(uid)?.displayName ?? uid
    crewAckSignatures[uid] = stubCrewAck(uid, name, documentHash)
    crewSigned += 1
    return {
      ...ex,
      briefingAcknowledged: true,
      dateIso: ex.dateIso || dateIso,
    }
  })

  let merged: Permit = { ...permit, executors, crewAckSignatures }
  let approversSigned = 0

  for (const role of APPROVER_ROLES) {
    if (isRoleSigned(merged, role)) continue
    const uid = assigneeUidForRole(merged, role)
    if (!uid) continue
    const name = resolveUser(uid)?.displayName ?? uid
    const sig = stubEgovSignature(role, uid, name, documentHash)
    const resolveBadge = (id: string) => resolveUserBadgeNo(id, userDirectory)
    const part = mergePermitAfterEgovSign(merged, role, sig, resolveBadge)
    merged = { ...merged, ...part }
    approversSigned += 1
  }

  const patch: Partial<Permit> = {
    executors: merged.executors,
    crewAckSignatures: merged.crewAckSignatures,
    egovSignatures: merged.egovSignatures,
    signatures: merged.signatures,
    asor: merged.asor,
    updatedAtIso: iso,
  }

  return {
    patch,
    summary: {
      crewSigned,
      approversSigned,
      skippedProducer: false,
      skippedErt,
    },
  }
}

export async function godModeSignPermitClient(
  permitId: string,
): Promise<GodModeSignSummary | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<{ permitId: string }, GodModeSignSummary>(
    getFunctions(app, REGION),
    'godModeSignPermitFn',
  )
  const res = await fn({ permitId })
  return res.data
}

export function findLatestPermit(permits: Permit[]): Permit | null {
  if (!permits.length) return null
  return [...permits].sort((a, b) => {
    const ca = a.updatedAtIso || a.createdAtIso || ''
    const cb = b.updatedAtIso || b.createdAtIso || ''
    return cb.localeCompare(ca) || b.id.localeCompare(a.id)
  })[0]!
}

export function canUseGodMode(user: DemoUser | null | undefined): boolean {
  return user?.role === 'coordinator'
}

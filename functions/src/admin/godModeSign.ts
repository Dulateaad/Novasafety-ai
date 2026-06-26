import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import {
  patchAsorApprovalsOnSign,
} from '../signing/approvalSequence'
import type { EgovSignRole } from '../signing/types'
import { signatureFlagKey } from '../signing/permissions'
import { provisionPermitSigners } from '../signing/provisionSigners'

const GOD_CMS = 'R09ELU1PREU='
const APPROVER_ROLES: EgovSignRole[] = ['issuer', 'permitter', 'leadExpert']

export type GodModeSignResult = {
  permitId: string
  crewSigned: number
  approversSigned: number
  skippedProducer: boolean
  skippedErt: number
}

function isRoleSigned(permit: DocumentData, role: EgovSignRole): boolean {
  const egov = permit.egovSignatures as Record<string, { cmsBase64?: string }> | undefined
  if (egov?.[role]?.cmsBase64?.trim()) return true
  const sig = permit.signatures as Record<string, boolean> | undefined
  if (role === 'performer') return !!sig?.performerSigned
  if (role === 'permitter') return !!sig?.permitterSigned
  if (role === 'issuer') return !!sig?.issuerSigned
  return !!sig?.leadExpertSigned
}

function assigneeUid(permit: DocumentData, role: EgovSignRole): string {
  if (role === 'performer') return String(permit.performerUid ?? '').trim()
  if (role === 'permitter') return String(permit.permitterUid ?? '').trim()
  if (role === 'issuer') return String(permit.issuerUid ?? '').trim()
  return String(permit.leadExpertUid ?? '').trim()
}

function executorBriefingDone(permit: DocumentData, uid: string): boolean {
  const crewAck = permit.crewAckSignatures as
    | Record<string, { cmsBase64?: string }>
    | undefined
  if (crewAck?.[uid]?.cmsBase64?.trim()) return true
  const executors = Array.isArray(permit.executors) ? permit.executors : []
  const row = executors.find((ex) => String(ex.userUid ?? '').trim() === uid)
  return row?.briefingAcknowledged === true
}

async function userRole(db: Firestore, uid: string): Promise<string> {
  const snap = await db.collection('users').doc(uid).get()
  return String(snap.data()?.role ?? '')
}

async function userDisplayName(db: Firestore, uid: string): Promise<string> {
  const snap = await db.collection('users').doc(uid).get()
  return String(snap.data()?.displayName ?? uid).trim() || uid
}

export async function applyGodModeSign(
  db: Firestore,
  permitId: string,
): Promise<GodModeSignResult> {
  const permitRef = db.collection('permits').doc(permitId)
  const snap = await permitRef.get()
  if (!snap.exists) throw new Error('Наряд не найден')

  let permit = snap.data()!
  const status = String(permit.status ?? '')
  if (status !== 'on_approval') {
    throw new Error('GOD MODE доступен только для нарядов «На согласовании»')
  }

  const documentHash = String(
    (permit.packagePdf as { documentHash?: string } | undefined)?.documentHash ?? 'god-mode',
  )
  const iso = new Date().toISOString()
  const dateIso = iso.slice(0, 10)
  const performerUid = String(permit.performerUid ?? '').trim()

  let crewSigned = 0
  let skippedErt = 0
  const crewAckSignatures = {
    ...((permit.crewAckSignatures as Record<string, unknown>) ?? {}),
  }
  const executors = Array.isArray(permit.executors) ? [...permit.executors] : []

  for (let i = 0; i < executors.length; i += 1) {
    const ex = executors[i] as Record<string, unknown>
    const uid = String(ex.userUid ?? '').trim()
    if (!uid || uid === performerUid) continue
    const role = await userRole(db, uid)
    if (role === 'ert') {
      skippedErt += 1
      continue
    }
    if (executorBriefingDone(permit, uid)) continue

    const name = await userDisplayName(db, uid)
    crewAckSignatures[uid] = {
      signedAtIso: iso,
      signedByUid: uid,
      signedByDisplayName: `${name} (GOD MODE)`,
      documentHash,
      cmsBase64: GOD_CMS,
      provider: 'unknown',
    }
    executors[i] = {
      ...ex,
      briefingAcknowledged: true,
      dateIso: String(ex.dateIso ?? dateIso),
    }
    crewSigned += 1
  }

  permit = {
    ...permit,
    executors,
    crewAckSignatures,
  }

  const egovSignatures = {
    ...((permit.egovSignatures as Record<string, unknown>) ?? {}),
  }
  const signatures = {
    ...((permit.signatures as Record<string, boolean>) ?? {}),
  }
  let asor = permit.asor as Record<string, unknown> | undefined

  let approversSigned = 0
  for (const role of APPROVER_ROLES) {
    if (isRoleSigned({ ...permit, egovSignatures, signatures }, role)) continue
    const uid = assigneeUid(permit, role)
    if (!uid) continue
    const name = await userDisplayName(db, uid)
    const badge = String(
      (await db.collection('users').doc(uid).get()).data()?.badgeNo ?? '',
    ).trim()

    egovSignatures[role] = {
      role,
      signedAtIso: iso,
      signedByUid: uid,
      signedByDisplayName: `${name} (GOD MODE)`,
      documentHash,
      cmsBase64: GOD_CMS,
      provider: 'unknown',
      sigexVerified: false,
    }
    signatures[signatureFlagKey(role)] = true

    const patchedAsor = patchAsorApprovalsOnSign(
      { ...permit, asor },
      role,
      {
        fullNamePrinted: `${name} (GOD MODE)`,
        badgeNo: badge,
        signedAtIso: iso,
      },
    )
    if (patchedAsor) asor = patchedAsor

    approversSigned += 1
  }

  await permitRef.update({
    executors,
    crewAckSignatures,
    egovSignatures,
    signatures,
    ...(asor ? { asor } : {}),
    updatedAtIso: iso,
  })

  await db.collection('permits').doc(permitId).collection('journal').add({
    permitId,
    atIso: iso,
    actorUid: 'god-mode',
    actorRole: 'coordinator',
    kind: 'note',
    message: `GOD MODE: подписано работников ${crewSigned}, согласующих ${approversSigned} (без производителя)`,
    meta: { godMode: true, crewSigned, approversSigned },
  })

  await provisionPermitSigners(db, permitId)

  return {
    permitId,
    crewSigned,
    approversSigned,
    skippedProducer: Boolean(performerUid),
    skippedErt,
  }
}

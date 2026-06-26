import type { DocumentData, Firestore } from 'firebase-admin/firestore'

export function isExecutorOnPermit(permit: DocumentData, uid: string): boolean {
  const executors = Array.isArray(permit.executors) ? permit.executors : []
  return executors.some((ex) => String(ex.userUid ?? '').trim() === uid)
}

export function isCrewAckPeriodActive(permit: DocumentData): boolean {
  const status = String(permit.status ?? '')
  return status === 'on_approval' || status === 'issued' || status === 'in_progress'
}

export function executorBriefingDone(permit: DocumentData, uid: string): boolean {
  const crewAck = permit.crewAckSignatures as
    | Record<string, { cmsBase64?: string }>
    | undefined
  if (crewAck?.[uid]?.cmsBase64?.trim()) return true
  const executors = Array.isArray(permit.executors) ? permit.executors : []
  const row = executors.find((ex) => String(ex.userUid ?? '').trim() === uid)
  return row?.briefingAcknowledged === true
}

export function requiredCrewExecutorUids(permit: DocumentData): string[] {
  const executors = Array.isArray(permit.executors) ? permit.executors : []
  return executors
    .map((ex) => String(ex.userUid ?? '').trim())
    .filter(Boolean)
}

export function allCrewAcknowledged(permit: DocumentData): boolean {
  const uids = requiredCrewExecutorUids(permit)
  if (uids.length === 0) return true
  return uids.every((uid) => executorBriefingDone(permit, uid))
}

export function pendingCrewAckCount(permit: DocumentData): number {
  return requiredCrewExecutorUids(permit).filter((uid) => !executorBriefingDone(permit, uid))
    .length
}

export function crewAckGateMessage(permit: DocumentData): string {
  const pending = pendingCrewAckCount(permit)
  if (pending <= 0) return ''
  const word = pending === 1 ? 'работник' : pending < 5 ? 'работника' : 'работников'
  return `Ожидается ознакомление ${pending} ${word} бригады с АБР и оценкой Риска.`
}

export function canUserSignCrewAck(
  user: DocumentData,
  uid: string,
  permit: DocumentData,
): boolean {
  if (!isCrewAckPeriodActive(permit)) return false
  const egov = permit.egovSignatures as Record<string, { cmsBase64?: string }> | undefined
  const sig = permit.signatures as Record<string, boolean> | undefined
  const performerSigned =
    !!egov?.performer?.cmsBase64?.trim() || !!sig?.performerSigned
  if (!performerSigned) return false
  if (executorBriefingDone(permit, uid)) return false
  const role = String(user.role ?? '')
  if (role === 'coordinator') return isExecutorOnPermit(permit, uid)
  if (role !== 'executor') return false
  return isExecutorOnPermit(permit, uid)
}

export async function completeCrewAckInvite(
  db: Firestore,
  permitId: string,
  uid: string,
): Promise<void> {
  await db
    .collection('signingInvites')
    .doc(`${permitId}_crew_${uid}`)
    .set(
      {
        status: 'completed',
        message: 'Ознакомление с АБР и оценкой риска подтверждено',
        completedAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      },
      { merge: true },
    )
}

import type { Permit } from '../types/domain'

export function isExecutorCrewAckDone(permit: Permit, uid: string): boolean {
  const id = uid.trim()
  if (!id) return false
  if (permit.crewAckSignatures?.[id]?.cmsBase64?.trim()) return true
  const row = permit.executors.find((ex) => ex.userUid.trim() === id)
  return row?.briefingAcknowledged === true
}

export function requiredCrewExecutorUids(permit: Permit): string[] {
  return permit.executors.map((ex) => ex.userUid.trim()).filter(Boolean)
}

export function allCrewAcknowledged(permit: Permit): boolean {
  const uids = requiredCrewExecutorUids(permit)
  if (uids.length === 0) return true
  return uids.every((uid) => isExecutorCrewAckDone(permit, uid))
}

export function pendingCrewAckCount(permit: Permit): number {
  return requiredCrewExecutorUids(permit).filter(
    (uid) => !isExecutorCrewAckDone(permit, uid),
  ).length
}

export function crewAckGateMessage(permit: Permit): string | null {
  const pending = pendingCrewAckCount(permit)
  if (pending <= 0) return null
  const word =
    pending === 1 ? 'работник' : pending < 5 ? 'работника' : 'работников'
  return `Ожидается ознакомление ${pending} ${word} бригады с АБР и оценкой риска.`
}

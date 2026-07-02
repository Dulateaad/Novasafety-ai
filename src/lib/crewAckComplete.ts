import type { DemoUser, Permit } from '../types/domain'
import { uidMatchesAccount } from './permitAccess'
import { resolveWorkerUid } from './resolveWorkerUid'

function crewAccountIds(executorUid: string, directory: DemoUser[] = []): Set<string> {
  const ids = new Set<string>()
  const id = executorUid.trim()
  if (!id) return ids
  ids.add(id)
  const resolved = resolveWorkerUid(directory, id)
  if (resolved) ids.add(resolved)
  for (const u of directory) {
    if (uidMatchesAccount(id, u, directory)) ids.add(u.id)
  }
  return ids
}

/** Ознакомление работника: ЭЦП (Firebase uid) или флаг в строке executors. */
export function isExecutorCrewAckDone(
  permit: Permit,
  uid: string,
  directory: DemoUser[] = [],
): boolean {
  const id = uid.trim()
  if (!id) return false

  const row = permit.executors.find((ex) => ex.userUid.trim() === id)
  if (row?.briefingAcknowledged) return true

  const accountIds = crewAccountIds(id, directory)
  const sigs = permit.crewAckSignatures ?? {}

  for (const accountId of accountIds) {
    if (sigs[accountId]?.cmsBase64?.trim()) return true
  }

  for (const sig of Object.values(sigs)) {
    if (!sig?.cmsBase64?.trim()) continue
    if (sig.signedByUid && accountIds.has(sig.signedByUid)) return true
  }

  return false
}

export function requiredCrewExecutorUids(permit: Permit): string[] {
  return permit.executors.map((ex) => ex.userUid.trim()).filter(Boolean)
}

export function allCrewAcknowledged(permit: Permit, directory: DemoUser[] = []): boolean {
  const uids = requiredCrewExecutorUids(permit)
  if (uids.length === 0) return true
  return uids.every((uid) => isExecutorCrewAckDone(permit, uid, directory))
}

export function pendingCrewAckCount(permit: Permit, directory: DemoUser[] = []): number {
  return requiredCrewExecutorUids(permit).filter(
    (uid) => !isExecutorCrewAckDone(permit, uid, directory),
  ).length
}

export function crewAckGateMessage(
  permit: Permit,
  directory: DemoUser[] = [],
): string | null {
  const pending = pendingCrewAckCount(permit, directory)
  if (pending <= 0) return null
  const word =
    pending === 1 ? 'работник' : pending < 5 ? 'работника' : 'работников'
  return `Ожидается ознакомление ${pending} ${word} бригады с АБР и оценкой риска.`
}

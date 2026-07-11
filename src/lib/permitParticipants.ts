import type { Permit } from '../types/domain'

/** Все участники наряда, которым рассылаются информационные уведомления. */
export function collectPermitParticipantUids(permit: Permit): string[] {
  const uids = new Set<string>()
  for (const uid of [
    permit.performerUid,
    permit.permitterUid,
    permit.issuerUid,
    permit.leadExpertUid,
    permit.ertUid,
  ]) {
    const t = uid?.trim()
    if (t) uids.add(t)
  }
  for (const ex of permit.executors ?? []) {
    const t = ex.userUid?.trim()
    if (t) uids.add(t)
  }
  return [...uids]
}

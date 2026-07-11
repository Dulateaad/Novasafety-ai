import type { PermitDraft } from '../types/domain'

export type NdprCrewSource = Pick<
  PermitDraft,
  'executors' | 'performerUid' | 'permitterUid' | 'issuerUid' | 'leadExpertUid'
>

function approvalUids(nd: NdprCrewSource | null | undefined): Set<string> {
  return new Set(
    [
      nd?.performerUid,
      nd?.permitterUid,
      nd?.issuerUid,
      nd?.leadExpertUid,
    ]
      .map((uid) => uid?.trim())
      .filter(Boolean) as string[],
  )
}

/** Работники бригады F03 — без 4 ролей согласования НДПР. */
export function ndprCrewMemberUids(nd: NdprCrewSource | null | undefined): string[] {
  const exclude = approvalUids(nd)
  const seen = new Set<string>()
  const uids: string[] = []
  for (const ex of nd?.executors ?? []) {
    const uid = ex.userUid.trim()
    if (!uid || seen.has(uid) || exclude.has(uid)) continue
    seen.add(uid)
    uids.push(uid)
  }
  return uids
}

export function ndprExecutorByUid(
  nd: NdprCrewSource | null | undefined,
): Map<string, PermitDraft['executors'][number]> {
  const map = new Map<string, PermitDraft['executors'][number]>()
  for (const ex of nd?.executors ?? []) {
    const uid = ex.userUid.trim()
    if (uid) map.set(uid, ex)
  }
  return map
}

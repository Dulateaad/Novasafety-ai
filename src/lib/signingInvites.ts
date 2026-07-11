import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { SigningInvite, SigningInviteStatus } from '../types/signingInvite'

function normalizeInvite(id: string, raw: Record<string, unknown>): SigningInvite {
  return {
    id,
    permitId: String(raw.permitId ?? ''),
    permitTitle: String(raw.permitTitle ?? ''),
    registrationRefNo: String(raw.registrationRefNo ?? ''),
    assigneeUid: String(raw.assigneeUid ?? ''),
    assigneeEmail: String(raw.assigneeEmail ?? ''),
    assigneeDisplayName: String(raw.assigneeDisplayName ?? ''),
    signRole: (String(raw.signRole ?? 'permitter') as SigningInvite['signRole']),
    inviteType:
      raw.inviteType === 'crew_ack' ? 'crew_ack' : 'approval',
    stepLabel: String(raw.stepLabel ?? ''),
    status: String(raw.status ?? 'pending') as SigningInviteStatus,
    message: String(raw.message ?? ''),
    createdAtIso: String(raw.createdAtIso ?? ''),
    updatedAtIso:
      typeof raw.updatedAtIso === 'string' ? raw.updatedAtIso : undefined,
    completedAtIso:
      typeof raw.completedAtIso === 'string' ? raw.completedAtIso : undefined,
  }
}

function sortInvites(list: SigningInvite[]): SigningInvite[] {
  return [...list].sort((a, b) => {
    const rank = (s: SigningInviteStatus) =>
      s === 'active' ? 0 : s === 'pending' ? 1 : 2
    const ra = rank(a.status)
    const rb = rank(b.status)
    if (ra !== rb) return ra - rb
    return (b.updatedAtIso ?? b.createdAtIso).localeCompare(
      a.updatedAtIso ?? a.createdAtIso,
    )
  })
}

function mergeInvitesById(lists: SigningInvite[][]): SigningInvite[] {
  const byId = new Map<string, SigningInvite>()
  for (const list of lists) {
    for (const invite of list) {
      byId.set(invite.id, invite)
    }
  }
  return sortInvites([...byId.values()])
}

/** Без onSnapshot — иначе Firestore 12.x падает при permission-denied без error callback. */
export async function fetchSigningInvites(
  db: Firestore,
  assigneeUid: string,
  assigneeEmail?: string,
): Promise<SigningInvite[]> {
  const uid = assigneeUid.trim()
  const email = assigneeEmail?.trim().toLowerCase() ?? ''
  if (!uid && !email) return []
  try {
    const queries = []
    if (uid) {
      queries.push(
        getDocs(
          query(collection(db, 'signingInvites'), where('assigneeUid', '==', uid)),
        ),
      )
    }
    if (email) {
      queries.push(
        getDocs(
          query(collection(db, 'signingInvites'), where('assigneeEmail', '==', email)),
        ),
      )
    }
    const snaps = await Promise.all(queries)
    const lists = snaps.map((snap) =>
      snap.docs.map((d) =>
        normalizeInvite(d.id, d.data() as Record<string, unknown>),
      ),
    )
    return mergeInvitesById(lists)
  } catch (e) {
    console.warn('[NOVA] Не удалось загрузить signingInvites', e)
    return []
  }
}

export function openSigningInvites(
  invites: SigningInvite[],
  existingPermitIds?: ReadonlySet<string>,
): SigningInvite[] {
  return invites.filter((i) => {
    if (i.status !== 'active' && i.status !== 'pending') return false
    if (existingPermitIds && !existingPermitIds.has(i.permitId)) return false
    return true
  })
}

/** Ссылка на карточку наряда из уведомления о подписи. ERT — с начала карточки (пакет → газотест → подпись). */
export function permitHrefForSigningInvite(invite: SigningInvite): string {
  const base = `/p/${invite.permitId}`
  if (invite.inviteType === 'crew_ack') return `${base}#crew-ack-section`
  if (invite.signRole === 'ert') return base
  return `${base}#signatures-section`
}

import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import type { Permit } from '../types/domain'
import type { PermitNotice, PermitNoticeKind } from '../types/permitNotice'
import { app, firebaseConfigured } from './firebase'
import { collectPermitParticipantUids } from './permitParticipants'

const REGION = 'europe-west1'
const LOCAL_KEY = 'nova_permit_notices_v1'

function noticeCopy(kind: PermitNoticeKind, regNo: string): { title: string; message: string } {
  const label = regNo ? `№ ${regNo}` : 'наряд-допуск'
  switch (kind) {
    case 'issued':
      return {
        title: 'Наряд открыт для всех',
        message: `Наряд ${label} выдан и открыт для выполнения работ. Все участники могут приступать к работам по регламенту.`,
      }
    case 'closure_saved':
      return {
        title: 'Закрытие разрешений сохранено',
        message: `Производитель работ сохранил раздел закрытия разрешений в PDF по наряду ${label}. Проверьте актуальный пакет документов.`,
      }
    default:
      return {
        title: 'Уведомление по наряду',
        message: `Обновление по наряду ${label}.`,
      }
  }
}

function normalizeNotice(id: string, raw: Record<string, unknown>): PermitNotice {
  return {
    id,
    permitId: String(raw.permitId ?? ''),
    permitTitle: String(raw.permitTitle ?? ''),
    registrationRefNo: String(raw.registrationRefNo ?? ''),
    assigneeUid: String(raw.assigneeUid ?? ''),
    kind: (String(raw.kind ?? 'info') as PermitNoticeKind),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    status: raw.status === 'dismissed' ? 'dismissed' : 'active',
    createdAtIso: String(raw.createdAtIso ?? ''),
    updatedAtIso:
      typeof raw.updatedAtIso === 'string' ? raw.updatedAtIso : undefined,
  }
}

function sortNotices(list: PermitNotice[]): PermitNotice[] {
  return [...list].sort((a, b) =>
    (b.updatedAtIso ?? b.createdAtIso).localeCompare(
      a.updatedAtIso ?? a.createdAtIso,
    ),
  )
}

function loadLocalNotices(): PermitNotice[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PermitNotice[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalNotices(list: PermitNotice[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export function upsertLocalPermitNotices(
  permit: Permit,
  kind: PermitNoticeKind,
): void {
  const uids = collectPermitParticipantUids(permit)
  const regNo = permit.registrationRefNo ?? ''
  const { title, message } = noticeCopy(kind, regNo)
  const iso = new Date().toISOString()
  const cur = loadLocalNotices()
  const byId = new Map(cur.map((n) => [n.id, n]))
  for (const assigneeUid of uids) {
    const id = `${permit.id}_${kind}_${assigneeUid}`
    byId.set(id, {
      id,
      permitId: permit.id,
      permitTitle: permit.title ?? permit.workDescription ?? 'Наряд-допуск',
      registrationRefNo: regNo,
      assigneeUid,
      kind,
      title,
      message,
      status: 'active',
      createdAtIso: iso,
      updatedAtIso: iso,
    })
  }
  saveLocalNotices([...byId.values()])
}

export async function fetchPermitNotices(
  db: Firestore | null,
  assigneeUid: string,
): Promise<PermitNotice[]> {
  if (!assigneeUid.trim()) return []
  if (!db) {
    return sortNotices(
      loadLocalNotices().filter(
        (n) => n.assigneeUid === assigneeUid && n.status === 'active',
      ),
    )
  }
  try {
    const q = query(
      collection(db, 'permitNotices'),
      where('assigneeUid', '==', assigneeUid),
      where('status', '==', 'active'),
    )
    const snap = await getDocs(q)
    return sortNotices(
      snap.docs.map((d) =>
        normalizeNotice(d.id, d.data() as Record<string, unknown>),
      ),
    )
  } catch (e) {
    console.warn('[NOVA] Не удалось загрузить permitNotices', e)
    return sortNotices(
      loadLocalNotices().filter(
        (n) => n.assigneeUid === assigneeUid && n.status === 'active',
      ),
    )
  }
}

export async function broadcastPermitNoticeClient(
  permitId: string,
  kind: PermitNoticeKind,
): Promise<number | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<
    { permitId: string; kind: PermitNoticeKind },
    { recipients: number }
  >(getFunctions(app, REGION), 'broadcastPermitNoticeFn')
  const res = await fn({ permitId, kind })
  return res.data.recipients
}

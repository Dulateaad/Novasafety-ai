import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { WorkStopAlert } from '../types/workStop'

const LOCAL_KEY = 'nova_work_stop_alerts_v1'

function normalizeAlert(id: string, raw: Record<string, unknown>): WorkStopAlert {
  return {
    id,
    permitId: String(raw.permitId ?? ''),
    permitTitle: String(raw.permitTitle ?? ''),
    siteName: String(raw.siteName ?? ''),
    assigneeUid: String(raw.assigneeUid ?? ''),
    status: raw.status === 'resolved' ? 'resolved' : 'pending',
    reason: String(raw.reason ?? ''),
    initiatedByUid: String(raw.initiatedByUid ?? ''),
    initiatedByName: String(raw.initiatedByName ?? ''),
    atIso: String(raw.atIso ?? ''),
    resolvedAtIso:
      typeof raw.resolvedAtIso === 'string' ? raw.resolvedAtIso : undefined,
  }
}

function sortAlerts(list: WorkStopAlert[]): WorkStopAlert[] {
  return [...list].sort((a, b) => (a.atIso < b.atIso ? 1 : -1))
}

function loadLocalAlerts(): WorkStopAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WorkStopAlert[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalAlerts(list: WorkStopAlert[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export function upsertLocalWorkStopAlerts(alerts: WorkStopAlert[]): void {
  const cur = loadLocalAlerts()
  const byId = new Map(cur.map((a) => [a.id, a]))
  for (const a of alerts) byId.set(a.id, a)
  saveLocalAlerts([...byId.values()])
}

export function resolveLocalWorkStopAlerts(permitId: string): void {
  const cur = loadLocalAlerts()
  const resolvedAtIso = new Date().toISOString()
  saveLocalAlerts(
    cur.map((a) =>
      a.permitId === permitId && a.status === 'pending'
        ? { ...a, status: 'resolved' as const, resolvedAtIso }
        : a,
    ),
  )
}

export function removeLocalWorkStopAlertsForPermits(permitIds: readonly string[]): void {
  const ids = new Set(permitIds.map((id) => id.trim()).filter(Boolean))
  if (ids.size === 0) return
  saveLocalAlerts(loadLocalAlerts().filter((a) => !ids.has(a.permitId)))
}

export async function fetchWorkStopAlerts(
  db: Firestore | null,
  assigneeUid: string,
): Promise<WorkStopAlert[]> {
  if (!assigneeUid.trim()) return []
  if (!db) {
    return sortAlerts(
      loadLocalAlerts().filter(
        (a) => a.assigneeUid === assigneeUid && a.status === 'pending',
      ),
    )
  }
  try {
    const q = query(
      collection(db, 'workStopAlerts'),
      where('assigneeUid', '==', assigneeUid),
    )
    const snap = await getDocs(q)
    return sortAlerts(
      snap.docs
        .map((d) =>
          normalizeAlert(d.id, d.data() as Record<string, unknown>),
        )
        .filter((a) => a.status === 'pending'),
    )
  } catch (e) {
    console.warn('[NOVA] Не удалось загрузить workStopAlerts', e)
    return []
  }
}

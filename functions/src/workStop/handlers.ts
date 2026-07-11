import type { Firestore } from 'firebase-admin/firestore'
import type { InspectorNotifyMode } from './types'

const SETTINGS_DOC = 'settings/app'
const INSPECTOR_ROLE_TITLE = 'Инженер по ОТ, ТБ и ООС'

export type WorkStopPhoto = {
  dataBase64: string
  mimeType: string
  fileName: string
}

export type WorkStopState = {
  status: 'pending' | 'lifted' | 'annulled'
  reason: string
  atIso: string
  initiatedByUid: string
  initiatedByName: string
  initiatedByRole: string
  photo?: WorkStopPhoto
  previousPermitStatus: 'issued' | 'in_progress'
  resolvedAtIso?: string
  resolvedByUid?: string
  resolvedByName?: string
  inspectorComment?: string
}

const INSPECTOR_EMAILS = new Set([
  'temirlan-safety@nova.local',
  'safety@demo.local',
])

export function isInspectorFirestoreUser(user: FirebaseFirestore.DocumentData): boolean {
  if (String(user.role ?? '') === 'safety') return true
  const email = String(user.email ?? '').trim().toLowerCase()
  return INSPECTOR_EMAILS.has(email)
}

export async function getInspectorNotifyMode(db: Firestore): Promise<InspectorNotifyMode> {
  const snap = await db.doc(SETTINGS_DOC).get()
  if (!snap.exists) return 'global'
  const mode = snap.data()?.inspectorNotifyMode
  return mode === 'site_bound' ? 'site_bound' : 'global'
}

export function isPermitParticipant(
  permit: FirebaseFirestore.DocumentData,
  uid: string,
): boolean {
  const uids = [
    permit.performerUid,
    permit.permitterUid,
    permit.issuerUid,
    permit.leadExpertUid,
    ...(Array.isArray(permit.executors) ? permit.executors : []).map(
      (ex: { userUid?: string }) => ex.userUid,
    ),
  ]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
  return uids.includes(uid)
}

function inspectorSitesMatch(
  inspectorSites: unknown,
  siteName: string,
): boolean {
  const zones = Array.isArray(inspectorSites)
    ? inspectorSites
        .map((s) => String(s ?? '').trim())
        .filter(Boolean)
    : []
  if (!zones.length) return true
  const site = siteName.trim()
  if (!site) return true
  return zones.some((z) => site.includes(z) || z.includes(site))
}

export async function inspectorAssigneeUids(
  db: Firestore,
  permit: FirebaseFirestore.DocumentData,
  mode: InspectorNotifyMode,
): Promise<string[]> {
  const snap = await db.collection('users').where('role', '==', 'safety').get()
  const uids: string[] = []
  snap.forEach((d) => {
    const data = d.data()
    if (mode === 'global') {
      uids.push(d.id)
      return
    }
    if (inspectorSitesMatch(data.inspectorSites, String(permit.siteName ?? ''))) {
      uids.push(d.id)
    }
  })
  return uids
}

export function buildWorkStopState(
  permit: FirebaseFirestore.DocumentData,
  actor: FirebaseFirestore.DocumentData,
  actorUid: string,
  reason: string,
  photo?: WorkStopPhoto,
): WorkStopState {
  const prev = String(permit.status ?? '')
  if (prev !== 'issued' && prev !== 'in_progress') {
    throw new Error('Остановка работ доступна только для выданного или выполняемого наряда')
  }
  const trimmed = reason.trim()
  if (trimmed.length < 3) {
    throw new Error('Укажите причину остановки работ (не менее 3 символов)')
  }
  if (permit.workStop?.status === 'pending') {
    throw new Error('Остановка работ уже ожидает решения инспектора')
  }
  return {
    status: 'pending',
    reason: trimmed,
    atIso: new Date().toISOString(),
    initiatedByUid: actorUid,
    initiatedByName: String(actor.displayName ?? 'Участник'),
    initiatedByRole: String(actor.role ?? ''),
    photo,
    previousPermitStatus: prev as 'issued' | 'in_progress',
  }
}

export function workStopJournalMessage(ws: WorkStopState): string {
  const photoNote = ws.photo ? ' (с фото)' : ''
  return `Остановка работ: ${ws.reason}${photoNote}. Инициатор: ${ws.initiatedByName}. Ожидает решения ${INSPECTOR_ROLE_TITLE}.`
}

export function resolutionJournalMessage(
  ws: WorkStopState,
  outcome: 'lifted' | 'annulled',
): string {
  if (outcome === 'annulled') {
    return `${INSPECTOR_ROLE_TITLE} аннулировал НДПР: ${ws.inspectorComment ?? ''}`
  }
  return `${INSPECTOR_ROLE_TITLE} снял остановку, наряд возвращён в работу: ${ws.inspectorComment ?? ''}`
}

export async function createWorkStopAlertsAdmin(
  db: Firestore,
  permitId: string,
  permit: FirebaseFirestore.DocumentData,
  workStop: WorkStopState,
  assigneeUids: string[],
): Promise<void> {
  const batch = db.batch()
  for (const assigneeUid of assigneeUids) {
    const id = `${permitId}_${assigneeUid}`
    const ref = db.collection('workStopAlerts').doc(id)
    batch.set(ref, {
      id,
      permitId,
      permitTitle: String(permit.title ?? ''),
      siteName: String(permit.siteName ?? ''),
      assigneeUid,
      status: 'pending',
      reason: workStop.reason,
      initiatedByUid: workStop.initiatedByUid,
      initiatedByName: workStop.initiatedByName,
      atIso: workStop.atIso,
    })
  }
  await batch.commit()
}

export async function resolveWorkStopAlertsAdmin(
  db: Firestore,
  permitId: string,
): Promise<void> {
  const snap = await db
    .collection('workStopAlerts')
    .where('permitId', '==', permitId)
    .get()
  const resolvedAtIso = new Date().toISOString()
  const batch = db.batch()
  snap.forEach((d) => {
    batch.set(d.ref, { status: 'resolved', resolvedAtIso }, { merge: true })
  })
  await batch.commit()
}

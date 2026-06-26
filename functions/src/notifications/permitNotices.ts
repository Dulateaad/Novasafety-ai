import type { DocumentData, Firestore } from 'firebase-admin/firestore'

export type PermitNoticeKind =
  | 'issued'
  | 'closure_saved'
  | 'crew_changed'
  | 'performer_replaced'
  | 'ndpr_extended'
  | 'info'

export function collectPermitParticipantUids(permit: DocumentData): string[] {
  const uids = new Set<string>()
  for (const field of [
    'performerUid',
    'permitterUid',
    'issuerUid',
    'leadExpertUid',
    'coordinatorUid',
  ]) {
    const uid = String(permit[field] ?? '').trim()
    if (uid) uids.add(uid)
  }
  const executors = Array.isArray(permit.executors) ? permit.executors : []
  for (const ex of executors) {
    const uid = String((ex as { userUid?: string }).userUid ?? '').trim()
    if (uid) uids.add(uid)
  }
  return [...uids]
}

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
    case 'crew_changed':
      return {
        title: 'Изменён состав бригады',
        message: `Обновлён список работников по наряду ${label}. Проверьте актуальный состав бригады и ознакомление с АБР.`,
      }
    case 'performer_replaced':
      return {
        title: 'Замена производителя работ',
        message: `Назначен новый производитель работ по наряду ${label}. Проверьте ответственность и подписи.`,
      }
    case 'ndpr_extended':
      return {
        title: 'Продление НДПР',
        message: `Срок действия НДПР ${label} продлён. Проверьте актуальные даты в пакете документов.`,
      }
    default:
      return {
        title: 'Уведомление по наряду',
        message: `Обновление по наряду ${label}.`,
      }
  }
}

/** Рассылка информационного уведомления всем участникам наряда. */
export async function broadcastPermitNotice(
  db: Firestore,
  permitId: string,
  permit: DocumentData,
  kind: PermitNoticeKind,
): Promise<number> {
  const uids = collectPermitParticipantUids(permit)
  if (uids.length === 0) return 0

  const permitTitle = String(permit.title ?? permit.workDescription ?? 'Наряд-допуск')
  const regNo = String(permit.registrationRefNo ?? '')
  const { title, message } = noticeCopy(kind, regNo)
  const iso = new Date().toISOString()

  await Promise.all(
    uids.map((assigneeUid) =>
      db
        .collection('permitNotices')
        .doc(`${permitId}_${kind}_${assigneeUid}`)
        .set(
          {
            permitId,
            permitTitle,
            registrationRefNo: regNo,
            assigneeUid,
            kind,
            title,
            message,
            status: 'active',
            createdAtIso: iso,
            updatedAtIso: iso,
          },
          { merge: true },
        ),
    ),
  )

  return uids.length
}

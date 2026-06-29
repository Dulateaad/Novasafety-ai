import type { DemoUser, Permit, PermitStatus } from '../types/domain'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import type { WorkStopPhoto, WorkStopState } from '../types/workStop'
import { isInspectorUser } from './inspectorAccess'

export interface WorkStopRequestInput {
  reason: string
  photo?: WorkStopPhoto
}

export function buildWorkStopState(
  permit: Permit,
  actor: DemoUser,
  input: WorkStopRequestInput,
): WorkStopState {
  const prev = permit.status
  if (prev !== 'issued' && prev !== 'in_progress') {
    throw new Error('Остановка работ доступна только для выданного или выполняемого наряда')
  }
  const reason = input.reason.trim()
  if (reason.length < 3) {
    throw new Error('Укажите причину остановки работ (не менее 3 символов)')
  }
  return {
    status: 'pending',
    reason,
    atIso: new Date().toISOString(),
    initiatedByUid: actor.id,
    initiatedByName: actor.displayName,
    initiatedByRole: actor.role,
    photo: input.photo,
    previousPermitStatus: prev,
  }
}

export function workStopJournalMessage(ws: WorkStopState): string {
  const photoNote = ws.photo ? ' (с фото)' : ''
  return `Остановка работ: ${ws.reason}${photoNote}. Инициатор: ${ws.initiatedByName}. Ожидает решения ${INSPECTOR_ROLE_TITLE}.`
}

export function liftWorkStopPatch(
  permit: Permit,
  actor: DemoUser,
  comment: string,
): { status: PermitStatus; workStop: WorkStopState } {
  if (!isInspectorUser(actor)) {
    throw new Error(`Снять остановку может только ${INSPECTOR_ROLE_TITLE}`)
  }
  const ws = permit.workStop
  if (!ws || ws.status !== 'pending') {
    throw new Error('Нет активной остановки работ')
  }
  const note = comment.trim()
  if (note.length < 3) {
    throw new Error('Укажите комментарий инспектора (не менее 3 символов)')
  }
  return {
    status: ws.previousPermitStatus,
    workStop: {
      ...ws,
      status: 'lifted',
      resolvedAtIso: new Date().toISOString(),
      resolvedByUid: actor.id,
      resolvedByName: actor.displayName,
      inspectorComment: note,
    },
  }
}

export function annulPermitPatch(
  permit: Permit,
  actor: DemoUser,
  comment: string,
): { status: PermitStatus; workStop: WorkStopState } {
  if (!isInspectorUser(actor)) {
    throw new Error(`Аннулировать НДПР может только ${INSPECTOR_ROLE_TITLE}`)
  }
  const ws = permit.workStop
  if (!ws || ws.status !== 'pending') {
    throw new Error('Аннулирование доступно только при активной остановке работ')
  }
  const note = comment.trim()
  if (note.length < 3) {
    throw new Error('Укажите причину аннулирования (не менее 3 символов)')
  }
  return {
    status: 'annulled',
    workStop: {
      ...ws,
      status: 'annulled',
      resolvedAtIso: new Date().toISOString(),
      resolvedByUid: actor.id,
      resolvedByName: actor.displayName,
      inspectorComment: note,
    },
  }
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

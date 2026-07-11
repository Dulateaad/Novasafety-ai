/** Состояние остановки работ по наряду (ожидает решения инспектора). */
export type WorkStopStatus = 'pending' | 'lifted' | 'annulled'

export interface WorkStopPhoto {
  dataBase64: string
  mimeType: string
  fileName: string
}

/** Активная или последняя остановка работ на наряде. */
export interface WorkStopState {
  status: WorkStopStatus
  reason: string
  atIso: string
  initiatedByUid: string
  initiatedByName: string
  initiatedByRole: string
  photo?: WorkStopPhoto
  /** Статус до остановки (issued | in_progress). */
  previousPermitStatus: 'issued' | 'in_progress'
  resolvedAtIso?: string
  resolvedByUid?: string
  resolvedByName?: string
  inspectorComment?: string
}

/** Уведомление инспектору по ОТ, ТБ и ООС. */
export type WorkStopAlertStatus = 'pending' | 'resolved'

export interface WorkStopAlert {
  id: string
  permitId: string
  permitTitle: string
  siteName: string
  assigneeUid: string
  status: WorkStopAlertStatus
  reason: string
  initiatedByUid: string
  initiatedByName: string
  atIso: string
  resolvedAtIso?: string
}

/** Режим уведомления инспекторов на объекте. */
export type InspectorNotifyMode = 'global' | 'site_bound'

export type PermitNoticeKind =
  | 'issued'
  | 'closure_saved'
  | 'crew_changed'
  | 'performer_replaced'
  | 'ndpr_extended'
  | 'info'

export type PermitNoticeStatus = 'active' | 'dismissed'

export interface PermitNotice {
  id: string
  permitId: string
  permitTitle: string
  registrationRefNo: string
  assigneeUid: string
  kind: PermitNoticeKind
  title: string
  message: string
  status: PermitNoticeStatus
  createdAtIso: string
  updatedAtIso?: string
}

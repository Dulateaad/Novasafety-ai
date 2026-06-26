import type { EgovSignRole } from './egovSignature'

export type SigningInviteStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export type SigningInviteType = 'approval' | 'crew_ack'

export type SigningInviteRole = EgovSignRole | 'crewAck'

export interface SigningInvite {
  id: string
  permitId: string
  permitTitle: string
  registrationRefNo: string
  assigneeUid: string
  assigneeEmail: string
  assigneeDisplayName: string
  signRole: SigningInviteRole
  inviteType: SigningInviteType
  stepLabel: string
  status: SigningInviteStatus
  message: string
  createdAtIso: string
  updatedAtIso?: string
  completedAtIso?: string
}

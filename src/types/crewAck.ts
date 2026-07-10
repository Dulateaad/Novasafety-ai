import type { SigningInviteType } from '../types/signingInvite'

export type StoredCrewAckSignature = {
  signedAtIso: string
  signedByUid: string
  signedByDisplayName: string
  signerIin?: string | null
  documentHash: string
  cmsBase64: string
  provider: 'egov_mobile' | 'ncalayer' | 'unknown'
}

export type CrewAckSignaturesMap = Partial<Record<string, StoredCrewAckSignature>>

export const CREW_ACK_LABEL = 'Ознакомление с АБР и оценкой риска'

/** Текст подтверждения перед подписью работника. */
export const CREW_ACK_CONFIRMATION =
  'Я ознакомлен с АБР и оценкой рисков'

export function crewAckInviteLabel(inviteType: SigningInviteType | undefined): string {
  return inviteType === 'crew_ack' ? CREW_ACK_LABEL : 'Согласование НДПР'
}

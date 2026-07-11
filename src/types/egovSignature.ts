/** Роль подписанта в процессе НДПР (ЭЦП через eGov Mobile / SIGEX). */
export type EgovSignRole =
  | 'performer'
  | 'permitter'
  | 'issuer'
  | 'leadExpert'
  | 'ert'

export interface StoredEgovSignature {
  role: EgovSignRole
  signedAtIso: string
  signedByUid: string
  signedByDisplayName: string
  /** ИИН из сертификата ЭЦП (если извлечён). */
  signerIin?: string | null
  signerSubjectDn?: string
  /** SHA-256 hex документа на подпись. */
  documentHash: string
  documentFormat?: 'pdf' | 'text'
  /** CMS-подпись (base64) от SIGEX / eGov Mobile. */
  cmsBase64: string
  provider: 'egov_mobile' | 'egov_business' | 'ncalayer' | 'unknown'
  sigexVerified?: boolean
}

export type EgovSignaturesMap = Partial<Record<EgovSignRole, StoredEgovSignature>>

export const EGOV_ROLE_LABELS: Record<EgovSignRole, string> = {
  performer: 'Производитель работ',
  permitter: 'Допускающий',
  issuer: 'Выдающий НД',
  leadExpert: 'Утверждающий НД',
  ert: 'ERT (ПАС)',
}

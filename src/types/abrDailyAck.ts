/** Ежедневное ознакомление работника с АБР (подпись за день). */
export interface AbrDailyAckEntry {
  userUid: string
  fullName: string
  roleLabel: string
  signedAtIso: string
  /** Отметка подписи в отчёте (ЭЦП / ознакомление). */
  signatureNote: string
  /** ЭЦП eGov Mobile (CMS), если подписано через приложение. */
  cmsBase64?: string
  signerIin?: string | null
  documentHash?: string
  provider?: 'egov_mobile' | 'ncalayer' | 'manual'
}

export interface AbrDailyAckDay {
  dateIso: string
  entries: AbrDailyAckEntry[]
}

export function emptyAbrDailyAckDay(dateIso: string): AbrDailyAckDay {
  return { dateIso, entries: [] }
}

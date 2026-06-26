import type { Permit } from '../types/domain'
import { formatStoredDateTime } from './datetimeLocal'

export function crewAckSignaturePdfText(
  permit: Permit,
  userUid: string,
  acknowledged: boolean,
): string {
  const sig = userUid ? permit.crewAckSignatures?.[userUid] : undefined
  if (sig?.cmsBase64?.trim()) {
    const when = new Date(sig.signedAtIso).toLocaleString('ru-RU')
    const iin = sig.signerIin ? ` · ИИН ${sig.signerIin}` : ''
    return `ЭЦП ✓ ${sig.signedByDisplayName}${iin}\n${when}`
  }
  if (acknowledged) return '✓ ознакомлен'
  return ''
}

export function crewAckDatePdfText(
  permit: Permit,
  userUid: string,
  fallbackDateIso: string,
): string {
  const sig = userUid ? permit.crewAckSignatures?.[userUid] : undefined
  if (sig?.signedAtIso) return formatStoredDateTime(sig.signedAtIso)
  return fallbackDateIso ? formatStoredDateTime(fallbackDateIso) : ''
}

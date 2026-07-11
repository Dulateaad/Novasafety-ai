import type { AbrDailyAckEntry } from '../types/abrDailyAck'

/** Текст колонки «Подпись» в PDF-отчёте ежедневного ознакомления. */
export function abrDailyAckSignaturePdfText(entry: AbrDailyAckEntry): string {
  if (entry.cmsBase64?.trim()) {
    const when = new Date(entry.signedAtIso).toLocaleString('ru-RU')
    const iin = entry.signerIin ? ` · IIN ${entry.signerIin}` : ''
    return `ЭЦП eGov Mobile${iin}\n${when}`
  }
  return entry.signatureNote || 'Ознакомлен'
}

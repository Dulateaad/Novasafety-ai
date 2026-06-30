import type { Permit } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { ROLE_LABELS } from '../types/domain'

export interface SigningPayload {
  /** UTF-8 текст, который видит подписант в eGov Mobile. */
  text: string
  /** SHA-256 hex. */
  documentHash: string
  /** Base64 UTF-8 bytes для SIGEX CMS. */
  dataBase64: string
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Канонический текст пакета согласования для подписи ЭЦП. */
export function buildSigningCanonicalText(
  permit: Permit,
  role: EgovSignRole,
  signerUid: string,
  signerName: string,
): string {
  const lines: string[] = [
    'NOVA SAFETY AI — НДПР / согласование',
    '═'.repeat(40),
    `Рег. №: ${permit.registrationRefNo || '—'}`,
    `Наименование: ${permit.title}`,
    `Объект: ${permit.siteName}`,
    `Категория: ${permit.category}`,
    `Статус: ${permit.status}`,
    '',
    `Подписывающая роль: ${ROLE_LABELS[role === 'leadExpert' ? 'leadExpert' : role]}`,
    `Подписант (учётная запись): ${signerName} (${signerUid})`,
    `Дата формирования: ${new Date().toISOString()}`,
    '',
    '— Описание работ —',
    permit.workDescription.slice(0, 4000),
  ]
  if (permit.ppr) {
    lines.push('', '— ППР (задания) —')
    permit.ppr.tasks.forEach((t, i) => {
      lines.push(`${i + 1}. ${t.taskTitle || `Задание ${i + 1}`}`)
      if (t.workContent.trim()) lines.push(`   ${t.workContent.trim()}`)
    })
  }
  if (permit.asor) {
    lines.push('', '— АСОР (задания / факторы) —')
    permit.asor.tasks.forEach((t, ti) => {
      lines.push(`${ti + 1}. ${t.taskTitle || `Задание ${ti + 1}`}`)
      t.hazards.forEach((h, hi) => {
        if (h.factorDescription.trim()) {
          lines.push(`   Фактор ${hi + 1}: ${h.factorDescription.trim()}`)
        }
      })
    })
  }
  lines.push('', 'Подпись подтверждает ознакомление и согласование пакета НДПР.')
  return lines.join('\n')
}

export async function buildSigningPayload(
  permit: Permit,
  role: EgovSignRole,
  signerUid: string,
  signerName: string,
): Promise<SigningPayload> {
  const text = buildSigningCanonicalText(permit, role, signerUid, signerName)
  const documentHash = await sha256Hex(text)
  return {
    text,
    documentHash,
    dataBase64: toBase64Utf8(text),
  }
}

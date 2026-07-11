import type { AsorApprovalRow } from '../types/asor'
import type { DemoUser, Permit } from '../types/domain'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import { formatStoredDateTime } from './datetimeLocal'
import { pdfApprovalRoleSigned, validEgovRoleSignature } from './signatureStatus'
import { enrichUserDirectoryWithDefaultSigners } from '../config/defaultNdprSigners'

export const PDF_EGOV_SIG_COLORS = {
  signedBg: '#E8F5E9',
  signedTitle: '#1B5E20',
  signedName: '#2E7D32',
  signedMuted: '#558B2F',
  signedRowTint: '#F1F8F4',
  headerSigBg: '#C8E6C9',
  headerSigText: '#1B5E20',
  pendingBg: '#F5F5F5',
  pendingText: '#9E9E9E',
  shieldFill: '#1B7F4A',
  legacyBg: '#EDF7ED',
  legacyText: '#33691E',
} as const

/** Иконка щита с галочкой для pdfmake (svg). */
export function pdfEgovShieldSvg(
  size = 18,
  fill = PDF_EGOV_SIG_COLORS.shieldFill,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
    <path fill="${fill}" d="M12 1.5 3.5 5v6.2c0 5.6 3.7 10.8 8.5 11.8 4.8-1 8.5-6.2 8.5-11.8V5L12 1.5z"/>
    <path fill="#ffffff" d="M10.2 12.4 8.4 10.6l-1.1 1.1 2.9 2.9 6.2-6.2-1.1-1.1-5.1 5.1z"/>
  </svg>`
}

function egovSigStack(sig: StoredEgovSignature): Record<string, unknown>[] {
  const when = new Date(sig.signedAtIso).toLocaleString('ru-RU')
  const lines: Record<string, unknown>[] = [
    {
      text: 'ЭЦП eGov',
      bold: true,
      fontSize: 7,
      color: PDF_EGOV_SIG_COLORS.signedTitle,
    },
    {
      text: sig.signedByDisplayName,
      bold: true,
      fontSize: 8,
      color: PDF_EGOV_SIG_COLORS.signedName,
      margin: [0, 1, 0, 0],
    },
  ]
  if (sig.signerIin) {
    lines.push({
      text: `ИИН ${sig.signerIin}`,
      fontSize: 6.5,
      color: PDF_EGOV_SIG_COLORS.signedMuted,
    })
  }
  lines.push({
    text: when,
    fontSize: 6.5,
    color: PDF_EGOV_SIG_COLORS.signedMuted,
    italics: true,
    margin: [0, 1, 0, 0],
  })
  if (sig.sigexVerified) {
    lines.push({
      text: 'Проверено SIGEX',
      fontSize: 6,
      bold: true,
      color: PDF_EGOV_SIG_COLORS.signedTitle,
      margin: [0, 2, 0, 0],
    })
  }
  return lines
}

export function buildPdfEgovSignatureCell(sig: StoredEgovSignature): Record<string, unknown> {
  return {
    fillColor: PDF_EGOV_SIG_COLORS.signedBg,
    margin: [4, 5, 4, 5],
    columns: [
      {
        width: 22,
        svg: pdfEgovShieldSvg(18),
        margin: [0, 1, 4, 0],
      },
      {
        width: '*',
        stack: egovSigStack(sig),
      },
    ],
  }
}

export function buildPdfLegacyAckCell(name: string, when: string): Record<string, unknown> {
  return {
    fillColor: PDF_EGOV_SIG_COLORS.legacyBg,
    margin: [4, 5, 4, 5],
    stack: [
      {
        text: 'Согласовано',
        bold: true,
        fontSize: 7,
        color: PDF_EGOV_SIG_COLORS.legacyText,
      },
      {
        text: name,
        fontSize: 8,
        bold: true,
        color: PDF_EGOV_SIG_COLORS.signedName,
        margin: [0, 1, 0, 0],
      },
      {
        text: when,
        fontSize: 6.5,
        color: PDF_EGOV_SIG_COLORS.signedMuted,
        italics: true,
        margin: [0, 1, 0, 0],
      },
    ],
  }
}

export function buildPdfSignaturePendingCell(): Record<string, unknown> {
  return {
    fillColor: PDF_EGOV_SIG_COLORS.pendingBg,
    margin: [4, 8, 4, 8],
    alignment: 'center',
    stack: [
      {
        text: '—',
        fontSize: 10,
        color: '#BDBDBD',
        alignment: 'center',
      },
      {
        text: 'Ожидает подписи',
        fontSize: 6.5,
        color: PDF_EGOV_SIG_COLORS.pendingText,
        italics: true,
        alignment: 'center',
        margin: [0, 2, 0, 0],
      },
    ],
  }
}

export function isPdfEgovSigned(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): boolean {
  const dir = enrichUserDirectoryWithDefaultSigners(directory)
  return validEgovRoleSignature(permit, role, dir)
}

/** Ячейка таблицы согласовантов: щит + зелёный блок для ЭЦП. */
export function buildPdfSignatureStatusCell(
  permit: Permit,
  role: EgovSignRole,
  row: AsorApprovalRow,
  directory: DemoUser[] = [],
): Record<string, unknown> {
  const dir = enrichUserDirectoryWithDefaultSigners(directory)
  const sig = permit.egovSignatures?.[role]

  if (validEgovRoleSignature(permit, role, dir) && sig?.cmsBase64?.trim()) {
    return buildPdfEgovSignatureCell(sig)
  }

  if (pdfApprovalRoleSigned(permit, role, dir)) {
    const name = sig?.signedByDisplayName?.trim() || row.fullNamePrinted.trim()
    const when = sig?.signedAtIso
      ? formatStoredDateTime(sig.signedAtIso)
      : row.acknowledged && row.dateIso
        ? formatStoredDateTime(row.dateIso)
        : 'согласовано'
    if (name) return buildPdfLegacyAckCell(name, when)
  }

  return buildPdfSignaturePendingCell()
}

/** Заголовок колонки «Подпись / ЭЦП» в pdfmake-таблицах. */
export function buildPdfSignatureColumnHeader(
  text: string,
  opts?: { align?: 'left' | 'center' | 'right'; fontSize?: number },
): Record<string, unknown> {
  return {
    text,
    bold: true,
    fillColor: PDF_EGOV_SIG_COLORS.headerSigBg,
    color: PDF_EGOV_SIG_COLORS.headerSigText,
    fontSize: opts?.fontSize ?? 8,
    alignment: opts?.align ?? 'center',
  }
}

/** Плоский текст для обратной совместимости (поиск, превью). */
export function pdfSignaturePlainText(
  permit: Permit,
  role: EgovSignRole,
  row: AsorApprovalRow,
  directory: DemoUser[] = [],
): string {
  const dir = enrichUserDirectoryWithDefaultSigners(directory)
  const sig = permit.egovSignatures?.[role]
  if (validEgovRoleSignature(permit, role, dir) && sig?.cmsBase64?.trim()) {
    const when = new Date(sig.signedAtIso).toLocaleString('ru-RU')
    const iin = sig.signerIin ? ` · ИИН ${sig.signerIin}` : ''
    return `ЭЦП ✓ ${sig.signedByDisplayName}${iin}\n${when}`
  }
  if (pdfApprovalRoleSigned(permit, role, dir)) {
    const name = sig?.signedByDisplayName?.trim() || row.fullNamePrinted.trim()
    if (!name) return ''
    const when =
      sig?.signedAtIso
        ? formatStoredDateTime(sig.signedAtIso)
        : row.acknowledged && row.dateIso
          ? formatStoredDateTime(row.dateIso)
          : 'согласовано'
    return `${name}\n${when}`
  }
  return ''
}

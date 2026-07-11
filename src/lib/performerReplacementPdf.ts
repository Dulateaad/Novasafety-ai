import type { AsorApprovalRow } from '../types/asor'
import type { DemoUser, Permit } from '../types/domain'
import type { StoredEgovSignature } from '../types/egovSignature'
import type { PerformerReplacement } from '../types/performerReplacement'
import { signerShortName } from './approvalSequence'
import { formatStoredDateTime } from './datetimeLocal'
import {
  buildPdfEgovSignatureCell,
  buildPdfLegacyAckCell,
  buildPdfSignaturePendingCell,
  pdfEgovShieldSvg,
} from './pdfEgovSignatureCell'
import { uidMatchesAccount } from './permitAccess'
import { pdfApprovalRoleSigned, resolvedAssigneeUidForRole, validEgovRoleSignature } from './signatureStatus'
import { enrichUserDirectoryWithDefaultSigners } from '../config/defaultNdprSigners'

const REPLACED_MUTED = '#795548'
const REPLACED_BG = '#FFF8E1'

function dash(text: string | undefined | null): string {
  const t = text?.trim()
  return t || '—'
}

function signingDirectory(directory: DemoUser[]): DemoUser[] {
  return enrichUserDirectoryWithDefaultSigners(directory)
}

/** ЭЦП производителя не совпадает с текущим назначением (после замены). */
export function performerEgovSignatureMismatch(
  permit: Permit,
  directory: DemoUser[] = [],
): boolean {
  const sig = permit.egovSignatures?.performer
  const signerUid = sig?.signedByUid?.trim()
  if (!sig?.cmsBase64?.trim() || !signerUid) return false
  const assigneeUid = resolvedAssigneeUidForRole(permit, 'performer', directory).trim()
  if (!assigneeUid) return false
  const dir = signingDirectory(directory)
  const signer =
    dir.find((u) => u.id === signerUid) ??
    ({ id: signerUid, email: '', displayName: sig.signedByDisplayName, role: 'performer' } as DemoUser)
  return !uidMatchesAccount(assigneeUid, signer, dir)
}

export function latestPerformerReplacement(permit: Permit): PerformerReplacement | null {
  const list = permit.performerReplacements ?? []
  return list.length > 0 ? list[list.length - 1]! : null
}

function archivedPerformerSignature(permit: Permit): StoredEgovSignature | null {
  const last = latestPerformerReplacement(permit)
  const archived = last?.previousEgovSignature
  if (archived?.cmsBase64?.trim() || archived?.signedByDisplayName?.trim()) {
    return archived
  }
  if (performerEgovSignatureMismatch(permit, [])) {
    return permit.egovSignatures?.performer ?? null
  }
  return null
}

function currentPerformerEgovSignature(
  permit: Permit,
  directory: DemoUser[] = [],
): StoredEgovSignature | null {
  const sig = permit.egovSignatures?.performer
  if (!sig?.cmsBase64?.trim()) return null
  if (performerEgovSignatureMismatch(permit, directory)) return null
  return sig
}

function buildPdfStalePerformerSignatureCell(sig: StoredEgovSignature): Record<string, unknown> {
  const when = new Date(sig.signedAtIso).toLocaleString('ru-RU')
  return {
    fillColor: REPLACED_BG,
    margin: [4, 4, 4, 4],
    stack: [
      {
        text: 'Предыдущий производитель (заменён)',
        fontSize: 6.5,
        color: REPLACED_MUTED,
        italics: true,
        margin: [0, 0, 0, 2],
      },
      {
        columns: [
          {
            width: 18,
            svg: pdfEgovShieldSvg(14),
            margin: [0, 1, 4, 0],
          },
          {
            width: '*',
            stack: [
              {
                text: sig.signedByDisplayName,
                fontSize: 7.5,
                bold: true,
                color: REPLACED_MUTED,
              },
              {
                text: when,
                fontSize: 6,
                color: '#8D6E63',
                italics: true,
                margin: [0, 1, 0, 0],
              },
            ],
          },
        ],
      },
    ],
  }
}

/** Имя производителя в таблице согласований: текущий + «ранее: …». */
export function buildPdfPerformerNameCell(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  fillColor?: string,
): Record<string, unknown> {
  const current = signerShortName(resolveUser(permit.performerUid)?.displayName)
  const last = latestPerformerReplacement(permit)
  const previous = last
    ? signerShortName(last.fromDisplayName) ||
      signerShortName(last.previousEgovSignature?.signedByDisplayName)
    : ''

  if (!previous || previous === current) {
    return { text: dash(current), fontSize: 8, fillColor }
  }

  return {
    fillColor,
    stack: [
      { text: current, fontSize: 8, bold: true },
      {
        text: `ранее: ${previous}`,
        fontSize: 7,
        color: '#666666',
        italics: true,
        margin: [0, 2, 0, 0],
      },
      {
        text: formatStoredDateTime(last!.atIso),
        fontSize: 6.5,
        color: '#888888',
        margin: [0, 1, 0, 0],
      },
    ],
  }
}

/** Ячейка подписи производителя: действующая / ожидание + архив предыдущего. */
export function buildPdfPerformerSignatureCell(
  permit: Permit,
  row: AsorApprovalRow,
  directory: DemoUser[] = [],
): Record<string, unknown> {
  const currentSig = currentPerformerEgovSignature(permit, directory)
  const staleSig = archivedPerformerSignature(permit)

  const blocks: Record<string, unknown>[] = []

  if (validEgovRoleSignature(permit, 'performer', directory) && currentSig?.cmsBase64?.trim()) {
    blocks.push(buildPdfEgovSignatureCell(currentSig))
  } else if (pdfApprovalRoleSigned(permit, 'performer', directory)) {
    const when = row.dateIso ? formatStoredDateTime(row.dateIso) : 'согласовано'
    blocks.push(buildPdfLegacyAckCell(row.fullNamePrinted, when))
  } else {
    blocks.push(buildPdfSignaturePendingCell())
  }

  if (staleSig && (!currentSig || staleSig.signedByUid !== currentSig.signedByUid)) {
    blocks.push(buildPdfStalePerformerSignatureCell(staleSig))
  }

  if (blocks.length === 1) return blocks[0]!
  return { stack: blocks }
}

/** Таблица журнала замен производителя для PDF-пакета. */
export function performerReplacementHistoryPdfBlocks(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
): Record<string, unknown>[] {
  const rows = permit.performerReplacements ?? []
  if (rows.length === 0) return []

  const body: unknown[][] = [
    [
      { text: 'Дата и время', style: 'tableHeader' },
      { text: 'Было', style: 'tableHeader' },
      { text: 'Стало', style: 'tableHeader' },
      { text: 'Кто оформил', style: 'tableHeader' },
    ],
    ...rows.map((r) => [
      formatStoredDateTime(r.atIso),
      dash(
        signerShortName(r.fromDisplayName) ||
          signerShortName(r.previousEgovSignature?.signedByDisplayName),
      ),
      dash(signerShortName(r.toDisplayName) || signerShortName(resolveUser(r.toUid)?.displayName)),
      dash(signerShortName(resolveUser(r.replacedByUid)?.displayName)),
    ]),
  ]

  return [
    {
      text: 'Замена производителя работ',
      bold: true,
      fontSize: 9,
      margin: [0, 8, 0, 4],
    },
    {
      text: 'При замене ответственного производителя в действующем наряде сохраняется история назначений и архивная ЭЦП снятого участника.',
      fontSize: 7,
      color: '#666666',
      italics: true,
      margin: [0, 0, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: [80, '*', '*', 90],
        body,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#333333',
        vLineColor: () => '#333333',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      fontSize: 8,
      margin: [0, 0, 0, 10],
    },
  ]
}

export function performerSummaryLine(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
): string {
  const name = signerShortName(resolveUser(permit.performerUid)?.displayName)
  const last = latestPerformerReplacement(permit)
  if (!last) return name
  const prev =
    signerShortName(last.fromDisplayName) ||
    signerShortName(last.previousEgovSignature?.signedByDisplayName)
  if (!prev || prev === name) return name
  return `${name} (с ${formatStoredDateTime(last.atIso).slice(0, 10)}; ранее ${prev})`
}

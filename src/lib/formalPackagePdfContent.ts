import type { DemoUser, Permit } from '../types/domain'
import { ASOR_EDITION_META } from '../types/asor'
import type { AsorApprovalRow } from '../types/asor'
import { defaultApprovalRows } from '../types/asor'
import {
  APP_NAME,
  ABR_LABEL,
} from '../config/branding'
import {
  ZONE_CLASS_LABELS,
  formatSpecialWorkActivitiesLabels,
} from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import {
  approvalIndexForRole,
  pdfApprovalRoleLabel,
  signingRoleOrder,
  SIGNING_ACTION_LABEL,
  signerShortName,
} from './approvalSequence'
import { assigneeUidForRole, pdfApprovalRoleSigned } from './signatureStatus'
import { formatStoredDateTime } from './datetimeLocal'
import { parseWorkStagesBlocks } from './formatWorkStagesDisplay'
import { parseToolsAndEquipmentList } from './toolsAndEquipmentFormat'
import { permitWorkTitle, permitWorkDescriptionNdpr } from './ndprWorkText'
import { permitShiftLabel } from './permitShiftLabel'
import { buildPermitCrewRows, permitToolsAndEquipment } from './permitCrewRows'
import {
  buildPdfSignatureStatusCell,
  PDF_EGOV_SIG_COLORS,
} from './pdfEgovSignatureCell'
import { crewAckDatePdfText, crewAckSignaturePdfText } from './crewAckPdfText'
import {
  buildPdfPerformerNameCell,
  buildPdfPerformerSignatureCell,
  performerReplacementHistoryPdfBlocks,
  performerSummaryLine,
} from './performerReplacementPdf'

function dash(text: string | undefined | null): string {
  const t = text?.trim()
  return t || '—'
}

const PDF_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#333333',
  vLineColor: () => '#333333',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
}

function labelCell(label: string): Record<string, unknown> {
  return { text: label, bold: true, fontSize: 10, fillColor: '#f0f0f0' }
}

function valueCell(text: string, bold = false): Record<string, unknown> {
  return { text: text || '—', fontSize: 9, ...(bold ? { bold: true } : {}) }
}

function kvRow(label: string, value: string, boldValue = false): unknown[] {
  return [labelCell(label), valueCell(value, boldValue)]
}

function kvRowContent(
  label: string,
  value: Record<string, unknown>,
  boldValue = false,
): unknown[] {
  return [
    labelCell(label),
    { ...value, fontSize: value.fontSize ?? 9, ...(boldValue ? { bold: true } : {}) },
  ]
}

function workStagesPdfValue(text: string): Record<string, unknown> {
  const blocks = parseWorkStagesBlocks(text)
  const titles = blocks.map((b) => b.title.trim()).filter(Boolean)
  if (titles.length === 0) {
    return { text: text || '—', fontSize: 9, bold: true, preserveLeadingSpaces: true }
  }
  return {
    stack: titles.map((title, i) => ({
      text: title,
      bold: true,
      fontSize: 9,
      margin: i > 0 ? [0, 2, 0, 0] : [0, 0, 0, 0],
    })),
  }
}

function toolsText(permit: Permit): string {
  const raw = permitToolsAndEquipment(permit)
  const items = parseToolsAndEquipmentList(raw)
  if (items.length > 0) return items.join(', ')
  return raw
}

function pdfPartsLine(permit: Permit): string {
  const parts = ['Наряд-допуск (НДПР)']
  if ((permit.asor?.abr?.stages?.length ?? 0) > 0) parts.push(ABR_LABEL)
  const hazardCount =
    permit.asor?.tasks.reduce((n, t) => n + t.hazards.length, 0) ?? 0
  if (hazardCount > 0) parts.push('Оценка Риска')
  return parts.join('  ·  ')
}

function sigBlock(name: string, caption: string): Record<string, unknown> {
  return {
    stack: [
      { text: name || ' ', margin: [0, 14, 0, 2], fontSize: 10 },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5 }],
      },
      { text: caption, fontSize: 7, italics: true, alignment: 'center', margin: [0, 2, 0, 0] },
    ],
  }
}

function buildPackageSummaryTable(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): Record<string, unknown> {
  const reg = permit.registrationRefNo || permit.id.slice(0, 8)
  const title = permitWorkTitle(permit)
  const stages = permitWorkDescriptionNdpr(permit)
  const tools = toolsText(permit)
  const start = formatStoredDateTime(permit.f02.startDate)
  const end = formatStoredDateTime(permit.f02.endDate)
  const period = start !== '—' || end !== '—' ? `${start} — ${end}` : '—'
  const crewCount = buildPermitCrewRows(permit, resolveUser, directory).length

  const body: unknown[][] = [
    [
      {
        text: `${APP_NAME} — краткая сводка пакета`,
        colSpan: 2,
        bold: true,
        fontSize: 11,
        fillColor: '#f0f0f0',
        margin: [6, 5, 6, 5],
      },
      {},
    ],
    kvRow('Наряд-допуск №', reg),
    kvRow('Объект', dash(permit.siteName), true),
    kvRow('Организация', dash(permit.f02?.company), true),
  ]

  if (period !== '—') body.push(kvRow('Срок работ', period, true))
  body.push(kvRow('Смена наряда', permitShiftLabel(permit), true))
  body.push(
    kvRow(
      'Вид работ',
      formatSpecialWorkActivitiesLabels(
        permit.specialWorkActivities,
        permit.specialWorkActivity,
      ),
    ),
  )
  body.push(kvRow('Зона', ZONE_CLASS_LABELS[permit.zoneClass]))
  if (crewCount > 0) body.push(kvRow('Бригада', `${crewCount} чел.`))
  body.push(kvRow('Наименование работ', dash(title), true))
  if (stages) body.push(kvRowContent('Этапы работ', workStagesPdfValue(stages), true))
  body.push(kvRow('Инструменты и оборудование', dash(tools), true))

  signingRoleOrder(permit).forEach((role) => {
    const uid = assigneeUidForRole(permit, role)
    const name =
      role === 'performer'
        ? dash(performerSummaryLine(permit, resolveUser))
        : dash(signerShortName(resolveUser(uid)?.displayName))
    body.push(kvRow(SIGNING_ACTION_LABEL[role], name))
  })

  body.push(kvRow('Состав PDF-пакета', pdfPartsLine(permit)))

  return {
    table: { widths: [130, '*'], body },
    layout: PDF_TABLE_LAYOUT,
    margin: [0, 0, 0, 14],
  }
}

function approvalRowForRole(
  permit: Permit,
  role: EgovSignRole,
  resolveUser: (uid: string) => DemoUser | undefined,
): AsorApprovalRow {
  const idx = approvalIndexForRole(role)
  const uid = assigneeUidForRole(permit, role)
  const name = signerShortName(resolveUser(uid)?.displayName)
  const existing = idx >= 0 ? permit.asor?.approvals[idx] : undefined
  if (existing) {
    return {
      ...existing,
      fullNamePrinted: name !== '—' ? name : existing.fullNamePrinted,
      roleLabelRu: pdfApprovalRoleLabel(role),
    }
  }
  const fallback = defaultApprovalRows()[idx]
  return (
    fallback ?? {
      roleKey: 'filled_work_permitter',
      roleLabelRu: pdfApprovalRoleLabel(role),
      fullNamePrinted: name !== '—' ? name : '',
      badgeNo: '',
      dateIso: '',
      acknowledged: false,
    }
  )
}

/** Официальный бланк НДПР — сводка пакета, бригада, согласования (pdfmake content). */
export function buildFormalPackagePdfContent(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): Record<string, unknown>[] {
  const reg = permit.registrationRefNo || permit.id.slice(0, 8)
  const issuer = resolveUser(permit.issuerUid)
  const performer = resolveUser(permit.performerUid)
  const asor = permit.asor
  const permitTypeLabel =
    permit.permitType === 'fire'
      ? 'на выполнение огневых работ'
      : 'на выполнение работ повышенной опасности'

  const content: Record<string, unknown>[] = [
    {
      text: dash(permit.f02.company),
      fontSize: 11,
      bold: true,
      margin: [0, 0, 0, 12],
    },
    {
      text: `НАРЯД-ДОПУСК № ${reg}\n${permitTypeLabel}`,
      alignment: 'center',
      bold: true,
      fontSize: 13,
      margin: [0, 0, 0, 10],
    },
    buildPackageSummaryTable(permit, resolveUser, directory),
  ]

  const crewRows = buildPermitCrewRows(permit, resolveUser, directory)

  content.push({
    text: '8. Состав бригады и инструктаж',
    bold: true,
    margin: [0, 8, 0, 4],
  })

  const teamBody: unknown[][] = [
    [
      { text: '№', style: 'tableHeader', alignment: 'center' },
      { text: 'Ф.И.О.', style: 'tableHeader' },
      { text: 'Функция', style: 'tableHeader' },
      { text: 'Ознакомление / ЭЦП', style: 'tableHeader', alignment: 'center' },
      { text: 'Дата', style: 'tableHeader', alignment: 'center' },
    ],
  ]

  if (crewRows.length === 0) {
    teamBody.push([
      '1',
      dash(performer?.displayName),
      '—',
      ' ',
      ' ',
    ])
  } else {
    crewRows.forEach((row, i) => {
      const name = row.badgeNo
        ? `${dash(row.fullName)} (№ ${row.badgeNo})`
        : dash(row.fullName)
      teamBody.push([
        String(i + 1),
        name,
        dash(row.roleLabel),
        crewAckSignaturePdfText(permit, row.userUid, row.acknowledged) || ' ',
        crewAckDatePdfText(permit, row.userUid, row.dateIso) || ' ',
      ])
    })
  }

  content.push({
    table: {
      headerRows: 1,
      widths: [20, '*', 70, 95, 55],
      body: teamBody,
    },
    layout: PDF_TABLE_LAYOUT,
    fontSize: 8,
    margin: [0, 0, 0, 10],
  })

  const sitePhotos = permit.sitePhotos ?? []
  if (sitePhotos.length > 0) {
    content.push({
      text: 'Фотофиксация места работ',
      bold: true,
      fontSize: 9,
      margin: [0, 6, 0, 6],
      pageBreak: sitePhotos.length > 2 ? 'before' : undefined,
    })
    const photoCols: Record<string, unknown>[] = []
    for (const photo of sitePhotos) {
      photoCols.push({
        width: '*',
        stack: [
          { image: photo.dataUrl, width: 220, margin: [0, 0, 0, 4] },
          {
            text: photo.caption.trim() || 'Участок работ',
            fontSize: 7,
            alignment: 'center',
          },
          {
            text: formatStoredDateTime(photo.capturedAtIso),
            fontSize: 6,
            alignment: 'center',
            color: '#555555',
          },
        ],
      })
    }
    for (let i = 0; i < photoCols.length; i += 2) {
      content.push({
        columns: photoCols.slice(i, i + 2),
        columnGap: 10,
        margin: [0, 0, 0, 8],
      })
    }
  }

  const issuerPrinted =
    asor?.approvals[1]?.fullNamePrinted.trim() || dash(issuer?.displayName)

  content.push({
    columns: [
      {
        width: '*',
        text: '9. Наряд-допуск выдан, инструктаж проведён',
        bold: true,
        fontSize: 9,
      },
      {
        width: 220,
        ...sigBlock(issuerPrinted, '(должность, ФИО, подпись, дата)'),
      },
    ],
    columnGap: 12,
    margin: [0, 6, 0, 10],
  })

  content.push({ text: '10. Согласовано:', bold: true, margin: [0, 4, 0, 6] })

  const approvalBody: unknown[][] = [
    [
      { text: '№', style: 'tableHeader', alignment: 'center' },
      { text: 'Роль / действие', style: 'tableHeader' },
      { text: 'Ф.И.О.', style: 'tableHeader' },
      { text: '№ бейджа', style: 'tableHeader', alignment: 'center' },
      { text: 'Согласование / ЭЦП', style: 'tableHeader', alignment: 'center' },
    ],
  ]

  signingRoleOrder(permit).forEach((role, i) => {
    const row = approvalRowForRole(permit, role, resolveUser)
    const signed = pdfApprovalRoleSigned(permit, role, directory)
    const rowFill = signed ? PDF_EGOV_SIG_COLORS.signedRowTint : undefined
    const nameCell =
      role === 'performer'
        ? buildPdfPerformerNameCell(permit, resolveUser, rowFill)
        : { text: dash(row.fullNamePrinted), fillColor: rowFill, fontSize: 8 }
    const sigCell =
      role === 'performer'
        ? buildPdfPerformerSignatureCell(permit, row, directory)
        : buildPdfSignatureStatusCell(permit, role, row, directory)
    approvalBody.push([
      { text: `10.${i + 1}`, fillColor: rowFill, fontSize: 8, alignment: 'center' },
      { text: pdfApprovalRoleLabel(role), fillColor: rowFill, fontSize: 8 },
      nameCell,
      {
        text: dash(row.badgeNo),
        fillColor: rowFill,
        fontSize: 8,
        alignment: 'center',
      },
      sigCell,
    ])
  })

  content.push({
    table: {
      headerRows: 1,
      widths: [28, '*', 85, 40, 118],
      body: approvalBody,
    },
    layout: PDF_TABLE_LAYOUT,
    fontSize: 8,
    margin: [0, 0, 0, 10],
  })

  content.push(...performerReplacementHistoryPdfBlocks(permit, resolveUser))

  content.push({
    text: `Документ сформирован ${APP_NAME} · ${ASOR_EDITION_META.formRef} · ${new Date().toLocaleString('ru-RU')}`,
    fontSize: 7,
    color: '#666666',
    margin: [0, 16, 0, 0],
  })

  return content
}

export const FORMAL_PDF_STYLES: Record<string, Record<string, unknown>> = {
  header: { fontSize: 14, bold: true },
  subheader: { fontSize: 11, bold: true },
  tableHeader: { bold: true, fillColor: '#f0f0f0', fontSize: 7 },
}

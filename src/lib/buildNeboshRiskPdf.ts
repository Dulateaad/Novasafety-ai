import { RISK_ASSESSMENT_LABEL } from '../config/branding'
import type { AsorForm, AsorHazardRow, AsorTaskResidualRisk } from '../types/asor'
import type { DemoUser, Permit } from '../types/domain'
import {
  NEBOSH_LIKELIHOOD_MATRIX,
  NEBOSH_MATRIX_COLS,
  NEBOSH_MATRIX_ROWS,
  NEBOSH_PDF_COLORS,
  NEBOSH_RISK_BAND_LABELS,
  NEBOSH_SEVERITY_SHORT,
  neboshCellColor,
  neboshCellTextColor,
  neboshRiskBand,
  neboshRiskBandFill,
  neboshRiskBandTextColor,
  neboshRiskScore,
  type NeboshRiskBand,
  type NeboshScaleValue,
} from '../config/neboshRiskMatrix'
import {
  canPreviewNebosh,
  finalizeNeboshTasksForReady,
  hazardRowHasContent,
} from './finalizeGeneratedRiskDocs'
import { mergeNeboshApprovalPeopleFromNd } from './ndprApprovalPeople'
import { resolveUserBadgeNo } from './userBadgeNumbers'
import { wrapTextAtWords } from './pdfTextWrap'
import { initPdfMake, pdfBase64Async } from './pdfMakeEngine'
import { sanitizeNeboshRiskAnnotations } from './neboshRiskText'
import { inferNeboshScores } from './inferNeboshScores'
import { buildPermitCrewRows } from './permitCrewRows'
import { crewAckDatePdfText, crewAckSignaturePdfText } from './crewAckPdfText'

type PdfCell = Record<string, unknown>

const TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#BFBFBF',
  vLineColor: () => '#BFBFBF',
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 4,
  paddingBottom: () => 4,
}

const FS = 9
/** Реестр в альбомной ориентации — больше места, перенос по словам. */
const FS_REGISTRY = 8
const FS_REGISTRY_HDR = 8
/** Узкие колонки «В/Т» и «Исх./Ост. риск» (LOW/MEDIUM/HIGH). */
const FS_SCORE = 7
const FS_RISK_BAND = 5.5
const FS_SECTION = 11
const FS_CREW = 10

/** Альбомная A4 (~802 pt): узкие В/Т и риск-полосы, «*» для мер. */
const REGISTRY_TABLE_WIDTHS: (number | string)[] = [
  72, 84, 58, 11, 11, 22, '*', 11, 11, 22, 84,
]

/** Ориентировочная длина строки для переноса по словам (8 pt, альбомная A4). */
const REGISTRY_WRAP = {
  operation: 14,
  hazard: 16,
  who: 11,
  measures: 78,
  responsible: 16,
} as const

const REGISTRY_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#BFBFBF',
  vLineColor: () => '#BFBFBF',
  paddingLeft: () => 3,
  paddingRight: () => 3,
  paddingTop: () => 2,
  paddingBottom: () => 2,
}

const REGISTRY_COLSPAN_FILLERS = (): PdfCell[] =>
  Array.from({ length: 10 }, () => ({ text: '' }))

function riskBandCell(band: NeboshRiskBand, fontSize = FS_RISK_BAND): PdfCell {
  if (!band) return scoreCell('—', NEBOSH_PDF_COLORS.white)
  return {
    text: NEBOSH_RISK_BAND_LABELS[band],
    fillColor: neboshRiskBandFill(band),
    color: neboshRiskBandTextColor(band),
    alignment: 'center',
    bold: true,
    fontSize,
    margin: [0, 2, 0, 2],
    noWrap: true,
  }
}

function scoreCell(text: string, fill: string = NEBOSH_PDF_COLORS.white): PdfCell {
  return {
    text: text || '—',
    fillColor: fill,
    fontSize: FS_SCORE,
    bold: true,
    alignment: 'center',
    color: '#000000',
    margin: [0, 2, 0, 2],
    noWrap: true,
  }
}

function registryHdr(text: string): PdfCell {
  return hdr(text, NEBOSH_PDF_COLORS.headerDark, '#FFFFFF', 'center', FS_REGISTRY_HDR)
}

function registryNarrowHdr(text: string): PdfCell {
  return hdr(text, NEBOSH_PDF_COLORS.headerDark, '#FFFFFF', 'center', FS_SCORE)
}

function hdr(
  text: string,
  fill: string = NEBOSH_PDF_COLORS.headerDark,
  color = '#FFFFFF',
  align: 'left' | 'center' | 'right' = 'center',
  fontSize = FS,
): PdfCell {
  return { text, fillColor: fill, color, bold: true, fontSize, alignment: align }
}

function cell(
  text: string,
  fill: string = NEBOSH_PDF_COLORS.white,
  opts?: {
    bold?: boolean
    align?: 'left' | 'center' | 'right'
    color?: string
    fontSize?: number
  },
): PdfCell {
  return {
    text: text || '—',
    fillColor: fill,
    fontSize: opts?.fontSize ?? FS,
    bold: opts?.bold,
    alignment: opts?.align ?? 'left',
    color: opts?.color ?? '#000000',
  }
}

function residualBandFallback(residualRisk: AsorTaskResidualRisk): NeboshRiskBand {
  if (residualRisk === 'low' || residualRisk === 'medium' || residualRisk === 'high') {
    return residualRisk
  }
  return ''
}

function resolvedHazardScores(h: AsorHazardRow): {
  initialLikelihood: NeboshScaleValue
  initialSeverity: NeboshScaleValue
  residualLikelihood: NeboshScaleValue
  residualSeverity: NeboshScaleValue
} {
  let initialLikelihood = h.initialLikelihood
  let initialSeverity = h.initialSeverity
  let residualLikelihood = h.residualLikelihood
  let residualSeverity = h.residualSeverity

  const needsInfer =
    !initialLikelihood ||
    !initialSeverity ||
    !residualLikelihood ||
    !residualSeverity

  if (needsInfer) {
    const inferred = inferNeboshScores(
      `${h.factorDescription}\n${h.operationText}`,
      h.protectiveMeasures,
    )
    if (!initialLikelihood) initialLikelihood = inferred.initialLikelihood
    if (!initialSeverity) initialSeverity = inferred.initialSeverity
    if (!residualLikelihood) residualLikelihood = inferred.residualLikelihood
    if (!residualSeverity) residualSeverity = inferred.residualSeverity
  }

  return { initialLikelihood, initialSeverity, residualLikelihood, residualSeverity }
}

function registryCell(
  text: string,
  fill: string = NEBOSH_PDF_COLORS.white,
  opts?: { bold?: boolean; align?: 'left' | 'center' | 'right' },
  wrapChars?: number,
): PdfCell {
  const raw = text?.trim() || '—'
  const align = opts?.align ?? 'left'
  const base = {
    fillColor: fill,
    fontSize: FS_REGISTRY,
    lineHeight: 1.2,
    bold: opts?.bold,
    alignment: align,
    color: '#000000',
  }

  if (!wrapChars) {
    return { ...base, text: raw }
  }

  const lines = wrapTextAtWords(raw, wrapChars).split('\n')
  if (lines.length <= 1) {
    return { ...base, text: lines[0] || '—', noWrap: true }
  }

  return {
    ...base,
    stack: lines.map((line) => ({
      text: line,
      fontSize: FS_REGISTRY,
      noWrap: true,
      margin: [0, 0, 0, 1] as [number, number, number, number],
    })),
  }
}

function hazardRow(h: AsorHazardRow): PdfCell[] {
  const scores = resolvedHazardScores(h)
  let initBand = neboshRiskBand(
    neboshRiskScore(scores.initialLikelihood, scores.initialSeverity),
  )
  let resBand = neboshRiskBand(
    neboshRiskScore(scores.residualLikelihood, scores.residualSeverity),
  )
  if (!resBand) resBand = residualBandFallback(h.residualRisk)
  return [
    registryCell(h.operationText, NEBOSH_PDF_COLORS.altRow, undefined, REGISTRY_WRAP.operation),
    registryCell(h.factorDescription, NEBOSH_PDF_COLORS.white, undefined, REGISTRY_WRAP.hazard),
    registryCell(h.whoAtRisk, NEBOSH_PDF_COLORS.altRow, undefined, REGISTRY_WRAP.who),
    scoreCell(String(scores.initialLikelihood), NEBOSH_PDF_COLORS.white),
    scoreCell(String(scores.initialSeverity), NEBOSH_PDF_COLORS.white),
    riskBandCell(initBand),
    registryCell(
      formatMeasures(h.protectiveMeasures),
      NEBOSH_PDF_COLORS.white,
      undefined,
      REGISTRY_WRAP.measures,
    ),
    scoreCell(String(scores.residualLikelihood), NEBOSH_PDF_COLORS.white),
    scoreCell(String(scores.residualSeverity), NEBOSH_PDF_COLORS.white),
    riskBandCell(resBand),
    registryCell(
      h.responsiblePerson,
      NEBOSH_PDF_COLORS.altRow,
      undefined,
      REGISTRY_WRAP.responsible,
    ),
  ]
}

function formatListedText(text: string): string {
  const raw = (text || '—').trim()
  if (!raw || raw === '—') return '—'

  let parts = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (parts.length === 1) {
    const line = parts[0]
    if (line.includes(';')) {
      parts = line.split(';').map((item) => item.trim()).filter(Boolean)
    } else if (/\d+[\.\)]\s/.test(line)) {
      parts = line
        .split(/(?=\d+[\.\)]\s)/)
        .map((item) => item.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(Boolean)
    }
  }

  return parts
    .map((line) => {
      const t = line.trim()
      if (!t) return ''
      return t.startsWith('•') ? t : `• ${t}`
    })
    .filter(Boolean)
    .join('\n')
}

function stripResidualRiskAnnotations(text: string): string {
  return sanitizeNeboshRiskAnnotations(text)
}

function formatMeasures(text: string): string {
  return formatListedText(stripResidualRiskAnnotations(text))
}

function infoTable(form: AsorForm): Record<string, unknown> {
  const nb = form.nebosh
  return {
    table: {
      widths: ['18%', '32%', '18%', '32%'],
      body: [
        [
          cell('Объект:', NEBOSH_PDF_COLORS.labelBg, { bold: true }),
          cell(nb.siteObject || form.workPlacesText || '—'),
          cell('Дата оценки:', NEBOSH_PDF_COLORS.labelBg, { bold: true }),
          cell(nb.assessmentDateIso || form.creationDateIso),
        ],
        [
          cell('Заказчик:', NEBOSH_PDF_COLORS.labelBg, { bold: true }),
          cell(nb.clientOrg),
          cell('Следующий пересмотр:', NEBOSH_PDF_COLORS.labelBg, { bold: true }),
          cell(nb.nextReviewNote),
        ],
        [
          cell('Подрядчик:', NEBOSH_PDF_COLORS.labelBg, { bold: true }),
          { ...cell(nb.contractorOrg), colSpan: 3 },
          {},
          {},
        ],
        [
          cell('Стандарт ОР:', NEBOSH_PDF_COLORS.labelBg, { bold: true }),
          { ...cell(nb.standardRef), colSpan: 3 },
          {},
          {},
        ],
      ],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 8, 0, 10],
  }
}

function matrixTableContent(): Record<string, unknown> {
  const header = [
    hdr('Вероятность / Тяжесть', NEBOSH_PDF_COLORS.headerDark, '#FFFFFF', 'left'),
    ...NEBOSH_MATRIX_COLS.map((s) =>
      hdr(`${s}\n${NEBOSH_SEVERITY_SHORT[s]}`, NEBOSH_PDF_COLORS.headerMid),
    ),
  ]
  const body = NEBOSH_MATRIX_ROWS.map((l) => [
    hdr(NEBOSH_LIKELIHOOD_MATRIX[l], NEBOSH_PDF_COLORS.labelBg, '#000000', 'left'),
    ...NEBOSH_MATRIX_COLS.map((s) => {
      const score = neboshRiskScore(l, s)
      return {
        text: String(score),
        fillColor: neboshCellColor(score),
        color: neboshCellTextColor(score),
        alignment: 'center' as const,
        bold: true,
        fontSize: FS,
      }
    }),
  ])
  return {
    table: {
      headerRows: 1,
      widths: ['22%', '*', '*', '*', '*', '*'],
      body: [header, ...body],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 6],
  }
}

function registryTable(form: AsorForm): Record<string, unknown> | null {
  const body: PdfCell[][] = [
    [
      registryHdr('Операция'),
      registryHdr('Опасность'),
      registryHdr('Под угрозой'),
      registryNarrowHdr('В'),
      registryNarrowHdr('Т'),
      registryNarrowHdr('Исх.\nриск'),
      registryHdr('Меры контроля'),
      registryNarrowHdr('В'),
      registryNarrowHdr('Т'),
      registryNarrowHdr('Ост.\nриск'),
      registryHdr('Ответств.'),
    ],
    [
      {
        text: 'В = Вероятность (1–5)   Т = Тяжесть (1–5)   Риск = В×Т   ВЫСОКИЙ ≥15   СРЕДНИЙ 8–14   НИЗКИЙ 1–7',
        colSpan: 11,
        fillColor: NEBOSH_PDF_COLORS.headerMid,
        color: '#FFFFFF',
        bold: true,
        fontSize: FS_REGISTRY,
        alignment: 'center',
      },
      ...REGISTRY_COLSPAN_FILLERS(),
    ],
  ]

  let hasRows = false
  for (const task of form.tasks) {
    const hazards = task.hazards.filter(hazardRowHasContent)
    if (hazards.length === 0) continue
    hasRows = true
    body.push([
      {
        text: task.taskTitle.trim() || `Задание ${task.ordinal}`,
        colSpan: 11,
        fillColor: NEBOSH_PDF_COLORS.groupHeader,
        color: '#FFFFFF',
        bold: true,
        fontSize: FS_REGISTRY + 1,
      },
      ...REGISTRY_COLSPAN_FILLERS(),
    ])
    for (const h of hazards) {
      body.push(hazardRow(h))
    }
  }

  if (!hasRows) return null

  return {
    table: {
      headerRows: 1,
      widths: REGISTRY_TABLE_WIDTHS,
      body,
    },
    layout: REGISTRY_LAYOUT,
    margin: [0, 6, 0, 6],
  }
}

/** Подготовка формы оценки риска для PDF (подписанты НД + финализация реестра). */
export function prepareNeboshFormForPdf(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): AsorForm | null {
  const asor = permit.asor
  if (!asor) return null
  const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, directory)
  const prepared = finalizeNeboshTasksForReady(
    mergeNeboshApprovalPeopleFromNd(asor, permit, resolveName, resolveBadge),
  )
  return canPreviewNebosh(prepared) ? prepared : null
}

/** Блок «2. РЕЕСТР ОПАСНОСТЕЙ И ОЦЕНКА РИСКОВ» для вставки в любой PDF. */
export function neboshRegistryPdfContent(
  form: AsorForm,
  opts?: { pageBreakBefore?: boolean },
): Record<string, unknown>[] {
  const prepared = finalizeNeboshTasksForReady(form)
  const registry = registryTable(prepared)
  if (!registry) return []
  const pageBreak = opts?.pageBreakBefore === false ? undefined : ('before' as const)
  return [
    {
      pageBreak,
      pageOrientation: 'landscape',
      stack: [
        {
          text: '2. РЕЕСТР ОПАСНОСТЕЙ И ОЦЕНКА РИСКОВ',
          bold: true,
          fontSize: FS_SECTION,
          margin: [0, 0, 0, 4],
        },
        registry,
      ],
    },
  ]
}

function emergencyPlanTable(
  rows: { scenario: string; actions: string; responsible: string }[],
): Record<string, unknown> {
  const body: PdfCell[][] = [
    [hdr('Сценарий аварии'), hdr('Немедленные действия'), hdr('Ответственный / Ресурсы')],
    ...rows.map((r, i) => {
      const fill = i % 2 === 0 ? NEBOSH_PDF_COLORS.altRow : NEBOSH_PDF_COLORS.white
      return [
        cell(r.scenario, fill),
        cell(formatListedText(r.actions), fill),
        cell(r.responsible, fill),
      ]
    }),
  ]
  return {
    table: { headerRows: 1, widths: ['22%', '*', '28%'], body },
    layout: TABLE_LAYOUT,
    margin: [0, 4, 0, 8],
  }
}

function stripedTable(
  headers: string[],
  rows: string[][],
  widths: (string | number)[],
): Record<string, unknown> {
  const body: PdfCell[][] = [headers.map((h) => hdr(h))]
  for (const row of rows) {
    body.push(
      row.map((txt, i) =>
        cell(txt, i === 0 ? NEBOSH_PDF_COLORS.altRow : NEBOSH_PDF_COLORS.white),
      ),
    )
  }
  return {
    table: { headerRows: 1, widths, body },
    layout: TABLE_LAYOUT,
    margin: [0, 4, 0, 8],
  }
}

export async function buildNeboshRiskPdf(
  rawForm: AsorForm,
  title: string,
  opts?: {
    permit?: Permit
    resolveUser?: (uid: string) => DemoUser | undefined
    directory?: DemoUser[]
  },
): Promise<{ base64: string; fileName: string }> {
  const form = finalizeNeboshTasksForReady(rawForm)
  const nb = form.nebosh
  const content: Record<string, unknown>[] = [
    {
      text: RISK_ASSESSMENT_LABEL.toUpperCase(),
      bold: true,
      fontSize: 16,
      margin: [0, 0, 0, 4],
    },
    { text: title, bold: true, fontSize: 13, margin: [0, 0, 0, 4] },
    infoTable(form),
    {
      text: '1. МАТРИЦА ОЦЕНКИ РИСКОВ (5×5)',
      bold: true,
      fontSize: FS_SECTION,
      margin: [0, 6, 0, 4],
    },
    matrixTableContent(),
    {
      text:
        'Интерпретация: ВЫСОКИЙ (15–25): немедленные меры, остановка работ при невозможности снижения. СРЕДНИЙ (8–14): требуются дополнительные контрольные меры и разрешение руководства. НИЗКИЙ (1–7): приемлемый риск при соблюдении процедур.',
      fontSize: FS,
      margin: [0, 0, 0, 8],
    },
    ...neboshRegistryPdfContent(form),
  ]

  let restorePortrait = content.some(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      (block as { pageOrientation?: string }).pageOrientation === 'landscape',
  )

  const afterRegistryPage = (): Record<string, unknown> =>
    restorePortrait
      ? { pageOrientation: 'portrait' as const, pageBreak: 'before' as const }
      : {}

  if (nb.ppeTable.length > 0) {
    content.push({
      text: '3. СРЕДСТВА ИНДИВИДУАЛЬНОЙ ЗАЩИТЫ (СИЗ)',
      bold: true,
      fontSize: FS_SECTION,
      margin: [0, 6, 0, 4],
      ...afterRegistryPage(),
    })
    restorePortrait = false
    content.push(
      stripedTable(
        ['СИЗ', 'Стандарт / Спецификация', 'Применение'],
        nb.ppeTable.map((r) => [r.item, r.standard, r.usage]),
        ['28%', '*', '*'],
      ),
    )
  }

  if (nb.emergencyPlan.length > 0) {
    content.push({
      text: '4. ПЛАН АВАРИЙНОГО РЕАГИРОВАНИЯ',
      bold: true,
      fontSize: FS_SECTION,
      margin: [0, 4, 0, 4],
      ...afterRegistryPage(),
    })
    restorePortrait = false
    content.push(emergencyPlanTable(nb.emergencyPlan))
  }

  if (nb.permitsTable.length > 0) {
    content.push({
      text: '5. КЛЮЧЕВЫЕ РАЗРЕШЕНИЯ И ДОКУМЕНТЫ',
      bold: true,
      fontSize: 10,
      margin: [0, 4, 0, 4],
    })
    content.push(
      stripedTable(
        ['Документ', 'Применение', 'Статус'],
        nb.permitsTable.map((r) => [r.document, r.application, r.status]),
        ['30%', '*', '22%'],
      ),
    )
  }

  const permit = opts?.permit
  const resolveUser = opts?.resolveUser
  const directory = opts?.directory ?? []
  const crewFromPermit =
    permit && resolveUser ? buildPermitCrewRows(permit, resolveUser, directory) : []

  if (crewFromPermit.length > 0) {
    const crewBody: PdfCell[][] = [
      [hdr('№'), hdr('Ф.И.О. (печатными буквами)'), hdr('Подпись'), hdr('Дата')],
      ...crewFromPermit.map((row, i) => {
        const name = row.badgeNo
          ? `${row.fullName} (№ ${row.badgeNo})`
          : row.fullName
        const sigText = crewAckSignaturePdfText(permit!, row.userUid, row.acknowledged)
        const dateText = crewAckDatePdfText(permit!, row.userUid, row.dateIso)
        const fill =
          i % 2 === 0 ? NEBOSH_PDF_COLORS.altRow : NEBOSH_PDF_COLORS.white
        return [
          cell(String(i + 1), fill, { align: 'center', fontSize: FS_CREW }),
          cell(name, fill, { fontSize: FS_CREW }),
          cell(sigText || '\n\n', fill, { align: 'center', fontSize: 7 }),
          cell(dateText, fill, { align: 'center', fontSize: FS_CREW }),
        ]
      }),
    ]
    content.push({
      text: 'СОСТАВ БРИГАДЫ',
      bold: true,
      fontSize: FS_SECTION,
      margin: [0, 6, 0, 4],
      ...afterRegistryPage(),
    })
    restorePortrait = false
    content.push({
      table: {
        headerRows: 1,
        widths: ['6%', '42%', '28%', '24%'],
        body: crewBody,
      },
      layout: TABLE_LAYOUT,
      margin: [0, 4, 0, 8],
    })
  } else {
    const crewRows = form.declarationTeamRows.filter((r) => r.fullNamePrinted.trim())
    if (crewRows.length > 0) {
      const crewBody: PdfCell[][] = [
        [hdr('№'), hdr('Ф.И.О. (печатными буквами)'), hdr('Подпись'), hdr('Дата')],
        ...crewRows.map((r, i) => {
          const name = r.fullNamePrinted.trim()
          const badge = r.badgeNo.trim()
          const label = badge ? `${name} (№ ${badge})` : name
          const fill = i % 2 === 0 ? NEBOSH_PDF_COLORS.altRow : NEBOSH_PDF_COLORS.white
          return [
            cell(String(i + 1), fill, { align: 'center', fontSize: FS_CREW }),
            cell(label, fill, { fontSize: FS_CREW }),
            cell('\n\n', fill, { align: 'center', fontSize: FS_CREW }),
            cell(r.dateIso || '', fill, { align: 'center', fontSize: FS_CREW }),
          ]
        }),
      ]
      content.push({
        text: 'СОСТАВ БРИГАДЫ',
        bold: true,
        fontSize: FS_SECTION,
        margin: [0, 6, 0, 4],
        ...afterRegistryPage(),
      })
      restorePortrait = false
      content.push({
        table: {
          headerRows: 1,
          widths: ['6%', '42%', '28%', '24%'],
          body: crewBody,
        },
        layout: TABLE_LAYOUT,
        margin: [0, 4, 0, 8],
      })
    }
  }

  const disclaimer =
    nb.disclaimerNote.trim() ||
    'Настоящая оценка рисков подготовлена в соответствии с требованиями ISO 45001:2018, законодательства Республики Казахстан в области промышленной безопасности и внутренних регламентов ТОО «Урал Ойл энд Газ».'
  content.push({
    text: `Примечание: ${disclaimer}`,
    fontSize: FS,
    italics: true,
    margin: [0, 8, 0, 0],
  })

  const doc: Record<string, unknown> = {
    pageSize: 'A4',
    pageMargins: [20, 28, 20, 28],
    defaultStyle: { font: 'Roboto', fontSize: FS },
    content,
  }
  const pdfMake = await initPdfMake()
  const base64 = await pdfBase64Async(pdfMake, doc)
  const safe = title.replace(/[^\wа-яА-ЯёЁ\d-]+/gi, '-').slice(0, 60)
  return {
    base64,
    fileName: `Оценка-Риска-${safe || 'UOG'}.pdf`,
  }
}

export function downloadNeboshRiskPdf(base64: string, fileName: string): void {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

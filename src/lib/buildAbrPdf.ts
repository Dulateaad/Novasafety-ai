import { ABR_PDF_COLORS } from '../config/abrPdfColors'
import {
  ABR_CONTROLS,
  ABR_HAZARDS,
  formatAbrNumbers,
} from '../config/abrCatalog'
import type { AbrForm, AbrStageRow } from '../types/abr'
import type { DemoUser, Permit } from '../types/domain'
import { abrDailyAckSignaturePdfText } from './abrDailyAckSignaturePdfText'
import { abrDailyAckMechanicsPdfText, normalizeAbrDailyAcks } from './abrDailyAck'
import { buildPermitCrewRows } from './permitCrewRows'
import { crewAckDatePdfText, crewAckSignaturePdfText } from './crewAckPdfText'
import { performerReplacementHistoryPdfBlocks } from './performerReplacementPdf'
import { initPdfMake, pdfBase64Async } from './pdfMakeEngine'

type PdfCell = Record<string, unknown>

const C = ABR_PDF_COLORS

const LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => C.border,
  vLineColor: () => C.border,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
}

const FS = 8
const FS_SECTION = 10
const FS_TITLE = 12

function cell(
  text: string,
  opts?: {
    bold?: boolean
    italics?: boolean
    fill?: string
    color?: string
    align?: 'left' | 'center' | 'right'
    rowSpan?: number
    colSpan?: number
    fontSize?: number
  },
): PdfCell {
  const c: PdfCell = {
    text: text || '',
    fontSize: opts?.fontSize ?? FS,
    alignment: opts?.align ?? 'left',
    fillColor: opts?.fill ?? C.white,
    color: opts?.color ?? C.black,
  }
  if (opts?.bold) c.bold = true
  if (opts?.italics) c.italics = true
  if (opts?.rowSpan) c.rowSpan = opts.rowSpan
  if (opts?.colSpan) c.colSpan = opts.colSpan
  return c
}

function hdrCell(text: string, colSpan = 1): PdfCell {
  return cell(text, {
    bold: true,
    fill: C.headerBlue,
    color: C.white,
    align: 'center',
    colSpan,
  })
}

function sectionPara(text: string, bold = true): Record<string, unknown> {
  return { text, bold, fontSize: FS_SECTION, margin: [0, 6, 0, 3] }
}

function bodyPara(text: string, opts?: { bold?: boolean; italics?: boolean }): Record<string, unknown> {
  return {
    text,
    fontSize: FS,
    bold: opts?.bold,
    italics: opts?.italics,
    margin: [0, 0, 0, 4],
  }
}

function legendPara(): Record<string, unknown> {
  return {
    fontSize: FS,
    lineHeight: 1.65,
    margin: [0, 6, 0, 10],
    text: [
      { text: 'Легенда: ', italics: true },
      {
        text: ' Красный ',
        bold: true,
        color: '#9C0006',
        background: C.hazardActive,
      },
      { text: ' — активный опасный фактор в данном АБР; ', italics: true },
      {
        text: ' Зелёный ',
        bold: true,
        color: '#375623',
        background: C.controlActive,
      },
      { text: ' — активная мера защиты в данном АБР.', italics: true },
    ],
  }
}

function shiftLabel(abr: AbrForm): string {
  if (abr.shiftNight) return 'Ночь'
  if (abr.shiftDay) return 'День'
  return ' '
}

function usedHazardNumbers(stages: AbrStageRow[]): Set<number> {
  return new Set(stages.flatMap((s) => s.hazardNumbers))
}

function usedControlNumbers(stages: AbrStageRow[]): Set<number> {
  return new Set(stages.flatMap((s) => s.controlNumbers))
}

function headerTable(abr: AbrForm): Record<string, unknown> {
  return {
    table: {
      widths: ['34%', '22%', '22%', '22%'],
      body: [
        [
          hdrCell('Место проведения работ'),
          hdrCell('Наряд-допуск №'),
          hdrCell('Дата'),
          hdrCell('Смена'),
        ],
        [
          cell(abr.workLocation || ' '),
          cell(abr.permitNo || ' '),
          cell(abr.dateIso || ' '),
          cell(shiftLabel(abr), { align: 'center' }),
        ],
      ],
    },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function stagesTable(stages: AbrStageRow[]): Record<string, unknown> {
  const rows = stages.filter((s) => s.title.trim())
  const body: PdfCell[][] = [
    [
      hdrCell('№'),
      hdrCell('Этап задания'),
      hdrCell('Опасные факторы (№)'),
      hdrCell('Средства защиты (№)'),
    ],
    ...(rows.length > 0
      ? rows.map((row) => [
          cell(String(row.order), { align: 'center', fill: C.stagePeach }),
          cell(row.title, { fill: C.stagePeach }),
          cell(formatAbrNumbers(row.hazardNumbers), { fill: C.stageHazardPeach }),
          cell(formatAbrNumbers(row.controlNumbers), { fill: C.controlGreen }),
        ])
      : [
          [
            cell(' ', { align: 'center' }),
            cell(' '),
            cell(' '),
            cell(' '),
          ],
        ]),
  ]
  return {
    table: { widths: ['6%', '44%', '25%', '25%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function hazardCell(no: number, active: Set<number>): PdfCell {
  const h = ABR_HAZARDS.find((x) => x.no === no)
  return cell(h ? String(h.no) : ' ', {
    align: 'center',
    fill: active.has(no) ? C.hazardActive : C.white,
  })
}

function hazardTextCell(no: number, active: Set<number>): PdfCell {
  const h = ABR_HAZARDS.find((x) => x.no === no)
  return cell(h ? h.text : ' ', {
    fill: active.has(no) ? C.hazardActive : C.white,
  })
}

function hazardsReferenceTable(active: Set<number>): Record<string, unknown> {
  const body: PdfCell[][] = [
    [hdrCell('№'), hdrCell('Опасный фактор'), hdrCell('№'), hdrCell('Опасный фактор')],
  ]
  // Слева 1…N/2, справа N/2+1…N (не чередование 1|2, 3|4)
  const mid = Math.ceil(ABR_HAZARDS.length / 2)
  for (let i = 0; i < mid; i++) {
    const left = ABR_HAZARDS[i]
    const right = ABR_HAZARDS[i + mid]
    body.push([
      hazardCell(left.no, active),
      hazardTextCell(left.no, active),
      right ? hazardCell(right.no, active) : cell(' '),
      right ? hazardTextCell(right.no, active) : cell(' '),
    ])
  }
  return {
    table: { widths: ['6%', '44%', '6%', '44%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function controlItemCell(no: number, active: Set<number>): PdfCell {
  const item = ABR_CONTROLS.find((x) => x.no === no)
  return cell(item ? `${item.no}. ${item.text}` : ' ', {
    fill: active.has(no) ? C.controlActive : C.white,
    fontSize: 7.5,
  })
}

function controlSectionRow(title: string): PdfCell[] {
  return [
    cell(title, {
      bold: true,
      fill: C.sectionBlue,
      align: 'center',
      colSpan: 2,
      fontSize: FS,
    }),
    cell(''),
  ]
}

function controlPairRows(
  nums: number[],
  active: Set<number>,
): PdfCell[][] {
  // Слева первая половина номеров, справа вторая (не чередование)
  const mid = Math.ceil(nums.length / 2)
  const rows: PdfCell[][] = []
  for (let i = 0; i < mid; i++) {
    const a = nums[i]
    const b = nums[i + mid]
    rows.push([
      controlItemCell(a, active),
      b !== undefined ? controlItemCell(b, active) : cell(' '),
    ])
  }
  return rows
}

function controlsReferenceTable(active: Set<number>): Record<string, unknown> {
  const eng = ABR_CONTROLS.filter((c) => c.group === 'engineering').map((c) => c.no)
  const admin = ABR_CONTROLS.filter((c) => c.group === 'admin').map((c) => c.no)
  const ppe = ABR_CONTROLS.filter((c) => c.group === 'ppe').map((c) => c.no)
  const body: PdfCell[][] = [
    controlSectionRow('Инженерные меры'),
    ...controlPairRows(eng, active),
    controlSectionRow('Административные меры'),
    ...controlPairRows(admin, active),
    controlSectionRow('СИЗ'),
    ...controlPairRows(ppe, active),
  ]
  return {
    table: { widths: ['50%', '50%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function crewAckReportTable(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[],
): Record<string, unknown> {
  const rows = buildPermitCrewRows(permit, resolveUser, directory)
  const body: PdfCell[][] = [
    [
      hdrCell('Ф.И.О.'),
      hdrCell('Должность'),
      hdrCell('Дата'),
      hdrCell('Подпись'),
    ],
    ...(rows.length > 0
      ? rows.map((r) => [
          cell(r.fullName),
          cell(r.roleLabel),
          cell(crewAckDatePdfText(permit, r.userUid, r.dateIso)),
          cell(crewAckSignaturePdfText(permit, r.userUid, r.acknowledged), {
            align: 'center',
          }),
        ])
      : [[cell(' '), cell(' '), cell(' '), cell(' ')]]),
  ]
  return {
    table: { widths: ['32%', '24%', '18%', '26%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function dailyAckReportTable(
  days: import('../types/abrDailyAck').AbrDailyAckDay[],
): Record<string, unknown> {
  const rows = days
    .flatMap((day) =>
      day.entries.map((e) => [
        day.dateIso,
        e.fullName,
        e.roleLabel,
        abrDailyAckSignaturePdfText(e),
      ]),
    )
    .filter((r) => String(r[1]).trim())
  const body: PdfCell[][] = [
    [
      hdrCell('Дата смены'),
      hdrCell('Ф.И.О.'),
      hdrCell('Должность'),
      hdrCell('Подпись'),
    ],
    ...(rows.length > 0
      ? rows.map((r) => [
          cell(String(r[0])),
          cell(String(r[1])),
          cell(String(r[2])),
          cell(String(r[3]), { align: 'center' }),
        ])
      : [[cell(' '), cell(' '), cell(' '), cell(' ')]]),
  ]
  return {
    table: { widths: ['14%', '32%', '24%', '30%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

export type BuildAbrPdfOpts = {
  permit?: Permit
  resolveUser?: (uid: string) => DemoUser | undefined
  directory?: DemoUser[]
}

export async function buildAbrPdf(
  abr: AbrForm,
  dailyAcks?: import('../types/abrDailyAck').AbrDailyAckDay[],
  opts?: BuildAbrPdfOpts,
): Promise<{ base64: string; fileName: string }> {
  const activeHazards = usedHazardNumbers(abr.stages)
  const activeControls = usedControlNumbers(abr.stages)
  const permitLine = [
    abr.permitNo ? `НД № ${abr.permitNo}` : '',
    abr.dateIso ? `от ${abr.dateIso}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const ackDays = normalizeAbrDailyAcks(dailyAcks)

  const content: Record<string, unknown>[] = [
    {
      text: 'Анализ безопасности работ',
      bold: true,
      fontSize: FS_TITLE,
      color: C.titleBlue,
      margin: [0, 0, 0, 6],
    },
    headerTable(abr),
    legendPara(),
    bodyPara(`Описание задания: ${abr.jobDescription || ' '}`),
    sectionPara('Этапы задания, опасные факторы и средства защиты'),
    stagesTable(abr.stages),
    sectionPara('Реестр опасных факторов'),
    bodyPara('Выделены факторы, отмеченные как актуальные для данного АБР.'),
    hazardsReferenceTable(activeHazards),
    sectionPara('Реестр средств защиты'),
    bodyPara('Выделены меры, отмеченные как применяемые в рамках данного АБР.'),
    controlsReferenceTable(activeControls),
    ...(opts?.permit && opts.resolveUser
      ? [
          sectionPara('Подписи бригады — ознакомление при согласовании наряда'),
          bodyPara(
            'Работники подтверждают ознакомление с АБР и оценкой рисков перед подписью допускающего и выдающего.',
            { italics: true },
          ),
          crewAckReportTable(opts.permit, opts.resolveUser, opts.directory ?? []),
        ]
      : []),
    sectionPara('Подписи бригады — ежедневное ознакомление с АБР'),
    bodyPara(abrDailyAckMechanicsPdfText(), { italics: true }),
    dailyAckReportTable(ackDays),
    ...(opts?.permit && opts.resolveUser
      ? performerReplacementHistoryPdfBlocks(opts.permit, opts.resolveUser)
      : []),
  ]

  const doc: Record<string, unknown> = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [24, 56, 24, 48],
    defaultStyle: { font: 'Roboto', fontSize: FS },
    header: {
      columns: [
        {
          text: 'Анализ безопасности работ (АБР)',
          bold: true,
          color: C.titleBlue,
          fontSize: 9,
          width: '*',
        },
        {
          text: permitLine,
          alignment: 'right',
          color: C.muted,
          fontSize: 8,
          width: 'auto',
        },
      ],
      margin: [24, 14, 24, 8],
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: `Стр. ${currentPage} из ${pageCount}`,
      alignment: 'center',
      color: C.muted,
      fontSize: 8,
      margin: [24, 8, 24, 10],
    }),
    content,
  }

  const pdfMake = await initPdfMake()
  const base64 = await pdfBase64Async(pdfMake, doc)
  const safe = (abr.jobDescription || 'АБР').replace(/[^\wа-яА-ЯёЁ\d-]+/gi, '-').slice(0, 50)
  return { base64, fileName: `АБР-${safe || 'UOG'}.pdf` }
}

export function downloadAbrPdf(base64: string, fileName: string): void {
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

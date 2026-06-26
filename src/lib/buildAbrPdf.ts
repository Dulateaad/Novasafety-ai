import { ABR_PDF_COLORS } from '../config/abrPdfColors'
import {
  ABR_CONTROLS,
  ABR_HAZARDS,
  formatAbrNumbers,
} from '../config/abrCatalog'
import type { AbrForm, AbrStageRow } from '../types/abr'
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

function formatAnswerText(text: string): string {
  const raw = (text || ' ').trim()
  if (!raw) return ' '

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
    .map((line, i) => {
      const t = line.trim()
      if (!t) return ''
      if (/^\d+[\.\)]\s/.test(t)) return t
      return `${i + 1}. ${t.replace(/^•\s*/, '')}`
    })
    .filter(Boolean)
    .join('\n')
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
          cell(formatAbrNumbers(row.hazardNumbers), { fill: C.stagePeach }),
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
  for (let i = 0; i < ABR_HAZARDS.length; i += 2) {
    const left = ABR_HAZARDS[i]
    const right = ABR_HAZARDS[i + 1]
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
  const rows: PdfCell[][] = []
  for (let i = 0; i < nums.length; i += 2) {
    const a = nums[i]
    const b = nums[i + 1]
    rows.push([
      controlItemCell(a, active),
      b ? controlItemCell(b, active) : cell(' '),
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

const BRIEFING_QUESTIONS = [
  'Какие 3 основных опасных фактора и меры их контроля вы обсудили?',
  'Какие 3 основных сценария для приостановки / прекращения работ вы обсудили?',
  'Имеются ли у нас в бригаде МОР? Знают ли они своих наставников? Знают ли наставники свои обязанности?',
] as const

const POST_WORK_QUESTIONS = [
  'Что было сделано хорошо?',
  'Что было сделано неправильно?',
  'Как можно улучшить выполнение работ?',
  'Использовался ли ППР и для чего?',
] as const

function qaTable(
  questions: readonly string[],
  answers: string[],
): Record<string, unknown> {
  const body: PdfCell[][] = [
    [hdrCell('№'), hdrCell('Вопрос'), hdrCell('Ответ / комментарий')],
    ...questions.map((q, i) => [
      cell(String(i + 1), { align: 'center' }),
      cell(q, { italics: true }),
      cell(formatAnswerText(answers[i] ?? ' ')),
    ]),
  ]
  return {
    table: { widths: ['5%', '32%', '*'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function dailyAckReportTable(
  days: import('../types/abrDailyAck').AbrDailyAckDay[],
): Record<string, unknown> {
  const rows = days
    .flatMap((day) =>
      day.entries.map((e) => [day.dateIso, e.fullName, e.roleLabel, e.signatureNote]),
    )
    .filter((r) => String(r[1]).trim())
  const body: PdfCell[][] = [
    [
      hdrCell('Дата'),
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

function crewTable(abr: AbrForm): Record<string, unknown> {
  const crew = abr.crewAcknowledgments.filter((c) => c.fullName.trim())
  const rowCount = Math.max(crew.length, 1)
  const body: PdfCell[][] = [
    [
      hdrCell('Ф.И.О. (печатными буквами)'),
      hdrCell('Должность'),
      hdrCell('Подпись'),
    ],
    ...Array.from({ length: rowCount }, (_, i) => [
      cell(crew[i]?.fullName || ' ', { fill: C.white }),
      cell(crew[i]?.roleLabel || ' ', { fill: C.white }),
      cell('\n\n', { fill: C.white, align: 'center' }),
    ]),
  ]
  return {
    table: { widths: ['40%', '32%', '28%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

function approvalTable(abr: AbrForm): Record<string, unknown> {
  const signers =
    abr.approvalSigners.length >= 4
      ? abr.approvalSigners.slice(0, 4)
      : [abr.workSupervisor, abr.areaPermitter]
  const body: PdfCell[][] = [
    [
      hdrCell('Ответственное лицо'),
      hdrCell('Ф.И.О. (печатными буквами)'),
      hdrCell('№ пропуска'),
      hdrCell('Подпись'),
    ],
    ...signers.map((person) => [
      cell(person.roleLabel || ' '),
      cell(person.fullName || ' '),
      cell(person.badgeNo || ' '),
      cell('\n\n', { align: 'center' }),
    ]),
  ]
  return {
    table: { widths: ['24%', '30%', '14%', '32%'], body },
    layout: LAYOUT,
    margin: [0, 0, 0, 2],
  }
}

export async function buildAbrPdf(
  abr: AbrForm,
  dailyAcks?: import('../types/abrDailyAck').AbrDailyAckDay[],
): Promise<{ base64: string; fileName: string }> {
  const activeHazards = usedHazardNumbers(abr.stages)
  const activeControls = usedControlNumbers(abr.stages)
  const permitLine = [
    abr.permitNo ? `НД № ${abr.permitNo}` : '',
    abr.dateIso ? `от ${abr.dateIso}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const completionLine = [
    abr.workLocation ? `Объект: ${abr.workLocation}` : '',
    abr.jobDescription ? `— ${abr.jobDescription}` : '',
    abr.permitNo ? `| Наряд-допуск № ${abr.permitNo}` : '',
    abr.dateIso ? `| ${abr.dateIso}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content: Record<string, unknown>[] = [
    {
      text: 'Анализ безопасности работ',
      bold: true,
      fontSize: FS_TITLE,
      color: C.titleBlue,
      margin: [0, 0, 0, 6],
    },
    headerTable(abr),
    bodyPara(`Описание задания: ${abr.jobDescription || ' '}`),
    sectionPara('Этапы задания, опасные факторы и средства защиты'),
    stagesTable(abr.stages),
    sectionPara('Реестр опасных факторов'),
    bodyPara('Выделены факторы, отмеченные как актуальные для данного АБР.'),
    hazardsReferenceTable(activeHazards),
    sectionPara('Реестр средств защиты'),
    bodyPara('Выделены меры, отмеченные как применяемые в рамках данного АБР.'),
    controlsReferenceTable(activeControls),
    sectionPara('Инструктаж перед началом работ'),
    bodyPara(
      'Производитель работ / бригадир обсуждает следующие вопросы с бригадой и фиксирует результаты.',
    ),
    qaTable(BRIEFING_QUESTIONS, [
      abr.briefing.topHazardsAndControls,
      abr.briefing.stopScenarios,
      abr.briefing.morMentors,
    ]),
    sectionPara('Подтверждение бригады'),
    bodyPara(
      'Настоящим подтверждаю, что я понимаю мои роли и обязанности, опасные факторы и средства защиты, связанные с данным анализом безопасности работ.',
      { italics: true },
    ),
    crewTable(abr),
    ...(dailyAcks && dailyAcks.some((d) => d.entries.length > 0)
      ? [
          sectionPara('Ежедневное ознакомление с АБР'),
          bodyPara(
            'Работники подтверждают ознакомление с АБР ежедневно. Ниже — журнал подписей (Ф.И.О., должность, подпись).',
            { italics: true },
          ),
          dailyAckReportTable(dailyAcks),
        ]
      : []),
    sectionPara('Утверждение АБР'),
    approvalTable(abr),
    sectionPara('Анализ безопасности работ — завершение'),
    bodyPara(completionLine || ' '),
    sectionPara('Итоги выполнения работ'),
    bodyPara(
      'По завершении работ производитель работ / бригадир обсуждает следующие вопросы с рабочей бригадой.',
    ),
    qaTable(POST_WORK_QUESTIONS, [
      abr.postWork.doneWell,
      abr.postWork.doneWrong,
      abr.postWork.improvements,
      abr.postWork.pprUsage,
    ]),
    bodyPara(
      'Легенда: Красный — активный опасный фактор в данном АБР; Зелёный — активная мера защиты в данном АБР.',
      { italics: true },
    ),
    bodyPara(
      'Документ составлен в соответствии с требованиями ПЛА RZK-NSS-000-PLN-HSE-00047-00.',
      { italics: true },
    ),
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

import type { DemoUser, Permit } from '../types/domain'
import { ASOR_EDITION_META } from '../types/asor'
import { formatStoredDateTime } from './datetimeLocal'
import { HSE_ACTIVITY_TEMPLATES } from '../config/hseActivityTemplates'

const HSE_DOC_TITLE = ASOR_EDITION_META.title
const MAX_HSE_LINES = 8

function dash(text: string | undefined | null): string {
  const t = text?.trim()
  return t || '—'
}

function splitDateTime(value: string): { date: string; time: string } {
  const f = formatStoredDateTime(value)
  if (f === '—') return { date: '—', time: '—' }
  const parts = f.split(' ')
  return { date: parts[0] ?? '—', time: parts[1] ?? '—' }
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

function fieldRow(num: string, title: string, value: string): Record<string, unknown> {
  return {
    margin: [0, 0, 0, 8],
    stack: [
      {
        text: [
          { text: `${num} `, bold: true },
          { text: title, bold: true },
        ],
      },
      { text: value || ' ', margin: [0, 3, 0, 0] },
    ],
  }
}

/** Краткий список ключевых мер (без дублирования ППР и длинных описаний факторов). */
function keyHseLines(permit: Permit): string[] {
  const lines: string[] = []
  const a = permit.asor
  if (!a) return lines

  HSE_ACTIVITY_TEMPLATES.filter((t) => a.selectedHseTemplateIds.includes(t.id)).forEach(
    (t) => lines.push(t.title),
  )

  const seen = new Set<string>()
  for (const task of a.tasks) {
    for (const haz of task.hazards) {
      const measures = haz.protectiveMeasures
        .split('\n')
        .map((m) => m.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
      for (const m of measures) {
        const key = m.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        lines.push(m)
        if (lines.length >= MAX_HSE_LINES) return lines
      }
    }
  }

  return lines.slice(0, MAX_HSE_LINES)
}

/** Официальный бланк НДПР — только ключевые поля (pdfmake content). */
export function buildFormalPackagePdfContent(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
): Record<string, unknown>[] {
  const reg = permit.registrationRefNo || permit.id.slice(0, 8)
  const issuer = resolveUser(permit.issuerUid)
  const permitter = resolveUser(permit.permitterUid)
  const performer = resolveUser(permit.performerUid)
  const leadExpert = resolveUser(permit.leadExpertUid)
  const start = splitDateTime(permit.f02.startDate)
  const end = splitDateTime(permit.f02.endDate)
  const asor = permit.asor
  const permitTypeLabel =
    permit.permitType === 'fire'
      ? 'на выполнение огневых работ'
      : 'на выполнение работ повышенной опасности'

  const content: Record<string, unknown>[] = [
    {
      columns: [
        {
          width: '*',
          text: dash(permit.f02.company),
          fontSize: 11,
          bold: true,
        },
        {
          width: '*',
          alignment: 'right',
          stack: [
            { text: 'УТВЕРЖДАЮ', bold: true, fontSize: 10 },
            {
              text: dash(leadExpert?.displayName ?? asor?.approvals[3]?.fullNamePrinted),
              margin: [0, 4, 0, 0],
            },
            sigBlock('', '(подпись)'),
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },
    {
      text: `НАРЯД-ДОПУСК № ${reg}\n${permitTypeLabel}`,
      alignment: 'center',
      bold: true,
      fontSize: 13,
      margin: [0, 0, 0, 14],
    },
    fieldRow('1.', 'Объект / подразделение:', dash(permit.siteName)),
    fieldRow(
      '2.',
      'Место проведения работ:',
      dash(permit.f04?.workArea || permit.ppr?.workArea || permit.siteName),
    ),
    fieldRow(
      '3.',
      'Содержание работ:',
      dash(permit.workDescription || permit.title),
    ),
    fieldRow('4.', 'Ответственный за подготовку:', dash(permitter?.displayName)),
    fieldRow('5.', 'Ответственный за проведение:', dash(performer?.displayName)),
    {
      margin: [0, 0, 0, 8],
      stack: [
        { text: '6. Срок работ:', bold: true },
        {
          text: `с ${start.date} ${start.time} по ${end.date} ${end.time}`,
          margin: [0, 3, 0, 0],
        },
      ],
    },
  ]

  const measures = keyHseLines(permit)
  content.push({
    text: `7. ${HSE_DOC_TITLE}:`,
    bold: true,
    margin: [0, 6, 0, 4],
  })

  if (measures.length === 0) {
    content.push({
      text: '7.1 Мероприятия не указаны.',
      fontSize: 9,
      margin: [0, 0, 0, 4],
    })
  } else {
    measures.forEach((line, i) => {
      content.push({ text: `7.${i + 1} ${line}`, margin: [0, 0, 0, 3], fontSize: 9 })
    })
  }

  if (permit.ppr?.workTitle?.trim()) {
    content.push({
      text: `ППР: «${permit.ppr.workTitle.trim()}»`,
      fontSize: 9,
      margin: [0, 4, 0, 8],
      italics: true,
    })
  }

  const teamRows = asor?.declarationTeamRows.filter((r) => r.fullNamePrinted.trim()) ?? []
  const executorRows =
    teamRows.length > 0
      ? teamRows
      : permit.executors.map((ex) => ({
          id: ex.id,
          rolePrinted: 'Работник',
          fullNamePrinted: resolveUser(ex.userUid)?.displayName ?? ex.userUid,
          badgeNo: '',
          dateIso: ex.dateIso,
          signatureAcknowledged: ex.briefingAcknowledged,
        }))

  content.push({
    text: '8. Состав бригады и инструктаж',
    bold: true,
    margin: [0, 8, 0, 4],
    pageBreak: measures.length > 6 ? 'before' : undefined,
  })

  const teamBody: unknown[][] = [
    [
      { text: '№', style: 'tableHeader', alignment: 'center' },
      { text: 'Ф.И.О.', style: 'tableHeader' },
      { text: 'Функция', style: 'tableHeader' },
      { text: 'Подпись', style: 'tableHeader', alignment: 'center' },
      { text: 'Дата', style: 'tableHeader', alignment: 'center' },
    ],
  ]

  if (executorRows.length === 0) {
    teamBody.push(['1', dash(performer?.displayName), '—', ' ', ' '])
  } else {
    executorRows.forEach((row, i) => {
      teamBody.push([
        String(i + 1),
        dash(row.fullNamePrinted),
        dash(row.rolePrinted),
        row.signatureAcknowledged ? '✓' : ' ',
        dash(row.dateIso ? formatStoredDateTime(row.dateIso) : ''),
      ])
    })
  }

  content.push({
    table: {
      headerRows: 1,
      widths: [20, '*', 80, 50, 55],
      body: teamBody,
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
  })

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

  const approvalRows = asor?.approvals ?? []
  approvalRows.forEach((row, i) => {
    content.push({
      columns: [
        { width: '*', text: `10.${i + 1} ${row.roleLabelRu}`, fontSize: 9 },
        {
          width: 220,
          stack: [
            {
              text: dash(row.fullNamePrinted),
              alignment: 'right',
              margin: [0, 10, 0, 0],
              fontSize: 9,
            },
            {
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }],
            },
            {
              text: row.badgeNo ? `№ ${row.badgeNo}` : '(подпись, дата)',
              fontSize: 7,
              italics: true,
              alignment: 'right',
            },
          ],
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 10],
    })
  })

  if (approvalRows.length === 0) {
    content.push({
      ul: [
        `Допускающий: ${dash(permitter?.displayName)}`,
        `Выдающий: ${dash(issuer?.displayName)}`,
        `Производитель работ: ${dash(performer?.displayName)}`,
      ],
      fontSize: 9,
    })
  }

  return content
}

export const FORMAL_PDF_STYLES: Record<string, Record<string, unknown>> = {
  header: { fontSize: 14, bold: true },
  subheader: { fontSize: 11, bold: true },
  tableHeader: { bold: true, fillColor: '#f0f0f0', fontSize: 7 },
}

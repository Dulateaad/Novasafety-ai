import {
  CLOSURE_CHECKBOX_LINES,
  FIRE_CHECK_PAIRS,
  GAS_HAZARD_CHECK_PAIRS,
  WORK_PERMISSION_DOC_TITLE,
  WORK_PERMISSION_PDF_PALETTE,
  signatureSectionNumbers,
  type WorkPermissionPdfPalette,
} from '../config/workPermissionPdfTemplate'
import type {
  GasTestReading,
  WorkPermissionCheckboxGroup,
  WorkPermissionCheckboxItem,
  WorkPermissionDocument,
  WorkPermissionForm,
  WorkPermissionSignRole,
} from '../types/workPermissions'
import {
  WORK_PERMISSION_SIGN_LABELS,
  WORK_PERMISSION_SIGN_ROLES,
} from '../types/workPermissions'
import { initPdfMake, pdfBase64Async } from './pdfMakeEngine'
import { listWorkStageTitles } from './formatWorkStagesDisplay'
import { parseToolsAndEquipmentList } from './toolsAndEquipmentFormat'

type PdfCell = Record<string, unknown>
type PdfBlock = Record<string, unknown>

const FS = 7.5
const FS_SECTION = 9
const TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#999999',
  vLineColor: () => '#999999',
  paddingLeft: () => 3,
  paddingRight: () => 3,
  paddingTop: () => 2,
  paddingBottom: () => 2,
}

async function sha256HexFromBase64(b64: string): Promise<string> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function cell(
  text: string,
  palette: WorkPermissionPdfPalette,
  opts?: {
    bold?: boolean
    fill?: string
    color?: string
    align?: 'left' | 'center' | 'right'
    colSpan?: number
    fontSize?: number
  },
): PdfCell {
  const c: PdfCell = {
    text: text || ' ',
    fontSize: opts?.fontSize ?? FS,
    alignment: opts?.align ?? 'left',
    fillColor: opts?.fill ?? palette.white,
    color: opts?.color ?? '#000000',
  }
  if (opts?.bold) c.bold = true
  if (opts?.colSpan) c.colSpan = opts.colSpan
  return c
}

function hdr(text: string, palette: WorkPermissionPdfPalette, colSpan = 1): PdfCell {
  return cell(text, palette, {
    bold: true,
    fill: palette.header,
    align: 'center',
    colSpan,
  })
}

function accentHdr(text: string, palette: WorkPermissionPdfPalette, colSpan = 1): PdfCell {
  return cell(text, palette, {
    bold: true,
    fill: palette.accent,
    color: '#FFFFFF',
    align: 'center',
    colSpan,
  })
}

function sectionTitle(text: string): PdfBlock {
  return { text, bold: true, fontSize: FS_SECTION, margin: [0, 8, 0, 4] }
}

function checkboxMark(checked: boolean): string {
  return checked ? '[X]' : '[ ]'
}

function permissionWorkTitles(doc: WorkPermissionDocument): string[] {
  const sep = doc.title.indexOf(' — ')
  const fromDocTitle = sep >= 0 ? doc.title.slice(sep + 3).trim() : ''
  const fromStages = listWorkStageTitles(doc.form.workDescription)
  if (fromStages.length > 0) return fromStages
  if (fromDocTitle) return [fromDocTitle]
  const first = doc.form.workDescription.split('\n')[0]?.trim()
  return first ? [first.replace(/^\d+[.)]\s*/, '').trim() || first] : []
}

function headerRef(text: string | undefined, placeholder = '_______________'): string {
  const t = text?.trim() ?? ''
  return t || placeholder
}

function workScopeBlock(doc: WorkPermissionDocument): PdfBlock {
  const titles = permissionWorkTitles(doc)
  if (titles.length === 0) {
    return { text: ' ', fontSize: FS, margin: [0, 0, 0, 4] }
  }
  return {
    ul: titles.map((t) => {
      const m = t.match(/^(\d+[.)])\s*(.+)$/)
      if (m) return `— ${m[1]} ${m[2].trim()}`
      return `— ${t.replace(/^\d+[.)]\s*/, '').trim() || t}`
    }),
    fontSize: FS,
    margin: [0, 0, 0, 4],
  }
}

function equipmentInlineBlock(text: string): PdfBlock {
  const items = parseToolsAndEquipmentList(text)
  const body =
    items.length > 0
      ? items.join(', ')
      : text
          .split(/[\n;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ')
  return { text: body || ' ', fontSize: FS, margin: [0, 0, 0, 4] }
}

function itemById(items: WorkPermissionCheckboxItem[], id: string): WorkPermissionCheckboxItem | undefined {
  return items.find((i) => i.id === id)
}

function checkMark(items: WorkPermissionCheckboxItem[], id: string): string {
  const hit = itemById(items, id)
  return hit?.checked ? '[X]' : '[ ]'
}

function requiredMark(items: WorkPermissionCheckboxItem[], id: string): string {
  const hit = itemById(items, id)
  return hit?.required ? '[X]' : '[ ]'
}

function checkboxLines(group: WorkPermissionCheckboxGroup | undefined): PdfBlock[] {
  if (!group?.items?.length) return []
  return group.items.map((item) => {
    const note = item.note.trim() ? ` ${item.note.trim()}` : ''
    return {
      text: `${checkboxMark(item.checked)}  ${item.label}${note}`,
      fontSize: FS,
      margin: [0, 0, 0, 2],
    }
  })
}

function titleTable(doc: WorkPermissionDocument, palette: WorkPermissionPdfPalette): PdfBlock {
  const ref = headerRef(doc.form.permissionRefNo)
  return {
    table: {
      widths: ['*'],
      body: [[accentHdr(`${WORK_PERMISSION_DOC_TITLE[doc.kind]}№ ${ref}`, palette)]],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 0, 0, 6],
  }
}

function metaHeaderTable(
  doc: WorkPermissionDocument,
  palette: WorkPermissionPdfPalette,
  kind: WorkPermissionDocument['kind'],
): PdfBlock[] {
  const f = doc.form
  const date = new Date().toLocaleDateString('ru-RU')
  const ndRef = headerRef(f.pprRef)
  if (kind === 'open_flame_fire') {
    const cat =
      f.fireCategory === '1' ? '[X]  1          [ ]  2' : f.fireCategory === '2' ? '[ ]  1          [X]  2' : '[ ]  1          [ ]  2'
    return [
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [hdr('Объект', palette), hdr('Участок', palette), hdr('Дата', palette)],
            [
              cell(f.siteObject || ' ', palette),
              cell(' ', palette),
              cell(date, palette),
            ],
          ],
        },
        layout: TABLE_LAYOUT,
        margin: [0, 0, 0, 2],
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [hdr('№ наряд-допуска / № сопутств. Н-Д', palette), hdr('Категория разрешения', palette)],
            [cell(ndRef, palette), cell(cat, palette, { align: 'center' })],
          ],
        },
        layout: TABLE_LAYOUT,
        margin: [0, 0, 0, 4],
      },
    ]
  }
  return [
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [hdr('Объект', palette), hdr('Участок', palette), hdr('Дата', palette), hdr('№ сопутств. Н-Д', palette)],
          [
            cell(f.siteObject || ' ', palette),
            cell(' ', palette),
            cell(date, palette),
            cell(ndRef, palette),
          ],
        ],
      },
      layout: TABLE_LAYOUT,
      margin: [0, 0, 0, 4],
    },
  ]
}

function gasTestModesBlock(f: WorkPermissionForm): PdfBlock[] {
  const primary = f.gasTestPrimary ?? true
  const continuous = f.gasTestContinuous ?? false
  if (!primary && !continuous) return []
  const lines: string[] = []
  if (primary) {
    lines.push(`Первичный — ${f.gasTestPrimaryInterval?.trim() || 'каждые 2 часа'}`)
  }
  if (continuous) {
    lines.push('Постоянный')
  }
  if (!lines.length) return []
  return [
    { text: 'Виды газотеста', bold: true, fontSize: FS, margin: [0, 4, 0, 2] },
    { ul: lines, fontSize: FS, margin: [0, 0, 0, 4] },
  ]
}

function section1Blocks(doc: WorkPermissionDocument): PdfBlock[] {
  const f = doc.form
  if (doc.kind === 'confined_space') {
    return [
      sectionTitle('1.  Заявка на проведение работ (заполняется производителем работ)'),
      { text: 'Вход в замкнутое пространство для:', bold: true, fontSize: FS, margin: [0, 0, 0, 2] },
      workScopeBlock(doc),
      { text: 'Инструменты и оборудование:', bold: true, fontSize: FS, margin: [0, 0, 0, 2] },
      equipmentInlineBlock(f.equipmentAndDocs),
      ...gasTestModesBlock(f),
    ]
  }
  const who =
    doc.kind === 'open_flame_fire'
      ? '1.  Заявка на проведение работ (заполняется составителем / производителем работ)'
      : '1.  Заявка на проведение работ (заполняется производителем работ)'
  return [
    sectionTitle(who),
    { text: 'Объём работ —', bold: true, fontSize: FS, margin: [0, 0, 0, 2] },
    workScopeBlock(doc),
    { text: 'Инструменты и оборудование', bold: true, fontSize: FS, margin: [0, 0, 0, 2] },
    equipmentInlineBlock(f.equipmentAndDocs),
  ]
}

function gasTestTable(gasTests: GasTestReading[], palette: WorkPermissionPdfPalette): PdfBlock {
  const rows: GasTestReading[] = [...gasTests]
  while (rows.length < 3) rows.push({ id: '', atIso: '', location: '', lelPercent: '', h2sPpm: '', o2Percent: '', coPpm: '', testerUid: '', testerName: '', instrumentNo: '', notes: '' })
  const body: PdfCell[][] = [
    [
      hdr('Дата', palette),
      hdr('Время', palette),
      hdr('НПВ / LEL %', palette),
      hdr('H2S, ppm', palette),
      hdr('O2, %', palette),
      hdr('CO, ppm', palette),
      hdr('Ф.И.О. проводившего', palette),
    ],
    ...rows.slice(0, 3).map((g) => {
      const d = g.atIso ? new Date(g.atIso) : null
      return [
        cell(d ? d.toLocaleDateString('ru-RU') : ' ', palette),
        cell(d ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ' ', palette),
        cell(g.lelPercent || ' ', palette, { align: 'center' }),
        cell(g.h2sPpm || ' ', palette, { align: 'center' }),
        cell(g.o2Percent || ' ', palette, { align: 'center' }),
        cell(g.coPpm || ' ', palette, { align: 'center' }),
        cell(g.testerName || ' ', palette),
      ]
    }),
  ]
  return { table: { widths: ['12%', '10%', '12%', '12%', '10%', '10%', '*'], body }, layout: TABLE_LAYOUT }
}

function gasTestSection(num: number, gasTests: GasTestReading[], notes: string, palette: WorkPermissionPdfPalette): PdfBlock[] {
  return [
    sectionTitle(
      `${num}.  Результаты отбора проб воздушной среды (заполняется ответственным за отбор проб воздушной среды)`,
    ),
    gasTestTable(gasTests, palette),
    {
      text: `Частота повторных отборов проб воздушной среды (по необходимости)${notes.trim() ? `: ${notes.trim()}` : ''}`,
      fontSize: FS,
      margin: [0, 4, 0, 4],
    },
  ]
}

function dualChecksTable(
  pairs: { leftId: string; rightId: string; left: string; right: string }[],
  items: WorkPermissionCheckboxItem[],
  palette: WorkPermissionPdfPalette,
): PdfBlock {
  const body: PdfCell[][] = [
    [
      hdr('Пункт проверки', palette),
      hdr('Требуется', palette),
      hdr('Имеется', palette),
      hdr('Пункт проверки', palette),
      hdr('Требуется', palette),
      hdr('Имеется', palette),
    ],
    ...pairs.map((p) => [
      cell(p.left, palette),
      cell(requiredMark(items, p.leftId), palette, { align: 'center' }),
      cell(checkMark(items, p.leftId), palette, { align: 'center' }),
      cell(p.right, palette),
      cell(requiredMark(items, p.rightId), palette, { align: 'center' }),
      cell(checkMark(items, p.rightId), palette, { align: 'center' }),
    ]),
  ]
  return { table: { widths: ['*', '9%', '9%', '*', '9%', '9%'], body }, layout: TABLE_LAYOUT }
}

function observerTable(notes: string, palette: WorkPermissionPdfPalette): PdfBlock {
  const lines = notes.split('\n').map((s) => s.trim()).filter(Boolean)
  return {
    table: {
      widths: ['*', '*'],
      body: [
        [hdr('1.', palette), hdr('2.', palette)],
        [cell(lines[0] || ' ', palette), cell(lines[1] || ' ', palette)],
      ],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 4, 0, 4],
  }
}

function signBlock(
  sectionNum: number,
  palette: WorkPermissionPdfPalette,
  role: WorkPermissionSignRole,
  doc: WorkPermissionDocument,
): PdfBlock[] {
  const egov = doc.egovSignatures?.[role]
  const legacy = doc.signatures.find((s) => s.role === role)
  const name = egov?.signedByDisplayName ?? legacy?.signedByName ?? ' '
  const at = egov?.signedAtIso ?? legacy?.signedAtIso
  const date = at ? new Date(at).toLocaleDateString('ru-RU') : ' '
  const time = at ? new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ' '
  const label = WORK_PERMISSION_SIGN_LABELS[role]
  return [
    sectionTitle(`${sectionNum}.  ${label === 'Выдающий НД' ? 'Выдающий наряд-допуск' : label}`),
    {
      table: {
        widths: ['22%', '28%', '18%', '18%'],
        body: [
          [accentHdr(label, palette), hdr('Подпись', palette), hdr('Дата', palette), hdr('Время', palette)],
          [cell('Ф.И.О.', palette, { bold: true }), cell(name, palette), cell(date, palette), cell(time, palette)],
        ],
      },
      layout: TABLE_LAYOUT,
      margin: [0, 0, 0, 4],
    },
  ]
}

export type BuildWorkPermissionPdfOptions = {
  /** Раздел «Передача рабочего участка» — только после закрытия НДПР. */
  includeClosureSection?: boolean
}

function closureSection(
  sectionNum: number,
  closureChecks: WorkPermissionCheckboxGroup | undefined,
): PdfBlock[] {
  const items = closureChecks?.items ?? []
  const lineFor = (index: number) => {
    const item = items[index]
    const label = CLOSURE_CHECKBOX_LINES[index] ?? item?.label ?? ''
    return `${checkboxMark(item?.checked ?? false)}  ${label}`
  }
  return [
    sectionTitle(`${sectionNum}.  Передача рабочего участка / возврат оборудования / закрытие разрешения`),
    { text: 'Работы / оборудование, указанные в разделе 1', fontSize: FS, margin: [0, 0, 0, 4] },
    ...CLOSURE_CHECKBOX_LINES.map((_, index) => ({
      text: lineFor(index),
      fontSize: FS,
      margin: [0, 0, 0, 2],
    })),
  ]
}

function confinedSpaceMiddleSections(doc: WorkPermissionDocument, palette: WorkPermissionPdfPalette): PdfBlock[] {
  const f = doc.form
  return [
    sectionTitle('3.  Тип замкнутого пространства (обозначить входы-выходы)'),
    ...checkboxLines(f.confinedSpaceTypes),
    { text: 'Ф.И.О. дежурного наблюдателя:', bold: true, fontSize: FS, margin: [0, 4, 0, 2] },
    observerTable(f.confinedSpaceNotes, palette),
  ]
}

function compactExtensionTable(sectionNum: number, palette: WorkPermissionPdfPalette): PdfBlock[] {
  return [
    sectionTitle(`${sectionNum}.  Продление разрешения`),
    {
      table: {
        widths: ['15%', '28%', '28%', '29%'],
        body: [
          [
            hdr('Дата', palette),
            hdr('Выдающий НД', palette),
            hdr('Производитель работ', palette),
            hdr('Допускающий', palette),
          ],
          ...Array.from({ length: 3 }, () =>
            [cell(' ', palette), cell(' ', palette), cell(' ', palette), cell(' ', palette)],
          ),
        ],
      },
      layout: TABLE_LAYOUT,
      margin: [0, 0, 0, 4],
    },
  ]
}

function extensionTable(sectionNum: number, palette: WorkPermissionPdfPalette): PdfBlock[] {
  return [
    sectionTitle(`${sectionNum}.  Продление разрешения`),
    {
      table: {
        widths: ['18%', '22%', '20%', '20%', '20%'],
        body: [
          [
            hdr('Дата', palette),
            hdr('Время', palette),
            hdr('До (дата)', palette),
            hdr('До (время)', palette),
            hdr('Подпись', palette),
          ],
          ...Array.from({ length: 3 }, () =>
            [cell(' ', palette), cell(' ', palette), cell(' ', palette), cell(' ', palette), cell(' ', palette)],
          ),
        ],
      },
      layout: TABLE_LAYOUT,
      margin: [0, 0, 0, 4],
    },
  ]
}

function buildContent(doc: WorkPermissionDocument, opts?: BuildWorkPermissionPdfOptions): PdfBlock[] {
  const palette = WORK_PERMISSION_PDF_PALETTE[doc.kind]
  const f = doc.form
  const nums = signatureSectionNumbers(doc.kind)
  const content: PdfBlock[] = [
    titleTable(doc, palette),
    ...metaHeaderTable(doc, palette, doc.kind),
    ...section1Blocks(doc),
  ]

  if (doc.kind === 'confined_space') {
    content.push(...gasTestSection(2, doc.gasTests, f.additionalNotes, palette))
    content.push(...confinedSpaceMiddleSections(doc, palette))
  } else {
    content.push(...gasTestSection(2, doc.gasTests, f.additionalNotes, palette))
    const checksTitle =
      doc.kind === 'open_flame_fire'
        ? '3.  Проверки, выполняемые на рабочей площадке'
        : '3.  Проверки, выполняемые на рабочем месте'
    content.push(sectionTitle(checksTitle))
    content.push(
      dualChecksTable(
        doc.kind === 'open_flame_fire' ? FIRE_CHECK_PAIRS : GAS_HAZARD_CHECK_PAIRS,
        f.preWorkChecks.items,
        palette,
      ),
    )
  }

  if (!nums.useCompactLayout) {
    if (!nums.skipSignatureBlocks) {
      for (const role of WORK_PERMISSION_SIGN_ROLES) {
        const num =
          role === 'issuer' ? nums.issuer : role === 'performer' ? nums.performer : nums.permitter
        content.push(...signBlock(num, palette, role, doc))
      }
    }
    content.push(...extensionTable(nums.extension, palette))
    if (opts?.includeClosureSection) {
      content.push(...closureSection(nums.closure, f.closureChecks))
    }
  } else {
    content.push(...compactExtensionTable(nums.extension, palette))
    content.push(
      ...closureSection(
        nums.closure,
        opts?.includeClosureSection ? f.closureChecks : undefined,
      ),
    )
  }

  return content
}

export async function buildWorkPermissionPdf(
  doc: WorkPermissionDocument,
  pdfMake?: Awaited<ReturnType<typeof initPdfMake>>,
  opts?: BuildWorkPermissionPdfOptions,
): Promise<{ base64: string; fileName: string; documentHash: string }> {
  const engine = pdfMake ?? (await initPdfMake())
  const definition = {
    pageSize: 'A4',
    pageOrientation: 'portrait' as const,
    pageMargins: [28, 36, 28, 36],
    defaultStyle: { font: 'Roboto', fontSize: FS },
    content: buildContent(doc, opts),
  }
  const base64 = await pdfBase64Async(engine, definition)
  const slug = doc.kind.replace(/_/g, '-')
  return {
    base64,
    fileName: `Permission-${slug}.pdf`,
    documentHash: await sha256HexFromBase64(base64),
  }
}

export async function renderWorkPermissionsBundle(
  documents: WorkPermissionDocument[],
  opts?: BuildWorkPermissionPdfOptions,
): Promise<WorkPermissionDocument[]> {
  const pdfMake = await initPdfMake()
  const generatedAtIso = new Date().toISOString()
  return Promise.all(
    documents.map(async (doc) => {
      const { base64, documentHash } = await buildWorkPermissionPdf(doc, pdfMake, opts)
      return {
        ...doc,
        pdfBase64: base64,
        documentHash,
        generatedAtIso,
      }
    }),
  )
}

export async function renderSingleWorkPermission(
  doc: WorkPermissionDocument,
  opts?: BuildWorkPermissionPdfOptions,
): Promise<WorkPermissionDocument> {
  const [one] = await renderWorkPermissionsBundle([doc], opts)
  return one!
}

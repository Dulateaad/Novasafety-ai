import type { PprControlMeasuresDoc } from '../types/ppr'
import { geminiPdfDocumentToPdfContent } from './buildPdfFromGeminiDocument'
import { controlMeasuresMethodLabel } from './pprControlMeasuresParse'
import { initPdfMake, pdfBase64Async } from './pdfMakeEngine'

function h(text: string, level = 2): Record<string, unknown> {
  return { text, style: level === 1 ? 'header' : 'subheader', margin: [0, 8, 0, 4] }
}

function p(text: string): Record<string, unknown> {
  return { text: text || '—', margin: [0, 0, 0, 4] }
}

function ul(items: string[]): Record<string, unknown> {
  return {
    ul: items.map((t) => t || '—'),
    margin: [0, 0, 0, 8],
    fontSize: 9,
  }
}

function legacyTemplateContent(
  input: Pick<
    PprControlMeasuresDoc,
    'workTitle' | 'sourceAttachmentName' | 'items' | 'method' | 'generatedAtIso'
  >,
): Record<string, unknown>[] {
  const content: Record<string, unknown>[] = [
    h('Меры контроля опасных факторов', 1),
    p('NOVA Safety · ТОО «Урал Ойл энд Газ»'),
    p(`Наименование работ: ${input.workTitle || '—'}`),
    p(`Источник ППР: ${input.sourceAttachmentName}`),
    p(`Дата формирования: ${new Date(input.generatedAtIso).toLocaleString()}`),
    p(`Способ извлечения: ${controlMeasuresMethodLabel(input.method)}`),
    { text: '', margin: [0, 4, 0, 4] },
  ]

  input.items.forEach((item, idx) => {
    content.push(h(`${idx + 1}. ${item.section}`, 2))
    content.push(p(`Опасный фактор: ${item.hazard}`))
    content.push({ text: 'Меры контроля:', bold: true, margin: [0, 2, 0, 2], fontSize: 9 })
    content.push(ul(item.controlMeasures))
  })

  content.push({
    text:
      'Документ сформирован автоматически NOVA Safety. Требуется проверка ответственным лицом ОТ/ТБ.',
    italics: true,
    fontSize: 8,
    color: '#555555',
    margin: [0, 12, 0, 0],
  })

  return content
}

/** PDF: контент полностью от Gemini (blocks) или запасной шаблон без ИИ. */
export async function buildControlMeasuresPdf(
  input: Pick<
    PprControlMeasuresDoc,
    | 'workTitle'
    | 'sourceAttachmentName'
    | 'items'
    | 'method'
    | 'generatedAtIso'
    | 'geminiPdfDocument'
  >,
): Promise<string> {
  const pdfMake = await initPdfMake()
  const content = input.geminiPdfDocument
    ? geminiPdfDocumentToPdfContent(input.geminiPdfDocument)
    : legacyTemplateContent(input)

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      header: { fontSize: 16, bold: true },
      subheader: { fontSize: 12, bold: true },
    },
    content,
  }

  return pdfBase64Async(pdfMake, docDefinition)
}

export function downloadControlMeasuresPdf(doc: PprControlMeasuresDoc): void {
  const b64 = doc.pdfBase64
  if (!b64) {
    throw new Error('PDF ещё не сформирован.')
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.fileName.endsWith('.pdf') ? doc.fileName : `${doc.fileName.replace(/\.md$/i, '')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

import type { GeminiPdfDocument, PprControlMeasuresItem } from '../types/ppr'

/** Запасной PDF-документ из items (если Gemini PDF не вернул). */
export function itemsToGeminiPdfDocument(input: {
  workTitle: string
  sourceFileName: string
  items: PprControlMeasuresItem[]
}): GeminiPdfDocument {
  const blocks: GeminiPdfDocument['blocks'] = [
    { type: 'h1', text: 'Меры контроля опасных факторов' },
    { type: 'p', text: 'ТОО «Урал Ойл энд Газ» · NOVA SAFETY AI' },
    { type: 'h2', text: 'Общие сведения' },
    { type: 'p', text: `Наименование работ: ${input.workTitle || '—'}` },
    { type: 'p', text: `Источник ППР: ${input.sourceFileName}` },
    { type: 'p', text: `Дата: ${new Date().toISOString().slice(0, 10)}` },
  ]

  input.items.forEach((item, idx) => {
    blocks.push({ type: 'h2', text: `${idx + 1}. ${item.section}` })
    blocks.push({ type: 'p', text: `Опасный фактор: ${item.hazard}` })
    blocks.push({ type: 'ul', items: item.controlMeasures })
  })

  blocks.push({
    type: 'p',
    text: 'Документ требует проверки ответственным лицом ОТ/ТБ перед применением.',
  })

  return { blocks }
}

function blockToPdfMake(block: GeminiPdfDocument['blocks'][0]): Record<string, unknown> | null {
  switch (block.type) {
    case 'h1':
      return { text: block.text || '—', style: 'header', margin: [0, 10, 0, 6] }
    case 'h2':
      return { text: block.text || '—', style: 'subheader', margin: [0, 8, 0, 4] }
    case 'h3':
      return { text: block.text || '—', bold: true, fontSize: 11, margin: [0, 6, 0, 3] }
    case 'p':
      return { text: block.text || '—', margin: [0, 0, 0, 4] }
    case 'ul':
      return {
        ul: (block.items ?? []).map((t) => t || '—'),
        margin: [0, 0, 0, 8],
        fontSize: 9,
      }
    case 'ol':
      return {
        ol: (block.items ?? []).map((t) => t || '—'),
        margin: [0, 0, 0, 8],
        fontSize: 9,
      }
    default:
      return null
  }
}

export function geminiPdfDocumentToPdfContent(doc: GeminiPdfDocument): Record<string, unknown>[] {
  const content: Record<string, unknown>[] = []
  for (const block of doc.blocks) {
    const el = blockToPdfMake(block)
    if (el) content.push(el)
  }
  return content.length > 0 ? content : [{ text: '—', margin: [0, 0, 0, 4] }]
}

export function geminiPdfDocumentToMarkdown(doc: GeminiPdfDocument): string {
  const lines: string[] = []
  for (const block of doc.blocks) {
    switch (block.type) {
      case 'h1':
        lines.push(`# ${block.text ?? ''}`, '')
        break
      case 'h2':
        lines.push(`## ${block.text ?? ''}`, '')
        break
      case 'h3':
        lines.push(`### ${block.text ?? ''}`, '')
        break
      case 'p':
        lines.push(block.text ?? '', '')
        break
      case 'ul':
        for (const item of block.items ?? []) lines.push(`- ${item}`)
        lines.push('')
        break
      case 'ol': {
        let n = 1
        for (const item of block.items ?? []) lines.push(`${n++}. ${item}`)
        lines.push('')
        break
      }
      default:
        break
    }
  }
  return lines.join('\n').trim()
}

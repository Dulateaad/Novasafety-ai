import mammoth from 'mammoth'
import type { PprAttachment } from '../types/ppr'
import { fillTemplate, localeMessages, type LanguageCode } from '../i18n/getLocale'
import { guessMimeType } from './pprAttachment'

function attachmentToArrayBuffer(att: PprAttachment): ArrayBuffer {
  const binary = atob(att.dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/** Сжимает пробелы внутри строки, не трогая табы между ячейками таблицы. */
function normalizeInline(text: string): string {
  return text.replace(/[ \t\r\n\u00a0]+/g, ' ').trim()
}

/** Строки таблицы: ячейки через TAB, строки через перенос — структура сохраняется. */
function tableToText(table: Element): string {
  const rows: string[] = []
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells = Array.from(tr.querySelectorAll('th,td')).map((cell) =>
      normalizeInline(cell.textContent ?? ''),
    )
    const row = cells.join('\t').replace(/(\t)+$/g, '').trim()
    if (row) rows.push(row)
  }
  return rows.join('\n')
}

const BLOCK_TAGS =
  /^(P|H[1-6]|LI|DIV|TR|BLOCKQUOTE|UL|OL|SECTION|ARTICLE|HEADER|FOOTER|PRE|TD|TH)$/

/** Рекурсивно превращает HTML (из mammoth) в текст с сохранением структуры. */
function elementToText(node: Node): string {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return ''

  const el = node as Element
  const tag = el.tagName.toUpperCase()

  if (tag === 'TABLE') {
    const table = tableToText(el)
    return table ? `\n${table}\n` : ''
  }
  if (tag === 'BR') return '\n'

  let inner = ''
  el.childNodes.forEach((child) => {
    inner += elementToText(child)
  })

  if (BLOCK_TAGS.test(tag)) {
    return `\n${inner}\n`
  }
  return inner
}

/** Чистый структурированный текст из HTML, сгенерированного mammoth. */
function htmlToStructuredText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const raw = elementToText(doc.body)
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Извлекает plain text из загруженного docx/doc. PDF пока не поддерживается. */
export async function extractTextFromPprAttachment(
  att: PprAttachment,
  code?: LanguageCode,
): Promise<string> {
  const m = localeMessages(code)
  const v = m.validation
  const mime = att.mimeType || guessMimeType(att.fileName, '')
  const ext = att.fileName.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf' || mime === 'application/pdf') {
    throw new Error(
      fillTemplate(v.pprPdfGemini, { source: m.branding.sourceDocument }),
    )
  }

  if (!['doc', 'docx'].includes(ext) && !mime.includes('word')) {
    throw new Error(v.pprWordOnly)
  }

  const buffer = attachmentToArrayBuffer(att)

  // HTML-конвертация сохраняет таблицы, заголовки и списки — это критично для
  // ППР, где этапы работ и меры контроля оформлены таблицами. extractRawText
  // склеивает ячейки в плоский текст и ломает downstream-анализ (ИИ + правила).
  let text = ''
  try {
    const html = await mammoth.convertToHtml({ arrayBuffer: buffer })
    text = htmlToStructuredText(html.value)
  } catch {
    /* fallback на raw-текст ниже */
  }

  if (!text) {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    text = result.value.trim()
  }

  if (!text) {
    throw new Error(v.pprExtractFailed)
  }
  return text
}

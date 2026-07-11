import { geminiGenerateText } from './client'
import {
  buildPdfDocumentUserPrompt,
  PPR_PDF_DOCUMENT_SYSTEM_PROMPT,
  type PdfDocumentItem,
} from './pdfDocumentPrompt'

export interface GeminiPdfBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol'
  text?: string
  items?: string[]
}

export interface GeminiPdfDocument {
  blocks: GeminiPdfBlock[]
}

const PDF_BLOCK_TYPES = new Set(['h1', 'h2', 'h3', 'p', 'ul', 'ol'])

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('Gemini: ответ PDF не JSON')
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
}

function normalizePdfDocument(raw: unknown): GeminiPdfDocument | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const blocksRaw = (raw as { blocks?: unknown }).blocks
  if (!Array.isArray(blocksRaw)) return undefined
  const blocks = blocksRaw
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .map((b) => {
      const type = String(b.type ?? 'p')
      const blockType = PDF_BLOCK_TYPES.has(type)
        ? (type as GeminiPdfBlock['type'])
        : 'p'
      return {
        type: blockType,
        text: typeof b.text === 'string' ? b.text : undefined,
        items: Array.isArray(b.items)
          ? b.items.map((x) => String(x).trim()).filter(Boolean)
          : undefined,
      }
    })
    .filter((b) => (b.text?.trim()?.length ?? 0) > 0 || (b.items?.length ?? 0) > 0)
  return blocks.length > 0 ? { blocks } : undefined
}

export async function generatePdfDocumentWithGemini(input: {
  workTitle: string
  sourceFileName: string
  items: PdfDocumentItem[]
}): Promise<GeminiPdfDocument> {
  const raw = await geminiGenerateText({
    systemPrompt: PPR_PDF_DOCUMENT_SYSTEM_PROMPT,
    userPrompt: buildPdfDocumentUserPrompt(input),
    json: true,
  })
  const payload = parseJsonObject(raw)
  const doc = normalizePdfDocument(payload.pdfDocument)
  if (!doc) {
    throw new Error('Gemini не сформировал pdfDocument.blocks')
  }
  return doc
}

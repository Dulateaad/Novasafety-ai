import type { GeminiPdfDocument, PprAttachment, PprControlMeasuresDoc, PprControlMeasuresItem } from '../types/ppr'
import { titleFromFileName } from './pprAttachment'
import { buildControlMeasuresPdf } from './buildControlMeasuresPdf'
import {
  geminiPdfDocumentToMarkdown,
  itemsToGeminiPdfDocument,
} from './buildPdfFromGeminiDocument'
import { generatePdfDocumentWithGemini } from './geminiPdfDocument'
import { isAssistantChatConfigured, requestAssistantCompletion } from './chatAssistant'
import { extractTextFromPprAttachment } from './pprDocText'
import {
  buildControlMeasuresMarkdown,
  controlMeasuresFileName as controlMeasuresPdfFileName,
} from './pprControlMeasuresFile'
import { extractControlMeasuresByRules } from './pprControlMeasuresRules'
import {
  normalizeControlMeasuresItems,
  parseControlMeasuresJson,
} from './pprControlMeasuresParse'
import { isGeminiExtractionAvailable, tryExtractWithGemini } from './pprGeminiExtract'
import {
  extractControlMeasuresFromPdfWithGemini,
  isPdfAttachment,
  isPprPdfAiReady,
} from './pprGeminiPdfExtract'
import {
  buildControlMeasuresUserPrompt,
  PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
} from '../config/pprControlMeasuresPrompt'
import { isAiClientReady } from './aiClient'
import type { PprNdprExtract } from './pprNdprExtract'
import { normalizeNdprFromPayload } from './pprNdprExtract'

export type PprExtractStage = 'reading' | 'gemini' | 'rules' | 'pdf'

export type AttachPdfResult = {
  doc: PprControlMeasuresDoc
  pdfWarning?: string
}

export type PprExtractItemsResult = {
  doc: PprControlMeasuresDoc
  ndprExtract?: PprNdprExtract
}

async function extractWithLegacyProxy(
  docText: string,
  fileName: string,
): Promise<{
  workTitle: string
  items: PprControlMeasuresItem[]
  ndprExtract?: PprNdprExtract
}> {
  const reply = await requestAssistantCompletion(
    [{ role: 'user', content: buildControlMeasuresUserPrompt(docText, fileName) }],
    { systemPrompt: PPR_CONTROL_MEASURES_SYSTEM_PROMPT },
  )
  const payload = parseControlMeasuresJson(reply)
  const items = normalizeControlMeasuresItems(payload)
  if (items.length === 0) {
    throw new Error('ИИ не извлёк меры контроля из документа')
  }
  return {
    workTitle: String(payload.workTitle ?? '').trim(),
    items,
    ndprExtract: normalizeNdprFromPayload(payload),
  }
}

async function extractItemsFromAttachment(
  attachment: PprAttachment,
  fallbackTitle: string,
  onStage?: (stage: PprExtractStage) => void,
): Promise<{
  workTitle: string
  items: PprControlMeasuresItem[]
  method: PprControlMeasuresDoc['method']
  geminiPdfDocument?: GeminiPdfDocument
  ndprExtract?: PprNdprExtract
}> {
  let method: PprControlMeasuresDoc['method'] = 'rules'
  let workTitle = fallbackTitle
  let items: PprControlMeasuresItem[] = []
  let geminiPdfDocument: GeminiPdfDocument | undefined
  let ndprExtract: PprNdprExtract | undefined

  if (isPdfAttachment(attachment)) {
    if (!isPprPdfAiReady()) {
      throw new Error(
        'Для PDF нужен Claude на сервере или VITE_ANTHROPIC_API_KEY. Загрузите .docx или настройте API.',
      )
    }
    onStage?.('gemini')
    const gemini = await extractControlMeasuresFromPdfWithGemini(attachment)
    items = gemini.items
    workTitle = gemini.workTitle || fallbackTitle
    geminiPdfDocument = gemini.geminiPdfDocument
    ndprExtract = gemini.ndprExtract
    method = 'ai'
  } else {
    onStage?.('reading')
    const docText = await extractTextFromPprAttachment(attachment)

    if (isGeminiExtractionAvailable()) {
      onStage?.('gemini')
      try {
        const gemini = await tryExtractWithGemini(docText, attachment.fileName)
        if (gemini) {
          items = gemini.items
          workTitle = gemini.workTitle || fallbackTitle
          geminiPdfDocument = gemini.geminiPdfDocument
          ndprExtract = gemini.ndprExtract
          method = 'ai'
        }
      } catch {
        /* rules below */
      }
    }

    if (items.length === 0 && isAssistantChatConfigured()) {
      onStage?.('gemini')
      try {
        const ai = await extractWithLegacyProxy(docText, attachment.fileName)
        items = ai.items
        workTitle = ai.workTitle || fallbackTitle
        ndprExtract = ai.ndprExtract
        method = 'ai'
      } catch {
        onStage?.('rules')
        items = extractControlMeasuresByRules(docText, fallbackTitle)
        method = 'rules'
      }
    }

    if (items.length === 0) {
      onStage?.('rules')
      items = extractControlMeasuresByRules(docText, fallbackTitle)
      method = 'rules'
    }
  }

  if (items.length === 0) {
    throw new Error('Не удалось извлечь меры контроля из документа.')
  }

  return { workTitle, items, method, geminiPdfDocument, ndprExtract }
}

function buildControlMeasuresDocBase(input: {
  attachment: PprAttachment
  workTitle: string
  items: PprControlMeasuresItem[]
  method: PprControlMeasuresDoc['method']
  generatedAtIso: string
  geminiPdfDocument?: GeminiPdfDocument
}): PprControlMeasuresDoc {
  const { attachment, workTitle, items, method, generatedAtIso, geminiPdfDocument } = input
  const markdown = geminiPdfDocument
    ? geminiPdfDocumentToMarkdown(geminiPdfDocument)
    : buildControlMeasuresMarkdown({
        workTitle,
        sourceFileName: attachment.fileName,
        items,
        method,
      })

  return {
    fileName: controlMeasuresPdfFileName(attachment.fileName),
    markdown,
    generatedAtIso,
    sourceAttachmentName: attachment.fileName,
    workTitle,
    items,
    method,
    geminiPdfDocument,
  }
}

export async function extractPprControlMeasuresItems(
  attachment: PprAttachment,
  opts?: { workTitle?: string; onStage?: (stage: PprExtractStage) => void },
): Promise<PprExtractItemsResult> {
  const fallbackTitle = opts?.workTitle?.trim() || titleFromFileName(attachment.fileName)
  const generatedAtIso = new Date().toISOString()
  const extracted = await extractItemsFromAttachment(
    attachment,
    fallbackTitle,
    opts?.onStage,
  )
  return {
    doc: buildControlMeasuresDocBase({
      attachment,
      ...extracted,
      generatedAtIso,
    }),
    ndprExtract: extracted.ndprExtract,
  }
}

/** PDF: Gemini blocks → pdfmake. Всегда возвращает PDF (с fallback). */
export async function attachControlMeasuresPdf(
  doc: PprControlMeasuresDoc,
  opts?: { onStage?: (stage: PprExtractStage) => void },
): Promise<AttachPdfResult> {
  if (doc.pdfBase64?.trim() && doc.geminiPdfDocument) {
    return { doc }
  }

  let geminiPdfDocument = doc.geminiPdfDocument
  let pdfWarning: string | undefined
  const useAiPdf = isAiClientReady()

  if (!geminiPdfDocument && useAiPdf) {
    opts?.onStage?.('pdf')
    try {
      geminiPdfDocument = await generatePdfDocumentWithGemini({
        workTitle: doc.workTitle,
        sourceFileName: doc.sourceAttachmentName,
        items: doc.items,
      })
    } catch (e) {
      pdfWarning =
        e instanceof Error
          ? `PDF от ИИ не получился: ${e.message}. Использован запасной вариант.`
          : 'PDF от ИИ не получился. Использован запасной вариант.'
    }
  }

  if (!geminiPdfDocument) {
    geminiPdfDocument = itemsToGeminiPdfDocument({
      workTitle: doc.workTitle,
      sourceFileName: doc.sourceAttachmentName,
      items: doc.items,
    })
    if (!pdfWarning && (doc.method === 'gemini' || doc.method === 'ai')) {
      pdfWarning = 'ИИ не вернул pdfDocument — PDF собран из извлечённых мер.'
    }
  }

  const pdfBase64 = await buildControlMeasuresPdf({ ...doc, geminiPdfDocument })
  const markdown = geminiPdfDocumentToMarkdown(geminiPdfDocument)

  return {
    doc: { ...doc, geminiPdfDocument, pdfBase64, markdown },
    pdfWarning,
  }
}

export async function extractPprControlMeasures(
  attachment: PprAttachment,
  opts?: { workTitle?: string; onStage?: (stage: PprExtractStage) => void },
): Promise<PprControlMeasuresDoc> {
  const { doc } = await extractPprControlMeasuresItems(attachment, opts)
  const { doc: withPdf } = await attachControlMeasuresPdf(doc, opts)
  return withPdf
}

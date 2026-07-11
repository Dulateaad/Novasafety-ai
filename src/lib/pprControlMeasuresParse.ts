import type { GeminiPdfDocument, PprControlMeasuresItem } from '../types/ppr'

export interface ControlMeasuresAiPayload {
  workTitle?: string
  siteName?: string
  customerOrg?: string
  contractorOrg?: string
  specialWorkActivities?: unknown
  workTasks?: unknown[]
  items?: unknown[]
  controlMeasures?: unknown
  control_measures?: unknown
  hazards?: unknown
  safetyMeasures?: unknown
  pdfDocument?: {
    blocks?: {
      type?: string
      text?: string
      items?: string[]
    }[]
  }
}

function splitMeasureLines(raw: string): string[] {
  return raw
    .split(/[;\n]|(?:\s+-\s+)/)
    .map((m) => m.replace(/^[-–—•·\d.)]+\s*/, '').trim())
    .filter((m) => m.length > 2)
}

function measuresFromUnknown(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((entry) => {
        if (typeof entry === 'string') return splitMeasureLines(entry)
        if (entry && typeof entry === 'object') {
          const o = entry as Record<string, unknown>
          const nested =
            o.text ?? o.measure ?? o.title ?? o.name ?? o.description ?? o.value
          if (typeof nested === 'string') return splitMeasureLines(nested)
        }
        return []
      })
      .filter(Boolean)
  }
  if (typeof raw === 'string') return splitMeasureLines(raw)
  return []
}

function measuresFromRow(row: unknown): string[] {
  if (!row || typeof row !== 'object') return []
  const r = row as Record<string, unknown>
  const raw =
    r.controlMeasures ??
    r.control_measures ??
    r.measures ??
    r.measure ??
    r.items ??
    r.меры ??
    r['меры контроля']
  return measuresFromUnknown(raw)
}

function itemsFromPdfDocumentFallback(
  payload: ControlMeasuresAiPayload,
): PprControlMeasuresItem[] {
  const doc = normalizePdfDocumentRaw(payload.pdfDocument)
  if (!doc) return []
  const measures = doc.blocks.flatMap((b) => b.items ?? []).filter(Boolean)
  if (measures.length === 0) return []
  return [
    {
      section: 'Техника безопасности',
      hazard: 'Опасные факторы по ППР',
      controlMeasures: measures,
    },
  ]
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('ИИ вернул ответ не в формате JSON')
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
}

const PDF_BLOCK_TYPES = new Set(['h1', 'h2', 'h3', 'p', 'ul', 'ol'])

function normalizePdfDocumentRaw(raw: unknown): GeminiPdfDocument | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const blocksRaw = (raw as { blocks?: unknown }).blocks
  if (!Array.isArray(blocksRaw)) return undefined
  const blocks = blocksRaw
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .map((b) => {
      const type = String(b.type ?? 'p')
      const blockType = PDF_BLOCK_TYPES.has(type)
        ? (type as GeminiPdfDocument['blocks'][0]['type'])
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

export function parseControlMeasuresJson(raw: string): ControlMeasuresAiPayload {
  return parseJsonObject(raw) as ControlMeasuresAiPayload
}

export function normalizePdfDocumentFromPayload(
  payload: ControlMeasuresAiPayload,
): GeminiPdfDocument | undefined {
  return normalizePdfDocumentRaw(payload.pdfDocument)
}

function itemsFromWorkTasks(payload: ControlMeasuresAiPayload): PprControlMeasuresItem[] {
  const tasks = payload.workTasks
  if (!Array.isArray(tasks)) return []
  const out: PprControlMeasuresItem[] = []
  for (const row of tasks) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const measures = measuresFromUnknown(
      r.safetyMeasures ??
        r.controlMeasures ??
        r.measures ??
        r.меры ??
        r['меры контроля'],
    )
    if (measures.length === 0) continue
    out.push({
      section: String(r.taskTitle ?? r.stage ?? r.title ?? 'Этап работ').trim(),
      hazard: String(r.hazard ?? r.taskTitle ?? r.stage ?? 'Риски этапа').trim(),
      controlMeasures: measures,
    })
  }
  return out
}

function itemsFromAlternateRootArrays(
  payload: ControlMeasuresAiPayload,
): PprControlMeasuresItem[] {
  const keys = [
    'controlMeasures',
    'control_measures',
    'hazards',
    'safetyMeasures',
    'safety_measures',
    'меры',
  ] as const
  for (const key of keys) {
    const raw = (payload as Record<string, unknown>)[key]
    if (!Array.isArray(raw)) continue
    const mapped = raw
      .map((row): PprControlMeasuresItem | null => {
        if (typeof row === 'string') {
          const measures = splitMeasureLines(row)
          if (measures.length === 0) return null
          return {
            section: 'Техника безопасности',
            hazard: 'По ППР',
            controlMeasures: measures,
          }
        }
        if (!row || typeof row !== 'object') return null
        const r = row as Record<string, unknown>
        const controlMeasures = measuresFromRow(row)
        if (controlMeasures.length === 0) return null
        return {
          section: String(r.section ?? r.раздел ?? 'Техника безопасности').trim(),
          hazard: String(
            r.hazard ?? r.опасность ?? r.title ?? r.name ?? 'Опасный фактор',
          ).trim(),
          controlMeasures,
        }
      })
      .filter((row): row is PprControlMeasuresItem => row !== null)
    if (mapped.length > 0) return mapped
  }
  return []
}

/** Минимальный блок, чтобы пройти валидацию и продолжить оформление НДПР. */
export function minimalControlMeasuresFallback(
  workTitle?: string,
): PprControlMeasuresItem[] {
  const title = workTitle?.trim() || 'работы по ППР'
  return [
    {
      section: 'Техника безопасности',
      hazard: 'Общие требования',
      controlMeasures: [
        `Соблюдать требования ППР по объекту: ${title}`,
        'Применять СИЗ и инструктаж по виду работ',
        'Контролировать опасную зону и SimOps с соседними работами',
      ],
    },
  ]
}

export function normalizeControlMeasuresItems(
  payload: ControlMeasuresAiPayload,
  opts?: { allowMinimalFallback?: boolean; workTitle?: string },
): PprControlMeasuresItem[] {
  const rows = Array.isArray(payload.items) ? payload.items : []
  const fromItems = rows
    .map((row) => {
      if (!row || typeof row !== 'object') {
        if (typeof row === 'string') {
          const measures = splitMeasureLines(row)
          if (measures.length === 0) return null
          return {
            section: 'Техника безопасности',
            hazard: 'По ППР',
            controlMeasures: measures,
          }
        }
        return null
      }
      const r = row as Record<string, unknown>
      const controlMeasures = measuresFromRow(row)
      if (controlMeasures.length === 0) return null
      return {
        section: String(r.section ?? r.раздел ?? 'Раздел ППР').trim(),
        hazard: String(r.hazard ?? r.опасность ?? r.risk ?? 'Опасный фактор').trim(),
        controlMeasures,
      }
    })
    .filter((row): row is PprControlMeasuresItem => row !== null)

  if (fromItems.length > 0) return fromItems

  const fromTasks = itemsFromWorkTasks(payload)
  if (fromTasks.length > 0) return fromTasks

  const fromRoot = itemsFromAlternateRootArrays(payload)
  if (fromRoot.length > 0) return fromRoot

  const fromPdf = itemsFromPdfDocumentFallback(payload)
  if (fromPdf.length > 0) return fromPdf

  if (opts?.allowMinimalFallback) {
    return minimalControlMeasuresFallback(
      opts.workTitle ?? String(payload.workTitle ?? ''),
    )
  }
  return []
}

export function controlMeasuresMethodLabel(
  method: 'gemini' | 'ai' | 'rules',
): string {
  if (method === 'gemini') return 'Gemini'
  if (method === 'ai') return 'ИИ (прокси)'
  return 'авторазбор'
}

export function parseGeminiPdfDocumentJson(raw: string): GeminiPdfDocument {
  const payload = parseJsonObject(raw)
  const doc = normalizePdfDocumentRaw(payload.pdfDocument)
  if (!doc) throw new Error('pdfDocument.blocks пуст')
  return doc
}

import {
  buildControlMeasuresUserPrompt,
  PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
} from './prompts'
import { geminiGenerateText } from './client'

export interface ControlMeasuresItem {
  section: string
  hazard: string
  controlMeasures: string[]
}

function parseJson(raw: string): { workTitle?: string; items?: ControlMeasuresItem[] } {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('Gemini: ответ не JSON')
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as {
    workTitle?: string
    items?: ControlMeasuresItem[]
  }
}

function normalizeItems(
  items: unknown,
): ControlMeasuresItem[] {
  if (!Array.isArray(items)) return []
  return items
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const o = row as Record<string, unknown>
      const controlMeasures = Array.isArray(o.controlMeasures)
        ? o.controlMeasures.map((m) => String(m).trim()).filter(Boolean)
        : []
      if (controlMeasures.length === 0) return null
      return {
        section: String(o.section ?? 'Раздел ППР').trim(),
        hazard: String(o.hazard ?? 'Опасный фактор').trim(),
        controlMeasures,
      }
    })
    .filter((x): x is ControlMeasuresItem => x !== null)
}

export async function extractControlMeasuresWithGemini(
  documentText: string,
  fileName: string,
): Promise<{ workTitle: string; items: ControlMeasuresItem[] }> {
  const raw = await geminiGenerateText({
    systemPrompt: PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
    userPrompt: buildControlMeasuresUserPrompt(documentText, fileName),
    json: true,
  })
  const payload = parseJson(raw)
  const items = normalizeItems(payload.items)
  if (items.length === 0) {
    throw new Error('Gemini не извлёк меры контроля')
  }
  return {
    workTitle: String(payload.workTitle ?? '').trim(),
    items,
  }
}

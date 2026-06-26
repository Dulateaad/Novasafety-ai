import { HSE_ACTIVITY_TEMPLATES } from '../config/hseActivityTemplates'

const VALID_IDS = new Set(HSE_ACTIVITY_TEMPLATES.map((t) => t.id))

export type HseActivitiesAiResult = {
  templateIds: string[]
  rationale: string
  method: 'gemini' | 'ai' | 'rules'
}

export function parseHseActivitiesAiJson(raw: string): {
  templateIds: string[]
  rationale: string
} {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('ИИ вернул ответ без JSON')
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    templateIds?: unknown
    rationale?: unknown
  }

  const templateIds = Array.isArray(parsed.templateIds)
    ? parsed.templateIds
        .filter((id): id is string => typeof id === 'string')
        .filter((id) => VALID_IDS.has(id))
    : []

  if (templateIds.length === 0) {
    throw new Error('ИИ не выбрал ни одного подходящего шаблона')
  }

  const rationale =
    typeof parsed.rationale === 'string' ? parsed.rationale.trim() : ''

  return { templateIds: [...new Set(templateIds)], rationale }
}

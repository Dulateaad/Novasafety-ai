import type { AbrForm, AbrStageRow } from '../types/abr'
import { emptyAbrForm } from '../types/abr'

export type AbrRiskAssessmentPayload = Partial<AbrForm> & {
  workTitle?: string
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('ИИ вернул ответ не в формате JSON')
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
}

function parseNums(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw.map((n) => Number(n)).filter((n) => n >= 1 && n <= 58)
}

export function parseAbrRiskAssessmentJson(raw: string): AbrRiskAssessmentPayload {
  const payload = parseJsonObject(raw)
  const stages: AbrStageRow[] = Array.isArray(payload.stages)
    ? payload.stages
        .map((s, i) => {
          if (!s || typeof s !== 'object') return null
          const row = s as Record<string, unknown>
          const title = String(row.title ?? '').trim()
          if (!title) return null
          return {
            order: Number(row.order) || i + 1,
            title,
            hazardNumbers: parseNums(row.hazardNumbers),
            controlNumbers: parseNums(row.controlNumbers),
          }
        })
        .filter((x): x is AbrStageRow => x !== null)
    : []

  const briefingRaw = payload.briefing as Record<string, unknown> | undefined
  const postRaw = payload.postWork as Record<string, unknown> | undefined

  return {
    workTitle: String(payload.workTitle ?? '').trim() || undefined,
    workLocation: String(payload.workLocation ?? '').trim(),
    permitNo: String(payload.permitNo ?? '').trim(),
    dateIso: String(payload.dateIso ?? emptyAbrForm().dateIso).slice(0, 10),
    shiftDay: Boolean(payload.shiftDay),
    shiftNight: Boolean(payload.shiftNight),
    jobDescription: String(payload.jobDescription ?? '').trim(),
    stages,
    briefing: {
      topHazardsAndControls: String(briefingRaw?.topHazardsAndControls ?? '').trim(),
      stopScenarios: String(briefingRaw?.stopScenarios ?? '').trim(),
      morMentors: String(briefingRaw?.morMentors ?? '').trim(),
    },
    postWork: {
      doneWell: String(postRaw?.doneWell ?? '').trim(),
      doneWrong: String(postRaw?.doneWrong ?? '').trim(),
      improvements: String(postRaw?.improvements ?? '').trim(),
      pprUsage: String(postRaw?.pprUsage ?? '').trim(),
    },
  }
}

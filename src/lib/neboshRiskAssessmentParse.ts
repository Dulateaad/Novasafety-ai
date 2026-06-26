import type {
  AsorNeboshEmergencyRow,
  AsorNeboshMeta,
  AsorNeboshPermitRow,
  AsorNeboshPpeRow,
  AsorNeboshSignatureRow,
} from '../types/asor'
import { parseNeboshScale } from '../config/neboshRiskMatrix'

export type NeboshHazardPayload = {
  operationText?: string
  factorDescription?: string
  whoAtRisk?: string
  initialLikelihood?: number
  initialSeverity?: number
  protectiveMeasures?: string
  residualLikelihood?: number
  residualSeverity?: number
  residualNote?: string
  responsiblePerson?: string
}

export type NeboshOperationGroup = {
  groupTitle?: string
  hazards?: NeboshHazardPayload[]
}

export type NeboshRiskAssessmentPayload = {
  workTitle?: string
  nebosh?: Partial<AsorNeboshMeta>
  operationGroups?: NeboshOperationGroup[]
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

function rowList<T>(
  raw: unknown,
  map: (o: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(map)
    .filter((x): x is T => x !== null)
}

export function parseNeboshRiskAssessmentJson(raw: string): NeboshRiskAssessmentPayload {
  const payload = parseJsonObject(raw)
  const neboshRaw = payload.nebosh
  const nebosh =
    neboshRaw && typeof neboshRaw === 'object'
      ? {
          ...(neboshRaw as Partial<AsorNeboshMeta>),
          ppeTable: rowList((neboshRaw as { ppeTable?: unknown }).ppeTable, (o) => {
            const item = String(o.item ?? '').trim()
            if (!item) return null
            return {
              item,
              standard: String(o.standard ?? '').trim(),
              usage: String(o.usage ?? '').trim(),
            } satisfies AsorNeboshPpeRow
          }),
          emergencyPlan: rowList(
            (neboshRaw as { emergencyPlan?: unknown }).emergencyPlan,
            (o) => {
              const scenario = String(o.scenario ?? '').trim()
              if (!scenario) return null
              return {
                scenario,
                actions: String(o.actions ?? '').trim(),
                responsible: String(o.responsible ?? '').trim(),
              } satisfies AsorNeboshEmergencyRow
            },
          ),
          permitsTable: rowList(
            (neboshRaw as { permitsTable?: unknown }).permitsTable,
            (o) => {
              const document = String(o.document ?? '').trim()
              if (!document) return null
              return {
                document,
                application: String(o.application ?? '').trim(),
                status: String(o.status ?? 'Обязателен').trim(),
              } satisfies AsorNeboshPermitRow
            },
          ),
          signatureRows: rowList(
            (neboshRaw as { signatureRows?: unknown }).signatureRows,
            (o) => {
              const role = String(o.role ?? '').trim()
              if (!role) return null
              return {
                role,
                fullName: String(o.fullName ?? '').trim(),
                dateIso: String(o.dateIso ?? '').trim(),
              } satisfies AsorNeboshSignatureRow
            },
          ),
        }
      : undefined

  const operationGroups = Array.isArray(payload.operationGroups)
    ? payload.operationGroups
        .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
        .map((g) => ({
          groupTitle: String(g.groupTitle ?? '').trim(),
          hazards: Array.isArray(g.hazards)
            ? g.hazards
                .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
                .map((h) => ({
                  operationText: String(h.operationText ?? '').trim(),
                  factorDescription: String(h.factorDescription ?? '').trim(),
                  whoAtRisk: String(h.whoAtRisk ?? 'Операторы, персонал площадки').trim(),
                  initialLikelihood: parseNeboshScale(h.initialLikelihood),
                  initialSeverity: parseNeboshScale(h.initialSeverity),
                  protectiveMeasures: String(h.protectiveMeasures ?? '').trim(),
                  residualLikelihood: parseNeboshScale(h.residualLikelihood),
                  residualSeverity: parseNeboshScale(h.residualSeverity),
                  residualNote: String(h.residualNote ?? '').trim(),
                  responsiblePerson: String(h.responsiblePerson ?? '').trim(),
                }))
                .filter((h) => h.factorDescription || h.protectiveMeasures)
            : [],
        }))
        .filter((g) => g.groupTitle || (g.hazards?.length ?? 0) > 0)
    : []

  return {
    workTitle: String(payload.workTitle ?? '').trim(),
    nebosh,
    operationGroups,
  }
}

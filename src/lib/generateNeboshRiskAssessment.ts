import {
  buildNeboshRiskAssessmentUserPrompt,
  NEBOSH_RISK_ASSESSMENT_SYSTEM_PROMPT,
} from '../config/neboshRiskAssessmentPrompt'
import type { PprForm } from '../types/ppr'
import { aiGenerateTextForExtraction, isAiClientReady } from './aiClient'
import { buildPprRiskAssessmentContext } from './pprRiskContext'
import {
  parseNeboshRiskAssessmentJson,
  type NeboshRiskAssessmentPayload,
} from './neboshRiskAssessmentParse'

export function isNeboshAiAvailable(): boolean {
  return isAiClientReady()
}

export async function generateNeboshRiskAssessmentFromPpr(
  ppr: PprForm,
  meta?: { preparedBy?: string; contractorOrg?: string },
): Promise<NeboshRiskAssessmentPayload> {
  if (!isAiClientReady()) {
    throw new Error('Для генерации NEBOSH нужен ключ Claude или Gemini в .env')
  }

  const ctx = await buildPprRiskAssessmentContext(ppr)

  const raw = await aiGenerateTextForExtraction({
    systemPrompt: NEBOSH_RISK_ASSESSMENT_SYSTEM_PROMPT,
    userPrompt: buildNeboshRiskAssessmentUserPrompt({
      workTitle: ctx.workTitle,
      workDescription: ctx.workDescription,
      workStages: ctx.workStages,
      workVolume: ctx.workVolume,
      toolsAndEquipment: ctx.toolsAndEquipment,
      safetyMeasures: ctx.safetyMeasures,
      controlMeasuresMarkdown: ctx.controlMeasuresMarkdown,
      controlMeasuresStructured: ctx.controlMeasuresStructured,
      docTextExcerpt: ctx.docTextExcerpt,
      operationGroupsHint: ctx.operationGroupsHint,
      siteName: ctx.siteName,
      contractorOrg: meta?.contractorOrg?.trim() || ctx.contractorOrg,
      preparedBy: meta?.preparedBy?.trim() || '',
    }),
  })

  const payload = parseNeboshRiskAssessmentJson(raw)
  const hazardCount = (payload.operationGroups ?? []).reduce(
    (n, g) => n + (g.hazards?.length ?? 0),
    0,
  )
  if (hazardCount === 0) {
    throw new Error('ИИ не сформировал реестр опасностей NEBOSH')
  }
  return payload
}

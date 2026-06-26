import {
  ABR_RISK_ASSESSMENT_SYSTEM_PROMPT,
  buildAbrRiskAssessmentUserPrompt,
} from '../config/abrRiskAssessmentPrompt'
import type { AbrForm } from '../types/abr'
import { emptyAbrForm } from '../types/abr'
import type { PprForm } from '../types/ppr'
import { aiGenerateTextForExtraction, isAiClientReady } from './aiClient'
import {
  type AbrNdPeopleSource,
  prefillAbrHeaderFromPprNd,
  prefillAbrPeopleFromNd,
} from './prefillAbrFromPackage'
import { parseAbrRiskAssessmentJson } from './abrRiskAssessmentParse'
import { enrichAbrAnswers } from './formatAbrAnswers'
import { buildPprRiskAssessmentContext } from './pprRiskContext'

export function isAbrAiAvailable(): boolean {
  return isAiClientReady()
}

export async function generateAbrFromPpr(
  ppr: PprForm,
  opts?: {
    nd?: AbrNdPeopleSource | null
    resolveName?: (uid: string) => string
    resolveBadge?: (uid: string) => string
  },
): Promise<AbrForm> {
  if (!isAiClientReady()) {
    throw new Error('Для генерации АБР нужен ключ Claude или Gemini в .env')
  }

  const header = prefillAbrHeaderFromPprNd(ppr, opts?.nd)
  const resolveName = opts?.resolveName ?? ((uid) => uid)
  const people = prefillAbrPeopleFromNd(opts?.nd, resolveName, opts?.resolveBadge)
  const ctx = await buildPprRiskAssessmentContext(ppr)

  const raw = await aiGenerateTextForExtraction({
    systemPrompt: ABR_RISK_ASSESSMENT_SYSTEM_PROMPT,
    userPrompt: buildAbrRiskAssessmentUserPrompt({
      workTitle: ctx.workTitle,
      workStages: ctx.workStages,
      toolsAndEquipment: ctx.toolsAndEquipment,
      safetyMeasures: ctx.safetyMeasures,
      controlMeasuresMarkdown: ctx.controlMeasuresMarkdown,
      controlMeasuresStructured: ctx.controlMeasuresStructured,
      docTextExcerpt: ctx.docTextExcerpt,
      operationGroupsHint: ctx.operationGroupsHint,
      siteName: ctx.siteName,
      permitNo: header.permitNo,
      contractorOrg: ctx.contractorOrg,
      dateIso: header.dateIso,
      shiftDay: header.shiftDay,
      shiftNight: header.shiftNight,
    }),
  })

  const payload = parseAbrRiskAssessmentJson(raw)
  if (!payload.stages?.length) {
    throw new Error('ИИ не сформировал этапы АБР')
  }

  const base = emptyAbrForm()
  return enrichAbrAnswers({
    ...base,
    ...header,
    workLocation: payload.workLocation || header.workLocation || base.workLocation,
    permitNo: header.permitNo || payload.permitNo || '',
    dateIso: header.dateIso,
    shiftDay: header.shiftDay,
    shiftNight: header.shiftNight,
    jobDescription:
      payload.jobDescription ||
      header.jobDescription ||
      payload.workTitle ||
      ppr.workTitle ||
      base.jobDescription,
    stages: payload.stages,
    briefing: payload.briefing ?? base.briefing,
    postWork: payload.postWork ?? base.postWork,
    ...people,
    generatedAtIso: new Date().toISOString(),
  })
}

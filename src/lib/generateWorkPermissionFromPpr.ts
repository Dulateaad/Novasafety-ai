import {
  WORK_PERMISSION_AI_SYSTEM_PROMPT,
  buildWorkPermissionAiUserPrompt,
} from '../config/workPermissionAiPrompt'
import { WORK_PERMISSION_KIND_LABELS, type WorkPermissionDocument } from '../types/workPermissions'
import type { PprForm } from '../types/ppr'
import { aiGenerateTextForExtraction, isAiClientReady } from './aiClient'
import {
  buildPprRiskAssessmentContext,
  type PprRiskAssessmentContext,
} from './pprRiskContext'
import { mergeAiIntoPermissionForm, parseWorkPermissionAiJson } from './parseWorkPermissionAiJson'

export function isWorkPermissionAiAvailable(): boolean {
  return isAiClientReady()
}

function checklistIdsForPrompt(doc: WorkPermissionDocument): string {
  const groups = [
    doc.form.preWorkChecks,
    doc.form.confinedSpaceTypes,
    doc.form.connectionMethods,
    doc.form.rescueEquipment,
  ].filter(Boolean)
  return groups
    .map((g) => `${g!.label}: ${g!.items.map((i) => i.id).join(', ')}`)
    .join('\n')
}

export async function generateWorkPermissionSectionsFromPpr(
  doc: WorkPermissionDocument,
  ppr: PprForm,
  ctx?: PprRiskAssessmentContext,
): Promise<WorkPermissionDocument> {
  if (!isAiClientReady()) {
    throw new Error('Для ИИ-заполнения нужен ключ Claude или Gemini в .env')
  }
  const context = ctx ?? (await buildPprRiskAssessmentContext(ppr))
  const raw = await aiGenerateTextForExtraction({
    systemPrompt: WORK_PERMISSION_AI_SYSTEM_PROMPT,
    userPrompt: buildWorkPermissionAiUserPrompt({
      kind: WORK_PERMISSION_KIND_LABELS[doc.kind],
      workTitle: context.workTitle,
      siteName: context.siteName,
      workStages: context.workStages,
      toolsAndEquipment: context.toolsAndEquipment,
      safetyMeasures: context.safetyMeasures,
      checklistIds: checklistIdsForPrompt(doc),
    }),
  })
  const payload = parseWorkPermissionAiJson(raw)
  return {
    ...doc,
    form: mergeAiIntoPermissionForm(doc.form, payload),
  }
}

export async function generateAllWorkPermissionsFromPpr(
  documents: WorkPermissionDocument[],
  ppr: PprForm,
): Promise<WorkPermissionDocument[]> {
  const ctx = await buildPprRiskAssessmentContext(ppr)
  return Promise.all(
    documents.map((doc) => generateWorkPermissionSectionsFromPpr(doc, ppr, ctx)),
  )
}

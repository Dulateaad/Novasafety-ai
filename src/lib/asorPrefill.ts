import type { PermitDraft } from '../types/domain'
import { PTW_SITES_SET } from '../config/ptwSites'
import type { AsorForm } from '../types/asor'
import {
  ASOR_EDITION_META,
  ASOR_TASK_RESIDUAL_LABELS,
  MATRIX_CELL_RISK_LABELS,
  deriveRiskFromMatrix,
} from '../types/asor'

export function pickSiteFromAsorPlaces(
  text: string,
  fallback: string,
): string {
  const chunks = text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const p of chunks) {
    if (PTW_SITES_SET.has(p)) return p
  }
  for (const site of PTW_SITES_SET) {
    if (text.includes(site)) return site
  }
  return fallback
}

export function composePermitWorkDescriptionFromAsor(a: AsorForm): string {
  const parts: string[] = []
  parts.push(
    `— ${ASOR_EDITION_META.title} (${ASOR_EDITION_META.formRef}, изд. ${ASOR_EDITION_META.edition})`,
  )
  parts.push(`Дата АСОР: ${a.creationDateIso}`)
  if (a.workDurationText.trim())
    parts.push(`Продолжительность: ${a.workDurationText.trim()}`)
  if (a.tentativeNdReference.trim())
    parts.push(`НД (предв.): ${a.tentativeNdReference.trim()}`)
  parts.push('')
  parts.push('Объём работ:')
  parts.push(a.workScopeMarkdown.trim() || '—')
  parts.push('')
  parts.push('Оборудование:')
  parts.push(a.equipmentMarkdown.trim() || '—')
  parts.push('')
  parts.push('Место проведения:')
  parts.push(a.workPlacesText.trim() || '—')
  const mx = deriveRiskFromMatrix(a.matrixLikelihood, a.matrixSeverity)
  if (mx) {
    parts.push('')
    parts.push(`Матрица оценки (авто): ${MATRIX_CELL_RISK_LABELS[mx]}`)
  }
  parts.push('')
  parts.push('Задания и опасные факторы (раздел 2):')
  a.tasks.forEach((t, ti) => {
    parts.push(`${ti + 1}. ${t.taskTitle.trim() || 'Задание без названия'}`)
    t.hazards.forEach((h, hi) => {
      parts.push(
        `   ${ti + 1}.${hi + 1} Опасный фактор: ${h.factorDescription.trim() || '—'}`,
      )
      parts.push(`   Средства защиты: ${h.protectiveMeasures.trim() || '—'}`)
      if (h.residualRisk)
        parts.push(
          `   Уровень остаточного риска: ${ASOR_TASK_RESIDUAL_LABELS[h.residualRisk]}`,
        )
    })
  })
  if (a.teamParticipatingNote.trim()) {
    parts.push('')
    parts.push(`Рабочая команда АСОР: ${a.teamParticipatingNote.trim()}`)
  }
  if (a.supplementaryResourcesMarkdown.trim()) {
    parts.push('')
    parts.push('Дополнительные ресурсы:')
    parts.push(a.supplementaryResourcesMarkdown.trim())
  }
  return parts.join('\n')
}

export function applyAsorToPermitDraft(
  base: PermitDraft,
  asor: AsorForm,
): PermitDraft {
  const site = pickSiteFromAsorPlaces(asor.workPlacesText, base.siteName)
  return {
    ...base,
    title: asor.shortTitleForNarjad.trim() || base.title,
    siteName: site,
    workDescription: composePermitWorkDescriptionFromAsor(asor),
    toolsAndEquipment:
      asor.toolsEquipmentList.trim() || base.toolsAndEquipment,
    asor,
  }
}

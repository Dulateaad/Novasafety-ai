import type { AsorPermitDocuments } from '../types/asor'
import type { PermitDraft } from '../types/domain'

/** Автоматически отмечает разрешительные документы по виду работ НДПР. */
export function inferPermitDocumentsFromNd(
  draft: PermitDraft,
  base: AsorPermitDocuments,
): AsorPermitDocuments {
  const next = { ...base, narjadPermit: true }

  switch (draft.specialWorkActivity) {
    case 'open_flame_fire':
      next.fireWorks = true
      break
    case 'electrical':
      next.electricalInstallationPermit = true
      next.hazardousEnergyIsolation = true
      break
    case 'gas_hazard':
      next.gasHazardWorks = true
      break
    case 'radiographic':
      next.radiographyWorks = true
      break
    case 'confined_space':
      next.confinedSpacePermit = true
      break
    default:
      break
  }

  if (/груз|кран|такелаж|строп/i.test(draft.toolsAndEquipment)) {
    next.liftingOperationsPlan = true
  }
  if (/землян|котлован|тrench/i.test(`${draft.workDescription} ${draft.workStages}`)) {
    next.excavationPlan = true
  }

  return next
}

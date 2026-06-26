import { UOG_CERTIFICATES } from '../config/uogCertificates'
import type { PprForm } from '../types/ppr'

function pprHaystack(ppr: PprForm): string {
  const parts = [
    ppr.workTitle,
    ppr.workDescription,
    ppr.workArea,
    ppr.safetyMeasures,
    ppr.toolsAndEquipment,
    ppr.workStagesText,
    ppr.workVolume,
    ...ppr.tasks.map((t) => `${t.taskTitle} ${t.workContent} ${t.safetyMeasures}`),
    ...(ppr.controlMeasures?.items ?? []).flatMap((i) => [
      i.section,
      i.hazard,
      ...i.controlMeasures,
    ]),
  ]
  return parts.join('\n').toLowerCase()
}

/** Подбирает процедуры UOG-HSE по содержанию ППР. */
export function matchCertificateIdsFromPpr(ppr: PprForm): string[] {
  const hay = pprHaystack(ppr)
  const ids = new Set<string>()

  for (const cert of UOG_CERTIFICATES) {
    if (cert.alwaysAttach) ids.add(cert.id)
    if (cert.matchPatterns.some((re) => re.test(hay))) ids.add(cert.id)
  }

  if (ppr.attachment?.fileName) ids.add('pr-007-r')

  return [...ids]
}

export function applyLinkedCertificatesToPpr(ppr: PprForm): PprForm {
  return { ...ppr, linkedCertificateIds: matchCertificateIdsFromPpr(ppr) }
}

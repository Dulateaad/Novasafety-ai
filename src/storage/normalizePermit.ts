import type { Permit, PermitCategory, PermitType } from '../types/domain'
import { coercePtwSite } from '../config/ptwSites'
import { emptyF02 } from '../uog/permitDefaults'
import { initialNdprResponses } from '../uog/ndprChecklistTemplate'

function normalizeStoredPermitType(raw: unknown): PermitType {
  if (raw === 'fire' || raw === 'cold') return raw
  if (raw === 'f04') return 'fire'
  if (raw === 'standard') return 'cold'
  return 'cold'
}

function normalizeStoredCategory(raw: unknown): PermitCategory {
  return raw === 1 ? 1 : 2
}

/** Дополняет сохранённые документы полями новой модели PR-007. */
export function migratePermit(p: Permit): Permit {
  const sig = p.signatures
  const incoming = p as Permit & {
    permitType?: unknown
    category?: unknown
    f04?: unknown
  }

  const permitType = normalizeStoredPermitType(incoming.permitType)
  const category = normalizeStoredCategory(incoming.category)

  const next: Permit = {
    ...incoming,
    permitType,
    category,
    siteName: coercePtwSite(incoming.siteName),
    f04: incoming.f04 as Permit['f04'],
    leadExpertUid: p.leadExpertUid ?? 'u-lead',
    registrationRefNo: p.registrationRefNo ?? '',
    f02: p.f02 ?? emptyF02(),
    executors: Array.isArray(p.executors) ? p.executors : [],
    ndprChecklist:
      Array.isArray(p.ndprChecklist) && p.ndprChecklist.length > 0
        ? p.ndprChecklist
        : initialNdprResponses(),
    signatures: {
      performerSigned: !!sig?.performerSigned,
      issuerSigned: !!sig?.issuerSigned,
      permitterSigned: !!sig?.permitterSigned,
      leadExpertSigned: !!sig?.leadExpertSigned,
      ertSigned: sig?.ertSigned,
    },
    incidentLongRetention: p.incidentLongRetention ?? false,
  }

  if (permitType === 'cold') next.f04 = undefined
  return next
}

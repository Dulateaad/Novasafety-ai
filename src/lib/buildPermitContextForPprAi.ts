import type { PermitDraft, UserRole } from '../types/domain'
import {
  ROLE_LABELS,
  SPECIAL_WORK_ACTIVITY_LABELS,
  ZONE_CLASS_LABELS,
  applySpecialWorkActivity,
  coerceSpecialWorkActivity,
  coerceZoneClass,
} from '../types/domain'

const ROLE_FIELDS: {
  uidKey: keyof Pick<
    PermitDraft,
    'issuerUid' | 'permitterUid' | 'performerUid' | 'leadExpertUid'
  >
  role: UserRole
}[] = [
  { uidKey: 'issuerUid', role: 'issuer' },
  { uidKey: 'permitterUid', role: 'permitter' },
  { uidKey: 'performerUid', role: 'performer' },
  { uidKey: 'leadExpertUid', role: 'leadExpert' },
]

function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role]
}

/**
 * Компактный словарь по черновику НД без персональных перечней НДПР,
 * для подсказки LLM текстом черновика ППР.
 */
export function buildPermitContextForPprAi(
  draft: PermitDraft,
  resolveDisplayName: (uid: string) => string | undefined,
): Record<string, unknown> {
  const swa = coerceSpecialWorkActivity(
    draft.specialWorkActivity,
    draft.permitType,
  )
  const derived = applySpecialWorkActivity(swa)
  const zoneClass = coerceZoneClass(draft.zoneClass)

  const participants: Record<string, string> = {}
  for (const { uidKey, role } of ROLE_FIELDS) {
    const uid = draft[uidKey]
    const name =
      typeof uid === 'string' ? resolveDisplayName(uid) ?? uid : String(uid)
    participants[roleLabel(role)] = `${name}`
  }

  const executors = draft.executors.map((ex, i) => ({
    row: i + 1,
    dateIso: ex.dateIso,
    worker:
      typeof ex.userUid === 'string' && ex.userUid.trim()
        ? resolveDisplayName(ex.userUid.trim()) ?? ex.userUid.trim()
        : 'не выбран',
    briefingConfirmed: ex.briefingAcknowledged ? 'да' : 'нет',
  }))

  const ndpr = draft.ndprChecklist ?? []
  const ndprFilled = ndpr.filter(
    (item) => item && item.answer !== null && item.answer !== undefined,
  )

  const samePerson = draft.samePersonException ?? {
    allowed: false,
    reason: '',
  }

  return {
    title: draft.title?.trim() || null,
    site: draft.siteName,
    organisation: draft.f02.company,
    badgeNoOrPass: draft.f02.badgeNo || null,
    shift: draft.f02.shift || null,
    plannedStartIso: draft.f02.startDate || null,
    plannedEndIso: draft.f02.endDate || null,
    issuedToOrgOrPersonHint: draft.f02.issuedTo || null,
    permitTypeDraft: `${derived.permitType} (кат. ${derived.category})`,
    matrixSpecialWorkRu: SPECIAL_WORK_ACTIVITY_LABELS[swa],
    zoneClassLabel: ZONE_CLASS_LABELS[zoneClass],
    workDescriptionMarkdown: draft.workDescription || null,
    toolsAndEquipmentLine: draft.toolsAndEquipment || null,
    contractorsPermitDraft: draft.isContractorPermit ? 'да' : 'нет',
    samePersonExceptionDraft: samePerson.allowed ? `да (${samePerson.reason ?? ''})` : 'нет',
    participantsSuggestedByRolesRu: participants,
    executorsF03RoughList: executors,
    ndprChecklistRough: {
      statedItems: ndpr.length,
      withAnswerOrRemark: ndprFilled.length,
    },
    bundleNote: draft.asor
      ? 'к черновику уже приложены данные АСОР (черновик пакета далее синхронизируется после АСОР)'
      : 'АСОР в этом черновике ещё не приложена к моменту генерации текста ППР',
    registrationDraftRefPlaceholder: draft.registrationRefNo || null,
  }
}

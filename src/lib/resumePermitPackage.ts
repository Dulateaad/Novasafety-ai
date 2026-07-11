import type { DemoUser, Permit, PermitDraft } from '../types/domain'
import { ASOR_EDITOR_AUTOSAVE_KEY } from '../types/asor'
import { emptyPprForm, normalizePprForm } from '../types/ppr'
import { setNdGatePassed } from './ndGate'
import { setPprGatePassed } from './pprGate'
import { clearRiskGate, setRiskGatePassed } from './riskGate'
import { notifyNavGatesChanged } from './navGates'
import {
  NEW_PERMIT_DRAFT_AUTOSAVE_KEY,
  parseStoredNewPermitDraft,
} from './newPermitDraftAutosave'
import { savePprForm, pprHasNdprSource, validatePprForm } from './pprAutosave'
import {
  prepareNdprDraftForValidation,
  validateNdprDraft,
} from './validateNdprDraft'
import { resetExecutorsBriefingAck } from './resubmitRejectedPermit'

export const RESUME_PERMIT_ID_KEY = 'nova_resume_permit_id_v1'
/** Флаг: идёт исправление отклонённого наряда — не сбрасывать resume-id при from=ppr. */
export const RESUBMIT_AFTER_REJECTION_KEY = 'nova_resubmit_after_rejection_v1'

export type PackageResumeRoute = '/ppr' | '/new' | '/risk-assessment'

export function isResubmitAfterRejection(): boolean {
  try {
    return sessionStorage.getItem(RESUBMIT_AFTER_REJECTION_KEY) === '1'
  } catch {
    return false
  }
}

export function setResubmitAfterRejection(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(RESUBMIT_AFTER_REJECTION_KEY, '1')
    else sessionStorage.removeItem(RESUBMIT_AFTER_REJECTION_KEY)
  } catch {
    /* ignore */
  }
}

/** Наряд уже проходил мастер и отправлялся на согласование — ППР повторно не нужен. */
export function isPermitPackagePreviouslySubmitted(permit: Permit): boolean {
  return Boolean(permit.packagePdf || permit.asor)
}

export function readResumePermitId(): string | null {
  try {
    const id = sessionStorage.getItem(RESUME_PERMIT_ID_KEY)?.trim()
    return id || null
  } catch {
    return null
  }
}

export function writeResumePermitId(id: string): void {
  try {
    sessionStorage.setItem(RESUME_PERMIT_ID_KEY, id.trim())
  } catch {
    /* ignore */
  }
}

export function clearResumePermitId(): void {
  try {
    sessionStorage.removeItem(RESUME_PERMIT_ID_KEY)
  } catch {
    /* ignore */
  }
}

export function permitToPermitDraft(permit: Permit): PermitDraft {
  const {
    id: _id,
    status: _status,
    version: _version,
    previousVersionId: _prev,
    packagePdf: _pdf,
    lastRejection: _rej,
    signatures: _sig,
    contractorSafetyApproved: _csa,
    validUntilIso: _valid,
    createdAtIso: _created,
    updatedAtIso: _updated,
    incidentLongRetention: _ret,
    egovSignatures: _egov,
    crewAckSignatures: _crew,
    ...draft
  } = permit
  return draft
}

/** Загружает данные наряда-черновика в sessionStorage для мастера ППР → НДПР → Оценка Риска. */
export function restorePackageSessionFromPermit(
  permit: Permit,
  opts?: { resubmitAfterRejection?: boolean },
): void {
  const ppr = permit.ppr
    ? normalizePprForm(permit.ppr) ?? emptyPprForm()
    : emptyPprForm()
  savePprForm(ppr)

  const ndDraft = permitToPermitDraft(permit)
  const { asor, ppr: _ppr, ...ndOnly } = ndDraft
  const ndForSession = opts?.resubmitAfterRejection
    ? { ...ndOnly, executors: resetExecutorsBriefingAck(ndDraft.executors) }
    : ndOnly
  try {
    sessionStorage.setItem(
      NEW_PERMIT_DRAFT_AUTOSAVE_KEY,
      JSON.stringify({ ...ndForSession, asor: undefined, ppr: undefined }),
    )
  } catch {
    /* ignore quota */
  }

  if (asor) {
    try {
      sessionStorage.setItem(ASOR_EDITOR_AUTOSAVE_KEY, JSON.stringify(asor))
    } catch {
      /* ignore quota */
    }
  }

  writeResumePermitId(permit.id)
  setResubmitAfterRejection(Boolean(opts?.resubmitAfterRejection))

  if (
    isPermitPackagePreviouslySubmitted(permit) ||
    (pprHasNdprSource(ppr) && validatePprForm(ppr) === null)
  ) {
    setPprGatePassed()
  }
  setNdGatePassed()
  if (permit.asor && !opts?.resubmitAfterRejection) {
    setRiskGatePassed()
  } else if (opts?.resubmitAfterRejection) {
    clearRiskGate()
  }
  notifyNavGatesChanged()
}

/** После отклонения — всегда на НДПР (ППР уже пройден). */
export function resolveRejectedPermitResubmitRoute(permit: Permit): PackageResumeRoute {
  return resolvePackageResumeRoute(permit, null, [])
}

/** Определяет вкладку мастера, на которой пользователь остановился. */
export function resolvePackageResumeRoute(
  permit: Permit,
  user: DemoUser | null,
  directory: DemoUser[],
): PackageResumeRoute {
  const ppr = permit.ppr
    ? normalizePprForm(permit.ppr) ?? emptyPprForm()
    : emptyPprForm()

  const skipPpr = isPermitPackagePreviouslySubmitted(permit)

  if (!skipPpr && (!pprHasNdprSource(ppr) || validatePprForm(ppr) !== null)) {
    return '/ppr'
  }

  if (skipPpr) {
    return '/new'
  }

  const parsed = parseStoredNewPermitDraft(permitToPermitDraft(permit))
  const ndDraft = prepareNdprDraftForValidation(
    parsed ?? permitToPermitDraft(permit),
    user,
    directory,
  )
  if (validateNdprDraft(ndDraft) !== null) {
    return '/new'
  }

  return '/risk-assessment'
}

export function packageDraftToPermitFields(draft: PermitDraft): Partial<Permit> {
  const registrationRefNo = draft.registrationRefNo.trim()
  return {
    title: draft.title,
    permitType: draft.permitType,
    category: draft.category,
    specialWorkActivity: draft.specialWorkActivity,
    zoneClass: draft.zoneClass,
    siteName: draft.siteName,
    workDescription: draft.workDescription,
    workStages: draft.workStages,
    workVolume: draft.workVolume,
    toolsAndEquipment: draft.toolsAndEquipment,
    issuerUid: draft.issuerUid,
    permitterUid: draft.permitterUid,
    performerUid: draft.performerUid,
    leadExpertUid: draft.leadExpertUid,
    ertUid: draft.ertUid,
    isContractorPermit: draft.isContractorPermit,
    samePersonException: draft.samePersonException,
    ...(registrationRefNo ? { registrationRefNo } : {}),
    f02: draft.f02,
    f04: draft.f04,
    executors: draft.executors,
    ndprChecklist: draft.ndprChecklist,
    sitePhotos: draft.sitePhotos,
    ppr: draft.ppr,
    asor: draft.asor,
    specialWorkActivities: draft.specialWorkActivities,
    workPermissions: draft.workPermissions,
  }
}

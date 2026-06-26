import type { DemoUser, Permit, PermitDraft } from '../types/domain'
import { ASOR_EDITOR_AUTOSAVE_KEY } from '../types/asor'
import { emptyPprForm, normalizePprForm } from '../types/ppr'
import { setNdGatePassed } from './ndGate'
import { setPprGatePassed } from './pprGate'
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

export const RESUME_PERMIT_ID_KEY = 'nova_resume_permit_id_v1'

export type PackageResumeRoute = '/ppr' | '/new' | '/risk-assessment'

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

/** Загружает данные наряда-черновика в sessionStorage для мастера ППР → НДПР → оценка риска. */
export function restorePackageSessionFromPermit(permit: Permit): void {
  const ppr = permit.ppr
    ? normalizePprForm(permit.ppr) ?? emptyPprForm()
    : emptyPprForm()
  savePprForm(ppr)

  const ndDraft = permitToPermitDraft(permit)
  const { asor, ppr: _ppr, ...ndOnly } = ndDraft
  try {
    sessionStorage.setItem(
      NEW_PERMIT_DRAFT_AUTOSAVE_KEY,
      JSON.stringify({ ...ndOnly, asor: undefined, ppr: undefined }),
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

  try {
    sessionStorage.setItem(RESUME_PERMIT_ID_KEY, permit.id)
  } catch {
    /* ignore */
  }

  if (pprHasNdprSource(ppr) && validatePprForm(ppr) === null) {
    setPprGatePassed()
  }
  setNdGatePassed()
  notifyNavGatesChanged()
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

  if (!pprHasNdprSource(ppr) || validatePprForm(ppr) !== null) {
    return '/ppr'
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
    isContractorPermit: draft.isContractorPermit,
    samePersonException: draft.samePersonException,
    registrationRefNo: draft.registrationRefNo,
    f02: draft.f02,
    f04: draft.f04,
    executors: draft.executors.map((ex) => ({
      ...ex,
      briefingAcknowledged: false,
    })),
    ndprChecklist: draft.ndprChecklist,
    sitePhotos: draft.sitePhotos,
    ppr: draft.ppr,
    asor: draft.asor,
    egovSignatures: {},
    crewAckSignatures: {},
    signatures: {
      performerSigned: false,
      issuerSigned: false,
      permitterSigned: false,
      leadExpertSigned: false,
    },
  }
}

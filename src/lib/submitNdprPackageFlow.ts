import type { NavigateFunction } from 'react-router-dom'
import type { DemoUser, Permit, PermitDraft } from '../types/domain'
import type { AsorForm } from '../types/asor'
import type { PprForm } from '../types/ppr'
import { clearPackageSession } from './packageSession'
import { resolveDraftRegistrationRefNo } from './registrationNumber'
import {
  packageDraftToPermitFields,
  readResumePermitId,
  clearResumePermitId,
  writeResumePermitId,
} from './resumePermitPackage'

function isPermitNotFoundError(e: unknown): boolean {
  return e instanceof Error && e.message === 'Permit not found'
}

/**
 * Черновик/отклонённый наряд того же производителя для повторной отправки —
 * чтобы не создать дубль с новым №, если session resume-id потерян.
 */
export function findReusablePermitIdForSubmit(
  packageDraft: Pick<PermitDraft, 'registrationRefNo' | 'performerUid'>,
  permits: readonly Permit[],
): string | null {
  const performerUid = packageDraft.performerUid?.trim()
  const reg = packageDraft.registrationRefNo?.trim()

  const isReusable = (p: Permit) =>
    p.status === 'draft' || p.status === 'rejected'

  if (reg) {
    const byReg = permits.filter((p) => {
      if (!isReusable(p)) return false
      if (p.registrationRefNo?.trim() !== reg) return false
      if (performerUid && p.performerUid?.trim() && p.performerUid.trim() !== performerUid) {
        return false
      }
      return true
    })
    if (byReg.length > 0) {
      byReg.sort((a, b) => (b.updatedAtIso ?? '').localeCompare(a.updatedAtIso ?? ''))
      return byReg[0]?.id ?? null
    }
  }

  // Номер в сессии мог уже смениться на «следующий» — ищем последний draft/rejected того же производителя.
  if (performerUid) {
    const byPerformer = permits.filter(
      (p) => isReusable(p) && p.performerUid?.trim() === performerUid,
    )
    if (byPerformer.length === 1) return byPerformer[0]!.id
    if (byPerformer.length > 1) {
      byPerformer.sort((a, b) => (b.updatedAtIso ?? '').localeCompare(a.updatedAtIso ?? ''))
      return byPerformer[0]!.id
    }
  }

  return null
}

async function updateExistingPermitForSubmit(
  permitId: string,
  draftWithReg: PermitDraft,
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>,
  permits: readonly Permit[],
): Promise<Permit> {
  const existing = permits.find((p) => p.id === permitId)
  const keepReg =
    existing?.registrationRefNo?.trim() || draftWithReg.registrationRefNo.trim()
  const draftToSave: PermitDraft = {
    ...draftWithReg,
    ...(keepReg ? { registrationRefNo: keepReg } : {}),
  }
  await updatePermit(permitId, packageDraftToPermitFields(draftToSave))
  writeResumePermitId(permitId)
  return {
    ...(existing ?? {}),
    ...draftToSave,
    id: permitId,
    status: existing?.status ?? 'draft',
    version: existing?.version ?? 1,
    signatures: existing?.signatures ?? {
      performerSigned: false,
      issuerSigned: false,
      permitterSigned: false,
      leadExpertSigned: false,
      ertSigned: false,
    },
    egovSignatures: existing?.egovSignatures,
    contractorSafetyApproved: existing?.contractorSafetyApproved ?? true,
    incidentLongRetention: existing?.incidentLongRetention ?? false,
    createdAtIso: existing?.createdAtIso ?? new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  } as Permit
}

/** Обновляет черновик по resume-id / № НДПР или создаёт новый наряд. */
export async function ensurePermitForPackageSubmit(args: {
  packageDraft: PermitDraft
  createPermit: (draft: PermitDraft) => Promise<Permit>
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  permits?: readonly Permit[]
}): Promise<Permit> {
  const { packageDraft, createPermit, updatePermit, permits = [] } = args
  const resumePermitId = readResumePermitId()
  const reusableId = findReusablePermitIdForSubmit(packageDraft, permits)
  const registrationRefNo = resolveDraftRegistrationRefNo(
    packageDraft,
    permits,
    resumePermitId ?? reusableId,
  )
  const draftWithReg: PermitDraft = { ...packageDraft, registrationRefNo }

  const tryIds = [resumePermitId, reusableId, findReusablePermitIdForSubmit(draftWithReg, permits)]
    .filter((id, i, arr): id is string => Boolean(id) && arr.indexOf(id) === i)

  for (const permitId of tryIds) {
    try {
      return await updateExistingPermitForSubmit(
        permitId,
        draftWithReg,
        updatePermit,
        permits,
      )
    } catch (e) {
      if (!isPermitNotFoundError(e)) throw e
      if (permitId === resumePermitId) clearResumePermitId()
    }
  }

  const created = await createPermit(draftWithReg)
  writeResumePermitId(created.id)
  return created
}

export type PreparePackageSubmitDeps = {
  packageDraft: PermitDraft
  createPermit: (draft: PermitDraft) => Promise<Permit>
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  permits?: readonly Permit[]
}

export type FinalizePackageSubmitDeps = {
  permitId: string
  transition: (id: string, status: Permit['status']) => Promise<void>
}

export type PackagePerformerSignTarget = {
  permit: Permit
  signerUid: string
  signerName: string
}

/** Сохраняет наряд и PDF-пакет; статус остаётся черновиком до ЭЦП производителя. */
export async function prepareNdprPackageForSubmit(
  deps: PreparePackageSubmitDeps,
): Promise<Permit> {
  const {
    packageDraft,
    createPermit,
    updatePermit,
    resolveUser,
    userDirectory,
    permits = [],
  } = deps

  const p = await ensurePermitForPackageSubmit({
    packageDraft,
    createPermit,
    updatePermit,
    permits,
  })

  if (packageDraft.workPermissions) {
    await updatePermit(p.id, { workPermissions: packageDraft.workPermissions })
  }

  const { buildSigningPackagePdf } = await import('./buildSigningPackagePdf')
  const packagePdf = await buildSigningPackagePdf(p, resolveUser, userDirectory)
  await updatePermit(p.id, { packagePdf })

  return {
    ...p,
    ...packageDraft,
    packagePdf,
    status: p.status ?? 'draft',
    signatures: p.signatures ?? {
      performerSigned: false,
      issuerSigned: false,
      permitterSigned: false,
      leadExpertSigned: false,
      ertSigned: false,
    },
    egovSignatures: p.egovSignatures,
  } as Permit
}

export async function finalizeNdprPackageSubmit(
  deps: FinalizePackageSubmitDeps,
): Promise<{ provisionWarning: string | null; permitId: string }> {
  const { permitId, transition } = deps

  await transition(permitId, 'on_approval')

  let provisionWarning: string | null = null
  try {
    const { provisionPermitSignersClient } = await import('./provisionSigners')
    const result = await provisionPermitSignersClient(permitId)
    if (!result) {
      provisionWarning =
        'Наряд отправлен, но уведомления подписантам не созданы (Firebase Functions недоступны).'
    }
  } catch (e) {
    provisionWarning =
      e instanceof Error
        ? `Наряд отправлен, но уведомления не созданы: ${e.message}`
        : 'Наряд отправлен, но уведомления подписантам не созданы.'
  }

  clearPackageSession()
  return { provisionWarning, permitId }
}

export function packagePerformerSignTarget(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
): PackagePerformerSignTarget {
  const performer = resolveUser(permit.performerUid)
  return {
    permit,
    signerUid: permit.performerUid,
    signerName: performer?.displayName?.trim() || 'Производитель работ',
  }
}

export type SubmitPackageDeps = PreparePackageSubmitDeps & {
  transition: (id: string, status: Permit['status']) => Promise<void>
  nav: NavigateFunction
}

export async function executeNdprPackageSubmit(
  deps: SubmitPackageDeps,
): Promise<{ provisionWarning: string | null; permitId: string }> {
  const permit = await prepareNdprPackageForSubmit(deps)
  return finalizeNdprPackageSubmit({
    permitId: permit.id,
    transition: deps.transition,
  })
}

export function buildPackageDraft(args: {
  draft: PermitDraft
  form: AsorForm
  ppr: PprForm | undefined
}): PermitDraft {
  const { draft, form, ppr } = args
  const abrShift =
    draft.f02.shift ||
    (form.abr?.shiftNight ? 'night' : form.abr?.shiftDay ? 'day' : '')

  return {
    ...draft,
    title: draft.title.trim(),
    workDescription:
      draft.workStages.trim() ||
      draft.workDescription.trim() ||
      draft.workDescription,
    ppr,
    asor: form,
    f02: { ...draft.f02, shift: abrShift },
    f04: draft.permitType === 'cold' ? undefined : draft.f04,
    isContractorPermit: false,
    performerUid: draft.performerUid,
    registrationRefNo: draft.registrationRefNo.trim() || draft.registrationRefNo,
  }
}

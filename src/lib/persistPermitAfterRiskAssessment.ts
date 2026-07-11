import type { DemoUser, Permit, PermitDraft, PermitStatus } from '../types/domain'
import type { AsorForm } from '../types/asor'
import type { PprForm } from '../types/ppr'
import { applyAsorToPermitDraft } from './asorPrefill'
import { seedApprovalNamesFromPermit } from './approvalSequence'
import { renderWorkPermissionsBundle } from './buildWorkPermissionPdf'
import { buildSigningPackagePdf } from './buildSigningPackagePdf'
import { finalizeAsorFormForReady } from './finalizeGeneratedRiskDocs'
import { resolveDraftRegistrationRefNo } from './registrationNumber'
import { resolveUserBadgeNo } from './userBadgeNumbers'
import {
  packageDraftToPermitFields,
  readResumePermitId,
  clearResumePermitId,
  writeResumePermitId,
} from './resumePermitPackage'
import { findReusablePermitIdForSubmit } from './submitNdprPackageFlow'
import { enrichWorkPermissionsBundle, initializeWorkPermissionsBundle } from './workPermissions'
import type { WorkPermissionsBundle } from '../types/workPermissions'

export type PersistPermitAfterRiskDeps = {
  draft: PermitDraft
  form: AsorForm
  ppr: PprForm | undefined
  existingStatus?: PermitStatus
  permits?: readonly Permit[]
  createPermit: (draft: PermitDraft) => Promise<Permit>
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  transition: (id: string, next: PermitStatus) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
}

/** Сохраняет наряд после шага «Оценка Риска» и переводит на согласование для доступа ERT. */
export async function persistPermitAfterRiskAssessment(
  deps: PersistPermitAfterRiskDeps,
): Promise<{ permitId: string; bundle: WorkPermissionsBundle }> {
  const {
    draft,
    form,
    ppr,
    existingStatus,
    permits = [],
    createPermit,
    updatePermit,
    transition,
    resolveUser,
    userDirectory,
  } = deps

  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, userDirectory)
  const registrationRefNo = resolveDraftRegistrationRefNo(
    draft,
    permits,
    readResumePermitId(),
  )
  const draftWithReg: PermitDraft = { ...draft, registrationRefNo }
  const asorWithApprovers = finalizeAsorFormForReady(
    seedApprovalNamesFromPermit(form, draftWithReg, resolveUser, resolveBadge),
    ppr,
    draftWithReg,
  )
  const abrShift =
    draftWithReg.f02.shift ||
    (asorWithApprovers.abr?.shiftNight
      ? 'night'
      : asorWithApprovers.abr?.shiftDay
        ? 'day'
        : '')

  let packageDraft = applyAsorToPermitDraft(draftWithReg, asorWithApprovers)
  packageDraft = {
    ...packageDraft,
    title: draftWithReg.title.trim() || packageDraft.title,
    workStages: draftWithReg.workStages,
    workDescription:
      draftWithReg.workStages.trim() ||
      draftWithReg.workDescription.trim() ||
      packageDraft.workDescription,
    ppr,
    asor: asorWithApprovers,
    f02: { ...packageDraft.f02, shift: abrShift },
    f04: draftWithReg.permitType === 'cold' ? undefined : draftWithReg.f04,
    isContractorPermit: false,
    performerUid: draftWithReg.performerUid,
    registrationRefNo,
  }

  let bundle = initializeWorkPermissionsBundle(packageDraft, ppr)
  bundle = enrichWorkPermissionsBundle(packageDraft, bundle)
  packageDraft = { ...packageDraft, workPermissions: bundle }

  const resumePermitId = readResumePermitId()
  const reusableId = findReusablePermitIdForSubmit(packageDraft, permits)
  let status: PermitStatus = existingStatus ?? 'draft'

  const tryIds = [resumePermitId, reusableId].filter(
    (id, i, arr): id is string => Boolean(id) && arr.indexOf(id) === i,
  )

  let permitId = ''
  for (const id of tryIds) {
    try {
      const existing = permits.find((p) => p.id === id)
      const keepReg =
        existing?.registrationRefNo?.trim() || packageDraft.registrationRefNo.trim()
      await updatePermit(
        id,
        packageDraftToPermitFields({
          ...packageDraft,
          ...(keepReg ? { registrationRefNo: keepReg } : {}),
        }),
      )
      permitId = id
      writeResumePermitId(id)
      break
    } catch (e) {
      if (!(e instanceof Error && e.message === 'Permit not found')) throw e
      if (id === resumePermitId) clearResumePermitId()
    }
  }
  if (!permitId) {
    const created = await createPermit(packageDraft)
    permitId = created.id
    status = created.status
    writeResumePermitId(permitId)
  }

  try {
    const renderedDocs = await renderWorkPermissionsBundle(bundle.documents)
    bundle = enrichWorkPermissionsBundle(packageDraft, {
      documents: renderedDocs,
      updatedAtIso: new Date().toISOString(),
    })
    packageDraft = { ...packageDraft, workPermissions: bundle }
    await updatePermit(permitId, { workPermissions: bundle })
  } catch (e) {
    console.error('[work-permission-pdf]', e)
  }

  const permitForPdf = {
    id: permitId,
    status,
    ...packageDraft,
    workPermissions: bundle,
  } as Permit

  try {
    const packagePdf = await buildSigningPackagePdf(
      permitForPdf,
      resolveUser,
      userDirectory,
    )
    await updatePermit(permitId, { packagePdf, workPermissions: bundle })
  } catch (e) {
    console.error('[signing-package-pdf]', e)
    await updatePermit(permitId, { workPermissions: bundle })
  }

  if (status === 'draft') {
    try {
      await transition(permitId, 'on_approval')
    } catch {
      /* наряд уже на согласовании */
    }
  }

  return { permitId, bundle }
}

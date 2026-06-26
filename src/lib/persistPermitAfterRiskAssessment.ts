import type { DemoUser, Permit, PermitDraft, PermitStatus } from '../types/domain'
import type { AsorForm } from '../types/asor'
import type { PprForm } from '../types/ppr'
import { applyAsorToPermitDraft } from './asorPrefill'
import { seedApprovalNamesFromPermit } from './approvalSequence'
import { renderWorkPermissionsBundle } from './buildWorkPermissionPdf'
import { buildSigningPackagePdf } from './buildSigningPackagePdf'
import { finalizeAsorFormForReady } from './finalizeGeneratedRiskDocs'
import { resolveUserBadgeNo } from './userBadgeNumbers'
import {
  packageDraftToPermitFields,
  readResumePermitId,
  writeResumePermitId,
} from './resumePermitPackage'
import { enrichWorkPermissionsBundle, initializeWorkPermissionsBundle } from './workPermissions'
import type { WorkPermissionsBundle } from '../types/workPermissions'

export type PersistPermitAfterRiskDeps = {
  draft: PermitDraft
  form: AsorForm
  ppr: PprForm | undefined
  existingStatus?: PermitStatus
  createPermit: (draft: PermitDraft) => Promise<Permit>
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  transition: (id: string, next: PermitStatus) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
}

/** Сохраняет наряд после шага «Оценка риска» и переводит на согласование для доступа ERT. */
export async function persistPermitAfterRiskAssessment(
  deps: PersistPermitAfterRiskDeps,
): Promise<{ permitId: string; bundle: WorkPermissionsBundle }> {
  const {
    draft,
    form,
    ppr,
    existingStatus,
    createPermit,
    updatePermit,
    transition,
    resolveUser,
    userDirectory,
  } = deps

  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, userDirectory)
  const asorWithApprovers = finalizeAsorFormForReady(
    seedApprovalNamesFromPermit(form, draft, resolveUser, resolveBadge),
    ppr,
  )
  const abrShift =
    draft.f02.shift ||
    (asorWithApprovers.abr?.shiftNight
      ? 'night'
      : asorWithApprovers.abr?.shiftDay
        ? 'day'
        : '')

  let packageDraft = applyAsorToPermitDraft(draft, asorWithApprovers)
  packageDraft = {
    ...packageDraft,
    title: draft.title.trim() || packageDraft.title,
    workStages: draft.workStages,
    workDescription:
      draft.workStages.trim() ||
      draft.workDescription.trim() ||
      packageDraft.workDescription,
    ppr,
    asor: asorWithApprovers,
    f02: { ...packageDraft.f02, shift: abrShift },
    f04: draft.permitType === 'cold' ? undefined : draft.f04,
    isContractorPermit: false,
    performerUid: draft.performerUid,
    registrationRefNo:
      draft.registrationRefNo.trim() || packageDraft.registrationRefNo,
  }

  let bundle = initializeWorkPermissionsBundle(packageDraft, ppr)
  bundle = enrichWorkPermissionsBundle(packageDraft, bundle)
  packageDraft = { ...packageDraft, workPermissions: bundle }

  const resumePermitId = readResumePermitId()
  let permitId: string
  let status: PermitStatus = existingStatus ?? 'draft'

  if (resumePermitId) {
    await updatePermit(resumePermitId, packageDraftToPermitFields(packageDraft))
    permitId = resumePermitId
  } else {
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

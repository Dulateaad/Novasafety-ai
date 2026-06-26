import type { NavigateFunction } from 'react-router-dom'
import type { DemoUser, Permit, PermitDraft } from '../types/domain'
import type { AsorForm } from '../types/asor'
import type { PprForm } from '../types/ppr'
import { clearPackageSession } from './packageSession'
import { packageDraftToPermitFields } from './resumePermitPackage'
import { readResumePermitId } from './resumePermitPackage'

export type SubmitPackageDeps = {
  packageDraft: PermitDraft
  createPermit: (draft: PermitDraft) => Promise<Permit>
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  transition: (id: string, status: Permit['status']) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  nav: NavigateFunction
}

export async function executeNdprPackageSubmit(
  deps: SubmitPackageDeps,
): Promise<{ provisionWarning: string | null; permitId: string }> {
  const {
    packageDraft,
    createPermit,
    updatePermit,
    transition,
    resolveUser,
    userDirectory,
  } = deps

  const resumePermitId = readResumePermitId()
  let p: Permit
  if (resumePermitId) {
    await updatePermit(resumePermitId, packageDraftToPermitFields(packageDraft))
    p = { id: resumePermitId, ...packageDraft } as Permit
  } else {
    p = await createPermit(packageDraft)
  }

  const { buildSigningPackagePdf } = await import('./buildSigningPackagePdf')
  const packagePdf = await buildSigningPackagePdf(p, resolveUser, userDirectory)
  await updatePermit(p.id, { packagePdf })
  await transition(p.id, 'on_approval')

  let provisionWarning: string | null = null
  try {
    const { provisionPermitSignersClient } = await import('./provisionSigners')
    const result = await provisionPermitSignersClient(p.id)
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
  return { provisionWarning, permitId: p.id }
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

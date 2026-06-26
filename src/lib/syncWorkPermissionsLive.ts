import type { DemoUser, Permit } from '../types/domain'
import type {
  WorkPermissionDocument,
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'
import { renderSingleWorkPermission, renderWorkPermissionsBundle } from './buildWorkPermissionPdf'
import { buildSigningPackagePdf } from './buildSigningPackagePdf'
import { enrichWorkPermissionsBundle } from './workPermissions'
import { permitToPermitDraft } from './resumePermitPackage'

/** Пересборка PDF разрешений и (опционально) полного пакета после live-изменений. */
export async function syncWorkPermissionsLive(args: {
  permit: Permit
  bundle: WorkPermissionsBundle
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  /** Пересобрать только указанные виды (быстрее при газотесте / закрытии). */
  renderKinds?: WorkPermissionKind[]
  /** Пересобрать packagePdf (по умолчанию — только при полной пересборке всех разрешений). */
  rebuildPackage?: boolean
}): Promise<WorkPermissionsBundle> {
  const { permit, updatePermit, resolveUser, userDirectory, renderKinds } = args
  let documents = enrichWorkPermissionsBundle(
    permitToPermitDraft(permit),
    args.bundle,
  ).documents

  const kindsToRender = renderKinds?.length ? new Set(renderKinds) : null

  if (kindsToRender) {
    documents = await Promise.all(
      documents.map(async (doc) =>
        kindsToRender.has(doc.kind) ? await renderSingleWorkPermission(doc) : doc,
      ),
    )
  } else {
    documents = await renderWorkPermissionsBundle(documents)
  }

  const bundle: WorkPermissionsBundle = {
    documents,
    updatedAtIso: new Date().toISOString(),
  }

  const shouldRebuildPackage =
    args.rebuildPackage ?? (kindsToRender === null)

  const patch: Partial<Permit> = { workPermissions: bundle }
  if (shouldRebuildPackage) {
    const permitPatched: Permit = { ...permit, workPermissions: bundle }
    patch.packagePdf = await buildSigningPackagePdf(
      permitPatched,
      resolveUser,
      userDirectory,
    )
  }

  await updatePermit(permit.id, patch)

  return bundle
}

export function patchWorkPermissionDocument(
  bundle: WorkPermissionsBundle,
  kind: WorkPermissionKind,
  patch: Partial<WorkPermissionDocument>,
): WorkPermissionsBundle {
  return {
    updatedAtIso: new Date().toISOString(),
    documents: bundle.documents.map((d) =>
      d.kind === kind ? { ...d, ...patch, form: { ...d.form, ...patch.form } } : d,
    ),
  }
}

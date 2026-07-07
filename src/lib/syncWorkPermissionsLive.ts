import type { DemoUser, Permit } from '../types/domain'
import type {
  WorkPermissionDocument,
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'
import { renderSingleWorkPermission, renderWorkPermissionsBundle } from './buildWorkPermissionPdf'
import { buildSigningPackagePdf } from './buildSigningPackagePdf'
import { gasTestReadingFilled } from './ertGasTestHints'
import { enrichWorkPermissionsBundle } from './workPermissions'

function documentGasTestsFilled(doc: WorkPermissionDocument): boolean {
  return (doc.gasTests ?? []).some(gasTestReadingFilled)
}

/** Не затирать газотест ERT при сохранении проверок допускающего / подписей со stale bundle. */
function mergeGasTestsFromServerPermit(
  permit: Permit,
  bundle: WorkPermissionsBundle,
): WorkPermissionsBundle {
  const serverDocs = permit.workPermissions?.documents ?? []
  if (!serverDocs.length) {
    return {
      ...bundle,
      documents: bundle.documents.map((doc) => ({
        ...doc,
        gasTests: doc.gasTests ?? [],
      })),
    }
  }
  return {
    ...bundle,
    documents: bundle.documents.map((doc) => {
      const serverDoc = serverDocs.find((d) => d.kind === doc.kind)
      const localGasTests = doc.gasTests ?? []
      if (!serverDoc) return { ...doc, gasTests: localGasTests }
      const serverGasTests = serverDoc.gasTests ?? []
      if (documentGasTestsFilled({ ...doc, gasTests: localGasTests })) {
        return { ...doc, gasTests: localGasTests }
      }
      if (documentGasTestsFilled({ ...doc, gasTests: serverGasTests })) {
        return { ...doc, gasTests: serverGasTests }
      }
      return { ...doc, gasTests: localGasTests.length ? localGasTests : serverGasTests }
    }),
  }
}

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
  const mergedBundle = mergeGasTestsFromServerPermit(permit, args.bundle)
  let documents = enrichWorkPermissionsBundle(permit, mergedBundle).documents

  const kindsToRender = renderKinds?.length ? new Set(renderKinds) : null
  const pdfOpts = {
    includeClosureSection: permit.status === 'closed',
  }

  if (kindsToRender) {
    documents = await Promise.all(
      documents.map(async (doc) =>
        kindsToRender.has(doc.kind) ? await renderSingleWorkPermission(doc, pdfOpts) : doc,
      ),
    )
  } else {
    documents = await renderWorkPermissionsBundle(documents, pdfOpts)
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
      d.kind === kind
        ? {
            ...d,
            ...patch,
            gasTests: patch.gasTests ?? d.gasTests ?? [],
            form: { ...d.form, ...patch.form },
          }
        : d,
    ),
  }
}

import { openPdfInBrowser } from './pdfPreview'
import type { Permit } from '../types/domain'
import type { WorkPermissionDocument } from '../types/workPermissions'
import { buildWorkPermissionPdf } from './buildWorkPermissionPdf'

export function workPermissionPdfOptsForPermit(
  permit?: Pick<Permit, 'status'>,
): { includeClosureSection: boolean } {
  return { includeClosureSection: permit?.status === 'closed' }
}

/** Открыть PDF разрешения с актуальными данными (газотесты, закрытие и т.д.). */
export async function openWorkPermissionPdf(
  doc: WorkPermissionDocument,
  permit?: Pick<Permit, 'status'>,
): Promise<void> {
  const { base64, fileName } = await buildWorkPermissionPdf(
    doc,
    undefined,
    workPermissionPdfOptsForPermit(permit),
  )
  openPdfInBrowser(base64, doc.title || fileName)
}

import { openPdfInBrowser } from './pdfPreview'
import type { WorkPermissionDocument } from '../types/workPermissions'
import { buildWorkPermissionPdf } from './buildWorkPermissionPdf'

/** Открыть PDF разрешения с актуальными данными (газотесты и т.д.). */
export async function openWorkPermissionPdf(doc: WorkPermissionDocument): Promise<void> {
  const { base64, fileName } = await buildWorkPermissionPdf(doc)
  openPdfInBrowser(base64, doc.title || fileName)
}

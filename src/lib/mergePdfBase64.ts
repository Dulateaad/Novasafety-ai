import { PDFDocument } from 'pdf-lib'

/** Объединяет несколько PDF (base64) в один документ по порядку. */
export async function mergePdfBase64(parts: string[]): Promise<string> {
  const merged = await PDFDocument.create()
  for (const part of parts) {
    if (!part?.trim()) continue
    const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0))
    const doc = await PDFDocument.load(bytes)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }
  const out = await merged.save()
  let binary = ''
  out.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

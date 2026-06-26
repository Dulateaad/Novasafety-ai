import type { PdfMakeInstance } from 'pdfmake/build/pdfmake'

let pdfEngineReady: Promise<PdfMakeInstance> | null = null

/** Roboto из vfs_fonts — полная поддержка кириллицы в pdfmake 0.3. */
export const PDFMAKE_ROBOTO_FONTS = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
} as const

export async function initPdfMake(): Promise<PdfMakeInstance> {
  if (!pdfEngineReady) {
    pdfEngineReady = (async () => {
      const pdfMakeModule = await import('pdfmake/build/pdfmake')
      const vfsModule = await import('pdfmake/build/vfs_fonts')
      const pdfMake = pdfMakeModule.default as PdfMakeInstance & {
        addFonts?: (fonts: typeof PDFMAKE_ROBOTO_FONTS) => void
      }
      const vfs = vfsModule.default

      if (vfs && typeof pdfMake.addVirtualFileSystem === 'function') {
        pdfMake.addVirtualFileSystem(vfs)
      } else if (vfs) {
        pdfMake.vfs = vfs
      }

      pdfMake.addFonts?.(PDFMAKE_ROBOTO_FONTS)

      return pdfMake
    })()
  }
  return pdfEngineReady
}

export function preloadPdfMakeEngine(): void {
  void initPdfMake()
}

/** pdfmake 0.3+: getBase64() → Promise; старые версии — callback. */
export async function pdfBase64Async(
  pdfMake: PdfMakeInstance,
  docDefinition: Record<string, unknown>,
): Promise<string> {
  const pdfDoc = pdfMake.createPdf(docDefinition)
  const result = pdfDoc.getBase64()

  if (result instanceof Promise) {
    return result
  }

  return new Promise((resolve, reject) => {
    try {
      ;(pdfDoc.getBase64 as (cb: (data: string) => void) => void)((data: string) =>
        resolve(data),
      )
    } catch (e) {
      reject(e)
    }
  })
}

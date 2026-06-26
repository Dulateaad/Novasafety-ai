declare module 'pdfmake/build/pdfmake' {
  export interface PdfDocument {
    getBase64(): Promise<string> | void
    getBase64(callback: (data: string) => void): void
  }

  export interface PdfMakeInstance {
    vfs?: Record<string, string>
    addVirtualFileSystem?(vfs: Record<string, string>): void
    createPdf(docDefinition: Record<string, unknown>): PdfDocument
  }

  const pdfMake: PdfMakeInstance
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>
  export default vfs
}

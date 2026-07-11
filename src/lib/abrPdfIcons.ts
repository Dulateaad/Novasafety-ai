const ABR_ICON_FILES = [
  'image1.png',
  'image2.png',
  'image3.png',
  'image4.png',
  'image5.png',
  'image6.png',
  'image7.png',
  'image8.png',
  'image9.png',
  'image10.png',
] as const

let cached: string[] | null = null

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Пиктограммы категорий опасностей (без логотипа компании). */
export async function loadAbrPdfIcons(): Promise<string[]> {
  if (cached) return cached
  cached = await Promise.all(
    ABR_ICON_FILES.map(async (file) => {
      const res = await fetch(`/assets/abr/${file}`)
      if (!res.ok) throw new Error(`Не найдена иконка АБР: ${file}`)
      return blobToDataUrl(await res.blob())
    }),
  )
  return cached
}

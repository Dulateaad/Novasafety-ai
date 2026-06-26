import type { PermitSitePhoto } from '../types/sitePhoto'
import { SITE_PHOTO_MAX_BYTES, SITE_PHOTO_MAX_COUNT } from '../types/sitePhoto'
import { formatFileSize } from './pprAttachment'

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.82

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'))
    img.src = dataUrl
  })
}

/** Сжимает фото для хранения в Firestore / sessionStorage. */
export async function compressSitePhotoFile(file: File): Promise<{
  dataUrl: string
  mimeType: PermitSitePhoto['mimeType']
  sizeBytes: number
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите изображение (JPEG, PNG, WebP).')
  }
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') reject(new Error('Ошибка чтения'))
      else resolve(reader.result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Ошибка чтения'))
    reader.readAsDataURL(file)
  })

  const img = await loadImage(raw)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен')
  ctx.drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const sizeBytes = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75)
  if (sizeBytes > SITE_PHOTO_MAX_BYTES) {
    throw new Error(
      `Фото слишком большое (${formatFileSize(sizeBytes)}). Сделайте снимок ближе или уменьшите качество.`,
    )
  }
  return { dataUrl, mimeType: 'image/jpeg', sizeBytes }
}

export function normalizeSitePhotos(raw: unknown): PermitSitePhoto[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((o) => {
      const dataUrl = typeof o.dataUrl === 'string' ? o.dataUrl.trim() : ''
      if (!dataUrl.startsWith('data:image/')) return null
      const mime = dataUrl.slice(5, dataUrl.indexOf(';'))
      const mimeType: PermitSitePhoto['mimeType'] =
        mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg'
      return {
        id:
          typeof o.id === 'string' && o.id.trim()
            ? o.id
            : crypto.randomUUID(),
        caption: typeof o.caption === 'string' ? o.caption : '',
        mimeType,
        sizeBytes: typeof o.sizeBytes === 'number' ? o.sizeBytes : 0,
        capturedAtIso:
          typeof o.capturedAtIso === 'string'
            ? o.capturedAtIso
            : new Date().toISOString(),
        dataUrl,
      }
    })
    .filter((x): x is PermitSitePhoto => x !== null)
    .slice(0, SITE_PHOTO_MAX_COUNT)
}

export async function sitePhotoFromFile(file: File, caption = ''): Promise<PermitSitePhoto> {
  const compressed = await compressSitePhotoFile(file)
  return {
    id: crypto.randomUUID(),
    caption: caption.trim(),
    ...compressed,
    capturedAtIso: new Date().toISOString(),
  }
}

export function canAddSitePhoto(photos: PermitSitePhoto[]): boolean {
  return photos.length < SITE_PHOTO_MAX_COUNT
}

/** Фото места проведения работ (при оформлении наряда). */
export interface PermitSitePhoto {
  id: string
  caption: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  capturedAtIso: string
  /** data:image/jpeg;base64,... */
  dataUrl: string
}

export const SITE_PHOTO_MAX_COUNT = 6
export const SITE_PHOTO_MAX_BYTES = 900_000

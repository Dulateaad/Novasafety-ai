import type { WorkStopPhoto } from '../types/workStop'
import { compressSitePhotoFile } from './sitePhotos'

export async function workStopPhotoFromFile(file: File): Promise<WorkStopPhoto> {
  const { dataUrl, mimeType } = await compressSitePhotoFile(file)
  const comma = dataUrl.indexOf(',')
  const dataBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return {
    dataBase64,
    mimeType,
    fileName: file.name || 'work-stop-photo.jpg',
  }
}

export function workStopPhotoDataUrl(photo: WorkStopPhoto): string {
  return `data:${photo.mimeType};base64,${photo.dataBase64}`
}

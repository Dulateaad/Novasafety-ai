import {
  PPR_ATTACHMENT_MAX_BYTES,
  type PprAttachment,
} from '../types/ppr'
import { openPdfInBrowser, pdfTabTitleFromFileName } from './pdfPreview'

const MIME_BY_EXT: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
}

export function guessMimeType(fileName: string, fallback: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? fallback
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Не удалось прочитать файл'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Ошибка чтения файла'))
    reader.readAsDataURL(file)
  })
}

/** Читает doc/docx/pdf и возвращает объект для сохранения в ППР. */
export async function readPprAttachmentFile(file: File): Promise<PprAttachment> {
  if (file.size > PPR_ATTACHMENT_MAX_BYTES) {
    throw new Error(
      `Файл слишком большой (${formatFileSize(file.size)}). Максимум ${formatFileSize(PPR_ATTACHMENT_MAX_BYTES)}.`,
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['doc', 'docx', 'pdf'].includes(ext)) {
    throw new Error('Допустимы только файлы .doc, .docx или .pdf')
  }

  const dataUrl = await readFileAsDataUrl(file)
  const comma = dataUrl.indexOf(',')
  const dataBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl

  return {
    fileName: file.name,
    mimeType: file.type.trim() || guessMimeType(file.name, 'application/octet-stream'),
    sizeBytes: file.size,
    uploadedAtIso: new Date().toISOString(),
    dataBase64,
  }
}

/** Открыть вложение ППР в новой вкладке (PDF — просмотр, doc/docx — скачивание). */
export function openPprAttachmentInBrowser(att: PprAttachment): boolean {
  const isPdf =
    att.mimeType === 'application/pdf' ||
    att.fileName.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    return openPdfInBrowser(att.dataBase64, pdfTabTitleFromFileName(att.fileName))
  }

  downloadPprAttachment(att)
  return true
}

export function downloadPprAttachment(att: PprAttachment): void {
  const binary = atob(att.dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: att.mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = att.fileName
  a.click()
  URL.revokeObjectURL(url)
}

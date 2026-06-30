import { useRef, useState } from 'react'
import {
  downloadPprAttachment,
  formatFileSize,
  readPprAttachmentFile,
} from '../lib/pprAttachment'
import { PPR_ATTACHMENT_ACCEPT, type PprAttachment } from '../types/ppr'
import { LoadingProgress } from './LoadingProgress'
import { AiDisclaimerNotice } from './AiDisclaimerNotice'
import { useLanguage } from '../context/LanguageContext'

export function PprDocumentUpload(props: {
  attachment?: PprAttachment
  onAttachmentChange: (attachment: PprAttachment | undefined) => void
  /** Repeat upload block at form bottom — without long description. */
  compact?: boolean
}) {
  const { t } = useLanguage()
  const u = t.pprUpload
  const { attachment, onAttachmentChange, compact = false } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function processFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const att = await readPprAttachmentFile(file)
      onAttachmentChange(att)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await processFile(file)
  }

  function removeAttachment() {
    onAttachmentChange(undefined)
    setError(null)
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    dragDepthRef.current += 1
    setDragOver(true)
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setDragOver(false)
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    e.dataTransfer.dropEffect = 'copy'
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setDragOver(false)
    if (busy) return
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  function openFilePicker() {
    if (!busy) inputRef.current?.click()
  }

  return (
    <fieldset className="fieldset ppr-upload">
      <legend>{t.branding.sourceDocument}</legend>
      {!compact && (
        <p className="muted xsmall" style={{ marginTop: 0 }}>
          {u.description}
        </p>
      )}

      <div
        className={`ppr-upload__dropzone${dragOver ? ' ppr-upload__dropzone--active' : ''}${attachment ? ' ppr-upload__dropzone--has-file' : ''}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={attachment ? undefined : openFilePicker}
        onKeyDown={
          attachment
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openFilePicker()
                }
              }
        }
        role={attachment ? undefined : 'button'}
        tabIndex={attachment ? undefined : 0}
        aria-label={attachment ? undefined : u.dropHint}
      >
        {attachment ? (
          <div className="ppr-upload__file">
            <div className="strong small">{attachment.fileName}</div>
            <p className="muted xsmall" style={{ margin: '0.25rem 0 0.5rem' }}>
              {formatFileSize(attachment.sizeBytes)} · загружен{' '}
              {new Date(attachment.uploadedAtIso).toLocaleString()}
            </p>
            <p className="muted xsmall" style={{ margin: '0 0 0.5rem' }}>
              {u.replaceDropHint}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost small"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadPprAttachment(attachment)
                }}
              >
                {t.common.download}
              </button>
              <button
                type="button"
                className="btn ghost small"
                onClick={(e) => {
                  e.stopPropagation()
                  openFilePicker()
                }}
              >
                {u.replace}
              </button>
              <button
                type="button"
                className="btn ghost small"
                onClick={(e) => {
                  e.stopPropagation()
                  removeAttachment()
                }}
              >
                {t.common.remove}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="ppr-upload__dropzone-title">
              {dragOver ? u.release : u.dropHere}
            </p>
            <p className="muted xsmall ppr-upload__dropzone-hint">
              {u.fileTypesHint}
            </p>
            <button
              type="button"
              className="btn primary small"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                openFilePicker()
              }}
            >
              {busy ? t.common.loading : u.selectFile}
            </button>
          </>
        )}
      </div>

      <AiDisclaimerNotice />

      <input
        ref={inputRef}
        type="file"
        accept={PPR_ATTACHMENT_ACCEPT}
        hidden
        onChange={onFileChange}
      />

      {busy && (
        <LoadingProgress label={u.uploading} indeterminate withTips fullscreen />
      )}

      {error && (
        <div className="alert error" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </div>
      )}
    </fieldset>
  )
}

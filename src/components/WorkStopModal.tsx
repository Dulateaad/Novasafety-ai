import { useRef, useState } from 'react'
import type { WorkStopPhoto } from '../types/workStop'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import { workStopPhotoFromFile, workStopPhotoDataUrl } from '../lib/workStopPhoto'
import { useLanguage } from '../context/LanguageContext'
import { WorkStopReasonField } from './WorkStopReasonField'

export function WorkStopModal(props: {
  open: boolean
  busy: boolean
  onClose: () => void
  onSubmit: (reason: string, photo?: WorkStopPhoto) => void
}) {
  const { open, busy, onClose, onSubmit } = props
  const { t } = useLanguage()
  const ws = t.workStop
  const c = t.common
  const [reason, setReason] = useState('')
  const [photo, setPhoto] = useState<WorkStopPhoto | undefined>()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const trimmed = reason.trim()
  const canSubmit = trimmed.length >= 3 && !busy && !photoBusy

  async function ingest(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      setPhoto(await workStopPhotoFromFile(file))
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : String(e))
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleClose() {
    setReason('')
    setPhoto(undefined)
    setPhotoError(null)
    onClose()
  }

  return (
    <div
      className="work-stop-modal-backdrop"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="work-stop-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-stop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="work-stop-modal__hero">
          <span className="work-stop-modal__hero-icon" aria-hidden>
            ⏸
          </span>
          <div className="work-stop-modal__hero-text">
            <span className="work-stop-modal__eyebrow">Экстренный сигнал</span>
            <h2 id="work-stop-title" className="work-stop-modal__title">
              {ws.modalTitle}
            </h2>
            <p className="work-stop-modal__desc">
              Укажите причину остановки. {INSPECTOR_ROLE_TITLE} получит уведомление и примет
              решение: аннулировать наряд или вернуть в работу.
            </p>
          </div>
        </header>

        <div className="work-stop-modal__body">
          <WorkStopReasonField
            id="work-stop-reason"
            label="Причина остановки *"
            placeholder={ws.reasonPlaceholder}
            value={reason}
            disabled={busy}
            rows={5}
            onChange={setReason}
          />

          <div className="work-stop-modal__photo">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={(e) => void ingest(e.target.files?.[0])}
            />
            {!photo ? (
              <button
                type="button"
                className="work-stop-modal__photo-zone"
                disabled={busy || photoBusy}
                onClick={() => fileRef.current?.click()}
              >
                <span className="work-stop-modal__photo-zone-title">
                  {photoBusy ? c.loading : ws.photoCapture}
                </span>
                <span className="work-stop-modal__photo-zone-hint">
                  JPEG, PNG или WebP · необязательно
                </span>
              </button>
            ) : (
              <figure className="work-stop-modal__photo-preview">
                <img src={workStopPhotoDataUrl(photo)} alt={ws.photoAlt} />
              </figure>
            )}
            {photo ? (
              <div className="work-stop-modal__photo-actions">
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={busy || photoBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  {ws.photoReplace}
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={busy}
                  onClick={() => setPhoto(undefined)}
                >
                  {c.remove}
                </button>
              </div>
            ) : null}
            {photoError ? <p className="work-stop-modal__error">{photoError}</p> : null}
          </div>

          <div className="work-stop-modal__actions">
            <button
              type="button"
              className="btn work-stop-modal__submit"
              disabled={!canSubmit}
              onClick={() => onSubmit(trimmed, photo)}
            >
              {busy ? ws.submitting : ws.submit}
            </button>
            <button type="button" className="btn ghost" disabled={busy} onClick={handleClose}>
              {c.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

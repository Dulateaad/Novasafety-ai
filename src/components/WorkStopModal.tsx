import { useRef, useState } from 'react'
import type { WorkStopPhoto } from '../types/workStop'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import { workStopPhotoFromFile, workStopPhotoDataUrl } from '../lib/workStopPhoto'

export function WorkStopModal(props: {
  open: boolean
  busy: boolean
  onClose: () => void
  onSubmit: (reason: string, photo?: WorkStopPhoto) => void
}) {
  const { open, busy, onClose, onSubmit } = props
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
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="modal card"
        role="dialog"
        aria-labelledby="work-stop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="work-stop-title" style={{ marginTop: 0 }}>
          Остановить работу
        </h2>
        <p className="muted small">
          Укажите причину остановки. {INSPECTOR_ROLE_TITLE} получит уведомление и примет
          решение: аннулировать наряд или вернуть в работу.
        </p>

        <label className="field">
          <span className="field-label">Причина *</span>
          <textarea
            rows={4}
            value={reason}
            disabled={busy}
            placeholder="Опишите опасную ситуацию или нарушение…"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        <div style={{ marginTop: '0.75rem' }}>
          <div className="btn-row">
            <button
              type="button"
              className="btn ghost small"
              disabled={busy || photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              {photoBusy ? 'Загрузка…' : photo ? 'Заменить фото' : 'Приложить фото'}
            </button>
            {photo ? (
              <button
                type="button"
                className="btn ghost small"
                disabled={busy}
                onClick={() => setPhoto(undefined)}
              >
                Убрать фото
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            onChange={(e) => void ingest(e.target.files?.[0])}
          />
          {photo ? (
            <img
              src={workStopPhotoDataUrl(photo)}
              alt="Фото к остановке работ"
              style={{
                marginTop: '0.5rem',
                maxWidth: '100%',
                maxHeight: '160px',
                borderRadius: '8px',
              }}
            />
          ) : null}
          {photoError ? (
            <p className="small" style={{ color: 'var(--danger)', marginTop: '0.35rem' }}>
              {photoError}
            </p>
          ) : null}
        </div>

        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="btn primary"
            disabled={!canSubmit}
            onClick={() => onSubmit(trimmed, photo)}
          >
            {busy ? 'Отправка…' : 'Остановить работу'}
          </button>
          <button type="button" className="btn ghost" disabled={busy} onClick={handleClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

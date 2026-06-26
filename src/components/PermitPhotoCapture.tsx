import { useRef, useState } from 'react'
import type { PermitSitePhoto } from '../types/sitePhoto'
import { SITE_PHOTO_MAX_COUNT } from '../types/sitePhoto'
import { canAddSitePhoto, sitePhotoFromFile } from '../lib/sitePhotos'
import { formatFileSize } from '../lib/pprAttachment'
import { useLanguage } from '../context/LanguageContext'

export function PermitPhotoCapture(props: {
  photos: PermitSitePhoto[]
  onChange: (photos: PermitSitePhoto[]) => void
  disabled?: boolean
}) {
  const { photos, onChange, disabled } = props
  const { t } = useLanguage()
  const p = t.photo
  const c = t.common
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function ingest(file: File | undefined) {
    if (!file || disabled || !canAddSitePhoto(photos)) return
    setBusy(true)
    setError(null)
    try {
      const photo = await sitePhotoFromFile(file)
      onChange([...photos, photo])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (galleryRef.current) galleryRef.current.value = ''
    }
  }

  function remove(id: string) {
    onChange(photos.filter((p) => p.id !== id))
  }

  function patchCaption(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)))
  }

  return (
    <fieldset className="fieldset">
      <legend>{p.siteAlt}</legend>
      <p className="small muted" style={{ marginTop: 0 }}>
        {p.capture} · {SITE_PHOTO_MAX_COUNT}
      </p>

      <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          className="btn primary small"
          disabled={disabled || busy || !canAddSitePhoto(photos)}
          onClick={() => cameraRef.current?.click()}
        >
          {busy ? p.processing : p.capture}
        </button>
        <button
          type="button"
          className="btn ghost small"
          disabled={disabled || busy || !canAddSitePhoto(photos)}
          onClick={() => galleryRef.current?.click()}
        >
          {c.upload}
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void ingest(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => void ingest(e.target.files?.[0])}
      />

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="muted xsmall">{c.na}</p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-card card">
              <img src={photo.dataUrl} alt={photo.caption || p.siteAlt} />
              <label className="small">
                {p.captionPlaceholder}
                <input
                  type="text"
                  value={photo.caption}
                  disabled={disabled}
                  placeholder={p.captionPlaceholder}
                  onChange={(e) => patchCaption(photo.id, e.target.value)}
                />
              </label>
              <div className="muted xsmall">
                {formatFileSize(photo.sizeBytes)} ·{' '}
                {new Date(photo.capturedAtIso).toLocaleString()}
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => remove(photo.id)}
                >
                  {c.remove}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </fieldset>
  )
}

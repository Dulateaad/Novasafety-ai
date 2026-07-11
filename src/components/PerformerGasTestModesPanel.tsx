import { useCallback, useEffect, useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import { GasTestModesFields } from './GasTestModesFields'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { isPermitProducer } from '../lib/closeNdprEarly'
import { patchWorkPermissionDocument, syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import type { WorkPermissionKind, WorkPermissionsBundle } from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'
import { LoadingProgress } from './LoadingProgress'

const EDIT_STATUSES = new Set<Permit['status']>(['on_approval', 'issued', 'in_progress', 'suspended'])

export function PerformerGasTestModesPanel(props: {
  permit: Permit
  actor: DemoUser
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  refresh?: () => Promise<void>
}) {
  const { permit, actor, updatePermit, resolveUser, userDirectory, refresh } = props
  const { t } = useLanguage()
  const wp = t.workPermission
  const c = t.common
  const serverBundle = permit.workPermissions
  const canEdit = isPermitProducer(permit, actor, userDirectory) && EDIT_STATUSES.has(permit.status)
  const [localBundle, setLocalBundle] = useState<WorkPermissionsBundle | null>(serverBundle ?? null)
  const [dirty, setDirty] = useState(false)
  const [dirtyKinds, setDirtyKinds] = useState<WorkPermissionKind[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (dirty) return
    setLocalBundle(serverBundle ?? null)
  }, [serverBundle, permit.id, dirty])

  const flush = useCallback(async () => {
    if (!localBundle || !dirty) return
    setBusy(true)
    setStatus(wp.updatingPermPdf)
    try {
      const updated = await syncWorkPermissionsLive({
        permit,
        bundle: localBundle,
        updatePermit,
        resolveUser,
        userDirectory,
        renderKinds: dirtyKinds.length ? dirtyKinds : undefined,
      })
      setLocalBundle(updated)
      setDirty(false)
      setDirtyKinds([])
      if (refresh) await refresh()
      setStatus(wp.savedPermPdf)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 4000)
    }
  }, [localBundle, dirty, dirtyKinds, permit, updatePermit, resolveUser, userDirectory, refresh, wp])

  if (actor.role !== 'performer') return null
  if (!localBundle?.documents?.length) return null

  const visibleDocs = localBundle.documents.filter(
    (doc) => WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests,
  )
  if (!visibleDocs.length) return null

  function patchLocal(kind: WorkPermissionKind, patch: Parameters<typeof patchWorkPermissionDocument>[2]) {
    setLocalBundle((prev) => {
      if (!prev) return prev
      return patchWorkPermissionDocument(prev, kind, patch)
    })
    setDirty(true)
    setDirtyKinds((prev) => (prev.includes(kind) ? prev : [...prev, kind]))
  }

  return (
    <section className="card work-perm-ert-panel" style={{ marginBottom: '1rem' }}>
      <header className="work-perm-ert-panel__head">
        <h2 style={{ margin: 0 }}>1. Заявка — виды газотеста</h2>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          Заполняет производитель работ (раздел 1 PDF разрешения).
        </p>
      </header>
      {visibleDocs.map((doc) => (
        <div key={doc.kind} className="work-perm-ert-panel__doc">
          <div className="work-perm-ert-panel__doc-head">
            <WorkPermissionIcon kind={doc.kind} size={20} />
            <span className="strong">{doc.title}</span>
          </div>
          <GasTestModesFields
            form={doc.form}
            disabled={!canEdit}
            onChange={(partial) =>
              patchLocal(doc.kind, { form: { ...doc.form, ...partial } })
            }
          />
        </div>
      ))}
      {canEdit ? (
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn primary small"
            disabled={!dirty || busy}
            onClick={() => void flush()}
          >
            {busy ? c.saving : 'Сохранить в PDF'}
          </button>
        </div>
      ) : null}
      {busy ? <LoadingProgress label={status ?? c.saving} indeterminate /> : null}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import { GasTestResultsTable } from './GasTestResultsTable'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import {
  canErtEditGasTests,
  ertGasTestBlockedHint,
  gasTestDocFilled,
} from '../lib/ertGasTestHints'
import { openWorkPermissionPdf } from '../lib/openWorkPermissionPdf'
import { patchWorkPermissionDocument, syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import {
  emptyGasTestReading,
  type GasTestReading,
  type WorkPermissionKind,
  type WorkPermissionsBundle,
} from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'
import { LoadingProgress } from './LoadingProgress'

export function ErtGasTestLivePanel(props: {
  permit: Permit
  actor: DemoUser
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  focusKind?: WorkPermissionKind | null
  onSaved?: (bundle: WorkPermissionsBundle) => void
  refresh?: () => Promise<void>
}) {
  const { t } = useLanguage()
  const wp = t.workPermission
  const gt = t.gasTest
  const c = t.common
  const {
    permit,
    actor,
    updatePermit,
    resolveUser,
    userDirectory,
    focusKind,
    onSaved,
    refresh,
  } = props
  const serverBundle = permit.workPermissions
  const isErt = actor.role === 'ert'
  const canEdit = isErt && canErtEditGasTests(permit)
  const [localBundle, setLocalBundle] = useState<WorkPermissionsBundle | null>(serverBundle ?? null)
  const [dirty, setDirty] = useState(false)
  const [dirtyKinds, setDirtyKinds] = useState<WorkPermissionKind[]>([])
  const [busy, setBusy] = useState(false)
  const [viewingKind, setViewingKind] = useState<WorkPermissionKind | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

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
        rebuildPackage: true,
      })
      setLocalBundle(updated)
      setDirty(false)
      setDirtyKinds([])
      onSaved?.(updated)
      if (refresh) await refresh()
      setLastSavedAt(Date.now())
      setStatus(wp.savedPermPdf)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 4000)
    }
  }, [
    localBundle,
    dirty,
    dirtyKinds,
    permit,
    updatePermit,
    resolveUser,
    userDirectory,
    onSaved,
    refresh,
    wp,
  ])

  if (!localBundle?.documents?.length) return null
  if (!isErt) return null
  if (!canErtEditGasTests(permit)) return null

  const visibleDocs = localBundle.documents.filter((doc) => {
    const meta = WORK_PERMISSION_BY_KIND[doc.kind]
    if (!meta.requiresGasTests) return false
    if (!focusKind) return true
    return doc.kind === focusKind
  })

  if (visibleDocs.length === 0) return null

  function patchLocal(kind: WorkPermissionKind, patch: Parameters<typeof patchWorkPermissionDocument>[2]) {
    setLocalBundle((prev) => {
      if (!prev) return prev
      return patchWorkPermissionDocument(prev, kind, patch)
    })
    setDirty(true)
    setDirtyKinds((prev) => (prev.includes(kind) ? prev : [...prev, kind]))
  }

  function onGasChange(kind: WorkPermissionKind, id: string, patch: Partial<GasTestReading>) {
    const doc = localBundle!.documents.find((d) => d.kind === kind)!
    const gasTests = (doc.gasTests ?? []).map((r) => {
      if (r.id !== id) return r
      const merged = { ...r, ...patch }
      merged.testerUid = actor.id
      merged.testerName = actor.displayName
      return merged
    })
    patchLocal(kind, { gasTests })
  }

  function addRow(kind: WorkPermissionKind) {
    const doc = localBundle!.documents.find((d) => d.kind === kind)!
    const reading = emptyGasTestReading()
    reading.testerUid = actor.id
    reading.testerName = actor.displayName
    patchLocal(kind, { gasTests: [...(doc.gasTests ?? []), reading] })
  }

  async function viewPdf(kind: WorkPermissionKind) {
    const doc = localBundle!.documents.find((d) => d.kind === kind)
    if (!doc) return
    setViewingKind(kind)
    try {
      await openWorkPermissionPdf(doc, permit)
    } finally {
      setViewingKind(null)
    }
  }

  const showUpdated = lastSavedAt !== null && !dirty && !busy

  return (
    <section className="card work-perm-ert-panel" id="ert-gas-tests">
      <header className="work-perm-ert-panel__head">
        <h2 style={{ margin: 0 }}>{gt.panelTitle}</h2>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          {gt.panelHint}
        </p>
      </header>

      {canEdit ? (
        <ol className="work-perm-ert-panel__steps small">
          <li>{gt.stepFill}</li>
          <li>{gt.stepSave}</li>
          <li>{gt.stepPdf}</li>
        </ol>
      ) : (
        <p className="work-perm-ert-panel__blocked small">{ertGasTestBlockedHint(permit.status)}</p>
      )}

      {visibleDocs.map((doc) => {
        const needsFill = !gasTestDocFilled(doc)
        return (
          <div key={doc.kind} className="work-perm-ert-panel__doc" id={`ert-gas-${doc.kind}`}>
            <div className="work-perm-ert-panel__doc-head">
              <WorkPermissionIcon kind={doc.kind} size={20} />
              <span className="strong">{doc.title}</span>
              {needsFill && canEdit ? (
                <span className="badge status-warning work-perm-ert-panel__badge">
                  {t.ert.needsReading}
                </span>
              ) : !needsFill ? (
                <span className="badge status-success work-perm-ert-panel__badge">
                  {gt.filledBadge}
                </span>
              ) : null}
              {!needsFill && !dirty ? (
                <button
                  type="button"
                  className="btn ghost small work-perm-ert-panel__pdf-btn"
                  disabled={viewingKind === doc.kind}
                  onClick={() => void viewPdf(doc.kind)}
                >
                  {viewingKind === doc.kind ? c.opening : wp.permPdf}
                </button>
              ) : null}
            </div>
            <GasTestResultsTable
              kind={doc.kind}
              readings={doc.gasTests ?? []}
              editable={canEdit}
              ertOnly
              isErt={isErt}
              tableTitle={gt.openSection}
              onChange={(id, patch) => onGasChange(doc.kind, id, patch)}
              onAddRow={() => addRow(doc.kind)}
            />
          </div>
        )
      })}

      {canEdit ? (
        <div className="btn-row work-perm-ert-panel__actions" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn primary small"
            disabled={!dirty || busy}
            onClick={() => void flush()}
          >
            {busy ? c.saving : wp.saveGasTest}
          </button>
          {showUpdated ? (
            <span className="muted small work-perm-ert-panel__updated">{gt.updatedLabel}</span>
          ) : null}
        </div>
      ) : null}

      {busy ? <LoadingProgress label={status ?? c.saving} indeterminate /> : null}
      {status && !busy ? <p className="muted xsmall work-perm-ert-panel__status">{status}</p> : null}
    </section>
  )
}

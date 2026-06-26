import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import {
  canPermitterEditPreWorkChecks,
  permitterPreWorkBlockedHint,
  preWorkChecksStarted,
} from '../lib/permitterPreWorkHints'
import { openWorkPermissionPdf } from '../lib/openWorkPermissionPdf'
import { patchWorkPermissionDocument, syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import type {
  WorkPermissionCheckboxGroup,
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'
import { LoadingProgress } from './LoadingProgress'

function PreWorkChecksEditor(props: {
  group: WorkPermissionCheckboxGroup
  clarificationPlaceholder: string
  onChange: (group: WorkPermissionCheckboxGroup) => void
  disabled?: boolean
}) {
  const { group, onChange, clarificationPlaceholder, disabled = false } = props
  return (
    <fieldset className="work-perm-checks" disabled={disabled}>
      <legend className="work-perm-checks__legend">{group.label}</legend>
      <ul className="work-perm-checks__list">
        {group.items.map((item, idx) => (
          <li key={item.id} className="work-perm-checks__item">
            <label className="check work-perm-checks__check">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => {
                  const items = [...group.items]
                  items[idx] = { ...item, checked: e.target.checked }
                  onChange({ ...group, items })
                }}
              />
              <span>{item.label}</span>
            </label>
            <input
              className="work-perm-checks__note"
              placeholder={clarificationPlaceholder}
              value={item.note}
              onChange={(e) => {
                const items = [...group.items]
                items[idx] = { ...item, note: e.target.value }
                onChange({ ...group, items })
              }}
            />
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

export function PermitterPreWorkLivePanel(props: {
  permit: Permit
  actor: DemoUser
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  focusKind?: WorkPermissionKind | null
  onSaved?: (bundle: WorkPermissionsBundle) => void
  refresh?: () => Promise<void>
}) {
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
  const { t } = useLanguage()
  const wp = t.workPermission
  const c = t.common
  const pwc = t.preWorkCheck
  const serverBundle = permit.workPermissions
  const canEdit = canPermitterEditPreWorkChecks(permit, actor)
  const [localBundle, setLocalBundle] = useState<WorkPermissionsBundle | null>(serverBundle ?? null)
  const [dirty, setDirty] = useState(false)
  const [dirtyKinds, setDirtyKinds] = useState<WorkPermissionKind[]>([])
  const [busy, setBusy] = useState(false)
  const [viewingKind, setViewingKind] = useState<WorkPermissionKind | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [savedConfirmed, setSavedConfirmed] = useState(false)

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
      onSaved?.(updated)
      if (refresh) await refresh()
      setStatus(wp.savedPermPdf)
      setSavedConfirmed(true)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 4000)
    }
  }, [localBundle, dirty, dirtyKinds, permit, updatePermit, resolveUser, userDirectory, onSaved, refresh, wp])

  if (!localBundle?.documents?.length) return null
  if (actor.role !== 'permitter') return null

  const visibleDocs = localBundle.documents.filter((doc) => {
    if (doc.kind === 'confined_space') return false
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
    setSavedConfirmed(false)
    setDirtyKinds((prev) => (prev.includes(kind) ? prev : [...prev, kind]))
  }

  async function viewPdf(kind: WorkPermissionKind) {
    const doc = localBundle!.documents.find((d) => d.kind === kind)
    if (!doc) return
    setViewingKind(kind)
    try {
      await openWorkPermissionPdf(doc)
    } finally {
      setViewingKind(null)
    }
  }

  if (savedConfirmed && !dirty) {
    const firstKind = visibleDocs[0].kind
    return (
      <section className="card work-perm-ert-panel" id="permitter-pre-work">
        <header className="work-perm-ert-panel__head">
          <h2 style={{ margin: 0 }}>{pwc.panelTitle}</h2>
        </header>
        <div className="alert" role="status" style={{ marginTop: '0.5rem' }}>
          {pwc.savedConfirm}
        </div>
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          {visibleDocs.length === 1 ? (
            <button
              type="button"
              className="btn ghost small"
              disabled={viewingKind === firstKind}
              onClick={() => void viewPdf(firstKind)}
            >
              {viewingKind === firstKind ? c.opening : wp.permPdf}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setSavedConfirmed(false)}
            >
              {pwc.editAgain}
            </button>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section className="card work-perm-ert-panel" id="permitter-pre-work">
      <header className="work-perm-ert-panel__head">
        <h2 style={{ margin: 0 }}>{pwc.panelTitle}</h2>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          {pwc.panelHint}
        </p>
      </header>

      {canEdit ? (
        <ol className="work-perm-ert-panel__steps small">
          <li>{pwc.stepFill}</li>
          <li>{pwc.stepSave}</li>
          <li>{pwc.stepPdf}</li>
        </ol>
      ) : (
        <p className="work-perm-ert-panel__blocked small">
          {permitterPreWorkBlockedHint(permit.status)}
        </p>
      )}

      {visibleDocs.map((doc) => {
        const needsFill = !preWorkChecksStarted(doc.form.preWorkChecks.items)
        return (
          <div key={doc.kind} className="work-perm-ert-panel__doc" id={`pre-work-${doc.kind}`}>
            <div className="work-perm-ert-panel__doc-head">
              <WorkPermissionIcon kind={doc.kind} size={20} />
              <span className="strong">{doc.title}</span>
              {needsFill && canEdit ? (
                <span className="badge status-warning work-perm-ert-panel__badge">
                  {pwc.needsFill}
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
            <PreWorkChecksEditor
              group={doc.form.preWorkChecks}
              clarificationPlaceholder={wp.clarification}
              disabled={!canEdit}
              onChange={(group) =>
                patchLocal(doc.kind, { form: { ...doc.form, preWorkChecks: group } })
              }
            />
          </div>
        )
      })}

      {canEdit ? (
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn primary small"
            disabled={!dirty || busy}
            onClick={() => void flush()}
          >
            {busy ? c.saving : pwc.saveChecks}
          </button>
        </div>
      ) : null}

      {busy ? <LoadingProgress label={status ?? c.saving} indeterminate /> : null}
      {status && !busy ? <p className="muted xsmall work-perm-ert-panel__status">{status}</p> : null}
    </section>
  )
}

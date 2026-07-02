import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import {
  canPermitterEditPreWorkChecks,
  normalizePreWorkChecksForKind,
  normalizePreWorkChecksInBundle,
  permitterPreWorkBlockedHint,
  permitterPreWorkHasUnsavedChanges,
  permitterPreWorkItemsRemaining,
  permitterPreWorkRequiredDocuments,
  permitterPreWorkSavedForSign,
  preWorkAvailableColumnCompleteForKind,
} from '../lib/permitterPreWorkHints'
import { nextRoleToSign } from '../lib/approvalSequence'
import { openWorkPermissionPdf } from '../lib/openWorkPermissionPdf'
import { patchWorkPermissionDocument, syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import { enrichWorkPermissionsBundle } from '../lib/workPermissions'
import type {
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'
import { LoadingProgress } from './LoadingProgress'
import { PreWorkChecksTable } from './PreWorkChecksTable'
import { WorkPermissionIcon } from './WorkPermissionIcon'

export function PermitterPreWorkLivePanel(props: {
  permit: Permit
  actor: DemoUser
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
  focusKind?: WorkPermissionKind | null
  onSaved?: (bundle: WorkPermissionsBundle) => void
  /** Локальные правки (dirty=true) — родитель сбрасывает кэш для подписи. */
  onDraftChange?: (bundle: WorkPermissionsBundle, dirty: boolean) => void
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
    onDraftChange,
    refresh,
  } = props
  const { t } = useLanguage()
  const wp = t.workPermission
  const c = t.common
  const pwc = t.preWorkCheck
  const serverBundle = permit.workPermissions
  const canEdit = canPermitterEditPreWorkChecks(permit, actor, resolveUser, userDirectory)
  const [localBundle, setLocalBundle] = useState<WorkPermissionsBundle | null>(serverBundle ?? null)
  const [dirty, setDirty] = useState(false)
  const [dirtyKinds, setDirtyKinds] = useState<WorkPermissionKind[]>([])
  const [busy, setBusy] = useState(false)
  const [viewingKind, setViewingKind] = useState<WorkPermissionKind | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [savedConfirmed, setSavedConfirmed] = useState(false)

  useEffect(() => {
    if (dirty) return
    setLocalBundle(
      serverBundle
        ? normalizePreWorkChecksInBundle(enrichWorkPermissionsBundle(permit, serverBundle))
        : null,
    )
  }, [serverBundle, permit.id, permit.registrationRefNo, dirty])

  useEffect(() => {
    if (!dirty || !localBundle) return
    onDraftChange?.(localBundle, true)
  }, [dirty, localBundle, onDraftChange])

  const flush = useCallback(async () => {
    if (!localBundle) return
    const savedPermitPreview = { ...permit, workPermissions: normalizePreWorkChecksInBundle(localBundle) }
    const hasChanges = permitterPreWorkHasUnsavedChanges(permit, localBundle, serverBundle ?? undefined)
    if (!hasChanges && !dirty) {
      const signTurn = nextRoleToSign(savedPermitPreview, userDirectory)
      if (signTurn === 'permitter' && permitterPreWorkSavedForSign(savedPermitPreview)) {
        setStatus(`${wp.savedPermPdf} Можно подписать в блоке «Подписи» ниже.`)
        requestAnimationFrame(() => {
          document.getElementById('signatures-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } else {
        const itemsLeft = permitterPreWorkItemsRemaining(savedPermitPreview)
        if (itemsLeft > 0) {
          setStatus('Отметьте пункты «Имеется» и нажмите «Сохранить проверки».')
        } else {
          setStatus('Нажмите «Сохранить проверки», затем можно подписать ЭЦП.')
        }
      }
      window.setTimeout(() => setStatus(null), 5000)
      return
    }
    setBusy(true)
    setStatus(wp.updatingPermPdf)
    try {
      const bundleToSave = normalizePreWorkChecksInBundle({
        ...localBundle,
        permitterPreWorkSavedAtIso: new Date().toISOString(),
      })
      const updated = normalizePreWorkChecksInBundle(
        await syncWorkPermissionsLive({
          permit,
          bundle: bundleToSave,
          updatePermit,
          resolveUser,
          userDirectory,
          renderKinds: dirtyKinds.length ? dirtyKinds : undefined,
        }),
      )
      onSaved?.(updated)
      if (refresh) await refresh()
      setLocalBundle(updated)
      setDirty(false)
      setDirtyKinds([])
      onDraftChange?.(updated, false)
      const savedPermit = { ...permit, workPermissions: updated }
      const signTurn = nextRoleToSign(savedPermit, userDirectory)
      if (signTurn === 'permitter') {
        setStatus(`${wp.savedPermPdf} Можно подписать в блоке «Подписи» ниже.`)
        requestAnimationFrame(() => {
          document.getElementById('signatures-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } else {
        const itemsLeft = permitterPreWorkItemsRemaining(savedPermit)
        setStatus(
          signTurn
            ? 'Проверки сохранены. Подпись появится после подписи предыдущего участника очереди (см. блок «Подписи» ниже).'
            : itemsLeft > 0
              ? `Сохранено. При необходимости отметьте ещё ${itemsLeft} пунктов «Имеется».`
              : wp.savedPermPdf,
        )
      }
      if (permitterPreWorkSavedForSign(savedPermit)) {
        setSavedConfirmed(true)
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 4000)
    }
  }, [
    localBundle,
    dirty,
    serverBundle,
    dirtyKinds,
    permit,
    updatePermit,
    resolveUser,
    userDirectory,
    onSaved,
    onDraftChange,
    refresh,
    wp,
  ])

  if (!localBundle?.documents?.length) return null
  if (actor.role !== 'permitter') return null

  const visibleDocs = permitterPreWorkRequiredDocuments(permit, localBundle).filter((doc) =>
    focusKind ? doc.kind === focusKind : true,
  )

  if (visibleDocs.length === 0) return null

  function patchLocal(kind: WorkPermissionKind, patch: Parameters<typeof patchWorkPermissionDocument>[2]) {
    setLocalBundle((prev) => {
      if (!prev) return prev
      let next = patchWorkPermissionDocument(prev, kind, patch)
      const doc = next.documents.find((d) => d.kind === kind)
      if (doc) {
        next = patchWorkPermissionDocument(next, kind, {
          form: {
            ...doc.form,
            preWorkChecks: normalizePreWorkChecksForKind(kind, doc.form.preWorkChecks),
          },
        })
      }
      return next
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

  if (savedConfirmed && !dirty && permitterPreWorkSavedForSign({ ...permit, workPermissions: localBundle })) {
    const firstKind = visibleDocs[0].kind
    return (
      <section className="card work-perm-ert-panel" id="permitter-pre-work">
        <header className="work-perm-ert-panel__head">
          <h2 style={{ margin: 0 }}>3. {pwc.panelTitle}</h2>
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
      {!canEdit ? (
        <p className="work-perm-ert-panel__blocked small" style={{ margin: 0 }}>
          {permitterPreWorkBlockedHint(permit.status)}
        </p>
      ) : null}

      {visibleDocs.map((doc) => {
        const needsFill = !preWorkAvailableColumnCompleteForKind(
          doc.kind,
          doc.form.preWorkChecks.items,
        )
        const isFire = doc.kind === 'open_flame_fire'
        const sectionTitle = isFire ? pwc.panelTitleFire : pwc.panelTitle
        return (
          <div key={doc.kind} className="work-perm-ert-panel__doc" id={`pre-work-${doc.kind}`}>
            {visibleDocs.length > 1 ? (
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
            ) : null}
            <section className="work-perm-form__section">
              <header className="work-perm-form__section-head">
                <span className="work-perm-form__section-num">3</span>
                <div>
                  <h3 className="work-perm-form__section-title">{sectionTitle}</h3>
                  {canEdit ? (
                    <p className="work-perm-form__section-hint">{pwc.panelHint}</p>
                  ) : null}
                </div>
              </header>
              <div className="work-perm-form__section-body">
                <PreWorkChecksTable
                  kind={doc.kind}
                  group={doc.form.preWorkChecks}
                  editColumn={canEdit ? 'available' : 'none'}
                  disabled={!canEdit}
                  onChange={(group) =>
                    patchLocal(doc.kind, { form: { ...doc.form, preWorkChecks: group } })
                  }
                />
              </div>
            </section>
            {visibleDocs.length === 1 && !needsFill && !dirty ? (
              <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={viewingKind === doc.kind}
                  onClick={() => void viewPdf(doc.kind)}
                >
                  {viewingKind === doc.kind ? c.opening : wp.permPdf}
                </button>
              </div>
            ) : null}
          </div>
        )
      })}

      {canEdit ? (
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <p className="muted xsmall" style={{ margin: '0 0 0.5rem', width: '100%' }}>
            {visibleDocs.length > 1
              ? 'Отметьте нужные пункты «Имеется», сохраните — затем подпишите ЭЦП в блоке ниже.'
              : 'Отметьте пункты «Имеется», нажмите «Сохранить проверки» — затем можно подписать ЭЦП.'}
          </p>
          <button
            type="button"
            className="btn primary small"
            disabled={busy}
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

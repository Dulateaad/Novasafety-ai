import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import { canFillPermissionClosure, isPermitProducer, permissionClosureDeniedReason } from '../lib/closeNdprEarly'
import { patchWorkPermissionDocument, syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import {
  broadcastPermitNoticeClient,
  upsertLocalPermitNotices,
} from '../lib/permitNotices'
import { notifyPermitNoticesRefresh } from '../lib/refreshPermitNotices'
import { firebaseConfigured } from '../lib/firebase'
import type {
  WorkPermissionCheckboxGroup,
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'
import { defaultClosureChecks } from '../config/workPermissionChecklists'
import { useLanguage } from '../context/LanguageContext'
import { LoadingProgress } from './LoadingProgress'

function ClosureChecksEditor(props: {
  group: WorkPermissionCheckboxGroup
  onChange: (group: WorkPermissionCheckboxGroup) => void
  disabled?: boolean
}) {
  const { group, onChange, disabled = false } = props
  return (
    <fieldset className="work-perm-checks" disabled={disabled}>
      <ul className="work-perm-checks__list">
      {group.items.map((item, idx) => (
        <li key={item.id} className="work-perm-checks__item">
          <label className="check work-perm-checks__check">
            <input
              type="checkbox"
              checked={item.checked}
              disabled={disabled}
              onChange={(e) => {
                const items = [...group.items]
                items[idx] = { ...item, checked: e.target.checked }
                onChange({ ...group, items })
              }}
            />
            <span>{item.label}</span>
          </label>
        </li>
      ))}
      </ul>
    </fieldset>
  )
}

export function WorkPermissionClosurePanel(props: {
  permit: Permit
  actor: DemoUser
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
}) {
  const { permit, actor, updatePermit, resolveUser, userDirectory } = props
  const { t } = useLanguage()
  const wp = t.workPermission
  const c = t.common
  const serverBundle = permit.workPermissions
  const canEdit = canFillPermissionClosure(permit, actor, userDirectory)
  const denied = permissionClosureDeniedReason(permit, actor, userDirectory)
  const [localBundle, setLocalBundle] = useState<WorkPermissionsBundle | null>(serverBundle ?? null)
  const [dirty, setDirty] = useState(false)
  const [dirtyKinds, setDirtyKinds] = useState<WorkPermissionKind[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setLocalBundle(serverBundle ?? null)
    setDirty(false)
  }, [serverBundle, permit.id])

  const save = useCallback(async () => {
    if (!localBundle || !dirty) return
    setBusy(true)
    setStatus(wp.updatingPdf)
    try {
      await syncWorkPermissionsLive({
        permit,
        bundle: localBundle,
        updatePermit,
        resolveUser,
        userDirectory,
        renderKinds: dirtyKinds.length ? dirtyKinds : undefined,
        rebuildPackage: true,
      })
      setDirty(false)
      setDirtyKinds([])
      setStatus(wp.savedClosure)
      if (firebaseConfigured) {
        void broadcastPermitNoticeClient(permit.id, 'closure_saved')
          .then(() => notifyPermitNoticesRefresh())
          .catch(() => {})
      } else {
        upsertLocalPermitNotices({ ...permit, workPermissions: localBundle }, 'closure_saved')
        notifyPermitNoticesRefresh()
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 3000)
    }
  }, [localBundle, dirty, permit, updatePermit, resolveUser, userDirectory])

  if (!localBundle?.documents?.length) return null
  if (permit.status !== 'closed' || !isPermitProducer(permit, actor, userDirectory)) return null

  function onClosureChange(kind: WorkPermissionKind, group: WorkPermissionCheckboxGroup) {
    setLocalBundle((prev) => {
      if (!prev) return prev
      return patchWorkPermissionDocument(prev, kind, {
        form: { ...prev.documents.find((d) => d.kind === kind)!.form, closureChecks: group },
      })
    })
    setDirty(true)
    setDirtyKinds((prev) => (prev.includes(kind) ? prev : [...prev, kind]))
  }

  return (
    <section className="card work-perm-closure-panel" id="work-perm-closure" style={{ marginBottom: '1rem' }}>
      <header>
        <h2 style={{ margin: 0 }}>Передача рабочего участка / закрытие разрешения</h2>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          Отметьте пункты и сохраните — раздел «Передача рабочего участка / закрытие» попадёт в PDF
          разрешения и журнал НДПР.
        </p>
        {!canEdit && denied ? <p className="muted small">{denied}</p> : null}
      </header>

      {localBundle.documents.map((doc) => (
        <div key={doc.kind} className="work-perm-ert-panel__doc">
          <div className="work-perm-ert-panel__doc-head">
            <WorkPermissionIcon kind={doc.kind} size={20} />
            <span className="strong">{doc.title}</span>
          </div>
          <ClosureChecksEditor
            group={doc.form.closureChecks ?? defaultClosureChecks()}
            onChange={(g) => onClosureChange(doc.kind, g)}
            disabled={!canEdit}
          />
        </div>
      ))}

      {canEdit ? (
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn primary small"
            disabled={!dirty || busy}
            onClick={() => void save()}
          >
            {busy ? c.saving : wp.saveClosure}
          </button>
          {dirty && !busy ? (
            <span className="muted xsmall">{c.updated}</span>
          ) : null}
        </div>
      ) : null}

      {busy ? <LoadingProgress label={status ?? c.saving} indeterminate /> : null}
      {status && !busy ? <p className="muted xsmall">{status}</p> : null}
    </section>
  )
}

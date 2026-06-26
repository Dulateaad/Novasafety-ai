import { useCallback, useEffect, useRef, useState } from 'react'
import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import { GasTestResultsTable } from './GasTestResultsTable'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { canErtEditGasTests, ertGasTestBlockedHint } from '../lib/ertGasTestHints'
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
}) {
  const { t } = useLanguage()
  const wp = t.workPermission
  const c = t.common
  const { permit, actor, updatePermit, resolveUser, userDirectory, focusKind } = props
  const bundle = permit.workPermissions
  const isErt = actor.role === 'ert'
  const canEdit = isErt && canErtEditGasTests(permit)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const pendingRef = useRef<WorkPermissionsBundle | null>(null)

  const flush = useCallback(async () => {
    const next = pendingRef.current
    if (!next) return
    pendingRef.current = null
    setBusy(true)
    setStatus(wp.updatingPermPdf)
    try {
      await syncWorkPermissionsLive({
        permit,
        bundle: next,
        updatePermit,
        resolveUser,
        userDirectory,
      })
      setStatus('Сохранено · PDF обновлён')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 2500)
    }
  }, [permit, updatePermit, resolveUser, userDirectory])

  const scheduleSync = useCallback(
    (next: WorkPermissionsBundle) => {
      pendingRef.current = next
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => void flush(), 800)
    },
    [flush],
  )

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  if (!bundle?.documents?.length) return null
  if (!isErt) return null

  const visibleDocs = bundle.documents.filter((doc) => {
    const meta = WORK_PERMISSION_BY_KIND[doc.kind]
    if (!meta.requiresGasTests) return false
    if (!focusKind) return true
    return doc.kind === focusKind
  })

  if (visibleDocs.length === 0) return null

  function onGasChange(kind: WorkPermissionKind, id: string, patch: Partial<GasTestReading>) {
    if (!bundle) return
    const doc = bundle.documents.find((d) => d.kind === kind)!
    const gasTests = doc.gasTests.map((r) => {
      if (r.id !== id) return r
      const merged = { ...r, ...patch }
      if (isErt) {
        merged.testerUid = actor.id
        merged.testerName = actor.displayName
      }
      return merged
    })
    scheduleSync(patchWorkPermissionDocument(bundle, kind, { gasTests }))
  }

  function addRow(kind: WorkPermissionKind) {
    if (!bundle) return
    const doc = bundle.documents.find((d) => d.kind === kind)!
    const reading = emptyGasTestReading()
    if (isErt) {
      reading.testerUid = actor.id
      reading.testerName = actor.displayName
    }
    scheduleSync(
      patchWorkPermissionDocument(bundle, kind, {
        gasTests: [...doc.gasTests, reading],
      }),
    )
  }

  return (
    <section className="card work-perm-ert-panel" id="ert-gas-tests">
      <header className="work-perm-ert-panel__head">
        <h2 style={{ margin: 0 }}>Ваше задание: газотест</h2>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          Данные попадают в раздел 2 PDF разрешения и в общий пакет наряда
        </p>
      </header>

      {canEdit ? (
        <ol className="work-perm-ert-panel__steps small">
          <li>Нажмите <strong>«Добавить замер»</strong> под таблицей (если строк ещё нет).</li>
          <li>Укажите дату/время, локацию, показания <strong>LEL %, H₂S, O₂, CO</strong> и № газоанализатора.</li>
          <li>Дождитесь надписи «Сохранено · PDF обновлён» — можно открыть PDF разрешения и проверить таблицу.</li>
        </ol>
      ) : (
        <p className="work-perm-ert-panel__blocked small">{ertGasTestBlockedHint(permit.status)}</p>
      )}

      {visibleDocs.map((doc) => (
        <div key={doc.kind} className="work-perm-ert-panel__doc" id={`ert-gas-${doc.kind}`}>
          <div className="work-perm-ert-panel__doc-head">
            <WorkPermissionIcon kind={doc.kind} size={20} />
            <span className="strong">{doc.title}</span>
            {doc.gasTests.length === 0 && canEdit ? (
              <span className="badge status-warning work-perm-ert-panel__badge">{t.ert.needsReading}</span>
            ) : null}
          </div>
          <GasTestResultsTable
            kind={doc.kind}
            readings={doc.gasTests}
            editable={canEdit}
            ertOnly
            isErt={isErt}
            onChange={(id, patch) => onGasChange(doc.kind, id, patch)}
            onAddRow={() => addRow(doc.kind)}
          />
        </div>
      ))}

      {busy ? <LoadingProgress label={status ?? c.saving} indeterminate /> : null}
      {status && !busy ? <p className="muted xsmall work-perm-ert-panel__status">{status}</p> : null}
    </section>
  )
}

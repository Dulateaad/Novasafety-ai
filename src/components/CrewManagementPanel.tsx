import { useMemo, useState } from 'react'
import type { DemoUser, Permit, WorkExecutor } from '../types/domain'
import { useSession } from '../context/SessionContext'
import {
  firstUnusedWorkerUid,
  workerChoicesForRow,
} from '../lib/directoryUsers'
import { broadcastPermitNoticeClient } from '../lib/permitNotices'
import { mergeAbrPeopleFromNd } from '../lib/prefillAbrFromPackage'

const EDIT_ROLES = new Set<DemoUser['role']>(['performer', 'coordinator', 'permitter'])
const ACTIVE = new Set<Permit['status']>(['issued', 'in_progress', 'suspended', 'on_approval'])

function newExecutorRow(userUid: string): WorkExecutor {
  return {
    id: crypto.randomUUID(),
    userUid,
    dateIso: new Date().toISOString().slice(0, 10),
    briefingAcknowledged: false,
  }
}

export function CrewManagementPanel(props: {
  permit: Permit
  actor: DemoUser
}) {
  const { permit, actor } = props
  const { updatePermit, userDirectory, authMode } = useSession()
  const [executors, setExecutors] = useState<WorkExecutor[]>(permit.executors)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canEdit = EDIT_ROLES.has(actor.role) && ACTIVE.has(permit.status)
  const canAdd = useMemo(() => {
    const used = new Set(executors.map((e) => e.userUid).filter(Boolean))
    return firstUnusedWorkerUid(userDirectory, used) !== null
  }, [executors, userDirectory])

  if (!canEdit) return null

  function patchExecutor(id: string, patch: Partial<WorkExecutor>) {
    setExecutors((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function addExecutor() {
    const used = new Set(executors.map((e) => e.userUid).filter(Boolean))
    const pick = firstUnusedWorkerUid(userDirectory, used)
    if (!pick) {
      setError('Нет свободных работников в справочнике.')
      return
    }
    setExecutors((list) => [...list, newExecutorRow(pick)])
    setError(null)
  }

  function removeExecutor(id: string) {
    setExecutors((list) => list.filter((x) => x.id !== id))
  }

  async function saveCrew() {
    if (executors.some((ex) => !ex.userUid.trim())) {
      setError('Выберите работника для каждой строки.')
      return
    }
    const unchanged =
      executors.length === permit.executors.length &&
      executors.every((ex, i) => {
        const prev = permit.executors[i]
        return prev && prev.userUid === ex.userUid && prev.id === ex.id
      })
    if (unchanged) return

    setBusy(true)
    setError(null)
    try {
      const resolveName = (uid: string) =>
        userDirectory.find((u) => u.id === uid)?.displayName ?? uid
      const nextAbr = permit.asor?.abr
        ? mergeAbrPeopleFromNd(permit.asor.abr, { ...permit, executors }, resolveName)
        : undefined

      await updatePermit(permit.id, {
        executors,
        ...(nextAbr ? { asor: { ...permit.asor!, abr: nextAbr } } : {}),
      })
      if (authMode === 'firebase') {
        await broadcastPermitNoticeClient(permit.id, 'crew_changed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить состав бригады.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Состав бригады</h2>
      <p className="muted small">
        Добавление и удаление работников. При сохранении изменений участникам отправляются
        push- и email-уведомления.
      </p>
      {error ? (
        <div className="alert error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="btn ghost small" onClick={addExecutor} disabled={!canAdd || busy}>
          + Добавить работника
        </button>
      </div>
      {executors.map((ex) => (
        <div key={ex.id} className="card" style={{ marginBottom: '0.65rem', padding: '0.75rem' }}>
          <label className="small">
            Работник
            <select
              value={ex.userUid}
              onChange={(e) => patchExecutor(ex.id, { userUid: e.target.value })}
              disabled={busy}
            >
              <option value="">— Выберите —</option>
              {workerChoicesForRow(userDirectory, executors, ex.id).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn ghost small"
            style={{ marginTop: '0.5rem' }}
            disabled={busy}
            onClick={() => removeExecutor(ex.id)}
          >
            Удалить
          </button>
        </div>
      ))}
      <button type="button" className="btn primary small" disabled={busy} onClick={() => void saveCrew()}>
        {busy ? 'Сохранение…' : 'Сохранить состав бригады'}
      </button>
    </section>
  )
}

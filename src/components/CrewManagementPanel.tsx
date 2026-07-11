import { useMemo, useState } from 'react'
import type { DemoUser, Permit, WorkExecutor } from '../types/domain'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import {
  executorAccountsConflict,
  hasAvailableWorkerForCrew,
  workerChoicesForRow,
} from '../lib/directoryUsers'
import { broadcastPermitNoticeClient } from '../lib/permitNotices'
import { mergeAbrPeopleFromNd } from '../lib/prefillAbrFromPackage'

const EDIT_ROLES = new Set<DemoUser['role']>(['performer', 'coordinator', 'permitter'])
const ACTIVE = new Set<Permit['status']>(['issued', 'in_progress', 'suspended'])

function newExecutorRow(): WorkExecutor {
  return {
    id: crypto.randomUUID(),
    userUid: '',
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
  const { showSuccess, showInfo, showError } = useToast()
  const [executors, setExecutors] = useState<WorkExecutor[]>(permit.executors)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canEdit = EDIT_ROLES.has(actor.role) && ACTIVE.has(permit.status)
  const isProducer = actor.role === 'performer'
  const canAdd = useMemo(
    () => hasAvailableWorkerForCrew(userDirectory, executors),
    [executors, userDirectory],
  )

  if (!canEdit) return null

  function patchExecutor(id: string, patch: Partial<WorkExecutor>) {
    setExecutors((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function addExecutor() {
    if (!canAdd) {
      setError('Нет свободных работников в справочнике.')
      return
    }
    setExecutors((list) => [newExecutorRow(), ...list])
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
    const uids = executors.map((ex) => ex.userUid.trim()).filter(Boolean)
    for (let i = 0; i < uids.length; i += 1) {
      for (let j = i + 1; j < uids.length; j += 1) {
        if (executorAccountsConflict(uids[i]!, uids[j]!, userDirectory)) {
          setError('Один и тот же работник не может быть указан в двух строках.')
          return
        }
      }
    }
    const unchanged =
      executors.length === permit.executors.length &&
      executors.every((ex, i) => {
        const prev = permit.executors[i]
        return prev && prev.userUid === ex.userUid && prev.id === ex.id
      })
    if (unchanged) {
      showInfo('Изменений нет')
      return
    }

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
      showSuccess('Состав бригады сохранён')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось сохранить состав бригады.'
      setError(msg)
      showError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Состав бригады</h2>
      {!isProducer ? (
        <p className="muted small">
          Добавление и удаление работников. При сохранении изменений участникам отправляются
          push- и email-уведомления.
        </p>
      ) : null}
      {error ? (
        <div className="alert error" role="alert">
          {error}
        </div>
      ) : null}
      {executors.map((ex) => (
        <div
          key={ex.id}
          className={isProducer ? 'ndpr-worker-row' : 'card'}
          style={isProducer ? undefined : { marginBottom: '0.65rem', padding: '0.75rem' }}
        >
          <label className={isProducer ? undefined : 'small'}>
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
            className={`btn ghost small${isProducer ? ' ndpr-worker-row__remove' : ''}`}
            style={isProducer ? undefined : { marginTop: '0.5rem' }}
            disabled={busy}
            onClick={() => removeExecutor(ex.id)}
          >
            Удалить
          </button>
        </div>
      ))}
      <div className="btn-row ndpr-workers-fieldset__add">
        <button type="button" className="btn ghost small" onClick={addExecutor} disabled={!canAdd || busy}>
          + Добавить работника
        </button>
      </div>
      <button type="button" className="btn primary small" disabled={busy} onClick={() => void saveCrew()}>
        {busy ? 'Сохранение…' : 'Сохранить состав бригады'}
      </button>
    </section>
  )
}

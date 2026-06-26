import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import type {
  PermitDraft,
  SpecialWorkActivity,
  UserRole,
  WorkExecutor,
  ZoneClass,
} from '../types/domain'
import {
  ROLE_LABELS,
  ZONE_CLASS_LABELS,
  SPECIAL_WORK_ACTIVITY_LABELS,
  SPECIAL_WORK_ACTIVITY_ORDER,
  applySpecialWorkActivity,
} from '../types/domain'
import { addOneCalendarMonth } from '../lib/calendarMonth'
import {
  firstUnusedWorkerUid,
  workerChoicesForRow,
} from '../lib/directoryUsers'
import { PTW_SITE_OPTIONS } from '../config/ptwSites'
import {
  NEW_PERMIT_DRAFT_AUTOSAVE_KEY,
  restoreNewPermitDraftFromSession,
} from '../lib/newPermitDraftAutosave'
import { setNdGatePassed } from '../lib/ndGate'
import { clearPprGate } from '../lib/pprGate'
import { clearPprForm } from '../lib/pprAutosave'

function uid() {
  return crypto.randomUUID()
}

function usersForField(
  directory: { id: string; displayName: string; role: UserRole }[],
  roles: UserRole[],
) {
  const m = directory.filter((u) => roles.includes(u.role))
  return m.length > 0 ? m : directory
}

function validateNdprDraft(draft: PermitDraft): string | null {
  if (!draft.title.trim()) return 'Укажите наименование работ.'
  if (!draft.siteName.trim()) return 'Выберите объект / локацию.'
  if (!draft.workDescription.trim()) return 'Заполните описание работ.'
  if (!draft.toolsAndEquipment.trim()) return 'Укажите инструменты и оборудование.'
  return null
}

export function NewPermitPage() {
  const { authMode, userDirectory } = useSession()
  const nav = useNavigate()
  const [draft, setDraft] = useState<PermitDraft>(() => restoreNewPermitDraftFromSession())
  const [workerError, setWorkerError] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const seededParticipants = useRef(false)

  useEffect(() => {
    if (authMode !== 'firebase' || userDirectory.length === 0) return
    if (seededParticipants.current) return
    seededParticipants.current = true
    const first = (roles: UserRole[]) =>
      userDirectory.find((u) => roles.includes(u.role))?.id ??
      userDirectory[0].id
    setDraft((d) => ({
      ...d,
      issuerUid: first(['issuer', 'coordinator']),
      permitterUid: first(['permitter', 'coordinator']),
      performerUid: first(['performer', 'coordinator']),
      leadExpertUid: first(['leadExpert', 'coordinator']),
    }))
  }, [authMode, userDirectory])

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(NEW_PERMIT_DRAFT_AUTOSAVE_KEY, JSON.stringify(draft))
      } catch {
        /* storage full / private mode */
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [draft])

  function addExecutor() {
    const used = new Set(draft.executors.map((e) => e.userUid).filter(Boolean))
    const pick = firstUnusedWorkerUid(userDirectory, used)
    if (!pick) return
    const row: WorkExecutor = {
      id: uid(),
      userUid: pick,
      dateIso: new Date().toISOString().slice(0, 10),
      briefingAcknowledged: false,
    }
    setDraft((d) => ({ ...d, executors: [...d.executors, row] }))
  }

  function patchExecutor(id: string, patch: Partial<WorkExecutor>) {
    setDraft((d) => ({
      ...d,
      executors: d.executors.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }))
  }

  function removeExecutor(id: string) {
    setDraft((d) => ({
      ...d,
      executors: d.executors.filter((x) => x.id !== id),
    }))
  }

  function submitNdpr(e: React.FormEvent) {
    e.preventDefault()
    setWorkerError(null)
    setSubmissionError(null)

    const v = validateNdprDraft(draft)
    if (v) {
      setSubmissionError(v)
      return
    }

    if (draft.executors.some((ex) => !ex.userUid.trim())) {
      setWorkerError('У каждого работника нужно выбрать пользователя из списка.')
      return
    }
    const activeUids = draft.executors.map((ex) => ex.userUid).filter(Boolean)
    if (new Set(activeUids).size !== activeUids.length) {
      setWorkerError('Один и тот же работник не может быть указан в двух строках.')
      return
    }

    try {
      sessionStorage.setItem(NEW_PERMIT_DRAFT_AUTOSAVE_KEY, JSON.stringify(draft))
    } catch {
      /* ignore */
    }

    clearPprGate()
    clearPprForm()
    setNdGatePassed()
    nav('/ppr')
  }

  const f02 = draft.f02

  const issuerOptions = useMemo(
    () =>
      authMode === 'firebase'
        ? usersForField(userDirectory, ['issuer', 'coordinator'])
        : null,
    [authMode, userDirectory],
  )
  const permitterOptions = useMemo(
    () =>
      authMode === 'firebase'
        ? usersForField(userDirectory, ['permitter', 'coordinator'])
        : null,
    [authMode, userDirectory],
  )
  const performerOptions = useMemo(
    () =>
      authMode === 'firebase'
        ? usersForField(userDirectory, ['performer', 'coordinator'])
        : null,
    [authMode, userDirectory],
  )
  const canAddWorker = useMemo(() => {
    const used = new Set(draft.executors.map((e) => e.userUid).filter(Boolean))
    return firstUnusedWorkerUid(userDirectory, used) !== null
  }, [draft.executors, userDirectory])

  const leadExpertOptions = useMemo(
    () =>
      authMode === 'firebase'
        ? usersForField(userDirectory, ['leadExpert', 'coordinator'])
        : null,
    [authMode, userDirectory],
  )

  return (
    <div className="page narrow">
      <h1>НДПР</h1>
      <p className="muted small page-subtitle" style={{ marginTop: '-0.5rem' }}>
        Наряд-допуск на проведение работ — шаг 1 из 3
      </p>

      <div className="card" style={{ padding: '1rem 1.15rem', marginBottom: '1rem' }}>
        <p className="muted small" style={{ margin: 0 }}>
          Цепочка оформления: <strong>НДПР</strong> → <strong>ППР</strong> (задания 1, 2, …) →{' '}
          <strong>АСОР</strong> (опасные факторы по каждому заданию). После заполнения каждого шага
          нажмите кнопку внизу формы — откроется следующий раздел.
        </p>
      </div>

      {submissionError && (
        <div className="alert error" role="alert" style={{ marginBottom: '1rem' }}>
          {submissionError}
        </div>
      )}

      <form className="card form" onSubmit={submitNdpr}>
        <label>
          Организация
          <input
            value={f02.company}
            onChange={(e) =>
              setDraft({
                ...draft,
                f02: { ...f02, company: e.target.value },
              })
            }
          />
        </label>
        <label>
          Наименование работ
          <input
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <p className="muted xsmall" style={{ marginTop: '-0.25rem', marginBottom: '0.35rem' }}>
          Регистрационный номер присваивается при отправке пакета на согласование.
        </p>
        <div className="row">
          <label>
            Особые виды работ
            <select
              value={draft.specialWorkActivity}
              onChange={(e) => {
                const specialWorkActivity = e.target
                  .value as SpecialWorkActivity
                const derived = applySpecialWorkActivity(specialWorkActivity)
                setDraft((d) => ({
                  ...d,
                  specialWorkActivity,
                  permitType: derived.permitType,
                  category: derived.category,
                  f04:
                    derived.permitType === 'cold' ? undefined : d.f04,
                }))
              }}
            >
              {SPECIAL_WORK_ACTIVITY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {SPECIAL_WORK_ACTIVITY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Классификация зоны
            <select
              value={draft.zoneClass}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  zoneClass: Number(e.target.value) as ZoneClass,
                })
              }
            >
              {([1, 2, 3] as const).map((z) => (
                <option key={z} value={z}>
                  {ZONE_CLASS_LABELS[z]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Объект / локация
          <select
            required
            value={draft.siteName}
            onChange={(e) => setDraft({ ...draft, siteName: e.target.value })}
          >
            {PTW_SITE_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Описание работ
          <textarea
            required
            rows={4}
            value={draft.workDescription}
            onChange={(e) =>
              setDraft({ ...draft, workDescription: e.target.value })
            }
          />
        </label>
        <label>
          Инструменты и оборудование
          <textarea
            required
            rows={3}
            value={draft.toolsAndEquipment}
            onChange={(e) =>
              setDraft({ ...draft, toolsAndEquipment: e.target.value })
            }
            placeholder="Укажите применяемые инструменты, машины и средства..."
          />
        </label>
        <fieldset className="fieldset">
          <legend>
            {authMode === 'firebase'
              ? 'Участники (учётные записи)'
              : 'Участники (демо-идентификаторы)'}
          </legend>
          <p className="small muted" style={{ marginTop: 0 }}>
            Производитель работ, допускающий, выдающий и утверждающий НД — у каждой роли свой вход
            для подписи.
          </p>
          <label>
            1. Производитель работ
            <select
              value={draft.performerUid}
              onChange={(e) =>
                setDraft({ ...draft, performerUid: e.target.value })
              }
            >
              {authMode === 'firebase' && performerOptions
                ? performerOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} — {ROLE_LABELS[u.role]}
                    </option>
                  ))
                : (
                    <>
                      <option value="u-performer">Сидоров — ПР</option>
                      <option value="u-coordinator">Админ</option>
                    </>
                  )}
            </select>
          </label>
          <label>
            2. Допускающий
            <select
              value={draft.permitterUid}
              onChange={(e) =>
                setDraft({ ...draft, permitterUid: e.target.value })
              }
            >
              {authMode === 'firebase' && permitterOptions
                ? permitterOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} — {ROLE_LABELS[u.role]}
                    </option>
                  ))
                : (
                    <>
                      <option value="u-permitter">Петров — допускающий</option>
                      <option value="u-coordinator">Админ</option>
                    </>
                  )}
            </select>
          </label>
          <label>
            3. Выдающий НД
            <select
              value={draft.issuerUid}
              onChange={(e) =>
                setDraft({ ...draft, issuerUid: e.target.value })
              }
            >
              {authMode === 'firebase' && issuerOptions
                ? issuerOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} — {ROLE_LABELS[u.role]}
                    </option>
                  ))
                : (
                    <>
                      <option value="u-issuer">Иванов — выдающий</option>
                      <option value="u-coordinator">Админ</option>
                    </>
                  )}
            </select>
          </label>
          <label>
            4. Утверждающий НД (подпись обязательна для категории 1)
            <select
              value={draft.leadExpertUid}
              onChange={(e) =>
                setDraft({ ...draft, leadExpertUid: e.target.value })
              }
            >
              {authMode === 'firebase' && leadExpertOptions
                ? leadExpertOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} — {ROLE_LABELS[u.role]}
                    </option>
                  ))
                : (
                    <>
                      <option value="u-lead">Утверждающий НД</option>
                      <option value="u-coordinator">Админ</option>
                    </>
                  )}
            </select>
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Бланк НД — общие поля (F02)</legend>
          <div className="row">
            <label>
              № пропуска / бейджа
              <input
                value={f02.badgeNo}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    f02: { ...f02, badgeNo: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Смена
              <select
                value={f02.shift}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    f02: {
                      ...f02,
                      shift: e.target.value as typeof f02.shift,
                    },
                  })
                }
              >
                <option value="">—</option>
                <option value="day">День</option>
                <option value="night">Ночь</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Дата начала
              <input
                type="date"
                value={f02.startDate}
                onChange={(e) => {
                  const startDate = e.target.value
                  setDraft({
                    ...draft,
                    f02: {
                      ...f02,
                      startDate,
                      endDate: startDate
                        ? addOneCalendarMonth(startDate)
                        : f02.endDate,
                    },
                  })
                }}
              />
            </label>
            <label>
              Дата окончания
              <input
                type="date"
                value={f02.endDate}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    f02: { ...f02, endDate: e.target.value },
                  })
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Работники</legend>
          <p className="muted xsmall" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            Строки F03 — добавляйте работников из справочника. Список переносится в АСОР.
          </p>
          {workerError && (
            <div className="alert error" role="alert" style={{ marginBottom: '0.75rem' }}>
              {workerError}
            </div>
          )}
          <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
            <button
              type="button"
              className="btn ghost"
              onClick={addExecutor}
              disabled={!canAddWorker}
              title={
                !canAddWorker ? 'Нет свободных учётных записей для добавления.' : ''
              }
            >
              + Добавить работника
            </button>
          </div>
          {draft.executors.length === 0 && (
            <p className="small muted">
              Добавьте хотя бы одного работника для бригады.
            </p>
          )}
          {draft.executors.map((ex) => (
            <div
              key={ex.id}
              className="card"
              style={{ marginBottom: '0.75rem', padding: '0.75rem' }}
            >
              <div className="row">
                <label>
                  Из списка пользователей
                  <select
                    value={ex.userUid}
                    onChange={(e) =>
                      patchExecutor(ex.id, { userUid: e.target.value })
                    }
                  >
                    <option value="">— Выберите —</option>
                    {workerChoicesForRow(userDirectory, draft.executors, ex.id).map(
                      (u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className="row">
                <label>
                  Дата
                  <input
                    type="date"
                    value={ex.dateIso}
                    onChange={(e) =>
                      patchExecutor(ex.id, { dateIso: e.target.value })
                    }
                  />
                </label>
                <label className="check" style={{ alignSelf: 'end' }}>
                  <input
                    type="checkbox"
                    checked={ex.briefingAcknowledged}
                    onChange={(e) =>
                      patchExecutor(ex.id, {
                        briefingAcknowledged: e.target.checked,
                      })
                    }
                  />
                  Целевой инструктаж
                </label>
              </div>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => removeExecutor(ex.id)}
              >
                Удалить работника
              </button>
            </div>
          ))}
        </fieldset>

        <div className="actions">
          <button type="submit" className="btn primary">
            Создать НДПР
          </button>
        </div>
      </form>
    </div>
  )
}

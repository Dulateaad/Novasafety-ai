import { useMemo, useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { ROLE_LABELS } from '../types/domain'
import { useSession } from '../context/SessionContext'
import {
  abrDailyAckForDate,
  buildAbrDailyAckEntry,
  hasAbrDailyAckToday,
  mergeAbrDailyAckEntry,
  normalizeAbrDailyAcks,
  todayDateIso,
} from '../lib/abrDailyAck'

const ACTIVE = new Set<Permit['status']>(['issued', 'in_progress', 'suspended'])

export function AbrDailyAckPanel(props: {
  permit: Permit
  actor: DemoUser
}) {
  const { permit, actor } = props
  const { updatePermit, resolveUser } = useSession()
  const [busy, setBusy] = useState(false)
  const today = todayDateIso()
  const todayDay = abrDailyAckForDate(permit, today)
  const actorInCrew = permit.executors.some((ex) => ex.userUid === actor.id)
  const canSignToday =
    ACTIVE.has(permit.status) && actorInCrew && !hasAbrDailyAckToday(permit, actor.id)

  const reportRows = useMemo(() => {
    return normalizeAbrDailyAcks(permit.abrDailyAcks)
      .flatMap((day) =>
        day.entries.map((e) => ({
          dateIso: day.dateIso,
          ...e,
        })),
      )
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.signedAtIso.localeCompare(a.signedAtIso))
  }, [permit.abrDailyAcks])

  if (!ACTIVE.has(permit.status) && reportRows.length === 0) return null

  async function signToday() {
    setBusy(true)
    try {
      const entry = buildAbrDailyAckEntry(actor, (u) => ROLE_LABELS[u.role] ?? u.role)
      await updatePermit(permit.id, {
        abrDailyAcks: mergeAbrDailyAckEntry(permit, entry, today),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Ежедневное ознакомление с АБР</h2>
      <p className="muted small">
        Каждый работник бригады подтверждает ознакомление с АБР один раз в день. В отчёте
        фиксируются ФИО, должность и подпись.
      </p>

      <p className="small">
        <strong>Сегодня ({today}):</strong>{' '}
        {todayDay.entries.length === 0
          ? 'пока нет подписей'
          : `${todayDay.entries.length} из ${Math.max(permit.executors.length, todayDay.entries.length)}`}
      </p>

      {canSignToday ? (
        <button type="button" className="btn primary small" disabled={busy} onClick={() => void signToday()}>
          {busy ? 'Сохранение…' : 'Подтвердить ознакомление за сегодня'}
        </button>
      ) : null}

      {permit.executors.length > 0 ? (
        <ul className="compact-list" style={{ marginTop: '0.75rem' }}>
          {permit.executors.map((ex) => {
            const signed = todayDay.entries.find((e) => e.userUid === ex.userUid)
            const name = resolveUser(ex.userUid)?.displayName ?? ex.userUid
            return (
              <li key={ex.id} className="small">
                {name} — {signed ? signed.signatureNote : 'не подписал сегодня'}
              </li>
            )
          })}
        </ul>
      ) : null}

      {reportRows.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Ф.И.О.</th>
                <th>Должность</th>
                <th>Подпись</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={`${row.dateIso}-${row.userUid}-${row.signedAtIso}`}>
                  <td>{row.dateIso}</td>
                  <td>{row.fullName}</td>
                  <td>{row.roleLabel}</td>
                  <td className="small">{row.signatureNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

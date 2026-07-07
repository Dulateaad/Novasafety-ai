import { useMemo, useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { useSession } from '../context/SessionContext'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'
import { isUserOnPermitCrew, uidMatchesAccount } from '../lib/permitAccess'
import {
  buildAbrDailyAckEntry,
  hasValidAbrDailyAck,
  isAbrDailyAckPeriodActive,
  latestAbrDailyAckForUser,
  mergeAbrDailyAckEntry,
  normalizeAbrDailyAcks,
  pendingAbrDailyAckUids,
  resolveExecutorDisplayName,
  todayDateIso,
} from '../lib/abrDailyAck'
import { abrDailyAckSignaturePdfText } from '../lib/abrDailyAckSignaturePdfText'
import { AbrDailyAckSignModal } from './AbrDailyAckSignModal'

export function AbrDailyAckPanel(props: {
  permit: Permit
  actor: DemoUser
}) {
  const { permit, actor } = props
  const { updatePermit, permits, userDirectory } = useSession()
  const { online } = useNetwork()
  const { t } = useLanguage()
  const d = t.abrDailyAck
  const ui = t.signingUi
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const today = todayDateIso()
  const actorInCrew = isUserOnPermitCrew(permit, actor.id, actor, userDirectory)
  const actorNeedsSign = permit.executors.some((ex) => {
    const uid = ex.userUid.trim()
    if (!uid) return false
    if (uid !== actor.id && !uidMatchesAccount(uid, actor, userDirectory)) return false
    return !hasValidAbrDailyAck(
      permit,
      uid,
      userDirectory,
      resolveExecutorDisplayName(uid, userDirectory),
    )
  })
  const canSignToday =
    isAbrDailyAckPeriodActive(permit.status) && actorInCrew && actorNeedsSign
  const pendingToday = pendingAbrDailyAckUids(permit, today, userDirectory, (uid) =>
    resolveExecutorDisplayName(uid, userDirectory),
  )
  const validCount = permit.executors.filter((ex) =>
    hasValidAbrDailyAck(
      permit,
      ex.userUid,
      userDirectory,
      resolveExecutorDisplayName(ex.userUid, userDirectory),
    ),
  ).length

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

  if (!isAbrDailyAckPeriodActive(permit.status) && reportRows.length === 0) return null

  async function saveEntry(entry: ReturnType<typeof buildAbrDailyAckEntry>) {
    const latestPermit = permits.find((p) => p.id === permit.id) ?? permit
    try {
      await updatePermit(permit.id, {
        abrDailyAcks: mergeAbrDailyAckEntry(latestPermit, entry, today, userDirectory),
      })
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
      throw e
    }
    setConfirmed(false)
    setModalOpen(false)
  }

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{d.title}</h2>
      <p className="muted small">{d.description}</p>

      <p className="small">
        <strong>
          {d.todayPrefix} ({today}):
        </strong>{' '}
        {validCount === 0 && pendingToday.length === permit.executors.length
          ? d.noSignaturesYet
          : fillTemplate(d.signedProgress, {
              signed: String(validCount),
              total: String(Math.max(permit.executors.length, 1)),
              pending: String(pendingToday.length),
            })}
      </p>

      {canSignToday ? (
        <div className="crew-ack-sign-row__actions" style={{ marginTop: '0.5rem' }}>
          {!online && (
            <p className="muted xsmall" style={{ margin: 0 }}>
              {ui.needInternet}
            </p>
          )}
          <label className="check check--crew-ack">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>{d.confirmation}</span>
          </label>
          <button
            type="button"
            className="btn primary small"
            disabled={!online || !confirmed}
            onClick={() => setModalOpen(true)}
          >
            {ui.approveEgov}
          </button>
        </div>
      ) : null}

      {permit.executors.length > 0 ? (
        <ul className="compact-list" style={{ marginTop: '0.75rem' }}>
          {permit.executors.map((ex) => {
            const label = resolveExecutorDisplayName(ex.userUid, userDirectory)
            const latest = latestAbrDailyAckForUser(permit, ex.userUid, userDirectory, label)
            const valid = hasValidAbrDailyAck(permit, ex.userUid, userDirectory, label)
            const name = label || ex.userUid
            return (
              <li key={ex.id} className="small">
                {name} —{' '}
                {valid && latest
                  ? abrDailyAckSignaturePdfText(latest)
                  : d.notSignedToday}
              </li>
            )
          })}
        </ul>
      ) : null}

      {reportRows.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <p className="strong small" style={{ marginTop: 0 }}>
            {d.reportTitle}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>{d.colDate}</th>
                <th>{d.colName}</th>
                <th>{d.colRole}</th>
                <th>{d.colSignature}</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={`${row.dateIso}-${row.userUid}-${row.signedAtIso}`}>
                  <td>{row.dateIso}</td>
                  <td>{row.fullName}</td>
                  <td>{row.roleLabel}</td>
                  <td className="small">{abrDailyAckSignaturePdfText(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AbrDailyAckSignModal
        open={modalOpen}
        permit={permit}
        actor={actor}
        dateIso={today}
        onClose={() => setModalOpen(false)}
        onSigned={(entry) => void saveEntry(entry)}
      />
    </section>
  )
}

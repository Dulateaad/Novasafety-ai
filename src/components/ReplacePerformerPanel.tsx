import { useMemo, useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { usersForField } from '../lib/directoryUsers'
import { broadcastPermitNoticeClient } from '../lib/permitNotices'
import { provisionPermitSignersClient } from '../lib/provisionSigners'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import { PERFORMER_DOCUMENT_ROLE_LABEL } from '../config/branding'
import { signerShortName } from '../lib/approvalSequence'

export function ReplacePerformerPanel(props: {
  permit: Permit
  actor: DemoUser
}) {
  const { permit, actor } = props
  const { updatePermit, userDirectory, authMode } = useSession()
  const { showSuccess } = useToast()
  const [nextUid, setNextUid] = useState(permit.performerUid)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canReplace = actor.role === 'coordinator' || actor.role === 'performer'
  const choices = useMemo(
    () => usersForField(userDirectory, ['performer', 'coordinator']),
    [userDirectory],
  )

  if (!canReplace) return null
  if (!['issued', 'in_progress', 'suspended'].includes(permit.status)) return null

  async function replacePerformer() {
    const uid = nextUid.trim()
    if (!uid || uid === permit.performerUid) return
    const person = userDirectory.find((u) => u.id === uid)
    if (!person) {
      setError('Выберите производителя работ из списка.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const nextAbr =
        permit.asor?.abr != null
          ? {
              ...permit.asor,
              abr: {
                ...permit.asor.abr,
                workSupervisor: {
                  fullName: person.displayName,
                  badgeNo: permit.asor.abr.workSupervisor?.badgeNo ?? '',
                  roleLabel: PERFORMER_DOCUMENT_ROLE_LABEL,
                },
              },
            }
          : permit.asor

      const prevPerson = userDirectory.find((u) => u.id === permit.performerUid)
      const replacement = {
        fromUid: permit.performerUid,
        fromDisplayName:
          prevPerson?.displayName?.trim() ||
          permit.asor?.abr?.workSupervisor?.fullName?.trim() ||
          permit.asor?.approvals?.[0]?.fullNamePrinted?.trim() ||
          '',
        toUid: uid,
        toDisplayName: person.displayName,
        atIso: new Date().toISOString(),
        replacedByUid: actor.id,
        ...(permit.egovSignatures?.performer
          ? { previousEgovSignature: permit.egovSignatures.performer }
          : {}),
      }

      const suspendOnReplace =
        permit.status === 'issued' || permit.status === 'in_progress'

      await updatePermit(permit.id, {
        performerUid: uid,
        ...(suspendOnReplace ? { status: 'suspended' as const } : {}),
        signatures: {
          ...permit.signatures,
          performerSigned: false,
        },
        performerReplacements: [...(permit.performerReplacements ?? []), replacement],
        ...(nextAbr ? { asor: nextAbr } : {}),
      })
      if (authMode === 'firebase') {
        await broadcastPermitNoticeClient(permit.id, 'performer_replaced')
        await provisionPermitSignersClient(permit.id)
        notifySigningInvitesRefresh()
      }
      showSuccess(
        `Производитель заменён: ${signerShortName(replacement.fromDisplayName) || '—'} → ${signerShortName(person.displayName)}`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось заменить производителя.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Замена производителя работ</h2>
      <p className="muted small">
        При каждой замене участникам отправляются push- и email-уведомления.
      </p>
      {error ? (
        <div className="alert error" role="alert">
          {error}
        </div>
      ) : null}
      <label className="small">
        Новый производитель работ
        <select value={nextUid} onChange={(e) => setNextUid(e.target.value)} disabled={busy}>
          {choices.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </label>
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn primary small"
          disabled={busy || nextUid === permit.performerUid}
          onClick={() => void replacePerformer()}
        >
          {busy ? 'Сохранение…' : 'Заменить производителя'}
        </button>
      </div>
    </section>
  )
}

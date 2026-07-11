import { useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { useSession } from '../context/SessionContext'
import { buildNdprExtensionPatch, canExtendNdpr } from '../lib/ndprExtension'
import { broadcastPermitNoticeClient } from '../lib/permitNotices'
import { permitValidityEndDate } from '../lib/permitValidity'

export function PermitExtensionCard(props: {
  permit: Permit
  actor: DemoUser
}) {
  const { permit, actor } = props
  const { updatePermit, authMode } = useSession()
  const [busy, setBusy] = useState(false)
  const canExtend = canExtendNdpr(permit, actor)
  const end = permitValidityEndDate(permit)

  if (actor.role !== 'performer' && actor.role !== 'coordinator') return null
  if (['closed', 'archived', 'annulled', 'draft', 'on_approval'].includes(permit.status)) {
    return null
  }
  if (!canExtend) return null

  async function extendNdpr() {
    setBusy(true)
    try {
      await updatePermit(permit.id, buildNdprExtensionPatch(permit))
      if (authMode === 'firebase') {
        await broadcastPermitNoticeClient(permit.id, 'ndpr_extended')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card permit-early-close" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Продление НДПР</h2>
      {end ? (
        <p className="muted small">
          Срок действия до:{' '}
          {end.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      ) : null}
      <p className="muted small">
        До окончания срока осталось менее 48 часов. Продление — на 1 сутки.
      </p>
      <button
        type="button"
        className="btn primary small"
        disabled={busy}
        onClick={() => void extendNdpr()}
      >
        {busy ? 'Продление…' : 'Продлить наряд'}
      </button>
    </section>
  )
}

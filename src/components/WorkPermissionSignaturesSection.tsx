import { useState } from 'react'
import type { Permit, DemoUser } from '../types/domain'
import type { StoredEgovSignature } from '../types/egovSignature'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import { WorkPermissionEgovSignModal } from './WorkPermissionEgovSignModal'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { assigneeUidForRole } from '../lib/signatureStatus'
import { openWorkPermissionPdf } from '../lib/openWorkPermissionPdf'
import { renderSingleWorkPermission } from '../lib/buildWorkPermissionPdf'
import { syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import {
  WORK_PERMISSION_SIGN_LABELS,
  WORK_PERMISSION_SIGN_ROLES,
  type WorkPermissionDocument,
  type WorkPermissionSignRole,
  type WorkPermissionsBundle,
} from '../types/workPermissions'
import { useNetwork } from '../context/NetworkContext'

function isPermissionRoleSigned(doc: WorkPermissionDocument, role: WorkPermissionSignRole): boolean {
  return Boolean(doc.egovSignatures?.[role]?.cmsBase64?.trim())
}

export function WorkPermissionSignaturesSection(props: {
  permit: Permit
  actor: DemoUser
  authMode: string
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
}) {
  const { permit, actor, authMode, updatePermit, resolveUser, userDirectory } = props
  const { online } = useNetwork()
  const bundle = permit.workPermissions
  const [modal, setModal] = useState<{
    doc: WorkPermissionDocument
    role: WorkPermissionSignRole
  } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!bundle?.documents?.length) return null
  if (permit.status === 'draft') return null

  function canSignRole(doc: WorkPermissionDocument, role: WorkPermissionSignRole): boolean {
    if (isPermissionRoleSigned(doc, role)) return false
    if (permit.status !== 'on_approval' && permit.status !== 'issued' && permit.status !== 'in_progress') {
      return false
    }
    const uid = assigneeUidForRole(permit, role)
    return actor.id === uid || actor.role === 'coordinator'
  }

  async function saveSignature(
    kind: WorkPermissionDocument['kind'],
    role: WorkPermissionSignRole,
    sig: StoredEgovSignature,
  ) {
    if (!bundle) return
    setBusy(true)
    try {
      const documents = bundle.documents.map((d) => {
        if (d.kind !== kind) return d
        const egovSignatures = { ...d.egovSignatures, [role]: sig }
        const signatures = [
          ...d.signatures.filter((s) => s.role !== role),
          {
            role,
            signedByUid: sig.signedByUid,
            signedByName: sig.signedByDisplayName,
            signedAtIso: sig.signedAtIso,
          },
        ]
        return { ...d, egovSignatures, signatures }
      })
      let next: WorkPermissionsBundle = { documents, updatedAtIso: new Date().toISOString() }
      next = {
        ...next,
        documents: await Promise.all(next.documents.map((d) => renderSingleWorkPermission(d))),
      }
      await syncWorkPermissionsLive({
        permit,
        bundle: next,
        updatePermit,
        resolveUser,
        userDirectory,
      })
    } finally {
      setBusy(false)
      setModal(null)
    }
  }

  return (
    <section className="card" id="work-permissions-section">
      <h2 style={{ marginTop: 0 }}>Разрешения — подписи</h2>
      <p className="muted small">
        Каждое спецразрешение подписывают производитель работ, выдающий НД и допускающий (ЭЦП eGov).
      </p>

      {bundle.documents.map((doc) => {
        const meta = WORK_PERMISSION_BY_KIND[doc.kind]
        return (
          <div key={doc.kind} className={`work-perm-sign-block work-perm-sign-block--${meta.style}`}>
            <header className="work-perm-sign-block__head">
              <WorkPermissionIcon kind={doc.kind} size={22} />
              <span className="strong">{doc.title}</span>
              <button
                type="button"
                className="btn ghost small"
                disabled={busy}
                onClick={() => void openWorkPermissionPdf(doc, permit)}
              >
                PDF
              </button>
            </header>
            <ul className="work-perm-sign-list">
              {WORK_PERMISSION_SIGN_ROLES.map((role) => {
                const signed = isPermissionRoleSigned(doc, role)
                const egov = doc.egovSignatures?.[role]
                const assignee = resolveUser(assigneeUidForRole(permit, role))
                return (
                  <li key={role} className="work-perm-sign-row">
                    <div>
                      <span className="strong">{WORK_PERMISSION_SIGN_LABELS[role]}</span>
                      <span className="muted xsmall" style={{ display: 'block' }}>
                        {assignee?.displayName ?? '—'}
                      </span>
                      {egov ? (
                        <span className="muted xsmall">
                          {egov.signedByDisplayName} · {new Date(egov.signedAtIso).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {signed ? (
                      <span className="badge status-issued">Подписано</span>
                    ) : canSignRole(doc, role) && authMode === 'firebase' ? (
                      <button
                        type="button"
                        className="btn primary small"
                        disabled={!online || busy}
                        onClick={() => setModal({ doc, role })}
                      >
                        ЭЦП eGov
                      </button>
                    ) : (
                      <span className="badge status-on_approval">Ожидает</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      {modal ? (
        <WorkPermissionEgovSignModal
          open
          permit={permit}
          doc={modal.doc}
          role={modal.role}
          signerUid={assigneeUidForRole(permit, modal.role)}
          signerName={resolveUser(assigneeUidForRole(permit, modal.role))?.displayName ?? actor.displayName}
          onClose={() => setModal(null)}
          onSigned={(sig) => void saveSignature(modal.doc.kind, modal.role, sig)}
        />
      ) : null}
    </section>
  )
}

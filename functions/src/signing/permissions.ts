import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import {
  ADDITIONAL_PERFORMER_ACCOUNT_TEMPLATES,
  SIGNER_ACCOUNT_TEMPLATES,
} from './signerTemplates'
import type { EgovSignRole } from './types'

function normEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export function assigneeUidForRole(
  permit: DocumentData,
  role: EgovSignRole,
): string {
  if (role === 'performer') return String(permit.performerUid ?? '')
  if (role === 'permitter') return String(permit.permitterUid ?? '')
  if (role === 'issuer') return String(permit.issuerUid ?? '')
  if (role === 'ert') {
    const uid = String(permit.ertUid ?? '').trim()
    return uid || 'u-ert'
  }
  return String(permit.leadExpertUid ?? '')
}

/** Demo-id в карточке наряда ↔ Firebase uid подписанта. */
export function isPlaceholderAssigneeUid(uid: string): boolean {
  const id = uid.trim()
  return id.startsWith('u-') || id.startsWith('default-')
}

function templateEmailsForRole(role: EgovSignRole): string[] {
  const emails: string[] = []
  const main = SIGNER_ACCOUNT_TEMPLATES[role]
  if (main?.email) emails.push(normEmail(main.email))
  if (role === 'performer') {
    for (const t of ADDITIONAL_PERFORMER_ACCOUNT_TEMPLATES) {
      if (t.email) emails.push(normEmail(t.email))
    }
  }
  return emails
}

/** Firebase uid ↔ demo-id ↔ email назначенного участника. */
export function uidMatchesAssignee(
  assigneeUid: string,
  actorUid: string,
  actorEmail: string,
  role: EgovSignRole,
  assigneeEmail?: string,
): boolean {
  const assigned = assigneeUid.trim()
  const uid = actorUid.trim()
  if (!assigned || !uid) return false
  if (assigned === uid) return true

  const actor = normEmail(actorEmail)
  if (!actor) return false

  const assignee = normEmail(assigneeEmail)
  if (assignee && actor === assignee) return true

  return templateEmailsForRole(role).includes(actor)
}

export function canUserSignRole(
  user: DocumentData,
  uid: string,
  permit: DocumentData,
  role: EgovSignRole,
  opts?: { assigneeEmail?: string },
): boolean {
  if (String(user.role ?? '') === 'coordinator') return true
  const userRole = String(user.role ?? '')
  if (role === 'performer' && userRole === 'performer') return true
  if (role === 'permitter' && userRole === 'permitter') return true
  if (role === 'issuer' && userRole === 'issuer') return true
  if (role === 'leadExpert' && userRole === 'leadExpert') return true
  if (role === 'ert' && userRole === 'ert') return true
  const assigneeUid = assigneeUidForRole(permit, role)
  return uidMatchesAssignee(
    assigneeUid,
    uid,
    String(user.email ?? ''),
    role,
    opts?.assigneeEmail,
  )
}

export async function loadAssigneeEmail(
  db: Firestore,
  assigneeUid: string,
): Promise<string | undefined> {
  const uid = assigneeUid.trim()
  if (!uid || uid.startsWith('u-') || uid.startsWith('default-')) return undefined
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) return undefined
  const email = String(snap.data()?.email ?? '').trim()
  return email || undefined
}

export function signatureFlagKey(
  role: EgovSignRole,
):
  | 'performerSigned'
  | 'permitterSigned'
  | 'issuerSigned'
  | 'leadExpertSigned'
  | 'ertSigned' {
  if (role === 'performer') return 'performerSigned'
  if (role === 'permitter') return 'permitterSigned'
  if (role === 'issuer') return 'issuerSigned'
  if (role === 'ert') return 'ertSigned'
  return 'leadExpertSigned'
}

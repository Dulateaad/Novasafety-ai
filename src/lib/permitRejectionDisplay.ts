import type { DemoUser, Permit, UserRole } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { roleLabel, type LanguageCode } from '../i18n/getLocale'
import { rejectionNoticeDismissKey } from './rejectionNoticeDismissal'

const EGOV_ROLES = new Set<EgovSignRole>([
  'performer',
  'permitter',
  'issuer',
  'leadExpert',
])

/** Пакет отклонён на согласовании (новый статус или legacy draft + lastRejection). */
export function isPermitSigningRejected(permit: Permit): boolean {
  if (permit.status === 'rejected') return true
  return permit.status === 'draft' && Boolean(permit.lastRejection)
}

export function rejectionSignerRole(permit: Permit): EgovSignRole | null {
  const role = permit.lastRejection?.byRole
  if (!role || !EGOV_ROLES.has(role as EgovSignRole)) return null
  return role as EgovSignRole
}

export function rejectionRejectorName(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
): string {
  const rejection = permit.lastRejection
  if (!rejection) return '—'
  return resolveUser(rejection.byUid)?.displayName ?? rejection.byUid
}

export function rejectionRejectorRoleLabel(
  permit: Permit,
  code?: LanguageCode,
): string {
  const rejection = permit.lastRejection
  if (!rejection) return '—'
  return roleLabel(rejection.byRole as UserRole, code)
}

export function rejectionActorLabel(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  code?: LanguageCode,
): string {
  return `${rejectionRejectorRoleLabel(permit, code)} · ${rejectionRejectorName(permit, resolveUser)}`
}

export function formatRejectionDateTime(atIso: string): string {
  return new Date(atIso).toLocaleString()
}

/** Участник согласования: одна из 4 ролей или координатор. */
export function isPermitApprovalStakeholder(
  permit: Permit,
  user: DemoUser,
): boolean {
  if (user.role === 'coordinator') return true
  const uids = [
    permit.performerUid,
    permit.permitterUid,
    permit.issuerUid,
    permit.leadExpertUid,
  ]
    .map((uid) => uid.trim())
    .filter(Boolean)
  return uids.includes(user.id)
}

/** Пользователь отклонил этот пакет на согласовании. */
export function isUserRejectionRejector(permit: Permit, user: DemoUser): boolean {
  const byUid = permit.lastRejection?.byUid?.trim()
  return Boolean(byUid && byUid === user.id)
}

/** Показывать уведомление об отклонении в журнале (не отклонившему и не закрывшему). */
export function shouldShowRejectionNotice(
  permit: Permit,
  user: DemoUser,
  dismissedKeys: ReadonlySet<string> = new Set(),
): boolean {
  if (!isPermitSigningRejected(permit)) return false
  if (!isPermitApprovalStakeholder(permit, user)) return false
  if (isUserRejectionRejector(permit, user)) return false
  const key = rejectionNoticeDismissKey(permit)
  if (key && dismissedKeys.has(key)) return false
  return true
}

export function rejectedPermitsForUser(
  permits: readonly Permit[],
  user: DemoUser,
  dismissedKeys: ReadonlySet<string> = new Set(),
): Permit[] {
  return permits.filter((p) => shouldShowRejectionNotice(p, user, dismissedKeys))
}

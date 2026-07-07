import type { DemoUser, Permit, UserRole } from '../types/domain'
import { DEMO_USERS } from '../demoUsers'
import { fillTemplate, localeMessages, roleLabel } from '../i18n/getLocale'
import { resolveWorkerUid } from './resolveWorkerUid'
import { isNdGatePassed } from './ndGate'
import { isNavRouteAccessible, navRouteLockedHint } from './navGates'
import { isPprGatePassed } from './pprGate'
import { permitVisibleToPermitter } from './permitterApprovalGate'

const APPROVAL_ROLES = new Set([
  'coordinator',
  'performer',
  'permitter',
  'issuer',
  'leadExpert',
  'ert',
  'safety',
])

/** Выданные и активные наряды видны всем — для экстренной остановки работ. */
const WORK_STOP_JOURNAL_STATUSES = new Set<Permit['status']>([
  'issued',
  'in_progress',
  'suspended',
])

function mergeWorkStopJournalPermits(primary: Permit[], all: Permit[]): Permit[] {
  const ids = new Set(primary.map((p) => p.id))
  const extra = all.filter(
    (p) => WORK_STOP_JOURNAL_STATUSES.has(p.status) && !ids.has(p.id),
  )
  return extra.length ? [...primary, ...extra] : primary
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function emailsForUid(uid: string, directory: DemoUser[]): string[] {
  const emails: string[] = []
  const fromDir = directory.find((u) => u.id === uid)
  if (fromDir?.email) emails.push(normalizeEmail(fromDir.email))
  const fromDemo = DEMO_USERS.find((u) => u.id === uid)
  if (fromDemo?.email) emails.push(normalizeEmail(fromDemo.email))
  return emails
}

/** Совпадение uid наряда с учётной записью (Firebase uid ↔ демо-id по email). */
export function uidMatchesAccount(
  assigneeUid: string,
  user: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  const uid = assigneeUid.trim()
  if (!uid) return false
  if (uid === user.id) return true
  const userEmail = normalizeEmail(user.email)
  if (!userEmail) return false
  return emailsForUid(uid, directory).some((e) => e === userEmail)
}

export function isUserOnPermitCrew(
  permit: Permit,
  userId: string,
  user?: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  for (const ex of permit.executors) {
    const raw = ex.userUid.trim()
    if (!raw) continue
    if (raw === userId) return true
    if (resolveWorkerUid(directory, raw) === userId) return true
    if (user && uidMatchesAccount(raw, user, directory)) return true
  }
  return false
}

export function isUserPermitParticipant(
  permit: Permit,
  userOrId: string | DemoUser,
  directory: DemoUser[] = [],
): boolean {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.id
  const user = typeof userOrId === 'string' ? undefined : userOrId
  const uids = [
    permit.performerUid,
    permit.permitterUid,
    permit.issuerUid,
    permit.leadExpertUid,
    permit.ertUid,
    ...permit.executors.map((ex) => ex.userUid),
  ]
    .map((uid) => uid?.trim())
    .filter((uid): uid is string => Boolean(uid))
  if (uids.includes(userId)) return true
  if (!user) return false
  return uids.some((uid) => uidMatchesAccount(uid, user, directory))
}

export function filterPermitsForUser(
  permits: Permit[],
  user: DemoUser | null,
  directory: DemoUser[] = [],
): Permit[] {
  if (!user) return []
  if (user.role === 'executor') {
    const mine = permits.filter(
      (p) =>
        p.status !== 'draft' &&
        (isUserOnPermitCrew(p, user.id, user, directory) ||
          !!p.crewAckSignatures?.[user.id]?.cmsBase64?.trim()),
    )
    return mergeWorkStopJournalPermits(mine, permits)
  }
  if (user.role === 'permitter') {
    const mine = permits.filter((p) => permitVisibleToPermitter(p, user, directory))
    return mergeWorkStopJournalPermits(mine, permits)
  }
  if (APPROVAL_ROLES.has(user.role)) return permits
  const mine = permits.filter((p) => isUserPermitParticipant(p, user, directory))
  return mergeWorkStopJournalPermits(mine, permits)
}

const PACKAGE_AUTHOR_ROLES: readonly UserRole[] = [
  'coordinator',
  'performer',
  'contractor',
  'issuer',
]

export function canUserCreatePermitPackage(user: DemoUser | null): boolean {
  if (!user) return false
  return PACKAGE_AUTHOR_ROLES.includes(user.role)
}

/** Отправка черновика на согласование (draft → on_approval). */
export function canUserSubmitPermitPackage(user: DemoUser | null): boolean {
  if (!user) return false
  return PACKAGE_AUTHOR_ROLES.includes(user.role)
}

export function submitPermitPackageDeniedReason(user: DemoUser | null): string {
  const a = localeMessages().access
  if (!user) return a.loginRequired
  return fillTemplate(a.submitDenied, { role: roleLabel(user.role) })
}

const APPROVER_EMPTY_HINT_ROLES = new Set<UserRole>([
  'issuer',
  'leadExpert',
  'ert',
  'safety',
])

/** Подсказка в пустом журнале — по роли пользователя. */
export function journalEmptyHint(
  user: DemoUser | null,
  messages: {
    emptyHintCreate: string
    emptyHintWait: string
    emptyHintPermitter: string
    emptyHintApprover: string
  },
): string {
  if (canUserCreatePermitPackage(user)) return messages.emptyHintCreate
  if (user?.role === 'permitter') return messages.emptyHintPermitter
  if (user && APPROVER_EMPTY_HINT_ROLES.has(user.role)) return messages.emptyHintApprover
  return messages.emptyHintWait
}

/** Составитель пакета — всегда текущий пользователь с ролью «производитель работ». */
export function resolvePerformerUidForPackage(
  draftPerformerUid: string,
  user: DemoUser | null,
  directory: DemoUser[],
): string {
  const trimmed = draftPerformerUid.trim()
  if (!user || user.role !== 'performer') return trimmed
  const selfInPool = directory.some((u) => u.id === user.id && u.role === 'performer')
  return selfInPool ? user.id : trimmed
}

export function isWorkerOnlyUser(user: DemoUser | null): boolean {
  return user?.role === 'executor'
}

/** F02, реквизиты и матрица в карточке наряда — только координатору. */
export function canViewPermitDetailTechnicalBlocks(user: DemoUser | null): boolean {
  return user?.role === 'coordinator'
}

export function isNavRouteAccessibleForUser(to: string, user: DemoUser | null): boolean {
  if (!user) return false
  if (user.role === 'executor') {
    return to === '/' || to.startsWith('/p/')
  }
  if (user.role === 'ert') {
    return to === '/' || to.startsWith('/p/') || to === '/help'
  }
  if (to === '/admin') return user.role === 'coordinator'
  if (to === '/' || to === '/ppr') return true
  if (to === '/new' || to === '/certificates') {
    return isPprGatePassed()
  }
  if (to === '/risk-assessment') {
    return isNdGatePassed()
  }
  if (to === '/permissions') {
    return isNavRouteAccessible(to) && canUserSubmitPermitPackage(user)
  }
  return true
}

export function navRouteLockedHintForUser(
  to: string,
  user: DemoUser | null,
): string | null {
  if (!user) return 'Войдите в систему.'
  if (user.role === 'executor') {
    if (to === '/') return null
    if (to.startsWith('/p/')) return null
    return 'Работникам доступен только журнал и подписание ознакомления по назначенным нарядам.'
  }
  if (user.role === 'ert') {
    if (to === '/' || to.startsWith('/p/') || to === '/help') return null
    return 'ПАС (Пожарно-аварийная служба): доступны журнал нарядов, карточка наряда (газотест) и справка.'
  }
  if (to === '/admin' && user.role !== 'coordinator') {
    return 'Админ-панель доступна только координатору.'
  }
  if (to === '/permissions' && !canUserSubmitPermitPackage(user)) {
    return 'Раздел «Разрешения» заполняет производитель при создании наряда. Допускающий отмечает колонку «Имеется» на карточке наряда в журнале.'
  }
  return isNavRouteAccessible(to) ? null : navRouteLockedHint(to)
}

import type { DemoUser, UserRole } from '../types/domain'
import { isExcludedWorkerDirectoryUser } from '../config/excludedDirectoryUsers'
import { uidMatchesAccount } from './permitAccess'
import { resolveWorkerUid } from './resolveWorkerUid'

function workerPool(directory: DemoUser[]): DemoUser[] {
  return directory.filter(
    (u) => u.role === 'executor' && !isExcludedWorkerDirectoryUser(u),
  )
}

/** Один и тот же работник (Firebase uid ↔ demo-id, email). */
export function executorAccountsConflict(
  leftUid: string,
  rightUid: string,
  directory: DemoUser[] = [],
): boolean {
  const a = leftUid.trim()
  const b = rightUid.trim()
  if (!a || !b) return false
  if (a === b) return true
  const resolvedA = resolveWorkerUid(directory, a)
  const resolvedB = resolveWorkerUid(directory, b)
  if (resolvedA && resolvedB && resolvedA === resolvedB) return true
  const userA = directory.find((u) => u.id === a)
  const userB = directory.find((u) => u.id === b)
  if (userA && uidMatchesAccount(b, userA, directory)) return true
  if (userB && uidMatchesAccount(a, userB, directory)) return true
  return false
}

/** Есть ли ещё работник, не занятый в других строках бригады. */
export function hasAvailableWorkerForCrew(
  directory: DemoUser[],
  executors: { userUid: string }[],
): boolean {
  const pool = workerPool(directory)
  return pool.some((u) =>
    executors.every((ex) => !executorAccountsConflict(u.id, ex.userUid, directory)),
  )
}

/** Варианты для строки таблицы: без повторного выбора одного того же аккаунта в других строках. */
export function workerChoicesForRow(
  directory: DemoUser[],
  executors: { id: string; userUid: string }[],
  rowId: string,
): DemoUser[] {
  return workerPool(directory).filter((u) =>
    executors.every(
      (ex) => ex.id === rowId || !executorAccountsConflict(u.id, ex.userUid, directory),
    ),
  )
}

/** Первый свободный uid из списка ролей «работник» или null, если все заняты. */
export function firstUnusedWorkerUid(
  directory: DemoUser[],
  usedUids: ReadonlySet<string>,
): string | null {
  const base = workerPool(directory)
  const free = base.find(
    (u) =>
      !usedUids.has(u.id) &&
      ![...usedUids].some((used) => executorAccountsConflict(u.id, used, directory)),
  )
  return free?.id ?? null
}

/** Кандидаты с нужными ролями или весь каталог (как для выдающего / производителя). */
export function usersForField(
  directory: DemoUser[],
  roles: UserRole[],
): DemoUser[] {
  return usersMatchingRoles(directory, roles)
}

/** Кандидаты с нужными ролями или весь каталог (как для выдающего / производителя). */
export function usersMatchingRoles(
  directory: DemoUser[],
  roles: UserRole[],
): DemoUser[] {
  const filtered = directory.filter((u) => roles.includes(u.role))
  return filtered.length > 0 ? filtered : directory
}

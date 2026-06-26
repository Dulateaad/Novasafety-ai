import type { DemoUser, UserRole } from '../types/domain'

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

/** Варианты для строки таблицы: без повторного выбора одного того же аккаунта в других строках. */
export function workerChoicesForRow(
  directory: DemoUser[],
  executors: { id: string; userUid: string }[],
  rowId: string,
): DemoUser[] {
  const base = directory.filter((u) => u.role === 'executor')
  return base.filter(
    (u) => executors.every((ex) => ex.id === rowId || ex.userUid !== u.id),
  )
}

/** Первый свободный uid из списка ролей «работник» или null, если все заняты. */
export function firstUnusedWorkerUid(
  directory: DemoUser[],
  usedUids: ReadonlySet<string>,
): string | null {
  const base = directory.filter((u) => u.role === 'executor')
  const free = base.find((u) => !usedUids.has(u.id))
  return free?.id ?? null
}

import type { DemoUser, WorkExecutor } from '../types/domain'
import { isExcludedWorkerDirectoryUser } from '../config/excludedDirectoryUsers'
import { usersMatchingRoles } from './directoryUsers'

function shuffle<T>(items: T[]): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** 2–4 работника, если в справочнике достаточно людей. */
export function randomExecutorCount(poolSize: number): number {
  if (poolSize <= 0) return 0
  if (poolSize === 1) return 1
  const min = Math.min(2, poolSize)
  const max = Math.min(4, poolSize)
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** Случайный состав бригады из роли «работник» (без повторов). */
export function buildRandomExecutorRows(
  directory: DemoUser[],
  count?: number,
): WorkExecutor[] {
  const pool = usersMatchingRoles(directory, ['executor']).filter(
    (u) => !isExcludedWorkerDirectoryUser(u),
  )
  if (pool.length === 0) return []

  const take = count ?? randomExecutorCount(pool.length)
  const today = new Date().toISOString().slice(0, 10)

  return shuffle(pool)
    .slice(0, take)
    .map((user) => ({
      id: crypto.randomUUID(),
      userUid: user.id,
      dateIso: today,
      briefingAcknowledged: false,
    }))
}

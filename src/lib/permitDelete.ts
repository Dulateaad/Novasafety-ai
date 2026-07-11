import type { DemoUser, Permit } from '../types/domain'

/** Координатор может удалять наряды, кроме черновиков. */
export function canUserDeletePermit(
  actor: DemoUser,
  permit?: Pick<Permit, 'status'> | null,
): boolean {
  if (actor.role !== 'coordinator') return false
  if (permit && permit.status === 'draft') return false
  return true
}

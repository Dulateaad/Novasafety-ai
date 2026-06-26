import type { DemoUser } from '../types/domain'

export function canUserDeletePermit(actor: DemoUser): boolean {
  return actor.role === 'coordinator'
}

import type { DemoUser, Permit, UserRole } from '../types/domain'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import type { InspectorNotifyMode } from '../types/workStop'

export function isInspectorRole(role: UserRole): boolean {
  return role === 'safety'
}

export function isInspectorUser(user: DemoUser | null | undefined): boolean {
  return !!user && isInspectorRole(user.role)
}

const STOP_ELIGIBLE = new Set<Permit['status']>(['issued', 'in_progress'])

/** Любой вошедший пользователь может инициировать остановку выданного/активного наряда. */
export function canUserInitiateWorkStop(
  permit: Permit,
  user: DemoUser | null,
): boolean {
  if (!user) return false
  if (!STOP_ELIGIBLE.has(permit.status)) return false
  if (permit.workStop?.status === 'pending') return false
  return true
}

export function canInspectorAnnulPermit(user: DemoUser | null): boolean {
  return isInspectorUser(user)
}

export function canInspectorResolveWorkStop(
  permit: Permit,
  user: DemoUser | null,
): boolean {
  if (!isInspectorUser(user)) return false
  return permit.workStop?.status === 'pending'
}

export function inspectorDeniedAnnulReason(user: DemoUser | null): string {
  if (!user) return 'Войдите в систему.'
  return `Аннулировать НДПР может только ${INSPECTOR_ROLE_TITLE}. Вы вошли как ${user.displayName}.`
}

export function inspectorAssigneesForPermit(
  directory: DemoUser[],
  permit: Permit,
  mode: InspectorNotifyMode = 'global',
): DemoUser[] {
  const inspectors = directory.filter((u) => isInspectorRole(u.role))
  if (!inspectors.length) return []

  if (mode === 'global') return inspectors

  const site = permit.siteName.trim()
  return inspectors.filter((u) => {
    const zones = u.inspectorSites?.map((s) => s.trim()).filter(Boolean) ?? []
    if (!zones.length) return true
    if (!site) return true
    return zones.some((z) => site.includes(z) || z.includes(site))
  })
}

import type { DemoUser } from '../types/domain'

/** Стартовая страница после входа: координатор сразу в админ-панель. */
export function homeRouteForUser(user: DemoUser | null | undefined): string {
  if (user?.role === 'coordinator') return '/admin'
  return '/'
}

/** Куда вернуть после логина (не перебиваем явный deep-link, кроме журнала для админа). */
export function postLoginRoute(user: DemoUser, from: string): string {
  const path = from?.trim() || '/'
  if (user.role === 'coordinator' && (path === '/' || path === '/login')) {
    return '/admin'
  }
  return path || '/'
}

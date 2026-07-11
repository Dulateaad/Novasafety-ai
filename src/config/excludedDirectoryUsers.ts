import type { DemoUser } from '../types/domain'

const EXCLUDED_EMAILS = new Set<string>()
const EXCLUDED_UIDS = new Set(['u-performer-6'])
const EXCLUDED_NAME_PATTERNS = [/абылай/i, /акмали/i]

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Скрыть из списков выбора работников (исполнителей бригады). */
export function isExcludedWorkerDirectoryUser(user: DemoUser): boolean {
  if (EXCLUDED_UIDS.has(user.id)) return true
  const email = normalizedEmail(user.email ?? '')
  if (email && EXCLUDED_EMAILS.has(email)) return true
  const name = user.displayName.trim()
  if (name && EXCLUDED_NAME_PATTERNS.some((p) => p.test(name))) return true
  return false
}

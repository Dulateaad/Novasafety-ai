import type { PermitNotice } from '../types/permitNotice'

function storageKey(userId: string): string {
  return `nova_permit_notice_dismissed_v1_${userId}`
}

export function loadDismissedPermitNoticeIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function dismissPermitNotice(userId: string, notice: PermitNotice): Set<string> {
  const next = loadDismissedPermitNoticeIds(userId)
  next.add(notice.id)
  localStorage.setItem(storageKey(userId), JSON.stringify([...next]))
  return next
}

import type { DemoUser, Permit, PermitStatus } from '../types/domain'

import { fillTemplate, localeMessages, statusLabel } from '../i18n/getLocale'

import { requiresWorkPermissions } from './workPermissions'

import type { WorkPermissionCheckboxItem } from '../types/workPermissions'

const PRE_WORK_EDIT_STATUSES = new Set<PermitStatus>([
  'on_approval',
  'issued',
  'in_progress',
  'suspended',
])

export function preWorkChecksStarted(items: WorkPermissionCheckboxItem[]): boolean {
  return items.some((item) => item.checked || item.note.trim().length > 0)
}

function isAssignedPermitter(
  permit: Permit,
  actor: DemoUser,
  resolveUser?: (uid: string) => DemoUser | undefined,
): boolean {
  const assigned = permit.permitterUid?.trim()
  if (!assigned) return true
  if (assigned === actor.id) return true

  const actorEmail = actor.email?.trim().toLowerCase()
  const assignedUser = resolveUser?.(assigned)
  const assignedEmail = assignedUser?.email?.trim().toLowerCase()
  if (actorEmail && assignedEmail && actorEmail === assignedEmail) return true

  // Наряд мог сохранить demo-id (u-permitter), а вход — по Firebase UID с тем же email.
  if (actorEmail === 'permitter@nova.local') {
    return assigned === 'u-permitter' || assignedEmail === 'permitter@nova.local'
  }

  return false
}

/** Раздел 3 разрешений заполняет допускающий (колонка «Имеется»). */
export function canPermitterEditPreWorkChecks(
  permit: Permit,
  actor: DemoUser,
  resolveUser?: (uid: string) => DemoUser | undefined,
): boolean {
  if (actor.role !== 'permitter') return false
  if (!isAssignedPermitter(permit, actor, resolveUser)) return false
  return PRE_WORK_EDIT_STATUSES.has(permit.status)
}

export function permitterPreWorkBlockedHint(status: PermitStatus): string {
  const p = localeMessages().preWorkCheck
  if (status === 'on_approval') return p.onApprovalHint
  if (status === 'draft') return p.draftHint
  if (status === 'closed' || status === 'archived' || status === 'annulled') {
    return fillTemplate(p.closedHint, { status: statusLabel(status) })
  }
  if (status === 'rejected') return p.rejectedHint
  return fillTemplate(p.editHint, { status: statusLabel(status) })
}

export function permitterPreWorkDocsNeedingFill(permit: Permit): number {
  const docs = permit.workPermissions?.documents ?? []
  return docs.filter((doc) => {
    if (doc.kind === 'confined_space') return false
    return !preWorkChecksStarted(doc.form.preWorkChecks.items)
  }).length
}

export function permitterPreWorkTaskSummary(permit: Permit): string | null {
  const p = localeMessages().preWorkCheck
  if (!requiresWorkPermissions(permit)) return null
  if (!permit.workPermissions?.documents?.length) return p.noPermissions

  const editable = permit.workPermissions.documents.filter((d) => d.kind !== 'confined_space')
  if (editable.length === 0) return null

  if (!PRE_WORK_EDIT_STATUSES.has(permit.status)) {
    return permitterPreWorkBlockedHint(permit.status)
  }

  const empty = permitterPreWorkDocsNeedingFill(permit)
  if (empty > 0) {
    return fillTemplate(p.fillChecks, { empty })
  }
  return p.checksFilled
}

export type PermitterPreWorkTask = {
  permit: Permit
  summary: string
  needsFill: boolean
}

/** @deprecated Используйте PermitterPreWorkTask */
export type PerformerPreWorkTask = PermitterPreWorkTask

/** Задания допускающего: заполнить раздел 3 разрешений. */
export function permitterPreWorkTasksForUser(
  permits: Permit[],
  user: DemoUser | null | undefined,
): PermitterPreWorkTask[] {
  if (!user || user.role !== 'permitter') return []

  const items: PermitterPreWorkTask[] = []

  for (const permit of permits) {
    if (!canPermitterEditPreWorkChecks(permit, user)) continue

    const empty = permitterPreWorkDocsNeedingFill(permit)
    if (empty === 0) continue

    const summary = permitterPreWorkTaskSummary(permit)
    if (!summary) continue

    items.push({ permit, summary, needsFill: true })
  }

  return items.sort((a, b) =>
    (b.permit.updatedAtIso ?? '').localeCompare(a.permit.updatedAtIso ?? ''),
  )
}

/** @deprecated Используйте permitterPreWorkTasksForUser */
export const performerPreWorkTasksForUser = permitterPreWorkTasksForUser

/** @deprecated Используйте canPermitterEditPreWorkChecks */
export const canPerformerEditPreWorkChecks = canPermitterEditPreWorkChecks

/** @deprecated Используйте permitterPreWorkBlockedHint */
export const performerPreWorkBlockedHint = permitterPreWorkBlockedHint

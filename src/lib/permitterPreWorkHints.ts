import type { DemoUser, Permit, PermitStatus } from '../types/domain'

import { fillTemplate, localeMessages, statusLabel } from '../i18n/getLocale'

import { uidMatchesAccount } from './permitAccess'
import { permitterOnApprovalUnlocked } from './permitterApprovalGate'
import { isRoleSigned } from './signatureStatus'

import { requiredPermissionKinds, requiresWorkPermissions } from './workPermissions'

import {
  FIRE_CHECK_PAIRS,
  GAS_HAZARD_CHECK_PAIRS,
} from '../config/workPermissionPdfTemplate'

import type {
  WorkPermissionCheckboxGroup,
  WorkPermissionCheckboxItem,
  WorkPermissionDocument,
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'

const PRE_WORK_EDIT_STATUSES = new Set<PermitStatus>([
  'on_approval',
  'issued',
  'in_progress',
  'suspended',
])

/** Задания в журнале — только на согласовании (до подписи допускающего). */
const PRE_WORK_TASK_STATUSES = new Set<PermitStatus>(['on_approval'])

function preWorkPairsForKind(kind: WorkPermissionKind) {
  if (kind === 'open_flame_fire') return FIRE_CHECK_PAIRS
  if (kind === 'gas_hazard') return GAS_HAZARD_CHECK_PAIRS
  return null
}

/** Только пункты из таблицы раздела 3 (пары PDF), без лишних записей в массиве. */
export function normalizePreWorkChecksForKind(
  kind: WorkPermissionKind,
  group: WorkPermissionCheckboxGroup,
): WorkPermissionCheckboxGroup {
  const pairs = preWorkPairsForKind(kind)
  if (!pairs?.length) return group
  const byId = new Map(group.items.map((i) => [i.id, i]))
  const items = pairs.flatMap((p) => {
    const left = byId.get(p.leftId)
    const right = byId.get(p.rightId)
    return [
      left
        ? { ...left, label: p.left }
        : { id: p.leftId, label: p.left, checked: false, required: false, note: '' },
      right
        ? { ...right, label: p.right }
        : { id: p.rightId, label: p.right, checked: false, required: false, note: '' },
    ]
  })
  return { ...group, items }
}

export function normalizePreWorkChecksInBundle(bundle: WorkPermissionsBundle): WorkPermissionsBundle {
  return {
    ...bundle,
    documents: bundle.documents.map((doc) => ({
      ...doc,
      form: {
        ...doc.form,
        preWorkChecks: normalizePreWorkChecksForKind(doc.kind, doc.form.preWorkChecks),
      },
    })),
  }
}

/** Есть несохранённые отметки «Имеется» относительно данных на сервере. */
export function permitterPreWorkHasUnsavedChanges(
  permit: Permit,
  local: WorkPermissionsBundle,
  server: WorkPermissionsBundle | undefined,
): boolean {
  if (!server?.documents?.length) return true
  const localNorm = normalizePreWorkChecksInBundle(local)
  const serverNorm = normalizePreWorkChecksInBundle(server)
  for (const doc of permitterPreWorkRequiredDocuments(permit, localNorm)) {
    const serverDoc = serverNorm.documents.find((d) => d.kind === doc.kind)
    if (!serverDoc) return true
    const pairs = preWorkPairsForKind(doc.kind)
    if (!pairs?.length) continue
    const localById = new Map(doc.form.preWorkChecks.items.map((i) => [i.id, i]))
    const serverById = new Map(serverDoc.form.preWorkChecks.items.map((i) => [i.id, i]))
    for (const pair of pairs) {
      for (const id of [pair.leftId, pair.rightId]) {
        const localChecked = Boolean(localById.get(id)?.checked)
        const serverChecked = Boolean(serverById.get(id)?.checked)
        if (localChecked !== serverChecked) return true
      }
    }
  }
  return false
}

/** Колонка «Имеется» заполнена для всех строк таблицы раздела 3. */
export function preWorkAvailableColumnCompleteForKind(
  kind: WorkPermissionKind,
  items: WorkPermissionCheckboxItem[],
): boolean {
  const pairs = preWorkPairsForKind(kind)
  if (!pairs?.length) return preWorkAvailableColumnComplete(items)
  const byId = new Map(items.map((i) => [i.id, i]))
  for (const pair of pairs) {
    if (!byId.get(pair.leftId)?.checked) return false
    if (!byId.get(pair.rightId)?.checked) return false
  }
  return true
}

/** Раздел 3 заполнен допускающим — все пункты отмечены в колонке «Имеется». */
export function preWorkAvailableColumnComplete(items: WorkPermissionCheckboxItem[]): boolean {
  if (items.length === 0) return true
  return items.every((item) => item.checked)
}

/** @deprecated Используйте preWorkAvailableColumnComplete */
export function preWorkChecksStarted(items: WorkPermissionCheckboxItem[]): boolean {
  return preWorkAvailableColumnComplete(items)
}

function isAssignedPermitter(
  permit: Permit,
  actor: DemoUser,
  _resolveUser?: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): boolean {
  const assigned = permit.permitterUid?.trim()
  if (!assigned) return true
  return uidMatchesAccount(assigned, actor, directory)
}

/** Раздел 3 разрешений заполняет допускающий (колонка «Имеется»). */
export function canPermitterEditPreWorkChecks(
  permit: Permit,
  actor: DemoUser,
  resolveUser?: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): boolean {
  if (actor.role !== 'permitter') return false
  if (!isAssignedPermitter(permit, actor, resolveUser, directory)) return false
  if (permit.status === 'on_approval' && !permitterOnApprovalUnlocked(permit, directory)) {
    return false
  }
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

/** Разрешения, где допускающий заполняет раздел 3 (колонка «Имеется»). */
export function permitterPreWorkRequiredDocuments(
  permit: Permit,
  bundle: WorkPermissionsBundle,
): WorkPermissionDocument[] {
  const required = new Set(requiredPermissionKinds(permit))
  return bundle.documents.filter(
    (doc) => doc.kind !== 'confined_space' && required.has(doc.kind),
  )
}

export function permitterPreWorkDocsNeedingFill(permit: Permit): number {
  const bundle = permit.workPermissions
  if (!bundle?.documents?.length) return 0
  const normalized = normalizePreWorkChecksInBundle(bundle)
  return permitterPreWorkRequiredDocuments(permit, normalized).filter(
    (doc) => !preWorkAvailableColumnCompleteForKind(doc.kind, doc.form.preWorkChecks.items),
  ).length
}

/** Сколько пунктов «Имеется» ещё не отмечено (по строкам таблицы). */
export function permitterPreWorkItemsRemaining(permit: Permit): number {
  const bundle = permit.workPermissions
  if (!bundle?.documents?.length) return 0
  const normalized = normalizePreWorkChecksInBundle(bundle)
  let remaining = 0
  for (const doc of permitterPreWorkRequiredDocuments(permit, normalized)) {
    const pairs = preWorkPairsForKind(doc.kind)
    if (!pairs?.length) continue
    const byId = new Map(doc.form.preWorkChecks.items.map((i) => [i.id, i]))
    for (const pair of pairs) {
      if (!byId.get(pair.leftId)?.checked) remaining++
      if (!byId.get(pair.rightId)?.checked) remaining++
    }
  }
  return remaining
}

/** Наряд с нормализованным bundle разрешений (для проверки подписи). */
export function permitWithNormalizedWorkPermissions(
  permit: Permit,
  workPermissions?: WorkPermissionsBundle | null,
): Permit {
  const wp = workPermissions ?? permit.workPermissions
  if (!wp) return permit
  return { ...permit, workPermissions: normalizePreWorkChecksInBundle(wp) }
}

/** Допускающий нажал «Сохранить проверки» (не обязательно все пункты «Имеется»). */
export function permitterPreWorkSavedForSign(permit: Permit): boolean {
  return Boolean(permit.workPermissions?.permitterPreWorkSavedAtIso?.trim())
}

/** Подпись допускающего не блокируется разделом 3 — проверки опциональны для PDF. */
export function permitterPreWorkAllowsSign(permit: Permit): boolean {
  if (!requiresWorkPermissions(permit)) return true
  // Без сформированных разрешений подписывать нечего в PDF, но ЭЦП НДПР не блокируем.
  return true
}

export function permitterPreWorkSignBlockedReason(permit: Permit): string {
  void permit
  return ''
}

/** Задание допускающего закрыто только после явного «Сохранить проверки». */
export function permitterPreWorkComplete(permit: Permit): boolean {
  if (!requiresWorkPermissions(permit)) return true
  return permitterPreWorkSavedForSign(permit)
}

export function permitterPreWorkTaskSummary(permit: Permit): string | null {
  const p = localeMessages().preWorkCheck
  if (!requiresWorkPermissions(permit)) return null
  if (!permit.workPermissions?.documents?.length) return p.noPermissions

  const editable = permit.workPermissions.documents.filter((d) => d.kind !== 'confined_space')
  if (editable.length === 0) return null

  if (!PRE_WORK_TASK_STATUSES.has(permit.status)) {
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

/** Задания допускающего: заполнить раздел 3 разрешений на согласовании. */
export function permitterPreWorkTasksForUser(
  permits: Permit[],
  user: DemoUser | null | undefined,
  resolveUser?: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): PermitterPreWorkTask[] {
  if (!user || user.role !== 'permitter') return []

  const items: PermitterPreWorkTask[] = []

  for (const permit of permits) {
    if (!PRE_WORK_TASK_STATUSES.has(permit.status)) continue
    if (!canPermitterEditPreWorkChecks(permit, user, resolveUser, directory)) continue
    if (!permitterOnApprovalUnlocked(permit, directory)) continue
    if (isRoleSigned(permit, 'permitter', directory)) continue
    if (permitterPreWorkComplete(permit)) continue

    const summary = permitterPreWorkTaskSummary(permit)
    if (!summary) continue

    items.push({ permit, summary, needsFill: true })
  }

  return items.sort((a, b) => {
    const aOn = a.permit.status === 'on_approval' ? 1 : 0
    const bOn = b.permit.status === 'on_approval' ? 1 : 0
    if (bOn !== aOn) return bOn - aOn
    return (b.permit.updatedAtIso ?? '').localeCompare(a.permit.updatedAtIso ?? '')
  })
}

/** @deprecated Используйте permitterPreWorkTasksForUser */
export const performerPreWorkTasksForUser = permitterPreWorkTasksForUser

/** @deprecated Используйте canPermitterEditPreWorkChecks */
export const canPerformerEditPreWorkChecks = canPermitterEditPreWorkChecks

/** @deprecated Используйте permitterPreWorkBlockedHint */
export const performerPreWorkBlockedHint = permitterPreWorkBlockedHint

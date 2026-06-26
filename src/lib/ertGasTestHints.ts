import type { DemoUser, Permit, PermitStatus } from '../types/domain'
import { fillTemplate, localeMessages, statusLabel } from '../i18n/getLocale'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { requiresWorkPermissions } from './workPermissions'

const GAS_TEST_EDIT_STATUSES = new Set<PermitStatus>(['issued', 'in_progress', 'suspended'])

export function canErtEditGasTests(permit: Permit): boolean {
  return GAS_TEST_EDIT_STATUSES.has(permit.status)
}

export function ertGasTestBlockedHint(status: PermitStatus): string {
  if (status === 'on_approval') {
    return 'Наряд ещё на согласовании. Таблицу газотеста можно заполнить после выдачи (статус «Выдан»).'
  }
  if (status === 'draft') {
    return 'Наряд в черновике. Газотест доступен после отправки на согласование и выдачи наряда.'
  }
  if (status === 'closed' || status === 'archived' || status === 'annulled') {
    return `Наряд завершён (${statusLabel(status)}). Редактирование газотеста недоступно.`
  }
  if (status === 'rejected') {
    return 'Наряд отклонён. Дождитесь повторной выдачи после исправлений.'
  }
  return `Редактирование доступно только для выданного, выполняемого или приостановленного наряда (сейчас: ${statusLabel(status)}).`
}

export function ertGasTestDocsNeedingFill(permit: Permit): number {
  const docs = permit.workPermissions?.documents ?? []
  return docs.filter((doc) => {
    const meta = WORK_PERMISSION_BY_KIND[doc.kind]
    if (!meta.requiresGasTests) return false
    return doc.gasTests.length === 0
  }).length
}

export function ertGasTestTaskSummary(permit: Permit): string | null {
  const g = localeMessages().gasTest
  if (!requiresWorkPermissions(permit)) return null
  if (!permit.workPermissions?.documents?.length) {
    return g.noPermissions
  }
  const gasDocs = permit.workPermissions.documents.filter(
    (d) => WORK_PERMISSION_BY_KIND[d.kind].requiresGasTests,
  )
  if (gasDocs.length === 0) return null
  if (!canErtEditGasTests(permit)) {
    return ertGasTestBlockedHint(permit.status)
  }
  const empty = ertGasTestDocsNeedingFill(permit)
  if (empty > 0) {
    return fillTemplate(g.fillTable, { empty })
  }
  return g.tableFilled
}

export type ErtGasTestTask = {
  permit: Permit
  summary: string
  needsFill: boolean
}

/** Задания ERT на журнале НД: заполнить газотест по нарядам на согласовании и выданным. */
export function ertGasTestTasksForUser(
  permits: Permit[],
  user: DemoUser | null | undefined,
): ErtGasTestTask[] {
  if (!user || user.role !== 'ert') return []
  const items: ErtGasTestTask[] = []
  for (const permit of permits) {
    if (!canErtEditGasTests(permit)) continue
    const empty = ertGasTestDocsNeedingFill(permit)
    if (empty === 0) continue
    const summary = ertGasTestTaskSummary(permit)
    if (!summary) continue
    items.push({ permit, summary, needsFill: true })
  }
  return items.sort((a, b) => {
    if (a.needsFill !== b.needsFill) return a.needsFill ? -1 : 1
    return (b.permit.updatedAtIso ?? '').localeCompare(a.permit.updatedAtIso ?? '')
  })
}

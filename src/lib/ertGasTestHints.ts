import type { DemoUser, Permit, PermitStatus } from '../types/domain'

import { fillTemplate, localeMessages, statusLabel } from '../i18n/getLocale'

import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'

import { requiresWorkPermissions } from './workPermissions'

import type { WorkPermissionDocument } from '../types/workPermissions'



const GAS_TEST_EDIT_STATUSES = new Set<PermitStatus>([
  'issued',
  'in_progress',
  'suspended',
])



export function permitHasGasTestDocuments(permit: Permit): boolean {
  const docs = permit.workPermissions?.documents ?? []
  return docs.some((doc) => WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests)
}

export function canErtEditGasTests(permit: Permit): boolean {
  if (!permitHasGasTestDocuments(permit)) return false
  return GAS_TEST_EDIT_STATUSES.has(permit.status)
}



export function gasTestDocFilled(doc: WorkPermissionDocument): boolean {

  const meta = WORK_PERMISSION_BY_KIND[doc.kind]

  if (!meta.requiresGasTests) return true

  return doc.gasTests.some(

    (r) =>

      Boolean(r.atIso) ||

      r.location.trim().length > 0 ||

      r.lelPercent.trim().length > 0 ||

      r.h2sPpm.trim().length > 0 ||

      r.o2Percent.trim().length > 0 ||

      r.coPpm.trim().length > 0 ||

      r.instrumentNo.trim().length > 0,

  )

}



export function ertGasTestBlockedHint(status: PermitStatus): string {

  const g = localeMessages().gasTest

  if (status === 'on_approval') return g.onApprovalHint

  if (status === 'draft') return g.draftHint

  if (status === 'closed' || status === 'archived' || status === 'annulled') {

    return fillTemplate(g.closedHint, { status: statusLabel(status) })

  }

  if (status === 'rejected') return g.rejectedHint

  return fillTemplate(g.editHint, { status: statusLabel(status) })

}



export function ertGasTestDocsNeedingFill(permit: Permit): number {
  if (!permitHasGasTestDocuments(permit)) return 0

  const docs = permit.workPermissions?.documents ?? []

  return docs.filter((doc) => {

    const meta = WORK_PERMISSION_BY_KIND[doc.kind]

    if (!meta.requiresGasTests) return false

    return !gasTestDocFilled(doc)

  }).length

}



export function ertGasTestTaskSummary(permit: Permit): string | null {
  if (!permitHasGasTestDocuments(permit)) return null

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



/** Задания ERT: газотест по разрешениям с таблицей отбора проб (огонь, газ, замкнутое пространство). */

export function ertGasTestTasksForUser(

  permits: Permit[],

  user: DemoUser | null | undefined,

): ErtGasTestTask[] {

  if (!user || user.role !== 'ert') return []

  const items: ErtGasTestTask[] = []

  for (const permit of permits) {
    if (!permitHasGasTestDocuments(permit)) continue

    if (!requiresWorkPermissions(permit)) continue

    if (!canErtEditGasTests(permit)) continue

    const empty = ertGasTestDocsNeedingFill(permit)

    const summary = ertGasTestTaskSummary(permit)

    if (!summary) continue

    if (empty === 0) continue

    items.push({ permit, summary, needsFill: true })

  }

  return items.sort((a, b) =>
    (b.permit.updatedAtIso ?? '').localeCompare(a.permit.updatedAtIso ?? ''),
  )
}


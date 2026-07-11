import type { DemoUser, Permit, PermitStatus } from '../types/domain'

import { fillTemplate, localeMessages, statusLabel } from '../i18n/getLocale'

import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'

import { allCrewAcknowledged } from './crewAckComplete'
import { isRoleSigned } from './signatureStatus'
import { requiresWorkPermissions } from './workPermissions'

import type { GasTestReading, WorkPermissionDocument } from '../types/workPermissions'



const GAS_TEST_EDIT_STATUSES = new Set<PermitStatus>([
  'issued',
  'in_progress',
  'suspended',
])

/** После подписи производителя и ознакомления бригады — этап ПАС (ERT) на согласовании. */
export function ertGasTestOnApprovalUnlocked(
  permit: Permit,
  directory: DemoUser[] = [],
): boolean {
  if (permit.status !== 'on_approval') return false
  return (
    isRoleSigned(permit, 'performer', directory) &&
    allCrewAcknowledged(permit, directory)
  )
}



export function permitHasGasTestDocuments(permit: Permit): boolean {
  const docs = permit.workPermissions?.documents ?? []
  return docs.some((doc) => WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests)
}

export function canErtEditGasTests(
  permit: Permit,
  directory: DemoUser[] = [],
): boolean {
  if (!permitHasGasTestDocuments(permit)) return false
  if (GAS_TEST_EDIT_STATUSES.has(permit.status)) return true
  return ertGasTestOnApprovalUnlocked(permit, directory)
}



function gasFieldFilled(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return false
  return String(value).trim().length > 0
}

export function gasTestReadingFilled(r: GasTestReading): boolean {
  return (
    Boolean(r.atIso?.trim()) ||
    gasFieldFilled(r.location) ||
    gasFieldFilled(r.lelPercent) ||
    gasFieldFilled(r.h2sPpm) ||
    gasFieldFilled(r.o2Percent) ||
    gasFieldFilled(r.coPpm) ||
    gasFieldFilled(r.instrumentNo)
  )
}

export function gasTestDocFilled(doc: WorkPermissionDocument): boolean {
  const meta = WORK_PERMISSION_BY_KIND[doc.kind]
  if (!meta.requiresGasTests) return true
  return (doc.gasTests ?? []).some(gasTestReadingFilled)
}



export function ertGasTestBlockedHint(
  permit: Permit,
  directory: DemoUser[] = [],
): string {

  const g = localeMessages().gasTest

  if (permit.status === 'on_approval') {
    return ertGasTestOnApprovalUnlocked(permit, directory)
      ? g.onApprovalHint
      : g.onApprovalWaitingHint
  }

  const status = permit.status

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

/** Все разрешения с газотестом имеют хотя бы одну заполненную строку замера. */
export function ertGasTestComplete(permit: Permit): boolean {
  if (!permitHasGasTestDocuments(permit)) return true
  return ertGasTestDocsNeedingFill(permit) === 0
}

/** Подпись ПАС (ERT) недоступна, пока не сохранена таблица газотеста. */
export function ertGasTestBlocksErtSign(permit: Permit): boolean {
  if (!permitHasGasTestDocuments(permit)) return false
  return !ertGasTestComplete(permit)
}



export function ertGasTestTaskSummary(
  permit: Permit,
  directory: DemoUser[] = [],
): string | null {
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

  if (!canErtEditGasTests(permit, directory)) {

    return ertGasTestBlockedHint(permit, directory)

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

  directory: DemoUser[] = [],

): ErtGasTestTask[] {

  if (!user || user.role !== 'ert') return []

  const items: ErtGasTestTask[] = []

  for (const permit of permits) {
    if (!permitHasGasTestDocuments(permit)) continue

    if (!requiresWorkPermissions(permit)) continue

    if (!canErtEditGasTests(permit, directory)) continue

    const empty = ertGasTestDocsNeedingFill(permit)

    const summary = ertGasTestTaskSummary(permit, directory)

    if (!summary) continue

    if (empty === 0) continue

    items.push({ permit, summary, needsFill: true })

  }

  return items.sort((a, b) =>
    (b.permit.updatedAtIso ?? '').localeCompare(a.permit.updatedAtIso ?? ''),
  )
}


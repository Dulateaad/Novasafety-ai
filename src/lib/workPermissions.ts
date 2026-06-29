import { workStagesTitlesText } from './formatWorkStagesDisplay'
import type { DemoUser, Permit, PermitDraft } from '../types/domain'
import type { PprForm } from '../types/ppr'
import {
  WORK_ACTIVITIES_REQUIRING_PERMISSIONS,
  emptyWorkPermissionForm,
  type GasTestReading,
  type WorkPermissionDocument,
  type WorkPermissionKind,
  type WorkPermissionsBundle,
} from '../types/workPermissions'
import {
  WORK_PERMISSION_TEMPLATES,
  type WorkPermissionTemplateMeta,
} from '../config/workPermissionsConfig'
import {
  fillTemplate,
  localeMessages,
  workPermissionKindLabel,
  type LanguageCode,
} from '../i18n/getLocale'
import { renderSingleWorkPermission } from './buildWorkPermissionPdf'
import { nextRegistrationNumber } from './registrationNumber'

type WorkPermissionRefSource = Pick<PermitDraft, 'registrationRefNo' | 'f02'>

const PERMISSION_KIND_SUFFIX: Record<WorkPermissionKind, string> = {
  gas_hazard: 'Г',
  open_flame_fire: 'О',
  confined_space: 'З',
}

/** № наряд-допуска (НДПР) для шапки разрешения. */
export function resolveNdprRefForWorkPermission(
  source: WorkPermissionRefSource,
  existingPermits: Permit[] = [],
): string {
  const fromDraft = source.registrationRefNo?.trim() || source.f02?.badgeNo?.trim() || ''
  if (fromDraft) return fromDraft
  if (existingPermits.length) return nextRegistrationNumber(existingPermits)
  return ''
}

export function resolvePermissionRefNo(
  ndRef: string,
  kind: WorkPermissionKind,
  kinds: WorkPermissionKind[],
): string {
  if (!ndRef) return ''
  if (kinds.length <= 1) return ndRef
  return `${ndRef}-${PERMISSION_KIND_SUFFIX[kind]}`
}

function applyWorkPermissionRefs(
  form: WorkPermissionDocument['form'],
  kind: WorkPermissionKind,
  kinds: WorkPermissionKind[],
  ndRef: string,
): WorkPermissionDocument['form'] {
  const next = { ...form }
  if (!next.pprRef.trim()) next.pprRef = ndRef
  if (!next.permissionRefNo?.trim()) {
    next.permissionRefNo = resolvePermissionRefNo(ndRef, kind, kinds)
  }
  return next
}

export function requiredPermissionKinds(
  draft: Pick<PermitDraft, 'specialWorkActivities' | 'specialWorkActivity'>,
): WorkPermissionKind[] {
  const activities =
    draft.specialWorkActivities?.length > 0
      ? draft.specialWorkActivities
      : [draft.specialWorkActivity]
  const kinds = new Set<WorkPermissionKind>()
  for (const activity of activities) {
    const tpl = WORK_PERMISSION_TEMPLATES.find((t) => t.activity === activity)
    if (tpl) kinds.add(tpl.kind)
  }
  return [...kinds]
}

export function requiresWorkPermissions(
  draft: Pick<PermitDraft, 'specialWorkActivities' | 'specialWorkActivity'>,
): boolean {
  return requiredPermissionKinds(draft).length > 0
}

export function permissionNoticesForActivities(
  draft: Pick<PermitDraft, 'specialWorkActivities' | 'specialWorkActivity'>,
): WorkPermissionTemplateMeta[] {
  const activities =
    draft.specialWorkActivities?.length > 0
      ? draft.specialWorkActivities
      : [draft.specialWorkActivity]
  return WORK_PERMISSION_TEMPLATES.filter((t) => activities.includes(t.activity))
}

export function wizardStepCount(
  draft: Pick<PermitDraft, 'specialWorkActivities' | 'specialWorkActivity'>,
): number {
  return requiresWorkPermissions(draft) ? 4 : 3
}

export function buildWorkPermissionTitle(
  kind: WorkPermissionKind,
  ppr?: PprForm,
  code?: LanguageCode,
): string {
  const base = workPermissionKindLabel(kind, code)
  const work = ppr?.workTitle?.trim()
  return work ? `${base} — ${work}` : base
}

export function initializeWorkPermissionsBundle(
  draft: PermitDraft,
  ppr?: PprForm,
  existingPermits: Permit[] = [],
): WorkPermissionsBundle {
  const kinds = requiredPermissionKinds(draft)
  const existing = draft.workPermissions?.documents ?? []
  const byKind = new Map(existing.map((d) => [d.kind, d]))
  const ndRef = resolveNdprRefForWorkPermission(draft, existingPermits)

  const documents: WorkPermissionDocument[] = kinds.map((kind) => {
    const prev = byKind.get(kind)
    if (prev) {
      return {
        ...prev,
        form: applyWorkPermissionRefs(prev.form, kind, kinds, ndRef),
      }
    }
    const form = emptyWorkPermissionForm(kind)
    form.siteObject = draft.siteName.trim() || ppr?.siteName?.trim() || ''
    form.workDescription =
      workStagesTitlesText(
        draft.workStages?.trim() ||
          draft.workDescription.trim() ||
          ppr?.workStagesText?.trim() ||
          '',
      ) ||
      draft.title.trim() ||
      ppr?.workTitle?.trim() ||
      ''
    form.equipmentAndDocs = draft.toolsAndEquipment.trim()
    if (kind === 'open_flame_fire') {
      form.fireCategory = draft.category === 1 ? '1' : '2'
    }
    return {
      kind,
      title: buildWorkPermissionTitle(kind, ppr),
      form: applyWorkPermissionRefs(form, kind, kinds, ndRef),
      gasTests: [],
      signatures: [],
    }
  })

  return {
    documents,
    updatedAtIso: new Date().toISOString(),
  }
}

export function mergeGasTestReading(
  doc: WorkPermissionDocument,
  readingId: string,
  patch: Partial<GasTestReading>,
): WorkPermissionDocument {
  return {
    ...doc,
    gasTests: doc.gasTests.map((r) =>
      r.id === readingId ? { ...r, ...patch } : r,
    ),
  }
}

export function applyErtGasTestUpdate(
  bundle: WorkPermissionsBundle,
  kind: WorkPermissionKind,
  readingId: string,
  patch: Partial<GasTestReading>,
  ertUser: DemoUser,
): WorkPermissionsBundle {
  return {
    ...bundle,
    updatedAtIso: new Date().toISOString(),
    documents: bundle.documents.map((doc) => {
      if (doc.kind !== kind) return doc
      return mergeGasTestReading(doc, readingId, {
        ...patch,
        testerUid: ertUser.id,
        testerName: ertUser.displayName,
      })
    }),
  }
}

export function validateWorkPermissionsBundle(
  bundle: WorkPermissionsBundle | undefined,
  draft: PermitDraft,
  code?: LanguageCode,
): string | null {
  if (!requiresWorkPermissions(draft)) return null
  const v = localeMessages(code).validation
  if (!bundle?.documents?.length) {
    return v.generatePermissions
  }
  const enriched = enrichWorkPermissionsBundle(draft, bundle)
  const kinds = requiredPermissionKinds(draft)
  for (const kind of kinds) {
    const doc = enriched.documents.find((d) => d.kind === kind)
    const kindLabel = workPermissionKindLabel(kind, code)
    if (!doc) {
      return fillTemplate(v.missingDoc, { kind: kindLabel })
    }
    const form = doc.form
    if (!form.workDescription.trim() || form.workDescription.trim().length < 3) {
      return fillTemplate(v.workDescriptionMin, { kind: kindLabel })
    }
    if (!isWorkPermissionPdfReady(doc)) {
      return fillTemplate(v.generatePermission, { kind: kindLabel })
    }
  }
  return null
}

export function isWorkPermissionPdfReady(doc: WorkPermissionDocument): boolean {
  return Boolean(doc.generatedAtIso?.trim() || doc.pdfBase64?.trim())
}

function workPermissionPdfNeedsRefresh(doc: WorkPermissionDocument): boolean {
  if (!isWorkPermissionPdfReady(doc)) return true
  return !doc.form.permissionRefNo?.trim() || !doc.form.pprRef.trim()
}

export async function ensureWorkPermissionsPdfsReady(
  draft: PermitDraft,
  bundle: WorkPermissionsBundle,
  ppr?: PprForm,
  existingPermits: Permit[] = [],
): Promise<WorkPermissionsBundle> {
  const synced = initializeWorkPermissionsBundle(
    { ...draft, workPermissions: bundle },
    ppr,
    existingPermits,
  )
  const enriched = enrichWorkPermissionsBundle(draft, synced, existingPermits)
  const kinds = new Set(requiredPermissionKinds(draft))
  const documents = await Promise.all(
    enriched.documents.map(async (doc) => {
      if (!kinds.has(doc.kind) || !workPermissionPdfNeedsRefresh(doc)) return doc
      return renderSingleWorkPermission(doc)
    }),
  )
  return {
    documents,
    updatedAtIso: new Date().toISOString(),
  }
}

export function workPermissionsFromPermit(permit: Permit): WorkPermissionsBundle | undefined {
  return permit.workPermissions
}

export function enrichWorkPermissionsBundle(
  source: PermitDraft | Permit,
  bundle: WorkPermissionsBundle,
  existingPermits: Permit[] = [],
): WorkPermissionsBundle {
  const ppr = 'ppr' in source ? source.ppr : undefined
  const kinds = bundle.documents.map((d) => d.kind)
  const ndRef = resolveNdprRefForWorkPermission(source, existingPermits)
  return {
    ...bundle,
    updatedAtIso: bundle.updatedAtIso || new Date().toISOString(),
    documents: bundle.documents.map((doc) => {
      let form = { ...doc.form }
      if (!form.siteObject.trim()) {
        form.siteObject = source.siteName.trim() || ppr?.siteName?.trim() || ''
      }
      if (!form.workDescription.trim()) {
        form.workDescription =
          workStagesTitlesText(
            source.workStages?.trim() ||
              source.workDescription.trim() ||
              ppr?.workStagesText?.trim() ||
              '',
          ) ||
          source.title.trim() ||
          ppr?.workTitle?.trim() ||
          ''
      }
      if (!form.equipmentAndDocs.trim()) {
        form.equipmentAndDocs = source.toolsAndEquipment.trim()
      }
      if (doc.kind === 'open_flame_fire' && !form.fireCategory) {
        form.fireCategory = source.category === 1 ? '1' : '2'
      }
      form = applyWorkPermissionRefs(form, doc.kind, kinds, ndRef)
      return { ...doc, form }
    }),
  }
}

export function activitiesRequiringPermissionsLabel(): string {
  return WORK_ACTIVITIES_REQUIRING_PERMISSIONS.join(', ')
}

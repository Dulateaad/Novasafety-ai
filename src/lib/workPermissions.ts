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
): WorkPermissionsBundle {
  const kinds = requiredPermissionKinds(draft)
  const existing = draft.workPermissions?.documents ?? []
  const byKind = new Map(existing.map((d) => [d.kind, d]))

  const documents: WorkPermissionDocument[] = kinds.map((kind) => {
    const prev = byKind.get(kind)
    if (prev) return prev
    const form = emptyWorkPermissionForm(kind)
    form.siteObject = draft.siteName.trim() || ppr?.siteName?.trim() || ''
    form.pprRef = ''
    const stagesRaw =
      draft.workStages?.trim() ||
      draft.workDescription.trim() ||
      ppr?.workStagesText?.trim() ||
      ''
    form.workDescription =
      workStagesTitlesText(stagesRaw) ||
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
      form,
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
  const kinds = requiredPermissionKinds(draft)
  for (const kind of kinds) {
    const doc = bundle.documents.find((d) => d.kind === kind)
    const kindLabel = workPermissionKindLabel(kind, code)
    if (!doc) {
      return fillTemplate(v.missingDoc, { kind: kindLabel })
    }
    const form = doc.form
    if (!form.workDescription.trim() || form.workDescription.trim().length < 3) {
      return fillTemplate(v.workDescriptionMin, { kind: kindLabel })
    }
    if (!doc.generatedAtIso) {
      return fillTemplate(v.generatePermission, { kind: kindLabel })
    }
  }
  return null
}

export function workPermissionsFromPermit(permit: Permit): WorkPermissionsBundle | undefined {
  return permit.workPermissions
}

export function enrichWorkPermissionsBundle(
  draft: PermitDraft,
  bundle: WorkPermissionsBundle,
): WorkPermissionsBundle {
  const ppr = draft.ppr
  return {
    ...bundle,
    updatedAtIso: bundle.updatedAtIso || new Date().toISOString(),
    documents: bundle.documents.map((doc) => {
      const form = { ...doc.form }
      if (!form.siteObject.trim()) {
        form.siteObject = draft.siteName.trim() || ppr?.siteName?.trim() || ''
      }
      if (!form.workDescription.trim()) {
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
      }
      if (!form.equipmentAndDocs.trim()) {
        form.equipmentAndDocs = draft.toolsAndEquipment.trim()
      }
      if (doc.kind === 'open_flame_fire' && !form.fireCategory) {
        form.fireCategory = draft.category === 1 ? '1' : '2'
      }
      return { ...doc, form }
    }),
  }
}

export function activitiesRequiringPermissionsLabel(): string {
  return WORK_ACTIVITIES_REQUIRING_PERMISSIONS.join(', ')
}

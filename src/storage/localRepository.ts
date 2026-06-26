import type {
  DemoUser,
  JournalEntry,
  Permit,
  PermitDraft,
  PermitStatus,
} from '../types/domain'
import {
  coerceZoneClass,
  coerceSpecialWorkActivity,
  applySpecialWorkActivity,
  normalizeSpecialWorkActivities,
  primarySpecialWorkActivity,
} from '../types/domain'
import { ASOR_EDITION_META } from '../types/asor'
import type { PermitRepository, Unsubscribe, WorkStopRequestParams, WorkStopResolveParams } from './types'
import { validateTransition, canUserTriggerStatus, issueStatusPatchIfApprovalsComplete } from '../lib/transitions'
import { mergeExecutorPatch } from '../lib/mergeExecutorPatch'
import { migratePermit } from './normalizePermit'
import { resolveRegistrationRefNo } from '../lib/registrationNumber'
import { coercePtwSite } from '../config/ptwSites'
import { emptyF02 } from '../uog/permitDefaults'
import { initialNdprResponses } from '../uog/ndprChecklistTemplate'
import {
  annulPermitPatch,
  buildWorkStopState,
  liftWorkStopPatch,
  resolutionJournalMessage,
  workStopJournalMessage,
} from '../lib/workStop'
import { buildWorkStopAlertRecords } from '../lib/workStopAlertStore'
import { inspectorAssigneesForPermit } from '../lib/inspectorAccess'
import { DEFAULT_INSPECTOR_SETTINGS } from '../lib/inspectorSettings'
import {
  resolveLocalWorkStopAlerts,
  upsertLocalWorkStopAlerts,
} from '../lib/workStopAlerts'

const STORAGE_KEY = 'nova_safety_local_v1'

interface PersistShape {
  permits: Permit[]
  journal: JournalEntry[]
}

function nowIso() {
  return new Date().toISOString()
}

function uid() {
  return crypto.randomUUID()
}

function loadShape(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { permits: [], journal: [] }
    const parsed = JSON.parse(raw) as PersistShape
    const permits = Array.isArray(parsed.permits)
      ? (parsed.permits as Permit[]).map(migratePermit)
      : []
    return {
      permits,
      journal: Array.isArray(parsed.journal) ? parsed.journal : [],
    }
  } catch {
    return { permits: [], journal: [] }
  }
}

function saveShape(s: PersistShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function seedDemoPermitIfEmpty() {
  const s = loadShape()
  if (s.permits.length > 0) return
  const p: Permit = {
    id: uid(),
    title: 'Демо: огневые работы на установке',
    specialWorkActivity: 'open_flame_fire',
    specialWorkActivities: ['open_flame_fire'],
    permitType: 'fire',
    category: 1,
    zoneClass: 2,
    siteName: '21 скважина',
    workDescription: 'Резка металла, сварка лесов.',
    workStages: 'Подготовка площадки\nОгневые работы\nКонтроль после работ',
    workVolume: '1 смена, участок 12 м²',
    toolsAndEquipment: 'Болгарка, сварочный аппарат.',
    issuerUid: 'u-performer-5',
    permitterUid: 'u-permitter',
    performerUid: 'u-performer',
    leadExpertUid: 'u-lead',
    isContractorPermit: false,
    samePersonException: { allowed: false, reason: '' },
    registrationRefNo: '001',
    f02: emptyF02(),
    executors: [],
    ndprChecklist: initialNdprResponses(),
    status: 'on_approval',
    version: 1,
    signatures: {
      performerSigned: false,
      issuerSigned: true,
      permitterSigned: false,
      leadExpertSigned: false,
      ertSigned: false,
    },
    contractorSafetyApproved: true,
    incidentLongRetention: false,
    createdAtIso: nowIso(),
    updatedAtIso: nowIso(),
  }
  s.permits.push(p)
  s.journal.push({
    id: uid(),
    permitId: p.id,
    atIso: nowIso(),
    actorUid: 'u-performer',
    actorRole: 'performer',
    kind: 'status_change',
    message: 'Создан черновик и отправлен на согласование (демо-данные)',
    meta: { to: 'on_approval' },
  })
  saveShape(s)
  notify()
}

export class LocalPermitRepository implements PermitRepository {
  async list(): Promise<Permit[]> {
    return loadShape().permits
  }

  async getById(id: string): Promise<Permit | null> {
    return loadShape().permits.find((p) => p.id === id) ?? null
  }

  async create(draft: PermitDraft, actor: DemoUser): Promise<Permit> {
    const s = loadShape()
    const regNo = resolveRegistrationRefNo(draft, s.permits.map(migratePermit))
    const p: Permit = {
      ...draft,
      siteName: coercePtwSite(draft.siteName),
      registrationRefNo: regNo,
      id: uid(),
      status: 'draft',
      version: 1,
      signatures: {
        performerSigned: false,
        issuerSigned: false,
        permitterSigned: false,
        leadExpertSigned: false,
      },
      contractorSafetyApproved: !draft.isContractorPermit,
      incidentLongRetention: false,
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
    }
    s.permits.unshift(p)
    s.journal.push({
      id: uid(),
      permitId: p.id,
      atIso: nowIso(),
      actorUid: actor.id,
      actorRole: actor.role,
      kind: 'status_change',
      message: draft.asor
        ? `Создан наряд-допуск № ${regNo} (пакет с ${ASOR_EDITION_META.title} ${ASOR_EDITION_META.formRef})`
        : `Создан наряд-допуск № ${regNo}`,
    })
    saveShape(s)
    notify()
    return p
  }

  async updateFields(
    id: string,
    patch: Partial<Permit>,
    actor: DemoUser,
  ): Promise<void> {
    const s = loadShape()
    const idx = s.permits.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Permit not found')
    const prev = s.permits[idx]
    let next = { ...prev, ...patch, updatedAtIso: nowIso() } as Permit
    if (patch.egovSignatures !== undefined) {
      next = {
        ...next,
        egovSignatures: {
          ...(prev.egovSignatures ?? {}),
          ...patch.egovSignatures,
        },
      }
    }
    if (patch.crewAckSignatures !== undefined) {
      next = {
        ...next,
        crewAckSignatures: {
          ...(prev.crewAckSignatures ?? {}),
          ...patch.crewAckSignatures,
        },
      }
    }
    if (patch.executors !== undefined) {
      next = {
        ...next,
        executors: mergeExecutorPatch(prev.executors ?? [], patch.executors),
      }
    }
    if (patch.siteName !== undefined)
      next = { ...next, siteName: coercePtwSite(patch.siteName) }
    if (patch.zoneClass !== undefined)
      next = { ...next, zoneClass: coerceZoneClass(patch.zoneClass) }
    if (
      patch.specialWorkActivity !== undefined ||
      patch.specialWorkActivities !== undefined
    ) {
      const activities = normalizeSpecialWorkActivities(
        patch.specialWorkActivities ??
          (patch.specialWorkActivity !== undefined
            ? [patch.specialWorkActivity]
            : undefined),
        {
          single:
            patch.specialWorkActivity !== undefined
              ? coerceSpecialWorkActivity(patch.specialWorkActivity, prev.permitType)
              : prev.specialWorkActivity,
          permitType: prev.permitType,
        },
      )
      const primary = primarySpecialWorkActivity(activities)
      const d = applySpecialWorkActivity(primary)
      next = {
        ...next,
        specialWorkActivities: activities,
        specialWorkActivity: primary,
        permitType: d.permitType,
        category: d.category,
      }
      if (d.permitType === 'cold') next = { ...next, f04: undefined }
    }
    const prevStatus = prev.status
    const autoIssue = issueStatusPatchIfApprovalsComplete(next)
    if (autoIssue) next = { ...next, ...autoIssue }
    s.permits[idx] = next
    if (autoIssue && prevStatus !== autoIssue.status) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'status_change',
        message: `Статус: ${prevStatus} → ${autoIssue.status} (все согласования завершены)`,
        meta: { from: prevStatus, to: autoIssue.status, auto: true },
      })
      void import('../lib/permitNotices').then((m) => {
        m.upsertLocalPermitNotices(next, 'issued')
        void import('../lib/refreshPermitNotices').then((r) => r.notifyPermitNoticesRefresh())
      })
    }
    if (patch.signatures || patch.contractorSafetyApproved !== undefined) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'signature',
        message: 'Обновлены подписи или согласование подрядчика',
      })
    }
    if (patch.ndprChecklist) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'ndpr',
        message: 'Обновлён проверочный лист F09 (НДПР)',
      })
    }
    if (patch.executors) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'executor_update',
        message: 'Изменён список работников',
      })
    }
    if (patch.performerUid && patch.performerUid !== prev.performerUid) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'status_change',
        message: `Замена производителя работ: ${prev.performerUid} → ${patch.performerUid}`,
      })
    }
    if (patch.validUntilIso && patch.validUntilIso !== prev.validUntilIso) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'extension',
        message: `Продление НДПР до ${patch.validUntilIso}`,
      })
    }
    if (patch.lastRejection) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'rejection',
        message: `Отклонено: ${patch.lastRejection.comment}`,
      })
    }
    if (patch.packagePdf) {
      s.journal.push({
        id: uid(),
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'matrix_note',
        message: `Сформирован PDF-пакет (${patch.packagePdf.fileName})`,
      })
    }
    saveShape(s)
    notify()
  }

  async transition(
    id: string,
    next: PermitStatus,
    actor: DemoUser,
  ): Promise<Permit> {
    const s = loadShape()
    const idx = s.permits.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Permit not found')
    const permit = s.permits[idx]
    if (!canUserTriggerStatus(permit, next, actor.role)) {
      throw new Error('Недостаточно прав для смены статуса')
    }
    const v = validateTransition(permit, next)
    if (!v.ok) throw new Error(v.reason)
    const updated: Permit = {
      ...permit,
      status: next,
      updatedAtIso: nowIso(),
    }
    s.permits[idx] = updated
    s.journal.push({
      id: uid(),
      permitId: id,
      atIso: nowIso(),
      actorUid: actor.id,
      actorRole: actor.role,
      kind:
        next === 'suspended'
          ? 'suspension'
          : 'status_change',
      message: `Статус: ${permit.status} → ${next}`,
      meta: { from: permit.status, to: next },
    })
    saveShape(s)
    notify()
    return updated
  }

  async requestWorkStop(
    id: string,
    params: WorkStopRequestParams,
    actor: DemoUser,
  ): Promise<Permit> {
    const s = loadShape()
    const idx = s.permits.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Permit not found')
    const permit = s.permits[idx]
    const workStop = buildWorkStopState(permit, actor, {
      reason: params.reason,
      photo: params.photo,
    })
    const updated: Permit = {
      ...permit,
      status: 'suspended',
      workStop,
      updatedAtIso: nowIso(),
    }
    s.permits[idx] = updated
    s.journal.push({
      id: uid(),
      permitId: id,
      atIso: workStop.atIso,
      actorUid: actor.id,
      actorRole: actor.role,
      kind: 'work_stop',
      message: workStopJournalMessage(workStop),
      meta: {
        reason: workStop.reason,
        hasPhoto: !!workStop.photo,
        initiatedByName: workStop.initiatedByName,
      },
    })
    const directory = params.directory ?? []
    const assignees = inspectorAssigneesForPermit(
      directory,
      updated,
      params.inspectorNotifyMode ?? DEFAULT_INSPECTOR_SETTINGS.inspectorNotifyMode,
    )
    if (assignees.length) {
      upsertLocalWorkStopAlerts(
        buildWorkStopAlertRecords(
          updated,
          workStop,
          assignees.map((u) => u.id),
        ),
      )
    }
    saveShape(s)
    notify()
    return updated
  }

  async resolveWorkStop(
    id: string,
    params: WorkStopResolveParams,
    actor: DemoUser,
  ): Promise<Permit> {
    const s = loadShape()
    const idx = s.permits.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Permit not found')
    const permit = s.permits[idx]
    const patch =
      params.action === 'annul'
        ? annulPermitPatch(permit, actor, params.comment)
        : liftWorkStopPatch(permit, actor, params.comment)
    const updated: Permit = {
      ...permit,
      ...patch,
      updatedAtIso: nowIso(),
    }
    s.permits[idx] = updated
    const outcome = params.action === 'annul' ? 'annulled' : 'lifted'
    s.journal.push({
      id: uid(),
      permitId: id,
      atIso: nowIso(),
      actorUid: actor.id,
      actorRole: actor.role,
      kind: 'work_stop_resolution',
      message: resolutionJournalMessage(updated.workStop!, outcome),
      meta: {
        outcome,
        comment: params.comment.trim(),
        inspectorName: actor.displayName,
      },
    })
    resolveLocalWorkStopAlerts(id)
    saveShape(s)
    notify()
    return updated
  }

  async deletePermit(id: string, _actor: DemoUser): Promise<void> {
    const s = loadShape()
    s.permits = s.permits.filter((p) => p.id !== id)
    s.journal = s.journal.filter((j) => j.permitId !== id)
    saveShape(s)
    notify()
  }

  async deleteAllPermits(_actor: DemoUser): Promise<void> {
    const s = loadShape()
    s.permits = []
    s.journal = []
    saveShape(s)
    notify()
  }

  subscribePermits(cb: (permits: Permit[]) => void): Unsubscribe {
    const run = () => {
      void this.list().then(cb)
    }
    run()
    listeners.add(run)
    return () => listeners.delete(run)
  }

  journalSubscribe(
    permitId: string,
    cb: (entries: JournalEntry[]) => void,
  ): Unsubscribe {
    const run = () => {
      const s = loadShape()
      cb(
        s.journal
          .filter((j) => j.permitId === permitId)
          .sort((a, b) => (a.atIso < b.atIso ? 1 : -1)),
      )
    }
    run()
    listeners.add(run)
    return () => listeners.delete(run)
  }

  async appendJournal(
    entry: Omit<JournalEntry, 'id'>,
  ): Promise<JournalEntry> {
    const s = loadShape()
    const full: JournalEntry = { ...entry, id: uid() }
    s.journal.push(full)
    saveShape(s)
    notify()
    return full
  }
}

import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type {
  DemoUser,
  JournalEntry,
  Permit,
  PermitDraft,
  PermitStatus,
} from '../types/domain'
import type { PermitRepository, Unsubscribe, WorkStopRequestParams, WorkStopResolveParams } from './types'
import { canUserTriggerStatus, validateTransition } from '../lib/transitions'
import { assertSignaturePatchAllowed } from '../lib/signatureGuard'
import { mergeExecutorPatch } from '../lib/mergeExecutorPatch'
import { migratePermit } from './normalizePermit'
import { mergeAbrDailyAcksBundles, normalizeAbrDailyAcks } from '../lib/abrDailyAck'
import { resolveRegistrationRefNo } from '../lib/registrationNumber'
import { readResumePermitId } from '../lib/resumePermitPackage'
import { deleteSigningInvitesForPermit, deleteSigningInvitesForPermits } from '../lib/deletePermitInvites'
import { cleanupPermitRelatedDataClient } from '../lib/cleanupPermitRelatedData'
import { coercePtwSite } from '../config/ptwSites'
import { coerceZoneClass, coerceSpecialWorkActivity, applySpecialWorkActivity, normalizeSpecialWorkActivities, primarySpecialWorkActivity } from '../types/domain'
import { pprForFirestore } from '../lib/pprAutosave'
import { ASOR_EDITION_META } from '../types/asor'
import {
  annulPermitPatch,
  buildWorkStopState,
  liftWorkStopPatch,
  resolutionJournalMessage,
  workStopJournalMessage,
} from '../lib/workStop'
import { fetchInspectorSettingsAdmin } from '../lib/inspectorSettings'
import { inspectorAssigneesForPermit } from '../lib/inspectorAccess'
import { createWorkStopAlerts, resolveWorkStopAlertsFs } from '../lib/workStopAlertStore'
import {
  canInspectorResolveRejectedPermit,
  inspectorRejectedJournalMessage,
  type InspectorRejectedAction,
} from '../lib/inspectorRejectedPermit'
function nowIso() {
  return new Date().toISOString()
}

function uid() {
  return crypto.randomUUID()
}

/** Firestore запрещает `undefined` в полях документа. */
/**
 * Тяжёлые PDF в base64 не храним в Firestore: документ ограничен 1 МБ, а
 * несколько разрешений + пакет легко выходят за лимит, и запись падает
 * (из-за этого, например, не сохранялись результаты газотеста ПАС).
 * PDF всегда пересобираются на лету (openWorkPermissionPdf / buildSigningPackagePdf).
 */
function stripHeavyPdfBlobs(cloned: Record<string, unknown>): void {
  if (cloned.packagePdf && typeof cloned.packagePdf === 'object') {
    const pkg = { ...(cloned.packagePdf as Record<string, unknown>) }
    delete pkg.pdfBase64
    cloned.packagePdf = pkg
  }
  const wp = cloned.workPermissions as { documents?: unknown[] } | undefined
  if (wp && Array.isArray(wp.documents)) {
    cloned.workPermissions = {
      ...wp,
      documents: wp.documents.map((d) => {
        if (!d || typeof d !== 'object') return d
        const doc = { ...(d as Record<string, unknown>) }
        delete doc.pdfBase64
        return doc
      }),
    }
  }
}

/** ЭЦП CMS в base64 раздувают документ Firestore (>1 МБ) — храним метаданные подписи. */
function stripHeavySignatureBlobs(cloned: Record<string, unknown>): void {
  if (cloned.crewAckSignatures && typeof cloned.crewAckSignatures === 'object') {
    const sigs = { ...(cloned.crewAckSignatures as Record<string, unknown>) }
    for (const key of Object.keys(sigs)) {
      const sig = sigs[key]
      if (!sig || typeof sig !== 'object') continue
      const copy = { ...(sig as Record<string, unknown>) }
      delete copy.cmsBase64
      sigs[key] = copy
    }
    cloned.crewAckSignatures = sigs
  }
  if (cloned.egovSignatures && typeof cloned.egovSignatures === 'object') {
    const sigs = { ...(cloned.egovSignatures as Record<string, unknown>) }
    for (const key of Object.keys(sigs)) {
      const sig = sigs[key]
      if (!sig || typeof sig !== 'object') continue
      const copy = { ...(sig as Record<string, unknown>) }
      delete copy.cmsBase64
      sigs[key] = copy
    }
    cloned.egovSignatures = sigs
  }
  if (Array.isArray(cloned.abrDailyAcks)) {
    cloned.abrDailyAcks = cloned.abrDailyAcks.map((day) => {
      if (!day || typeof day !== 'object') return day
      const d = { ...(day as Record<string, unknown>) }
      if (!Array.isArray(d.entries)) return d
      d.entries = d.entries.map((e) => {
        if (!e || typeof e !== 'object') return e
        const copy = { ...(e as Record<string, unknown>) }
        delete copy.cmsBase64
        return copy
      })
      return d
    })
  }
}

function forFirestore<T>(value: T): T {
  const cloned = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  if (cloned && typeof cloned === 'object') {
    if (cloned.ppr && typeof cloned.ppr === 'object') {
      cloned.ppr = pprForFirestore(cloned.ppr as import('../types/ppr').PprForm)
    }
    stripHeavyPdfBlobs(cloned)
    stripHeavySignatureBlobs(cloned)
  }
  return JSON.parse(JSON.stringify(cloned)) as T
}

export class FirestorePermitRepository implements PermitRepository {
  private readonly fs: Firestore

  constructor(fs: Firestore) {
    this.fs = fs
  }

  private permitsCol() {
    return collection(this.fs, 'permits')
  }

  private journalCol(permitId: string) {
    return collection(this.fs, 'permits', permitId, 'journal')
  }

  async list(): Promise<Permit[]> {
    const snap = await getDocs(this.permitsCol())
    const list: Permit[] = []
    snap.forEach((d) =>
      list.push(
        migratePermit({
          ...(d.data() as Permit),
          id: (d.data() as Permit).id || d.id,
        }),
      ),
    )
    return list.sort((a, b) => (a.updatedAtIso < b.updatedAtIso ? 1 : -1))
  }

  async getById(id: string): Promise<Permit | null> {
    const ref = doc(this.fs, 'permits', id)
    const s = await getDoc(ref)
    if (!s.exists()) return null
    return migratePermit(s.data() as Permit)
  }

  async create(draft: PermitDraft, actor: DemoUser): Promise<Permit> {
    const existing = await this.list()
    const regNo = resolveRegistrationRefNo(draft, existing, readResumePermitId())
    const id = uid()
    const p: Permit = {
      ...draft,
      siteName: coercePtwSite(draft.siteName),
      registrationRefNo: regNo,
      id,
      status: 'draft',
      version: 1,
      signatures: {
        performerSigned: false,
        issuerSigned: false,
        permitterSigned: false,
        leadExpertSigned: false,
        ertSigned: false,
      },
      contractorSafetyApproved: !draft.isContractorPermit,
      incidentLongRetention: false,
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
    }
    await setDoc(doc(this.fs, 'permits', id), forFirestore(p))
    await addDoc(this.journalCol(id), forFirestore({
      permitId: id,
      atIso: nowIso(),
      actorUid: actor.id,
      actorRole: actor.role,
      kind: 'status_change',
      message: draft.asor
        ? `Создан наряд-допуск № ${regNo} (пакет с ${ASOR_EDITION_META.title} ${ASOR_EDITION_META.formRef})`
        : `Создан наряд-допуск № ${regNo}`,
    }))
    return p
  }

  async updateFields(
    id: string,
    patch: Partial<Permit>,
    actor: DemoUser,
  ): Promise<void> {
    const ref = doc(this.fs, 'permits', id)
    const cur = await this.getById(id)
    if (!cur) throw new Error('Permit not found')
    let next = { ...cur, ...patch, updatedAtIso: nowIso() } as Permit
    if (patch.egovSignatures !== undefined) {
      next = {
        ...next,
        egovSignatures: {
          ...(cur.egovSignatures ?? {}),
          ...patch.egovSignatures,
        },
      }
    }
    if (
      patch.performerUid &&
      patch.performerUid !== cur.performerUid &&
      patch.signatures?.performerSigned === false
    ) {
      const egov = { ...(next.egovSignatures ?? {}) }
      delete egov.performer
      next = { ...next, egovSignatures: egov }
    }
    if (patch.crewAckSignatures !== undefined) {
      next = {
        ...next,
        crewAckSignatures: {
          ...(cur.crewAckSignatures ?? {}),
          ...patch.crewAckSignatures,
        },
      }
    }
    if (patch.abrDailyAcks !== undefined) {
      next = {
        ...next,
        abrDailyAcks: mergeAbrDailyAcksBundles(
          normalizeAbrDailyAcks(cur.abrDailyAcks),
          normalizeAbrDailyAcks(patch.abrDailyAcks),
        ),
      }
    }
    if (patch.executors !== undefined) {
      next = {
        ...next,
        executors: mergeExecutorPatch(cur.executors ?? [], patch.executors),
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
              ? coerceSpecialWorkActivity(patch.specialWorkActivity, cur.permitType)
              : cur.specialWorkActivity,
          permitType: cur.permitType,
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
    if (patch.signatures) {
      assertSignaturePatchAllowed(actor, cur, patch.signatures)
    }
    await setDoc(ref, forFirestore(next), { merge: true })
    if (patch.signatures || patch.contractorSafetyApproved !== undefined) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'signature',
          message: 'Обновлены подписи или согласование подрядчика',
        }),
      )
    }
    if (patch.ndprChecklist) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'ndpr',
          message: 'Обновлён проверочный лист F09 (НДПР)',
        }),
      )
    }
    if (patch.executors) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'executor_update',
          message: 'Изменён список работников',
        }),
      )
    }
    if (patch.performerUid && patch.performerUid !== cur.performerUid) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'status_change',
          message: `Замена производителя работ: ${cur.performerUid} → ${patch.performerUid}`,
        }),
      )
    }
    if (patch.validUntilIso && patch.validUntilIso !== cur.validUntilIso) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'extension',
          message: `Продление НДПР до ${patch.validUntilIso}`,
        }),
      )
    }
    if (patch.abrDailyAcks !== undefined) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'info',
          message: 'Ежедневное ознакомление с АБР',
        }),
      )
    }
    if (patch.lastRejection) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'rejection',
          message: `Отклонено: ${patch.lastRejection.comment}`,
          meta: { to: 'rejected' },
        }),
      )
    }
    if (patch.packagePdf) {
      await addDoc(
        this.journalCol(id),
        forFirestore({
          permitId: id,
          atIso: nowIso(),
          actorUid: actor.id,
          actorRole: actor.role,
          kind: 'matrix_note',
          message: `Сформирован PDF-пакет для согласования (${patch.packagePdf.fileName})`,
        }),
      )
    }
  }

  async transition(
    id: string,
    next: PermitStatus,
    actor: DemoUser,
  ): Promise<Permit> {
    const permit = await this.getById(id)
    if (!permit) throw new Error('Permit not found')
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
    const ref = doc(this.fs, 'permits', id)
    await setDoc(ref, forFirestore(updated), { merge: true })
    await addDoc(
      this.journalCol(id),
      forFirestore({
        permitId: id,
        atIso: nowIso(),
        actorUid: actor.id,
        actorRole: actor.role,
        kind: next === 'suspended' ? 'suspension' : 'status_change',
        message: `Статус: ${permit.status} → ${next}`,
        meta: { from: permit.status, to: next },
      }),
    )
    return updated
  }

  async requestWorkStop(
    id: string,
    params: WorkStopRequestParams,
    actor: DemoUser,
  ): Promise<Permit> {
    const permit = await this.getById(id)
    if (!permit) throw new Error('Permit not found')
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
    const ref = doc(this.fs, 'permits', id)
    await setDoc(ref, forFirestore(updated), { merge: true })
    await addDoc(
      this.journalCol(id),
      forFirestore({
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
      }),
    )
    const settings = await fetchInspectorSettingsAdmin(this.fs)
    const directory = params.directory ?? []
    const assignees = inspectorAssigneesForPermit(
      directory,
      updated,
      params.inspectorNotifyMode ?? settings.inspectorNotifyMode,
    )
    if (assignees.length) {
      await createWorkStopAlerts(
        this.fs,
        updated,
        workStop,
        assignees.map((u) => u.id),
      ).catch((e) => {
        console.warn('[NOVA] workStopAlerts create skipped (rules/functions)', e)
      })
    }
    return updated
  }

  async resolveWorkStop(
    id: string,
    params: WorkStopResolveParams,
    actor: DemoUser,
  ): Promise<Permit> {
    const permit = await this.getById(id)
    if (!permit) throw new Error('Permit not found')
    const patch =
      params.action === 'annul'
        ? annulPermitPatch(permit, actor, params.comment)
        : liftWorkStopPatch(permit, actor, params.comment)
    const updated: Permit = {
      ...permit,
      ...patch,
      updatedAtIso: nowIso(),
    }
    const ref = doc(this.fs, 'permits', id)
    await setDoc(ref, forFirestore(updated), { merge: true })
    const outcome = params.action === 'annul' ? 'annulled' : 'lifted'
    await addDoc(
      this.journalCol(id),
      forFirestore({
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
      }),
    )
    await resolveWorkStopAlertsFs(this.fs, id).catch((e) => {
      console.warn('[NOVA] workStopAlerts resolve skipped (rules/functions)', e)
    })
    return updated
  }

  async resolveRejectedPermit(
    id: string,
    params: { action: InspectorRejectedAction; comment: string },
    actor: DemoUser,
  ): Promise<Permit> {
    const permit = await this.getById(id)
    if (!permit) throw new Error('Permit not found')
    if (!canInspectorResolveRejectedPermit(permit, actor)) {
      throw new Error('Решение по отклонённому пакету принимает инженер по ОТ, ТБ и ООС')
    }
    const note = params.comment.trim()
    if (note.length < 3) {
      throw new Error('Укажите комментарий (не менее 3 символов)')
    }
    const atIso = nowIso()
    const nextStatus = params.action === 'annul' ? 'annulled' : 'on_approval'
    const ref = doc(this.fs, 'permits', id)
    const payload: Record<string, unknown> = {
      status: nextStatus,
      updatedAtIso: atIso,
    }
    if (params.action === 'restore') {
      payload.lastRejection = deleteField()
    }
    await setDoc(ref, payload, { merge: true })
    await addDoc(
      this.journalCol(id),
      forFirestore({
        permitId: id,
        atIso,
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'status_change',
        message: inspectorRejectedJournalMessage(params.action, note),
        meta: { from: permit.status, to: nextStatus, inspectorDecision: params.action },
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error('Permit not found')
    return updated
  }

  async resetRejectedPermitToDraft(id: string, actor: DemoUser): Promise<Permit> {
    const { canUserResubmitRejectedPermit, rejectedPermitResubmitFields } =
      await import('../lib/resubmitRejectedPermit')
    const permit = await this.getById(id)
    if (!permit) throw new Error('Permit not found')
    if (!canUserResubmitRejectedPermit(permit, actor)) {
      throw new Error('Исправить отклонённый пакет может производитель работ по наряду')
    }
    const atIso = nowIso()
    const fields = rejectedPermitResubmitFields()
    const ref = doc(this.fs, 'permits', id)
    await setDoc(
      ref,
      {
        ...forFirestore({
          ...fields,
          updatedAtIso: atIso,
        }),
        lastRejection: deleteField(),
      },
      { merge: true },
    )
    await addDoc(
      this.journalCol(id),
      forFirestore({
        permitId: id,
        atIso,
        actorUid: actor.id,
        actorRole: actor.role,
        kind: 'status_change',
        message: 'Отклонённый пакет возвращён в черновик для исправления и повторной отправки',
        meta: { from: permit.status, to: 'draft', resubmit: true },
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error('Permit not found')
    return updated
  }

  async deletePermit(id: string, _actor: DemoUser): Promise<void> {
    const journalSnap = await getDocs(this.journalCol(id))
    const batch = writeBatch(this.fs)
    journalSnap.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(this.fs, 'permits', id))
    await batch.commit()
    try {
      await cleanupPermitRelatedDataClient([id])
    } catch (e) {
      console.warn('[NOVA] Не удалось очистить задания ролей для наряда', id, e)
      try {
        await deleteSigningInvitesForPermit(this.fs, id)
      } catch (fallbackError) {
        console.warn('[NOVA] Не удалось удалить signingInvites для наряда', id, fallbackError)
      }
    }
  }

  async deleteAllPermits(_actor: DemoUser): Promise<void> {
    const snap = await getDocs(this.permitsCol())
    const permitIds = snap.docs.map((d) => d.id)
    for (const permitDoc of snap.docs) {
      const journalSnap = await getDocs(this.journalCol(permitDoc.id))
      const batch = writeBatch(this.fs)
      journalSnap.forEach((d) => batch.delete(d.ref))
      batch.delete(permitDoc.ref)
      await batch.commit()
    }
    if (permitIds.length === 0) return
    try {
      await cleanupPermitRelatedDataClient(permitIds)
    } catch (e) {
      console.warn('[NOVA] Не удалось очистить задания ролей при очистке журнала', e)
      try {
        await deleteSigningInvitesForPermits(this.fs, permitIds)
      } catch (fallbackError) {
        console.warn('[NOVA] Не удалось удалить signingInvites при очистке журнала', fallbackError)
      }
    }
  }

  subscribePermits(cb: (permits: Permit[]) => void): Unsubscribe {
    return onSnapshot(
      this.permitsCol(),
      (snap) => {
        const list: Permit[] = []
        snap.forEach((d) => {
          try {
            list.push(
              migratePermit({
                ...(d.data() as Permit),
                id: (d.data() as Permit).id || d.id,
              }),
            )
          } catch (e) {
            console.warn('[NOVA] Firestore: пропуск наряда при загрузке', d.id, e)
          }
        })
        cb(list.sort((a, b) => (a.updatedAtIso < b.updatedAtIso ? 1 : -1)))
      },
      (err) => {
        console.warn('[NOVA] Firestore: журнал нарядов — ошибка синхронизации', err)
      },
    )
  }

  journalSubscribe(
    permitId: string,
    cb: (entries: JournalEntry[]) => void,
  ): Unsubscribe {
    const qy = query(this.journalCol(permitId))
    return onSnapshot(
      qy,
      (snap) => {
        const list: JournalEntry[] = []
        snap.forEach((d) =>
          list.push({ id: d.id, ...(d.data() as Omit<JournalEntry, 'id'>) }),
        )
        cb(list.sort((a, b) => (a.atIso < b.atIso ? 1 : -1)))
      },
      (err) => {
        console.warn('[NOVA] Firestore: журнал событий — ошибка синхронизации', err)
      },
    )
  }

  async appendJournal(
    entry: Omit<JournalEntry, 'id'>,
  ): Promise<JournalEntry> {
    const ref = await addDoc(this.journalCol(entry.permitId), forFirestore(entry))
    return { ...entry, id: ref.id }
  }
}

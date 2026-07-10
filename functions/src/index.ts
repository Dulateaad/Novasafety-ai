import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type DocumentData,
} from 'firebase-admin/firestore'
import { buildNdprSigningPdf, pdfToBase64 } from './pdf/buildNdprPdf'
import { parseCmsSigner, verifyCmsViaSigex } from './signing/parseCmsSigner'
import {
  assertSignerMatchesProfile,
  SignerIdentityRejected,
} from './signing/verifySignerIdentity'
import {
  assigneeUidForRole,
  canUserSignRole,
  loadAssigneeEmail,
  signatureFlagKey,
} from './signing/permissions'
import { canSignRoleNow, patchAsorApprovalsOnSign } from './signing/approvalSequence'
import { maybeAutoIssuePatch, applyAutoIssueIfReady } from './signing/autoIssue'
import {
  ensureDefaultNdprSignerAccounts,
  provisionPermitSigners,
  ensureDefaultWorkerAccounts,
  syncSigningInvitesAfterSign,
  refreshCrewAckInvites,
} from './signing/provisionSigners'
import { renumberAllPermits } from './admin/renumberPermits'
import {
  cleanupOrphanPermitRelatedData,
  deletePermitRelatedDataForPermitsAdmin,
} from './admin/cleanupPermitRelatedData'
import { broadcastPermitNotice } from './notifications/permitNotices'
import { notifyUser } from './notifications/notifyUser'
import {
  canUserSignCrewAckAsync,
  completeCrewAckInvite,
  allCrewAcknowledgedAsync,
} from './signing/crewAck'
import { resolveWorkerUidOnServer } from './signing/resolveWorkerUid'
import type { EgovSignRole } from './signing/types'
import { SESSION_TTL_MS } from './signing/types'
import { CALLABLE_OPTIONS, LONG_CALLABLE_OPTIONS } from './callableOptions'
import {
  getSigningAppSettings,
  setSigningAppSettings,
  setInspectorNotifyMode,
} from './signing/appSettings'
import {
  buildWorkStopState,
  workStopJournalMessage,
  getInspectorNotifyMode,
  inspectorAssigneeUids,
  createWorkStopAlertsAdmin,
  isInspectorFirestoreUser,
  resolutionJournalMessage,
  resolveWorkStopAlertsAdmin,
  type WorkStopPhoto,
  type WorkStopState,
} from './workStop/handlers'

initializeApp()
const db = getFirestore()

const SIGEX_BASE = process.env.SIGEX_BASE_URL ?? 'https://sigex.kz'

const PUSH_TRIGGER_OPTIONS = { region: 'europe-west1' as const }

type BroadcastNoticeKind =
  | 'closure_saved'
  | 'info'
  | 'crew_changed'
  | 'performer_replaced'
  | 'ndpr_extended'

async function assertSignerIdentityIfEnabled(
  user: DocumentData,
  signerInfo: ReturnType<typeof parseCmsSigner>,
): Promise<void> {
  const settings = await getSigningAppSettings(db)
  try {
    assertSignerMatchesProfile(user, signerInfo, {
      verifyFio: settings.verifyEgovFio,
    })
  } catch (e) {
    if (e instanceof SignerIdentityRejected) {
      throw new HttpsError('permission-denied', e.message)
    }
    throw e
  }
}

function assertRole(raw: unknown): EgovSignRole {
  if (
    raw === 'performer' ||
    raw === 'permitter' ||
    raw === 'issuer' ||
    raw === 'leadExpert' ||
    raw === 'ert'
  ) {
    return raw
  }
  throw new HttpsError('invalid-argument', 'Некорректная роль подписи')
}

function assertBroadcastKind(raw: unknown): BroadcastNoticeKind {
  if (
    raw === 'closure_saved' ||
    raw === 'info' ||
    raw === 'crew_changed' ||
    raw === 'performer_replaced' ||
    raw === 'ndpr_extended'
  ) {
    return raw
  }
  throw new HttpsError('invalid-argument', 'Недопустимый тип уведомления')
}

/** Push + email при информационном уведомлении по наряду. */
export const pushOnPermitNotice = onDocumentCreated(
  { ...PUSH_TRIGGER_OPTIONS, document: 'permitNotices/{id}' },
  async (event) => {
    const n = event.data?.data()
    if (!n) return
    await notifyUser(db, String(n.assigneeUid ?? ''), {
      title: String(n.title ?? 'NOVA SAFETY AI'),
      body: String(n.message ?? ''),
      permitId: String(n.permitId ?? ''),
    })
  },
)

/** Push + email при приглашении на подпись (approval — в provisionSigners; crew_ack — в provisionCrewInvites). */
export const pushOnSigningInvite = onDocumentCreated(
  { ...PUSH_TRIGGER_OPTIONS, document: 'signingInvites/{id}' },
  async (event) => {
    const n = event.data?.data()
    if (!n) return
    const inviteType = String(n.inviteType ?? 'approval')
    if (inviteType === 'approval' || inviteType === 'crew_ack') return
    const status = String(n.status ?? '')
    if (status !== 'active') return
    const title = String(n.stepLabel ?? 'Требуется ваша подпись')
    await notifyUser(
      db,
      String(n.assigneeUid ?? ''),
      {
        title,
        body: String(n.message ?? title),
        permitId: String(n.permitId ?? ''),
      },
      { inviteType },
    )
  },
)

/** Push + email инспектору ОТ/ТБ/ООС при остановке работ. */
export const pushOnWorkStopAlert = onDocumentCreated(
  { ...PUSH_TRIGGER_OPTIONS, document: 'workStopAlerts/{id}' },
  async (event) => {
    const n = event.data?.data()
    if (!n) return
    const site = String(n.siteName ?? '').trim()
    const initiator = String(n.initiatedByName ?? '').trim()
    const reason = String(n.reason ?? '').trim()
    const bodyParts = [initiator && `${initiator}`, reason].filter(Boolean)
    await notifyUser(db, String(n.assigneeUid ?? ''), {
      title: site ? `Остановка работ — ${site}` : 'Остановка работ',
      body: bodyParts.join(': ') || 'Запрошена остановка работ.',
      permitId: String(n.permitId ?? ''),
    })
  },
)

/** Сформировать PDF и сессию подписания (серверный hash). */
export const getSigningDocument = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const permitId = String(request.data?.permitId ?? '')
  const role = assertRole(request.data?.role)
  if (!permitId) {
    throw new HttpsError('invalid-argument', 'permitId обязателен')
  }

  const uid = request.auth.uid
  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(uid).get(),
  ])
  if (!permitSnap.exists) {
    throw new HttpsError('not-found', 'Наряд не найден')
  }
  if (!userSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }

  const permit = permitSnap.data()!
  const user = userSnap.data()!
  const assigneeEmail = await loadAssigneeEmail(db, assigneeUidForRole(permit, role))
  if (!canUserSignRole(user, uid, permit, role, { assigneeEmail })) {
    throw new HttpsError(
      'permission-denied',
      'Недостаточно прав для подписи этой роли',
    )
  }
  if (!canSignRoleNow(permit, role)) {
    throw new HttpsError(
      'failed-precondition',
      'Сейчас не очередь этой роли — дождитесь предыдущих подписей',
    )
  }

  const existing = permit.egovSignatures?.[role] as
    | { cmsBase64?: string }
    | undefined
  if (existing?.cmsBase64) {
    throw new HttpsError('failed-precondition', 'Подпись этой роли уже есть')
  }

  const clientHash = String(request.data?.documentHash ?? '').trim()
  const clientPdfSize = Number(request.data?.pdfByteLength ?? 0)
  let pdf: Buffer | null = null
  let documentHash: string
  if (clientHash && clientPdfSize > 0) {
    documentHash = clientHash
  } else {
    try {
      ;({ pdf, documentHash } = await buildNdprSigningPdf({
        permit,
        role,
        signerName: String(user.displayName ?? 'Пользователь'),
        signerUid: uid,
      }))
    } catch (e) {
      throw new HttpsError(
        'internal',
        e instanceof Error ? e.message : 'Не удалось сформировать PDF для подписи',
      )
    }
  }

  const sessionRef = db.collection('signingSessions').doc()
  const now = Date.now()
  await sessionRef.set({
    permitId,
    role,
    signerUid: uid,
    documentHash,
    documentFormat: 'pdf',
    pdfByteLength: pdf?.length ?? clientPdfSize,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + SESSION_TTL_MS),
    used: false,
  })

  return {
    sessionId: sessionRef.id,
    documentHash,
    pdfBase64: pdf ? pdfToBase64(pdf) : '',
    dataBase64: pdf ? pdfToBase64(pdf) : '',
    documentFormat: 'pdf' as const,
  }
})

/** Принять CMS, проверить ИИН/роль, записать подпись в наряд. */
export const submitEgovSignature = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const sessionId = String(request.data?.sessionId ?? '')
  const cmsBase64 = String(request.data?.cmsBase64 ?? '')
  const providerRaw = String(request.data?.provider ?? 'egov_mobile')
  const provider =
    providerRaw === 'ncalayer' || providerRaw === 'egov_business'
      ? providerRaw
      : 'egov_mobile'
  if (!sessionId || !cmsBase64.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId и cmsBase64 обязательны')
  }

  const cmsNormalized = cmsBase64.replace(/\s+/g, '')
  const cmsByteLength = Math.floor((cmsNormalized.length * 3) / 4)
  if (cmsByteLength > 750_000) {
    throw new HttpsError(
      'invalid-argument',
      'Подпись слишком большая для сохранения. Используйте откреплённую подпись NCALayer (без вложенного PDF).',
    )
  }

  const uid = request.auth.uid
  const sessionRef = db.collection('signingSessions').doc(sessionId)
  const sessionSnap = await sessionRef.get()
  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'Сессия подписания не найдена')
  }
  const session = sessionSnap.data()!
  if (session.used) {
    throw new HttpsError('failed-precondition', 'Сессия уже использована')
  }
  if (session.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Сессия подписания истекла')
  }
  if (session.signerUid !== uid) {
    throw new HttpsError('permission-denied', 'Сессия принадлежит другому пользователю')
  }

  const role = assertRole(session.role)
  const permitId = String(session.permitId)
  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(uid).get(),
  ])
  if (!permitSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Наряд или профиль не найден')
  }
  const permit = permitSnap.data()!
  const user = userSnap.data()!
  const assigneeEmail = await loadAssigneeEmail(db, assigneeUidForRole(permit, role))
  if (!canUserSignRole(user, uid, permit, role, { assigneeEmail })) {
    throw new HttpsError('permission-denied', 'Нет прав на эту подпись')
  }
  if (!canSignRoleNow(permit, role)) {
    throw new HttpsError(
      'failed-precondition',
      'Сейчас не очередь этой роли — дождитесь предыдущих подписей',
    )
  }

  let signerInfo
  try {
    signerInfo = parseCmsSigner(cmsNormalized)
  } catch (e) {
    throw new HttpsError(
      'invalid-argument',
      `Не удалось разобрать CMS: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  await assertSignerIdentityIfEnabled(user, signerInfo)

  const sigexCheck = await verifyCmsViaSigex(cmsNormalized, SIGEX_BASE)
  if (!sigexCheck.ok) {
    console.warn('SIGEX verify soft-fail:', sigexCheck.detail)
    // Не блокируем, если SIGEX недоступен — CMS уже разобран локально.
  }

  const stored = {
    role,
    signedAtIso: new Date().toISOString(),
    signedByUid: uid,
    signedByDisplayName: String(user.displayName ?? signerInfo.commonName),
    signerIin: signerInfo.iin,
    signerSubjectDn: signerInfo.subjectDn,
    documentHash: String(session.documentHash),
    documentFormat: 'pdf',
    cmsBase64: cmsNormalized,
    provider,
    sigexVerified: sigexCheck.ok,
  }

  const flagKey = signatureFlagKey(role)
  const egovSignatures = {
    ...(permit.egovSignatures ?? {}),
    [role]: stored,
  }
  const signatures = {
    ...(permit.signatures ?? {}),
    [flagKey]: true,
  }

  const badge =
    String((permit.f02 as { badgeNo?: string } | undefined)?.badgeNo ?? '').trim() ||
    String(permit.registrationRefNo ?? '').trim()
  const asorPatch = patchAsorApprovalsOnSign(permit, role, {
    fullNamePrinted: stored.signedByDisplayName,
    badgeNo: badge,
    signedAtIso: stored.signedAtIso,
  })

  const updatePayload: DocumentData = {
    egovSignatures,
    signatures,
    updatedAtIso: new Date().toISOString(),
  }
  if (asorPatch) updatePayload.asor = asorPatch

  const mergedPermit = { ...permit, egovSignatures, signatures }
  const autoIssuePatch = maybeAutoIssuePatch(mergedPermit)
  if (autoIssuePatch) {
    updatePayload.status = 'issued'
  }

  try {
    await db.collection('permits').doc(permitId).update(updatePayload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/longer than \d+ bytes|exceeds the maximum allowed size/i.test(msg)) {
      throw new HttpsError(
        'invalid-argument',
        'Документ наряда слишком большой для сохранения подписи. Попробуйте откреплённую подпись NCALayer.',
      )
    }
    throw new HttpsError('internal', `Не удалось сохранить подпись: ${msg}`)
  }

  if (autoIssuePatch) {
    await db.collection('permits').doc(permitId).collection('journal').add({
      permitId,
      atIso: new Date().toISOString(),
      actorUid: uid,
      actorRole: user.role ?? 'coordinator',
      kind: 'status_change',
      message: 'Статус: on_approval → issued (все подписи согласующих получены)',
      meta: { from: 'on_approval', to: 'issued', auto: true },
    })
    await refreshCrewAckInvites(db, permitId)
    await broadcastPermitNotice(
      db,
      permitId,
      { ...mergedPermit, status: 'issued' },
      'issued',
    )
  }

  await syncSigningInvitesAfterSign(db, permitId, role)
  await sessionRef.update({ used: true, completedAt: FieldValue.serverTimestamp() })

  await db.collection('permits').doc(permitId).collection('journal').add({
    permitId,
    atIso: new Date().toISOString(),
    actorUid: uid,
    actorRole: user.role ?? 'coordinator',
    kind: 'signature',
    message: `ЭЦП (${role}): ${stored.signedByDisplayName}${signerInfo.iin ? `, ИИН ${signerInfo.iin}` : ''}`,
    meta: { egovRole: role, documentHash: stored.documentHash, sigexVerified: sigexCheck.ok },
  })

  return { ok: true, signature: stored }
})

/** Создать стандартные учётки участников НДПР (производитель, допускающий, выдающий, утверждающий). */
export const ensureDefaultNdprSignersFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  try {
    return await ensureDefaultNdprSignerAccounts(db)
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось подготовить учётки участников',
    )
  }
})

/** Создать учётки подписантов (если нет) и уведомления signingInvites. */
export const provisionPermitSignersFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const permitId = String(request.data?.permitId ?? '')
  if (!permitId) {
    throw new HttpsError('invalid-argument', 'permitId обязателен')
  }

  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  const callerRole = String(callerSnap.data()?.role ?? '')
  if (
    callerRole !== 'coordinator' &&
    callerRole !== 'performer' &&
    callerRole !== 'issuer' &&
    callerRole !== 'ert'
  ) {
    throw new HttpsError(
      'permission-denied',
      'Только координатор или составитель может назначить подписантов',
    )
  }

  try {
    return await provisionPermitSigners(db, permitId)
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось назначить подписантов',
    )
  }
})

/** Создать стандартные учётки работников бригады. */
export const ensureDefaultWorkersFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  try {
    const accounts = await ensureDefaultWorkerAccounts(db)
    return { accounts }
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось подготовить учётки работников',
    )
  }
})

/** Перенумеровать наряды 001, 002… по дате создания (координатор). */
export const renumberPermitsFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  const callerRole = String(callerSnap.data()?.role ?? '')
  if (callerRole !== 'coordinator') {
    throw new HttpsError('permission-denied', 'Только координатор может перенумеровать наряды')
  }

  try {
    return await renumberAllPermits(db)
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось перенумеровать наряды',
    )
  }
})

/** Рассылка информационного уведомления участникам наряда (закрытие PDF и т.п.). */
export const broadcastPermitNoticeFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const permitId = String(request.data?.permitId ?? '').trim()
  const kind = assertBroadcastKind(request.data?.kind ?? 'info')
  if (!permitId) {
    throw new HttpsError('invalid-argument', 'Укажите permitId')
  }

  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(request.auth.uid).get(),
  ])
  if (!permitSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Наряд или профиль не найден')
  }

  const user = userSnap.data()!
  const role = String(user.role ?? '')
  if (kind === 'closure_saved' && role !== 'performer' && role !== 'coordinator') {
    throw new HttpsError(
      'permission-denied',
      'Уведомление о закрытии может отправить производитель или координатор',
    )
  }
  if (
    (kind === 'crew_changed' || kind === 'performer_replaced' || kind === 'ndpr_extended') &&
    role !== 'performer' &&
    role !== 'coordinator' &&
    role !== 'permitter'
  ) {
    throw new HttpsError('permission-denied', 'Недостаточно прав для рассылки уведомления')
  }

  const recipients = await broadcastPermitNotice(
    db,
    permitId,
    permitSnap.data()!,
    kind,
  )
  return { ok: true, recipients }
})

/** Удалить приглашения на подпись для уже удалённых нарядов (координатор). */
export const cleanupOrphanSigningInvitesFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  const callerRole = String(callerSnap.data()?.role ?? '')
  if (callerRole !== 'coordinator') {
    throw new HttpsError('permission-denied', 'Только координатор может очистить уведомления')
  }

  try {
    const result = await cleanupOrphanPermitRelatedData(db)
    return {
      deleted:
        result.signingInvites + result.permitNotices + result.workStopAlerts,
      scanned:
        result.scannedSigningInvites +
        result.scannedPermitNotices +
        result.scannedWorkStopAlerts,
      ...result,
    }
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось очистить уведомления',
    )
  }
})

/** Удалить задания и уведомления ролей по списку нарядов (координатор). */
export const cleanupPermitRelatedDataFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  const callerRole = String(callerSnap.data()?.role ?? '')
  if (callerRole !== 'coordinator') {
    throw new HttpsError('permission-denied', 'Только координатор может удалять задания ролей')
  }

  const permitIds = Array.isArray(request.data?.permitIds)
    ? request.data.permitIds.map((id: unknown) => String(id ?? '').trim()).filter(Boolean)
    : []
  if (permitIds.length === 0) {
    throw new HttpsError('invalid-argument', 'Укажите permitIds')
  }

  try {
    return await deletePermitRelatedDataForPermitsAdmin(db, permitIds)
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось удалить задания ролей',
    )
  }
})

/** Удалить «осиротевшие» задания и уведомления для удалённых нарядов (координатор). */
export const cleanupOrphanPermitRelatedDataFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  const callerRole = String(callerSnap.data()?.role ?? '')
  if (callerRole !== 'coordinator') {
    throw new HttpsError('permission-denied', 'Только координатор может очистить задания ролей')
  }

  try {
    return await cleanupOrphanPermitRelatedData(db)
  } catch (e) {
    throw new HttpsError(
      'internal',
      e instanceof Error ? e.message : 'Не удалось очистить задания ролей',
    )
  }
})

/** Настройки подписи eGov (чтение — любой вошедший пользователь). */
export const getSigningSettingsFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  return getSigningAppSettings(db)
})

/** Вкл/выкл проверки ФИО при подписи eGov (только координатор). */
export const setSigningSettingsFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  const callerRole = String(callerSnap.data()?.role ?? '')
  if (callerRole !== 'coordinator') {
    throw new HttpsError('permission-denied', 'Только координатор может менять настройки подписи')
  }

  if (typeof request.data?.verifyEgovFio !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Укажите verifyEgovFio: true | false')
  }
  const verifyEgovFio = request.data.verifyEgovFio
  return setSigningAppSettings(db, { verifyEgovFio }, request.auth.uid)
})

/** Сессия подписания ознакомления бригады с АБР и оценкой Риска. */
export const getCrewAckDocument = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const permitId = String(request.data?.permitId ?? '')
  if (!permitId) {
    throw new HttpsError('invalid-argument', 'permitId обязателен')
  }

  const uid = request.auth.uid
  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(uid).get(),
  ])
  if (!permitSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Наряд или профиль не найден')
  }

  const permit = permitSnap.data()!
  const user = userSnap.data()!
  if (!(await canUserSignCrewAckAsync(db, user, uid, permit))) {
    throw new HttpsError('permission-denied', 'Нет прав на ознакомление по этому наряду')
  }

  const documentHash = String(request.data?.documentHash ?? '').trim()
  const clientPdfSize = Number(request.data?.pdfByteLength ?? 0)
  if (!documentHash || clientPdfSize <= 0) {
    throw new HttpsError('invalid-argument', 'documentHash и pdfByteLength обязательны')
  }

  const sessionRef = db.collection('signingSessions').doc()
  const now = Date.now()
  await sessionRef.set({
    permitId,
    role: 'crewAck',
    signerUid: uid,
    documentHash,
    documentFormat: 'pdf',
    pdfByteLength: clientPdfSize,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + SESSION_TTL_MS),
    used: false,
  })

  return {
    sessionId: sessionRef.id,
    documentHash,
    documentFormat: 'pdf' as const,
  }
})

/** Принять ЭЦП ознакомления бригады с АБР и оценкой Риска. */
export const submitCrewAcknowledgment = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const sessionId = String(request.data?.sessionId ?? '')
  const cmsBase64 = String(request.data?.cmsBase64 ?? '')
  const providerRaw = String(request.data?.provider ?? 'egov_mobile')
  const provider =
    providerRaw === 'ncalayer' || providerRaw === 'egov_business'
      ? providerRaw
      : 'egov_mobile'
  if (!sessionId || !cmsBase64.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId и cmsBase64 обязательны')
  }

  const cmsNormalized = cmsBase64.replace(/\s+/g, '')
  const cmsByteLength = Math.floor((cmsNormalized.length * 3) / 4)
  if (cmsByteLength > 750_000) {
    throw new HttpsError(
      'invalid-argument',
      'Подпись слишком большая для сохранения. Используйте откреплённую подпись NCALayer.',
    )
  }

  const uid = request.auth.uid
  const sessionRef = db.collection('signingSessions').doc(sessionId)
  const sessionSnap = await sessionRef.get()
  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'Сессия подписания не найдена')
  }
  const session = sessionSnap.data()!
  if (session.used) {
    throw new HttpsError('failed-precondition', 'Сессия уже использована')
  }
  if (session.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Сессия подписания истекла')
  }
  if (session.signerUid !== uid || session.role !== 'crewAck') {
    throw new HttpsError('permission-denied', 'Сессия принадлежит другому пользователю')
  }

  const permitId = String(session.permitId)
  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(uid).get(),
  ])
  if (!permitSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Наряд или профиль не найден')
  }

  const permit = permitSnap.data()!
  const user = userSnap.data()!
  if (!(await canUserSignCrewAckAsync(db, user, uid, permit))) {
    throw new HttpsError('permission-denied', 'Нет прав на ознакомление')
  }

  let signerInfo
  try {
    signerInfo = parseCmsSigner(cmsNormalized)
  } catch (e) {
    throw new HttpsError(
      'invalid-argument',
      `Не удалось разобрать CMS: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  await assertSignerIdentityIfEnabled(user, signerInfo)

  const stored = {
    signedAtIso: new Date().toISOString(),
    signedByUid: uid,
    signedByDisplayName: String(user.displayName ?? signerInfo.commonName),
    signerIin: signerInfo.iin,
    signerSubjectDn: signerInfo.subjectDn,
    documentHash: String(session.documentHash),
    cmsBase64: cmsNormalized,
    provider,
  }

  const executors = Array.isArray(permit.executors) ? [...permit.executors] : []
  const nextExecutors = await Promise.all(
    executors.map(async (ex) => {
      const row = ex as { userUid?: string; briefingAcknowledged?: boolean }
      const raw = String(row.userUid ?? '').trim()
      if (!raw) return ex
      const resolved = await resolveWorkerUidOnServer(db, raw)
      if (raw === uid || resolved === uid) {
        return { ...row, briefingAcknowledged: true }
      }
      return ex
    }),
  )
  const crewAckSignatures: Record<string, typeof stored> = {
    ...((permit.crewAckSignatures as Record<string, typeof stored> | undefined) ?? {}),
    [uid]: stored,
  }
  for (const ex of executors) {
    const raw = String((ex as { userUid?: string }).userUid ?? '').trim()
    if (!raw || raw === uid) continue
    const resolved = await resolveWorkerUidOnServer(db, raw)
    if (resolved === uid) {
      crewAckSignatures[raw] = stored
    }
  }

  await db.collection('permits').doc(permitId).update({
    executors: nextExecutors,
    crewAckSignatures,
    updatedAtIso: new Date().toISOString(),
  })

  const mergedPermit = {
    ...permit,
    executors: nextExecutors,
    crewAckSignatures,
  }

  await completeCrewAckInvite(db, permitId, uid)
  if (await allCrewAcknowledgedAsync(db, mergedPermit)) {
    await provisionPermitSigners(db, permitId)
  } else {
    await refreshCrewAckInvites(db, permitId)
  }

  await applyAutoIssueIfReady(db, permitId, mergedPermit, {
    uid,
    role: String(user.role ?? 'executor'),
  })

  await sessionRef.update({ used: true, completedAt: FieldValue.serverTimestamp() })

  await db.collection('permits').doc(permitId).collection('journal').add({
    permitId,
    atIso: new Date().toISOString(),
    actorUid: uid,
    actorRole: user.role ?? 'executor',
    kind: 'signature',
    message: `Ознакомление с АБР и оценкой Риска: ${stored.signedByDisplayName}`,
    meta: { crewAck: true, documentHash: stored.documentHash },
  })

  return { ok: true, signature: stored }
})

/** Остановка работ участником наряда (причина обязательна). */
export const requestWorkStopFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const permitId = String(request.data?.permitId ?? '')
  const reason = String(request.data?.reason ?? '')
  const photo = request.data?.photo as WorkStopPhoto | undefined
  if (!permitId) {
    throw new HttpsError('invalid-argument', 'permitId обязателен')
  }

  const uid = request.auth.uid
  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(uid).get(),
  ])
  if (!permitSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Наряд или профиль не найден')
  }

  const permit = permitSnap.data()!
  const user = userSnap.data()!

  let workStop: WorkStopState
  try {
    workStop = buildWorkStopState(permit, user, uid, reason, photo)
  } catch (e) {
    throw new HttpsError(
      'failed-precondition',
      e instanceof Error ? e.message : 'Нельзя остановить работу',
    )
  }

  await db.collection('permits').doc(permitId).set(
    {
      status: 'suspended',
      workStop,
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  )

  await db.collection('permits').doc(permitId).collection('journal').add({
    permitId,
    atIso: workStop.atIso,
    actorUid: uid,
    actorRole: user.role ?? 'executor',
    kind: 'work_stop',
    message: workStopJournalMessage(workStop),
    meta: {
      reason: workStop.reason,
      hasPhoto: !!workStop.photo,
      initiatedByName: workStop.initiatedByName,
    },
  })

  const mode = await getInspectorNotifyMode(db)
  const assignees = await inspectorAssigneeUids(db, permit, mode)
  if (assignees.length) {
    await createWorkStopAlertsAdmin(db, permitId, permit, workStop, assignees)
  }

  return { ok: true }
})

/** Решение инспектора по ОТ, ТБ и ООС: снять остановку или аннулировать НДПР. */
export const resolveWorkStopFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const permitId = String(request.data?.permitId ?? '')
  const action = String(request.data?.action ?? '')
  const comment = String(request.data?.comment ?? '')
  if (!permitId || (action !== 'lift' && action !== 'annul')) {
    throw new HttpsError('invalid-argument', 'permitId и action (lift|annul) обязательны')
  }

  const uid = request.auth.uid
  const [permitSnap, userSnap] = await Promise.all([
    db.collection('permits').doc(permitId).get(),
    db.collection('users').doc(uid).get(),
  ])
  if (!permitSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Наряд или профиль не найден')
  }

  const permit = permitSnap.data()!
  const user = userSnap.data()!
  if (!isInspectorFirestoreUser(user)) {
    throw new HttpsError(
      'permission-denied',
      'Аннулировать НДПР и снимать остановку может только Инженер по ОТ, ТБ и ООС',
    )
  }

  const ws = permit.workStop as WorkStopState | undefined
  if (!ws || ws.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Нет активной остановки работ')
  }

  const note = comment.trim()
  if (note.length < 3) {
    throw new HttpsError('invalid-argument', 'Укажите комментарий (не менее 3 символов)')
  }

  const nowIso = new Date().toISOString()
  const nextWorkStop: WorkStopState = {
    ...ws,
    resolvedAtIso: nowIso,
    resolvedByUid: uid,
    resolvedByName: String(user.displayName ?? 'Инспектор'),
    inspectorComment: note,
    status: action === 'annul' ? 'annulled' : 'lifted',
  }
  const nextStatus =
    action === 'annul'
      ? 'annulled'
      : ws.previousPermitStatus === 'issued' || ws.previousPermitStatus === 'in_progress'
        ? ws.previousPermitStatus
        : 'in_progress'

  await db.collection('permits').doc(permitId).set(
    {
      status: nextStatus,
      workStop: nextWorkStop,
      updatedAtIso: nowIso,
    },
    { merge: true },
  )

  const outcome = action === 'annul' ? 'annulled' : 'lifted'
  await db.collection('permits').doc(permitId).collection('journal').add({
    permitId,
    atIso: nowIso,
    actorUid: uid,
    actorRole: 'safety',
    kind: 'work_stop_resolution',
    message: resolutionJournalMessage(nextWorkStop, outcome),
    meta: { outcome, comment: note, inspectorName: user.displayName },
  })

  await resolveWorkStopAlertsAdmin(db, permitId)
  return { ok: true, status: nextStatus }
})

/** Режим уведомления инспекторов (координатор). */
export const setInspectorSettingsFn = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Требуется вход')
  }
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'Нет профиля пользователя')
  }
  if (String(callerSnap.data()?.role ?? '') !== 'coordinator') {
    throw new HttpsError('permission-denied', 'Только координатор может менять настройки инспектора')
  }

  const mode = request.data?.inspectorNotifyMode === 'site_bound' ? 'site_bound' : 'global'
  const settings = await setInspectorNotifyMode(db, mode, request.auth.uid)
  return {
    inspectorNotifyMode: settings.inspectorNotifyMode,
  }
})

/** Универсальный прокси Claude (PDF и текст) — ключ ANTHROPIC_API_KEY только на сервере. */
export const claudeAiFn = onCall(LONG_CALLABLE_OPTIONS, async (request) => {
  const systemPrompt = String(request.data?.systemPrompt ?? '').trim()
  const userPrompt = String(request.data?.userPrompt ?? '').trim()
  const mimeType = String(request.data?.mimeType ?? '').trim()
  const dataBase64 = String(request.data?.dataBase64 ?? '').trim()
  const complex = Boolean(request.data?.complex)

  if (!systemPrompt || !userPrompt) {
    throw new HttpsError('invalid-argument', 'systemPrompt и userPrompt обязательны')
  }

  try {
    const {
      claudeGenerateText,
      claudeGenerateTextForComplexExtraction,
      claudeGenerateTextForExtraction,
      claudeGenerateWithFileForExtraction,
    } = await import('./claude/client')
    if (dataBase64 && mimeType) {
      if (dataBase64.length > 12_000_000) {
        throw new HttpsError('invalid-argument', 'Файл слишком большой для Claude')
      }
      const raw = await claudeGenerateWithFileForExtraction({
        systemPrompt,
        userPrompt,
        mimeType,
        dataBase64,
        complex,
      })
      return { raw }
    }
    const raw = complex
      ? await claudeGenerateTextForComplexExtraction({ systemPrompt, userPrompt })
      : request.data?.extraction === false
        ? await claudeGenerateText({
            systemPrompt,
            userPrompt,
            json: request.data?.json !== false,
          })
        : await claudeGenerateTextForExtraction({ systemPrompt, userPrompt })
    return { raw }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('ANTHROPIC_API_KEY')) {
      throw new HttpsError(
        'failed-precondition',
        'На сервере не настроен ANTHROPIC_API_KEY для Cloud Functions',
      )
    }
    throw new HttpsError('internal', message)
  }
})

/** Извлечение мер контроля из PDF ППР через Claude на сервере (ANTHROPIC_API_KEY). */
export const extractPprControlMeasuresFromPdfFn = onCall(
  LONG_CALLABLE_OPTIONS,
  async (request) => {
    const dataBase64 = String(request.data?.dataBase64 ?? '').trim()
    const fileName = String(request.data?.fileName ?? 'document.pdf').trim()
    if (!dataBase64) {
      throw new HttpsError('invalid-argument', 'dataBase64 обязателен')
    }
    if (dataBase64.length > 12_000_000) {
      throw new HttpsError('invalid-argument', 'PDF слишком большой для извлечения')
    }
    try {
      const { extractPprControlMeasuresPdfRaw } = await import(
        './claude/extractPprControlMeasuresPdf'
      )
      const raw = await extractPprControlMeasuresPdfRaw({ dataBase64, fileName })
      return { raw }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes('ANTHROPIC_API_KEY')) {
        throw new HttpsError(
          'failed-precondition',
          'На сервере не настроен ANTHROPIC_API_KEY для Cloud Functions',
        )
      }
      throw new HttpsError('internal', message)
    }
  },
)

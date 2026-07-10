import { getAuth } from 'firebase-admin/auth'
import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import { assigneeUidForRole, isPlaceholderAssigneeUid } from './permissions'
import {
  approvalStepLabel,
  isRoleSigned,
  nextRoleToSignAsync,
  requiredSignRoles,
} from './approvalSequence'
import {
  ADDITIONAL_PERFORMER_ACCOUNT_TEMPLATES,
  SIGNER_ACCOUNT_TEMPLATES,
  type SignerAccountTemplate,
} from './signerTemplates'
import { WORKER_ACCOUNT_TEMPLATES, type WorkerAccountTemplate } from './workerTemplates'
import {
  INSPECTOR_ACCOUNT_TEMPLATE,
  type InspectorAccountTemplate,
} from './inspectorTemplate'
import { ERT_ACCOUNT_TEMPLATE, type ErtAccountTemplate } from './ertTemplate'
import { executorBriefingDone } from './crewAck'
import { normalizePermitExecutorUids, resolveWorkerUidOnServer } from './resolveWorkerUid'
import { notifyUser } from '../notifications/notifyUser'
import type { EgovSignRole } from './types'

const ROLE_UID_FIELD: Record<EgovSignRole, string> = {
  performer: 'performerUid',
  permitter: 'permitterUid',
  issuer: 'issuerUid',
  leadExpert: 'leadExpertUid',
  ert: 'ertUid',
}

const APPROVAL_PACKAGE_MESSAGE =
  'Требуется подпись единого PDF-пакета: НДПР, Анализ безопасности работ и Оценка Риска'

type SigningInviteStatus = 'completed' | 'active' | 'pending'

type ProvisionedAccount = {
  uid: string
  email: string
  displayName: string
  created: boolean
}

type WorkerProvisionedAccount = ProvisionedAccount & {
  role: 'executor'
  badgeNo: string
}

type InspectorProvisionedAccount = ProvisionedAccount & {
  role: InspectorAccountTemplate['role']
  badgeNo: string
  inspectorSites: string[]
}

type ErtProvisionedAccount = ProvisionedAccount & {
  role: ErtAccountTemplate['role']
  badgeNo: string
}

type NdprSignerSlot = {
  slot: EgovSignRole
  uid: string
  email: string
  displayName: string
  role: EgovSignRole | 'performer'
  badgeNo: string
  created: boolean
}

type ResolvedSigner = {
  uid: string
  email: string
  displayName: string
  accountCreated: boolean
}

type ProvisionedSigner = ResolvedSigner & {
  role: EgovSignRole
  stepLabel: string
  inviteId: string
}

function authErrorCode(e: unknown): string {
  return e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
}

function approvalInviteMessage(status: SigningInviteStatus, stepLabel: string): string {
  if (status === 'completed') return 'Подпись получена'
  if (status === 'pending') return `Ожидает очереди: ${stepLabel}`
  return APPROVAL_PACKAGE_MESSAGE
}

export async function ensureWorkerAccount(
  db: Firestore,
  template: WorkerAccountTemplate,
): Promise<ProvisionedAccount> {
  const auth = getAuth()
  let userRecord
  let created = false
  try {
    userRecord = await auth.getUserByEmail(template.email)
    await auth.updateUser(userRecord.uid, {
      displayName: template.displayName,
      password: template.password,
      emailVerified: true,
    })
  } catch (e: unknown) {
    if (authErrorCode(e) !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email: template.email,
      password: template.password,
      displayName: template.displayName,
      emailVerified: true,
    })
    created = true
  }
  await db
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName: template.displayName,
        role: 'executor',
        email: template.email,
        badgeNo: template.badgeNo,
      },
      { merge: true },
    )
  return {
    uid: userRecord.uid,
    email: template.email,
    displayName: template.displayName,
    created,
  }
}

/** Создаёт/обновляет стандартные учётки работников бригады. */
export async function ensureDefaultWorkerAccounts(
  db: Firestore,
): Promise<WorkerProvisionedAccount[]> {
  const accounts = await Promise.all(
    WORKER_ACCOUNT_TEMPLATES.map((template) => ensureWorkerAccount(db, template)),
  )
  return accounts.map((account, i) => ({
    uid: account.uid,
    email: account.email,
    displayName: account.displayName,
    role: 'executor',
    badgeNo: WORKER_ACCOUNT_TEMPLATES[i].badgeNo,
    created: account.created,
  }))
}

async function provisionCrewInvites(
  db: Firestore,
  permitId: string,
  permit: DocumentData,
): Promise<void> {
  const executors = Array.isArray(permit.executors) ? permit.executors : []
  const permitTitle = String(permit.title ?? permit.workDescription ?? 'НДПР')
  const regNo = String(permit.registrationRefNo ?? '')
  const status = String(permit.status ?? '')
  const performerSigned = isRoleSigned(permit, 'performer')
  const crewActive =
    performerSigned &&
    (status === 'on_approval' || status === 'issued' || status === 'in_progress')

  for (const ex of executors) {
    const rawUid = String((ex as { userUid?: string }).userUid ?? '').trim()
    if (!rawUid) continue
    const uid = await resolveWorkerUidOnServer(db, rawUid)
    const userSnap = await db.collection('users').doc(uid).get()
    if (!userSnap.exists) continue
    const userData = userSnap.data() ?? {}
    const displayName = String(userData.displayName ?? '').trim() || uid
    const email = String(userData.email ?? '').trim()
    const done = executorBriefingDone(permit, uid)
    const inviteId = `${permitId}_crew_${uid}`
    const existingSnap = await db.collection('signingInvites').doc(inviteId).get()
    const prevStatus = String(existingSnap.data()?.status ?? '')
    const stepLabel = `Ознакомление с АБР и оценкой Риска — ${displayName}`
    const newStatus: SigningInviteStatus = done ? 'completed' : crewActive ? 'active' : 'pending'
    const message = done
      ? 'Ознакомление подтверждено'
      : 'Требуется ознакомление с АБР и оценкой Риска (единый PDF-пакет, подпись eGov)'
    await db
      .collection('signingInvites')
      .doc(inviteId)
      .set(
        {
          permitId,
          permitTitle,
          registrationRefNo: regNo,
          assigneeUid: uid,
          assigneeEmail: email,
          assigneeDisplayName: displayName,
          signRole: 'crewAck',
          inviteType: 'crew_ack',
          stepLabel,
          status: newStatus,
          message,
          createdAtIso: existingSnap.exists
            ? String(existingSnap.data()?.createdAtIso ?? new Date().toISOString())
            : new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        },
        { merge: true },
      )
    if (newStatus === 'active' && prevStatus !== 'active' && !done) {
      await notifyUser(
        db,
        uid,
        { title: stepLabel, body: message, permitId },
        { inviteType: 'crew_ack' },
      )
    }
  }
}

export async function ensureRoleAccount(
  db: Firestore,
  template: SignerAccountTemplate,
): Promise<ProvisionedAccount> {
  const auth = getAuth()
  let userRecord
  let created = false
  try {
    userRecord = await auth.getUserByEmail(template.email)
    await auth.updateUser(userRecord.uid, {
      displayName: template.displayName,
      password: template.password,
      emailVerified: true,
    })
  } catch (e: unknown) {
    if (authErrorCode(e) !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email: template.email,
      password: template.password,
      displayName: template.displayName,
      emailVerified: true,
    })
    created = true
  }
  await db
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName: template.displayName,
        role: template.role,
        email: template.email,
        badgeNo: template.badgeNo,
        ...(template.iin ? { iin: template.iin } : {}),
      },
      { merge: true },
    )
  return {
    uid: userRecord.uid,
    email: template.email,
    displayName: template.displayName,
    created,
  }
}

/** Создаёт/обновляет учётку инспектора по ОТ, ТБ и ООС. */
export async function ensureInspectorAccount(
  db: Firestore,
  template: InspectorAccountTemplate = INSPECTOR_ACCOUNT_TEMPLATE,
): Promise<InspectorProvisionedAccount> {
  const auth = getAuth()
  let userRecord
  let created = false
  try {
    userRecord = await auth.getUserByEmail(template.email)
    await auth.updateUser(userRecord.uid, {
      displayName: template.displayName,
      password: template.password,
      emailVerified: true,
    })
  } catch (e: unknown) {
    if (authErrorCode(e) !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email: template.email,
      password: template.password,
      displayName: template.displayName,
      emailVerified: true,
    })
    created = true
  }
  await db
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName: template.displayName,
        role: template.role,
        email: template.email,
        badgeNo: template.badgeNo,
        inspectorSites: template.inspectorSites,
      },
      { merge: true },
    )
  return {
    uid: userRecord.uid,
    email: template.email,
    displayName: template.displayName,
    role: template.role,
    badgeNo: template.badgeNo,
    inspectorSites: template.inspectorSites,
    created,
  }
}

/** Создаёт/обновляет учётку Emergency Response Team (ПАС). */
export async function ensureErtAccount(
  db: Firestore,
  template: ErtAccountTemplate = ERT_ACCOUNT_TEMPLATE,
): Promise<ErtProvisionedAccount> {
  const auth = getAuth()
  let userRecord
  let created = false
  try {
    userRecord = await auth.getUserByEmail(template.email)
    await auth.updateUser(userRecord.uid, {
      displayName: template.displayName,
      password: template.password,
      emailVerified: true,
    })
  } catch (e: unknown) {
    if (authErrorCode(e) !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email: template.email,
      password: template.password,
      displayName: template.displayName,
      emailVerified: true,
    })
    created = true
  }
  await db
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName: template.displayName,
        role: template.role,
        email: template.email,
        badgeNo: template.badgeNo,
      },
      { merge: true },
    )
  return {
    uid: userRecord.uid,
    email: template.email,
    displayName: template.displayName,
    role: template.role,
    badgeNo: template.badgeNo,
    created,
  }
}

async function resolveSignerUid(
  db: Firestore,
  permit: DocumentData,
  role: EgovSignRole,
): Promise<ResolvedSigner> {
  if (role === 'ert') {
    const currentUid = assigneeUidForRole(permit, role)
    if (currentUid && !isPlaceholderAssigneeUid(currentUid)) {
      const snap = await db.collection('users').doc(currentUid).get()
      if (snap.exists) {
        const data = snap.data() ?? {}
        return {
          uid: currentUid,
          email: String(data.email ?? ERT_ACCOUNT_TEMPLATE.email),
          displayName: String(data.displayName ?? ERT_ACCOUNT_TEMPLATE.displayName),
          accountCreated: false,
        }
      }
    }
    const account = await ensureErtAccount(db)
    return {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      accountCreated: account.created,
    }
  }
  const template = SIGNER_ACCOUNT_TEMPLATES[role]
  const currentUid = assigneeUidForRole(permit, role)
  if (currentUid) {
    const snap = await db.collection('users').doc(currentUid).get()
    if (snap.exists) {
      const data = snap.data() ?? {}
      return {
        uid: currentUid,
        email: String(data.email ?? template.email),
        displayName: String(data.displayName ?? template.displayName),
        accountCreated: false,
      }
    }
  }
  const account = await ensureRoleAccount(db, template)
  return {
    uid: account.uid,
    email: account.email,
    displayName: account.displayName,
    accountCreated: account.created,
  }
}

/** Создаёт/обновляет стандартные учётки участников НДПР (до отправки на согласование). */
export async function ensureDefaultNdprSignerAccounts(db: Firestore): Promise<{
  accounts: NdprSignerSlot[]
  inspector: InspectorProvisionedAccount
  ert: ErtProvisionedAccount
}> {
  const [performer, permitter, issuer, leadExpert, inspector, ert] = await Promise.all([
    ensureRoleAccount(db, SIGNER_ACCOUNT_TEMPLATES.performer),
    ensureRoleAccount(db, SIGNER_ACCOUNT_TEMPLATES.permitter),
    ensureRoleAccount(db, SIGNER_ACCOUNT_TEMPLATES.issuer),
    ensureRoleAccount(db, SIGNER_ACCOUNT_TEMPLATES.leadExpert),
    ensureInspectorAccount(db),
    ensureErtAccount(db),
  ])
  const additionalPerformers = await Promise.all(
    ADDITIONAL_PERFORMER_ACCOUNT_TEMPLATES.map((template) => ensureRoleAccount(db, template)),
  )
  return {
    accounts: [
      {
        slot: 'performer',
        uid: performer.uid,
        email: performer.email,
        displayName: performer.displayName,
        role: 'performer',
        badgeNo: SIGNER_ACCOUNT_TEMPLATES.performer.badgeNo,
        created: performer.created,
      },
      ...additionalPerformers.map((account, i) => ({
        slot: 'performer' as const,
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        role: 'performer' as const,
        badgeNo: ADDITIONAL_PERFORMER_ACCOUNT_TEMPLATES[i].badgeNo,
        created: account.created,
      })),
      {
        slot: 'permitter',
        uid: permitter.uid,
        email: permitter.email,
        displayName: permitter.displayName,
        role: 'permitter',
        badgeNo: SIGNER_ACCOUNT_TEMPLATES.permitter.badgeNo,
        created: permitter.created,
      },
      {
        slot: 'issuer',
        uid: issuer.uid,
        email: issuer.email,
        displayName: issuer.displayName,
        role: 'issuer',
        badgeNo: SIGNER_ACCOUNT_TEMPLATES.issuer.badgeNo,
        created: issuer.created,
      },
      {
        slot: 'leadExpert',
        uid: leadExpert.uid,
        email: leadExpert.email,
        displayName: leadExpert.displayName,
        role: 'leadExpert',
        badgeNo: SIGNER_ACCOUNT_TEMPLATES.leadExpert.badgeNo,
        created: leadExpert.created,
      },
    ],
    inspector,
    ert,
  }
}

export async function provisionPermitSigners(
  db: Firestore,
  permitId: string,
): Promise<{
  signers: ProvisionedSigner[]
  permitUpdated: boolean
  currentStep: EgovSignRole | null
}> {
  const permitRef = db.collection('permits').doc(permitId)
  const permitSnap = await permitRef.get()
  if (!permitSnap.exists) {
    throw new Error('Наряд не найден')
  }
  const permitData = permitSnap.data()
  if (!permitData) {
    throw new Error('Наряд не найден')
  }
  let permit: DocumentData = permitData
  const normalized = await normalizePermitExecutorUids(db, permit)
  if (normalized.changed) {
    await permitRef.update({
      executors: normalized.executors,
      updatedAtIso: new Date().toISOString(),
    })
    permit = { ...permit, executors: normalized.executors }
  }
  const roles = requiredSignRoles(permit)
  const permitPatch: Partial<Record<(typeof ROLE_UID_FIELD)[EgovSignRole], string>> = {}
  const signers: ProvisionedSigner[] = []
  for (const role of roles) {
    const resolved = await resolveSignerUid(db, permit, role)
    const field = ROLE_UID_FIELD[role]
    if (assigneeUidForRole(permit, role) !== resolved.uid) {
      permitPatch[field] = resolved.uid
    }
    permit = { ...permit, [field]: resolved.uid }
    const stepLabel = approvalStepLabel(role, resolved.displayName, permit)
    const inviteId = `${permitId}_${role}`
    const signed = isRoleSigned(permit, role)
    const current = await nextRoleToSignAsync(db, permit)
    const status: SigningInviteStatus = signed
      ? 'completed'
      : current === role
        ? 'active'
        : 'pending'
    const existingSnap = await db.collection('signingInvites').doc(inviteId).get()
    const prevAssignee = String(existingSnap.data()?.assigneeUid ?? '').trim()
    const assigneeChanged = Boolean(prevAssignee && prevAssignee !== resolved.uid)
    const message = approvalInviteMessage(status, stepLabel)
    await db
      .collection('signingInvites')
      .doc(inviteId)
      .set(
        {
          permitId,
          permitTitle: String(permit.title ?? permit.workDescription ?? 'НДПР'),
          registrationRefNo: String(permit.registrationRefNo ?? ''),
          assigneeUid: resolved.uid,
          assigneeEmail: resolved.email.trim().toLowerCase(),
          assigneeDisplayName: resolved.displayName,
          signRole: role,
          inviteType: 'approval',
          stepLabel,
          status,
          message,
          createdAtIso: existingSnap.exists
            ? String(existingSnap.data()?.createdAtIso ?? new Date().toISOString())
            : new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        },
        { merge: true },
      )
    if (!signed && (!existingSnap.exists || assigneeChanged)) {
      await notifyUser(
        db,
        resolved.uid,
        { title: stepLabel, body: message, permitId },
        { inviteType: 'approval' },
      )
    }
    signers.push({
      role,
      uid: resolved.uid,
      email: resolved.email,
      displayName: resolved.displayName,
      stepLabel,
      accountCreated: resolved.accountCreated,
      inviteId,
    })
  }
  if (Object.keys(permitPatch).length > 0) {
    await permitRef.update({
      ...permitPatch,
      updatedAtIso: new Date().toISOString(),
    })
  }
  await provisionCrewInvites(db, permitId, { ...permit, ...permitPatch })
  return {
    signers,
    permitUpdated: Object.keys(permitPatch).length > 0,
    currentStep: await nextRoleToSignAsync(db, { ...permit, ...permitPatch, status: permit.status }),
  }
}

export async function syncSigningInvitesAfterSign(
  db: Firestore,
  permitId: string,
  signedRole: EgovSignRole,
): Promise<void> {
  const permitSnap = await db.collection('permits').doc(permitId).get()
  if (!permitSnap.exists) return
  const permit = permitSnap.data()
  if (!permit) return
  await db
    .collection('signingInvites')
    .doc(`${permitId}_${signedRole}`)
    .set(
      {
        status: 'completed',
        message: 'Подпись получена',
        completedAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      },
      { merge: true },
    )
  if (signedRole === 'performer') {
    await refreshCrewAckInvites(db, permitId)
  }
  const next = await nextRoleToSignAsync(db, permit)
  if (!next) return
  const assigneeUid = assigneeUidForRole(permit, next)
  const inviteSnap = await db.collection('signingInvites').doc(`${permitId}_${next}`).get()
  const inviteData = inviteSnap.data()
  let displayName = String(inviteData?.assigneeDisplayName ?? '').trim()
  if (!displayName && assigneeUid) {
    const userSnap = await db.collection('users').doc(assigneeUid).get()
    displayName = String(userSnap.data()?.displayName ?? '').trim()
  }
  if (!displayName) {
    displayName =
      next === 'ert'
        ? ERT_ACCOUNT_TEMPLATE.displayName
        : SIGNER_ACCOUNT_TEMPLATES[next].displayName
  }
  const stepLabel = approvalStepLabel(next, displayName, permit)
  const message = APPROVAL_PACKAGE_MESSAGE
  await db
    .collection('signingInvites')
    .doc(`${permitId}_${next}`)
    .set(
      {
        status: 'active',
        stepLabel,
        message,
        updatedAtIso: new Date().toISOString(),
      },
      { merge: true },
    )
  if (assigneeUid) {
    await notifyUser(
      db,
      assigneeUid,
      { title: stepLabel, body: message, permitId },
      { inviteType: 'approval' },
    )
  }
}

/** Актуализировать уведомления ознакомления бригады (после выдачи наряда и т.п.). */
export async function refreshCrewAckInvites(db: Firestore, permitId: string): Promise<void> {
  const permitSnap = await db.collection('permits').doc(permitId).get()
  if (!permitSnap.exists) return
  const permit = permitSnap.data()
  if (!permit) return
  await provisionCrewInvites(db, permitId, permit)
}

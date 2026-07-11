import type { WorkPermissionsBundle } from './workPermissions'
import type { AsorForm } from './asor'
import type { PprForm } from './ppr'
import type { EgovSignaturesMap } from './egovSignature'
import type { PermitSitePhoto } from './sitePhoto'
import type { WorkStopState } from './workStop'

export type PermitCategory = 1 | 2

export type PermitType = 'fire' | 'cold'

export const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  fire: 'Огневой',
  cold: 'Холодный',
}

/** Классификация зоны */
export type ZoneClass = 1 | 2 | 3

export const ZONE_CLASS_LABELS: Record<ZoneClass, string> = {
  1: '01',
  2: '02',
  3: '03',
}

export function coerceZoneClass(raw: unknown): ZoneClass {
  const n = Number(raw)
  if (n === 1 || n === 2 || n === 3) return n
  return 1
}

/** Виды работ по бланку НДПР (раздел «Виды работ»). */
export type SpecialWorkActivity =
  | 'open_flame_fire'
  | 'radiographic'
  | 'confined_space'
  | 'electrical'
  | 'gas_hazard'
  | 'energy_isolation'
  | 'work_at_height'
  | 'lifting_operations'
  | 'cold_works'

export const SPECIAL_WORK_ACTIVITY_LABELS: Record<SpecialWorkActivity, string> = {
  open_flame_fire:
    'Огневые работы с открытым источником огня',
  radiographic: 'Радиографические работы',
  confined_space: 'Вход в замкнутый объем',
  electrical: 'Электрические работы',
  gas_hazard: 'Газоопасные работы',
  energy_isolation: 'Изоляция источников опасной энергии',
  work_at_height: 'Работа на высоте',
  lifting_operations: 'Грузоподъёмные работы',
  cold_works: 'Холодные работы',
}

export const SPECIAL_WORK_ACTIVITY_ORDER = [
  'open_flame_fire',
  'radiographic',
  'confined_space',
  'electrical',
  'gas_hazard',
  'energy_isolation',
  'work_at_height',
  'lifting_operations',
  'cold_works',
] as const satisfies readonly SpecialWorkActivity[]

const SPECIAL_IDS = new Set<string>(
  SPECIAL_WORK_ACTIVITY_ORDER as unknown as readonly string[],
)

/** Виды работ, для которых ERT (ПАС) согласует НД и заполняет газотест — огневые и газоопасные. */
export const ERT_APPROVAL_ACTIVITIES: readonly SpecialWorkActivity[] = [
  'open_flame_fire',
  'gas_hazard',
] as const satisfies readonly SpecialWorkActivity[]

export function activitiesRequireErtApproval(
  activities: SpecialWorkActivity[] | undefined,
  single?: SpecialWorkActivity,
): boolean {
  const list =
    activities && activities.length > 0
      ? activities
      : single
        ? [single]
        : []
  return list.some((a) =>
    (ERT_APPROVAL_ACTIVITIES as readonly string[]).includes(a),
  )
}

/** Согласование с матрицей переходов: только открытый огонь ↔ огневой НД кат. 1; остальное ↔ холодный кат. 2. */
export function applySpecialWorkActivity(
  activity: SpecialWorkActivity,
): { permitType: PermitType; category: PermitCategory } {
  if (activity === 'open_flame_fire') return { permitType: 'fire', category: 1 }
  return { permitType: 'cold', category: 2 }
}

export function coerceSpecialWorkActivity(
  raw: unknown,
  fallbackPermitType: PermitType,
): SpecialWorkActivity {
  if (typeof raw === 'string' && SPECIAL_IDS.has(raw)) {
    return raw as SpecialWorkActivity
  }
  if (fallbackPermitType === 'fire') return 'open_flame_fire'
  return 'cold_works'
}

function dedupeSpecialWorkActivities(
  activities: SpecialWorkActivity[],
): SpecialWorkActivity[] {
  const seen = new Set<SpecialWorkActivity>()
  const out: SpecialWorkActivity[] = []
  for (const activity of activities) {
    if (!seen.has(activity)) {
      seen.add(activity)
      out.push(activity)
    }
  }
  const specific = out.filter((a) => a !== 'cold_works')
  if (specific.length > 1 && out.includes('cold_works')) {
    return specific
  }
  return out
}

/** Газоопасные и огневые работы не совмещаются — при газоопасных огневые снимаются. */
export function reconcileGasFireExclusiveActivities(
  activities: SpecialWorkActivity[],
): SpecialWorkActivity[] {
  if (!activities.includes('gas_hazard')) return activities
  return activities.filter((a) => a !== 'open_flame_fire')
}

export function isSpecialWorkActivityDisabled(
  activity: SpecialWorkActivity,
  selected: SpecialWorkActivity[],
): boolean {
  return activity === 'open_flame_fire' && selected.includes('gas_hazard')
}

/** Нормализует массив видов работ из хранилища или AI. */
export function normalizeSpecialWorkActivities(
  raw: unknown,
  opts?: { single?: SpecialWorkActivity; permitType?: PermitType },
): SpecialWorkActivity[] {
  if (Array.isArray(raw)) {
    const ids = raw.filter(
      (x): x is SpecialWorkActivity =>
        typeof x === 'string' && SPECIAL_IDS.has(x),
    )
    return reconcileGasFireExclusiveActivities(dedupeSpecialWorkActivities(ids))
  }
  if (typeof raw === 'string' && SPECIAL_IDS.has(raw)) {
    return reconcileGasFireExclusiveActivities([raw as SpecialWorkActivity])
  }
  if (opts?.single) return [opts.single]
  if (opts?.permitType === 'fire') return ['open_flame_fire']
  return ['cold_works']
}

/** Основной вид работ для типа наряда (огонь имеет приоритет). */
export function primarySpecialWorkActivity(
  activities: SpecialWorkActivity[],
): SpecialWorkActivity {
  if (!activities.length) return 'cold_works'
  if (activities.includes('open_flame_fire')) return 'open_flame_fire'
  return activities[0]
}

export function formatSpecialWorkActivitiesLabels(
  activities: SpecialWorkActivity[] | undefined,
  fallback?: SpecialWorkActivity,
): string {
  const list = activities?.length
    ? activities
    : fallback
      ? [fallback]
      : []
  if (!list.length) return '—'
  return list.map((a) => SPECIAL_WORK_ACTIVITY_LABELS[a]).join('; ')
}

/** Синхронизирует массив видов работ с типом наряда и legacy-полем. */
export function applyWorkActivitiesToDraft(
  draft: PermitDraft,
  activities: SpecialWorkActivity[],
): PermitDraft {
  const specialWorkActivities = reconcileGasFireExclusiveActivities(
    normalizeSpecialWorkActivities(activities),
  )
  const specialWorkActivity = primarySpecialWorkActivity(specialWorkActivities)
  const derived = applySpecialWorkActivity(specialWorkActivity)
  const needsErt = activitiesRequireErtApproval(specialWorkActivities)
  return {
    ...draft,
    specialWorkActivities,
    specialWorkActivity,
    permitType: derived.permitType,
    category: derived.category,
    ...(derived.permitType === 'cold' ? { f04: undefined } : {}),
    ertUid: needsErt
      ? draft.ertUid?.trim() || 'u-ert'
      : undefined,
  }
}

export type PermitStatus =
  | 'draft'
  | 'on_approval'
  | 'rejected'
  | 'issued'
  | 'in_progress'
  | 'suspended'
  | 'closed'
  | 'archived'
  /** Аннулирован инспектором по ОТ, ТБ и ООС после остановки работ. */
  | 'annulled'

/** Роли по UOG-HSE-PR-007-R + НДПР/F08 */
export type UserRole =
  | 'issuer'
  | 'permitter'
  | 'performer'
  | 'executor'
  | 'coordinator'
  | 'contractor'
  | 'safety'
  /** Emergency Response Team (ПАС). */
  | 'ert'
  /** Утверждающий НД (F01). */
  | 'leadExpert'

export const ROLE_LABELS: Record<UserRole, string> = {
  issuer: 'Выдающий НД',
  permitter: 'Допускающий',
  performer: 'Производитель работ',
  executor: 'Работник',
  coordinator: 'Координатор НД / админ',
  contractor: 'Подрядчик',
  safety: 'Ведущий инженер по ОТ, ТБ',
  ert: 'ПАС (Пожарно-аварийная служба)',
  leadExpert: 'Утверждающий НД',
}

/** Полное название роли инспектора (аудит, уведомления, backend). */
export const INSPECTOR_ROLE_TITLE = ROLE_LABELS.safety

export const STATUS_LABELS: Record<PermitStatus, string> = {
  draft: 'Черновик',
  on_approval: 'На согласовании',
  rejected: 'Отклонён',
  issued: 'Выдан',
  in_progress: 'В работе',
  suspended: 'Приостановлен',
  closed: 'Закрыт',
  archived: 'Архив',
  annulled: 'Аннулирован',
}

/** Блок мер безопасности F02 */
export interface PtwF02SafetyBlock {
  isolationOfEnergy: string
  fireFightingEquipment: string
  communications: string
  workAreaBarricading: string
}

/** Общая информация бланка НД F02 */
export interface PtwF02General {
  company: string
  badgeNo: string
  shift: '' | 'day' | 'night'
  /** Дата и время начала (`yyyy-mm-dd` или `yyyy-mm-ddTHH:mm`). */
  startDate: string
  /** Дата окончания (`yyyy-mm-dd` или с временем). */
  endDate: string
  issuedTo: string
  safety: PtwF02SafetyBlock
}

/** Строка работника на бланке (F03): привязка к учётной записи справочника. */
export interface WorkExecutor {
  id: string
  /** Firestore users / демо — кто включён как работник по наряду. */
  userUid: string
  dateIso: string
  briefingAcknowledged: boolean
}

export type NdprAnswer = 'yes' | 'no' | 'na'

/** F09 */
export interface NdprChecklistItem {
  templateId: string
  order: number
  question: string
  answer: NdprAnswer | null
}

export interface F04Fields {
  routeSheetNo: string
  workArea: string
  specialConditions: string
  validUntilIso?: string
}

export interface SamePersonException {
  allowed: boolean
  reason: string
}

export interface PermitDraft {
  title: string
  permitType: PermitType
  category: PermitCategory
  specialWorkActivity: SpecialWorkActivity
  /** Все виды работ по НДПР (может быть несколько). */
  specialWorkActivities: SpecialWorkActivity[]
  zoneClass: ZoneClass
  siteName: string
  workDescription: string
  /** Этапы работ (из ППР, для бланка и PDF). */
  workStages: string
  /** Объём работ (из ППР). */
  workVolume: string
  /** Инструменты и оборудование (под описанием работ). */
  toolsAndEquipment: string
  issuerUid: string
  permitterUid: string
  performerUid: string
  leadExpertUid: string
  /** ERT (ПАС) — согласование огневых работ. */
  ertUid?: string
  isContractorPermit: boolean
  samePersonException: SamePersonException
  f04?: F04Fields
  registrationRefNo: string
  f02: PtwF02General
  /** Работники (F03). */
  executors: WorkExecutor[]
  /** АСОР (UOG-HSE-PR-001-F01): заполняется после ППР и сохраняется вместе с нарядом. */
  asor?: AsorForm
  /** ППР — программа производства работ. */
  ppr?: PprForm
  /** ЭЦП через SIGEX / eGov Mobile (по ролям). */
  egovSignatures?: EgovSignaturesMap
  /** ЭЦП ознакомления бригады с АБР и оценкой риска (по userUid). */
  crewAckSignatures?: import('./crewAck').CrewAckSignaturesMap
  /** Спецразрешения (газоопасные / огневые / замкнутое пространство) — JSON → PDF. */
  workPermissions?: WorkPermissionsBundle
  ndprChecklist: NdprChecklistItem[]
  /** Фото места проведения работ (шаг НДПР). */
  sitePhotos?: PermitSitePhoto[]
}

export interface PackagePdfDocument {
  fileName: string
  generatedAtIso: string
  documentHash: string
  /** Заполняется только при генерации на клиенте, в Firestore не хранится. */
  pdfBase64?: string
}

export interface PermitRejection {
  atIso: string
  byUid: string
  byRole: string
  comment: string
}

export interface Permit extends PermitDraft {
  id: string
  status: PermitStatus
  version: number
  previousVersionId?: string
  packagePdf?: PackagePdfDocument
  lastRejection?: PermitRejection
  signatures: {
    performerSigned: boolean
    issuerSigned: boolean
    permitterSigned: boolean
    leadExpertSigned: boolean
    ertSigned?: boolean
  }
  contractorSafetyApproved: boolean
  validUntilIso?: string
  createdAtIso: string
  updatedAtIso: string
  incidentLongRetention: boolean
  /** Остановка работ — ожидает решения инспектора по ОТ, ТБ и ООС. */
  workStop?: WorkStopState
  /** Ежедневные подписи ознакомления с АБР по датам. */
  abrDailyAcks?: import('./abrDailyAck').AbrDailyAckDay[]
  /** История замен производителя работ в действующем наряде. */
  performerReplacements?: import('./performerReplacement').PerformerReplacement[]
}

export type JournalEventKind =
  | 'status_change'
  | 'extension'
  | 'suspension'
  | 'signature'
  | 'matrix_note'
  | 'contractor_approval'
  | 'ndpr'
  | 'executor_update'
  | 'rejection'
  | 'work_stop'
  | 'work_stop_resolution'

export interface JournalEntry {
  id: string
  permitId: string
  atIso: string
  actorUid: string
  actorRole: UserRole
  kind: JournalEventKind
  message: string
  meta?: Record<string, unknown>
}

export interface MatrixRule {
  category: PermitCategory
  requiredDocuments: string[]
  approverRoles: UserRole[]
  defaultValidityDays: number
  extensionPolicy: 'forbidden' | 'daily' | 'up_to_6mo' | 'na'
  interactionMeasures: string[]
  summaryRu: string
}

export interface DemoUser {
  id: string
  displayName: string
  email: string
  role: UserRole
  /** № пропуска / бейджа (001, 002, …). */
  badgeNo?: string
  /** ИИН для сверки с сертификатом eGov Mobile. */
  iin?: string
  /** Зоны ответственности инспектора (пусто = все наряды на объекте). */
  inspectorSites?: string[]
  /** Email для писем об уведомлениях (задаёт пользователь или координатор). */
  notificationEmail?: string
}

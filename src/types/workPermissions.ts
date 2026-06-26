import type { SpecialWorkActivity } from './domain'
import type { StoredEgovSignature } from './egovSignature'
import { seedPermissionFormChecklists } from '../config/workPermissionChecklists'

/** Три шаблона спецразрешений (DOCX → JSON → PDF). */
export type WorkPermissionKind =
  | 'confined_space'
  | 'open_flame_fire'
  | 'gas_hazard'

export type WorkPermissionSignRole = 'performer' | 'issuer' | 'permitter'

export const WORK_PERMISSION_SIGN_ROLES: WorkPermissionSignRole[] = [
  'performer',
  'issuer',
  'permitter',
]

export const WORK_PERMISSION_SIGN_LABELS: Record<WorkPermissionSignRole, string> = {
  performer: 'Производитель работ',
  issuer: 'Выдающий НД',
  permitter: 'Допускающий',
}

/** Одна строка таблицы отбора проб / газотеста (раздел 6 шаблонов). */
export interface GasTestReading {
  id: string
  atIso: string
  location: string
  lelPercent: string
  h2sPpm: string
  o2Percent: string
  coPpm: string
  /** Заполняет ПАС (роль `ert`). */
  testerUid: string
  testerName: string
  instrumentNo: string
  notes: string
}

export interface WorkPermissionCheckboxItem {
  id: string
  label: string
  checked: boolean
  note: string
}

export interface WorkPermissionCheckboxGroup {
  label: string
  items: WorkPermissionCheckboxItem[]
}

export interface WorkPermissionEmergencyContact {
  id: string
  role: string
  internalPhone: string
  externalPhone: string
  radioChannel: string
}

export interface WorkPermissionSignature {
  role: WorkPermissionSignRole
  signedByUid: string
  signedByName: string
  signedAtIso: string
}

/** Поля разрешения по разделам DOCX (1–5). */
export interface WorkPermissionForm {
  siteObject: string
  pprRef: string
  workDescription: string
  equipmentAndDocs: string
  fireCategory: '1' | '2' | ''
  /** Раздел 2 — замкнутое пространство */
  confinedSpaceTypes?: WorkPermissionCheckboxGroup
  connectionMethods?: WorkPermissionCheckboxGroup
  rescueEquipment?: WorkPermissionCheckboxGroup
  /** Раздел 3 — проверки */
  preWorkChecks: WorkPermissionCheckboxGroup
  /** Раздел 3 — контакты (ЗП) */
  emergencyContacts: WorkPermissionEmergencyContact[]
  confinedSpaceNotes: string
  additionalNotes: string
  /** Сводный текст разделов 3–5 (ИИ / ручной) */
  bodyText: string
  /** Номер разрешения (шапка бланка). */
  permissionRefNo?: string
  /** Раздел закрытия — чеклист при возврате участка. */
  closureChecks?: WorkPermissionCheckboxGroup
}

export interface WorkPermissionDocument {
  kind: WorkPermissionKind
  title: string
  form: WorkPermissionForm
  gasTests: GasTestReading[]
  signatures: WorkPermissionSignature[]
  /** ЭЦП eGov по ролям разрешения */
  egovSignatures?: Partial<Record<WorkPermissionSignRole, StoredEgovSignature>>
  generatedAtIso?: string
  documentHash?: string
  pdfBase64?: string
}

export interface WorkPermissionsBundle {
  documents: WorkPermissionDocument[]
  updatedAtIso: string
}

export const WORK_PERMISSION_KIND_LABELS: Record<WorkPermissionKind, string> = {
  confined_space: 'Разрешение на вход в замкнутое пространство',
  open_flame_fire: 'Разрешение на проведение огневых работ',
  gas_hazard: 'Разрешение на газоопасные работы',
}

export const WORK_ACTIVITIES_REQUIRING_PERMISSIONS: readonly SpecialWorkActivity[] = [
  'open_flame_fire',
  'gas_hazard',
  'confined_space',
] as const

export const WORK_PERMISSIONS_AUTOSAVE_KEY = 'nova_work_permissions_v1'

export function emptyWorkPermissionForm(kind: WorkPermissionKind): WorkPermissionForm {
  const seeded = seedPermissionFormChecklists(kind)
  return {
    siteObject: '',
    pprRef: '',
    workDescription: '',
    equipmentAndDocs: '',
    fireCategory: '',
    confinedSpaceTypes: seeded.confinedSpaceTypes,
    connectionMethods: seeded.connectionMethods,
    rescueEquipment: seeded.rescueEquipment,
    preWorkChecks: seeded.preWorkChecks,
    closureChecks: seeded.closureChecks,
    emergencyContacts: seeded.emergencyContacts,
    confinedSpaceNotes: '',
    additionalNotes: '',
    bodyText: '',
  }
}

export function emptyGasTestReading(id = crypto.randomUUID()): GasTestReading {
  return {
    id,
    atIso: new Date().toISOString(),
    location: '',
    lelPercent: '',
    h2sPpm: '',
    o2Percent: '',
    coPpm: '',
    testerUid: '',
    testerName: '',
    instrumentNo: '',
    notes: '',
  }
}

import type { SpecialWorkActivity } from '../types/domain'
import type { WorkPermissionKind } from '../types/workPermissions'
import { WORK_PERMISSION_KIND_LABELS } from '../types/workPermissions'

export type WorkPermissionStyle = 'orange' | 'red' | 'blue'

export interface WorkPermissionTemplateMeta {
  kind: WorkPermissionKind
  activity: SpecialWorkActivity
  label: string
  shortLabel: string
  style: WorkPermissionStyle
  /** Файл-образец (DOCX) в репозитории */
  templateFile: string
  requiresGasTests: boolean
  gasTestHint: string
  selectionNotice: string
}

export const WORK_PERMISSION_TEMPLATES: WorkPermissionTemplateMeta[] = [
  {
    kind: 'gas_hazard',
    activity: 'gas_hazard',
    label: WORK_PERMISSION_KIND_LABELS.gas_hazard,
    shortLabel: 'Газоопасные',
    style: 'orange',
    templateFile: 'Разрешение на газоопасные работы (RU, оранжевый стиль).docx',
    requiresGasTests: true,
    gasTestHint:
      'Таблицу отбора проб заполняет ПАС (роль ERT). Данные сразу попадают в PDF разрешения и общий пакет.',
    selectionNotice:
      'Для газоопасных работ необходимо заполнить специальное разрешение и провести газоанализ.',
  },
  {
    kind: 'open_flame_fire',
    activity: 'open_flame_fire',
    label: WORK_PERMISSION_KIND_LABELS.open_flame_fire,
    shortLabel: 'Огневые',
    style: 'red',
    templateFile: 'Разрешение на проведение огневых работ (RU, красный стиль).docx',
    requiresGasTests: true,
    gasTestHint:
      'Результаты проб воздушной среды (LEL, H2S, O2, CO) — до начала и при необходимости в процессе работ.',
    selectionNotice:
      'Для огневых работ требуется разрешение на проведение огневых работ и контроль атмосферы.',
  },
  {
    kind: 'confined_space',
    activity: 'confined_space',
    label: WORK_PERMISSION_KIND_LABELS.confined_space,
    shortLabel: 'Замкнутое пространство',
    style: 'blue',
    templateFile: 'Разрешение_на_вход_в_замкнутое_пространство__RU_.docx',
    requiresGasTests: true,
    gasTestHint:
      'Газотест перед входом и периодический контроль — заполняет ПАС (ERT), синхронизация с документом в реальном времени.',
    selectionNotice:
      'Для входа в замкнутое пространство требуется отдельное разрешение и газоанализ.',
  },
]

export const WORK_PERMISSION_BY_ACTIVITY: Partial<
  Record<SpecialWorkActivity, WorkPermissionTemplateMeta>
> = Object.fromEntries(
  WORK_PERMISSION_TEMPLATES.map((t) => [t.activity, t]),
)

export const WORK_PERMISSION_BY_KIND: Record<
  WorkPermissionKind,
  WorkPermissionTemplateMeta
> = Object.fromEntries(
  WORK_PERMISSION_TEMPLATES.map((t) => [t.kind, t]),
) as Record<WorkPermissionKind, WorkPermissionTemplateMeta>

import type { WorkPermissionKind } from '../types/workPermissions'
import { CLOSURE_CHECKBOX_LINES } from './workPermissionPdfTemplate'
import type { WorkPermissionCheckboxGroup } from '../types/workPermissions'
import {
  CONFINED_SPACE_CONNECTION_ITEMS,
  CONFINED_SPACE_RESCUE_ITEMS,
  CONFINED_SPACE_TYPE_ITEMS,
  FIRE_CHECK_PAIRS,
  GAS_HAZARD_CHECK_PAIRS,
} from './workPermissionPdfTemplate'

function group(label: string, items: { id: string; label: string }[]): WorkPermissionCheckboxGroup {
  return {
    label,
    items: items.map((i) => ({ ...i, checked: false, note: '' })),
  }
}

export function defaultConfinedSpaceTypes(): WorkPermissionCheckboxGroup {
  return group('2. Тип замкнутого пространства', [...CONFINED_SPACE_TYPE_ITEMS])
}

export function defaultConnectionMethods(): WorkPermissionCheckboxGroup {
  return group('3. Способы связи с работающими в З/П', [...CONFINED_SPACE_CONNECTION_ITEMS])
}

export function defaultRescueEquipment(): WorkPermissionCheckboxGroup {
  return group('4. Аварийно-спасательное оборудование', [...CONFINED_SPACE_RESCUE_ITEMS])
}

function checksFromPairs(
  label: string,
  pairs: { leftId: string; rightId: string; left: string; right: string }[],
): WorkPermissionCheckboxGroup {
  const items = pairs.flatMap((p) => [
    { id: p.leftId, label: p.left },
    { id: p.rightId, label: p.right },
  ])
  return group(label, items)
}

export function defaultPreWorkChecks(kind: WorkPermissionKind): WorkPermissionCheckboxGroup {
  if (kind === 'open_flame_fire') {
    return checksFromPairs('3. Проверки на рабочей площадке', FIRE_CHECK_PAIRS)
  }
  if (kind === 'gas_hazard') {
    return checksFromPairs('3. Проверки на рабочем месте', GAS_HAZARD_CHECK_PAIRS)
  }
  return group('3. Проверки перед входом', [
    { id: 'isolation', label: 'Изоляция / LOTO выполнена' },
    { id: 'ventilation', label: 'Проветривание / продувка' },
    { id: 'gas_test', label: 'Газоанализ до входа проведён' },
    { id: 'rescue_plan', label: 'План спасения согласован' },
    { id: 'communication', label: 'Связь с наблюдающим установлена' },
    { id: 'lighting', label: 'Освещение взрывобезопасное' },
    { id: 'ppe', label: 'СИЗ проверены' },
    { id: 'briefing', label: 'Инструктаж проведён' },
  ])
}

export function defaultEmergencyContacts() {
  return [
    { id: crypto.randomUUID(), role: 'Операторная', internalPhone: '', externalPhone: '', radioChannel: '' },
    { id: crypto.randomUUID(), role: 'Медпункт', internalPhone: '', externalPhone: '', radioChannel: '' },
    { id: crypto.randomUUID(), role: 'Пожарная бригада', internalPhone: '', externalPhone: '', radioChannel: '' },
    { id: crypto.randomUUID(), role: 'Служба ТБ, ОТ и ОС', internalPhone: '', externalPhone: '', radioChannel: '' },
  ]
}

export function defaultClosureChecks(): WorkPermissionCheckboxGroup {
  return group(
    'Закрытие разрешения',
    CLOSURE_CHECKBOX_LINES.map((label, i) => ({ id: `closure_${i}`, label })),
  )
}

export function seedPermissionFormChecklists(kind: WorkPermissionKind) {
  return {
    confinedSpaceTypes: kind === 'confined_space' ? defaultConfinedSpaceTypes() : undefined,
    connectionMethods: kind === 'confined_space' ? defaultConnectionMethods() : undefined,
    rescueEquipment: kind === 'confined_space' ? defaultRescueEquipment() : undefined,
    preWorkChecks: defaultPreWorkChecks(kind),
    closureChecks: defaultClosureChecks(),
    emergencyContacts: kind === 'confined_space' ? defaultEmergencyContacts() : [],
  }
}

import type { WorkPermissionKind } from '../types/workPermissions'

export type WorkPermissionPdfPalette = {
  accent: string
  header: string
  white: string
}

export const WORK_PERMISSION_PDF_PALETTE: Record<WorkPermissionKind, WorkPermissionPdfPalette> = {
  gas_hazard: { accent: '#B8590A', header: '#FCE9D2', white: '#FFFFFF' },
  open_flame_fire: { accent: '#9E1B1B', header: '#FBE0E0', white: '#FFFFFF' },
  confined_space: { accent: '#1F3864', header: '#DCE6F1', white: '#FFFFFF' },
}

export const WORK_PERMISSION_DOC_TITLE: Record<WorkPermissionKind, string> = {
  gas_hazard: 'РАЗРЕШЕНИЕ НА ГАЗООПАСНЫЕ РАБОТЫ',
  open_flame_fire: 'РАЗРЕШЕНИЕ НА ПРОВЕДЕНИЕ ОГНЕВЫХ РАБОТ',
  confined_space: 'РАЗРЕШЕНИЕ НА ВХОД В ЗАМКНУТОЕ ПРОСТРАНСТВО',
}

/** Пары пунктов проверки (раздел 3 газ / огонь) — как в DOCX. */
export const GAS_HAZARD_CHECK_PAIRS: { leftId: string; rightId: string; left: string; right: string }[] = [
  { leftId: 'g01', rightId: 'g02', left: 'Искробезопасные инструменты', right: 'Системы сдренированы, продуты, стравлены и промыты' },
  { leftId: 'g03', rightId: 'g04', left: 'Контроль на рабочем участке (ПР)', right: 'Наблюдатель присутствует на рабочем участке' },
  { leftId: 'g05', rightId: 'g06', left: 'Средства связи', right: 'Наличие ВДА' },
  { leftId: 'g07', rightId: 'g08', left: 'Ответственное лицо подтвердил полное отсутствие энергии', right: 'Перчатки' },
  { leftId: 'g09', rightId: 'g10', left: 'Проверить отсутствие веществ в дренажных линиях до начала работ', right: 'СИЗ для защиты от химических веществ' },
  { leftId: 'g11', rightId: 'g12', left: 'Наличие оборудования для локализации разливов', right: 'Защита органов слуха' },
  { leftId: 'g13', rightId: 'g14', left: 'Наличие противопожарного оборудования', right: 'Страховочные ремни и трос' },
  { leftId: 'g15', rightId: 'g16', left: 'Защитная маска', right: 'Пути аварийного реагирования и эвакуации установлены' },
  { leftId: 'g17', rightId: 'g18', left: 'Постоянный отбор проб воздушной среды', right: 'Контроль воздушной среды' },
]

export const FIRE_CHECK_PAIRS: { leftId: string; rightId: string; left: string; right: string }[] = [
  { leftId: 'f01', rightId: 'f02', left: 'Среда с избыточным давлением', right: 'Наличие возведённых ограждений для предотвращения случайного входа' },
  { leftId: 'f03', rightId: 'f04', left: 'Пожарный ящик / противопожарные одеяла', right: 'Защитная маска' },
  { leftId: 'f05', rightId: 'f06', left: 'Контроль на рабочей площадке (ПР)', right: 'Системы сдренированы, продуты, стравлены и промыты' },
  { leftId: 'f07', rightId: 'f08', left: 'Средства связи', right: 'Пожарный наблюдатель / наблюдатель присутствует на рабочей площадке' },
  { leftId: 'f09', rightId: 'f10', left: 'Персонал по эксплуатации подтвердил полное отсутствие энергии', right: 'Место сварочных работ заземлено' },
  { leftId: 'f11', rightId: 'f12', left: 'Проверить отсутствие веществ в дренажных линиях до начала работ', right: 'Все необходимые СИЗ для выполнения работ' },
]

export const CONFINED_SPACE_TYPE_ITEMS = [
  { id: 'vertical_vessel', label: 'Вертикальный сосуд' },
  { id: 'horizontal_vessel', label: 'Горизонтальный сосуд' },
  { id: 'tank', label: 'Резервуар' },
  { id: 'well_pit', label: 'Колодец' },
  { id: 'well_shaft', label: 'Шахта скважины' },
  { id: 'trench', label: 'Траншея' },
  { id: 'drain', label: 'Дренажный канал' },
  { id: 'other_cs', label: 'Другое' },
] as const

export const CONFINED_SPACE_CONNECTION_ITEMS = [
  { id: 'radio', label: 'Рация' },
  { id: 'hand', label: 'Сигналы рукой' },
  { id: 'rope', label: 'Сигналы веревкой' },
  { id: 'voice', label: 'Звуковой / голосовой' },
  { id: 'other_conn', label: 'Другое' },
] as const

export const CONFINED_SPACE_RESCUE_ITEMS = [
  { id: 'belt', label: 'Страховочный пояс' },
  { id: 'rescue_rope', label: 'Спасательная верёвка' },
  { id: 'scba', label: 'Резервный ВДА' },
  { id: 'light', label: 'Переносное освещение' },
  { id: 'stretcher', label: 'Носилки' },
  { id: 'tripod', label: 'Тренога с лебёдкой' },
  { id: 'extinguisher', label: 'Огнетушитель' },
  { id: 'ladder', label: 'Приставные лестницы' },
  { id: 'other_rescue', label: 'Другое' },
] as const

export const CONFINED_SPACE_EMERGENCY_ROLES = [
  'Операторная',
  'Медпункт',
  'Пожарная бригада',
  'Служба ТБ, ОТ и ОС',
] as const

export const CLOSURE_CHECKBOX_LINES = [
  'ЗАВЕРШЕНЫ, все инструменты и оборудование удалены, территория убрана',
  'Работа продолжится по разрешению № _______',
  'Все отключения сняты',
  'Рабочий участок может быть возвращён в эксплуатацию',
] as const

export function signatureSectionNumbers(kind: WorkPermissionKind): {
  performer: number
  issuer: number
  permitter: number
  extension: number
  closure: number
  /** Газ / огонь: разделы 1–5 без отдельных блоков подписей (как в DOCX). */
  useCompactLayout: boolean
  /** Замкнутое пространство: без блоков подписей ПР / ВНД / допускающего в PDF. */
  skipSignatureBlocks?: boolean
} {
  if (kind === 'confined_space') {
    return {
      performer: 0,
      issuer: 0,
      permitter: 0,
      extension: 4,
      closure: 5,
      useCompactLayout: false,
      skipSignatureBlocks: true,
    }
  }
  return { performer: 0, issuer: 0, permitter: 0, extension: 4, closure: 5, useCompactLayout: true }
}

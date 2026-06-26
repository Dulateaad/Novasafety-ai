import type { SpecialWorkActivity } from '../types/domain'

/** Категория мероприятия по ОТ / ТБ / ООС / особый вид работ. */
export type HseActivityCategory = 'ot' | 'tb' | 'oos' | 'work'

export interface HseActivityTemplate {
  id: string
  category: HseActivityCategory
  title: string
  hazard: string
  measures: string[]
  /** Связь с «Особым видом работ» в НДПР (если есть). */
  ndprWorkActivity?: SpecialWorkActivity
}

export const HSE_ACTIVITY_CATEGORY_LABELS: Record<HseActivityCategory, string> = {
  work: 'Особые виды работ',
  ot: 'Охрана труда (ОТ)',
  tb: 'Техника безопасности (ТБ)',
  oos: 'Охрана окружающей среды (ООС)',
}

/** Порядок блоков на форме. */
export const HSE_ACTIVITY_CATEGORY_ORDER: HseActivityCategory[] = [
  'work',
  'ot',
  'tb',
  'oos',
]

/** Шаблоны мероприятий — для выбора на шаге «Мероприятия по ОТ, ТБ и ООС». */
export const HSE_ACTIVITY_TEMPLATES: HseActivityTemplate[] = [
  {
    id: 'work-fire',
    category: 'work',
    ndprWorkActivity: 'open_flame_fire',
    title: 'Огневые работы с открытым источником огня',
    hazard: 'Возгорание, распространение огня, ожоги',
    measures: [
      'Оформить наряд-допуск на огневые работы',
      'Организовать пожарный пост и средства тушения',
      'Газовый контроль и подготовка зоны',
      'Контроль места работ после окончания (не менее 1–2 ч)',
    ],
  },
  {
    id: 'work-height',
    category: 'work',
    title: 'Работы на высоте',
    hazard: 'Падение с высоты, падение предметов на людей',
    measures: [
      'Страховочная система, анкерные точки, двойная страховка',
      'Ограждение опасной зоны и знаки',
      'Инструмент и материалы на страховке',
      'Допуск по процедуре UOG-HSE-PR-012',
    ],
  },
  {
    id: 'work-fire-height',
    category: 'work',
    title: 'Огневые работы на высоте',
    hazard: 'Сочетание рисков огня и падения с высоты',
    measures: [
      'Наряд-допуск на огневые работы + работы на высоте',
      'Страховка персонала и искробезопасный инструмент',
      'Пожарный пост с учётом высоты и доступа',
      'Контроль зоны снизу и сверху',
    ],
  },
  {
    id: 'work-confined',
    category: 'work',
    ndprWorkActivity: 'confined_space',
    title: 'Работы в замкнутом пространстве (ЗПО)',
    hazard: 'Кислородная недостаточность, токсичные/взрывоопасные среды',
    measures: [
      'Наряд-допуск на работы в ЗПО',
      'Непрерывный газовый мониторинг до и во время работ',
      'Наблюдающий у входа, средства СИЗОД и спасения',
      'План аварийного вывода и связь с диспетчером',
    ],
  },
  {
    id: 'work-electrical',
    category: 'work',
    ndprWorkActivity: 'electrical',
    title: 'Электротехнологические работы',
    hazard: 'Поражение электрическим током, дуговой разряд',
    measures: [
      'Наряд-допуск / допуск на работы в электроустановках',
      'Отключение, блокировка, проверка отсутствия напряжения',
      'Диэлектрические СИЗ и инструмент',
      'Работа под напряжением — только по отдельному разрешению',
    ],
  },
  {
    id: 'work-gas',
    category: 'work',
    ndprWorkActivity: 'gas_hazard',
    title: 'Газоопасные работы',
    hazard: 'Отравление, взрыв, обогащение/обеднение кислородом',
    measures: [
      'Наряд-допуск на газоопасные работы',
      'Газоанализаторы, калибровка, журнал замеров',
      'СИЗОД по результатам замеров',
      'Знаки «Идут газоопасные работы», ограждение зоны',
    ],
  },
  {
    id: 'work-radiographic',
    category: 'work',
    ndprWorkActivity: 'radiographic',
    title: 'Радиографические работы',
    hazard: 'Ионизирующее излучение',
    measures: [
      'Разрешение на радиографию, ограждение контролируемой зоны',
      'Дозиметрический контроль персонала',
      'Знак «Рентген», исключение посторонних из зоны',
      'Согласование с ответственным за радиационную безопасность',
    ],
  },
  {
    id: 'work-isolation',
    category: 'work',
    ndprWorkActivity: 'energy_isolation',
    title: 'Изоляция источников опасной энергии',
    hazard: 'Несанкционированная подача энергии, давления, среды',
    measures: [
      'LOTO: блокировки, бирки, проверка нулевой энергии',
      'Журнал изоляций и согласование с эксплуатацией',
      'Пробное включение только по процедуре снятия изоляции',
    ],
  },
  {
    id: 'work-lifting',
    category: 'work',
    title: 'Грузоподъёмные операции',
    hazard: 'Падение груза, опрокидывание техники, зажим',
    measures: [
      'План ГПО / такелажные схемы',
      'Допуск машиниста и стропальщиков, исправность оснастки',
      'Ограждение зоны падения груза',
    ],
  },
  {
    id: 'work-excavation',
    category: 'work',
    title: 'Земляные работы',
    hazard: 'Обрушение стенок котлована, повреждение подземных коммуникаций',
    measures: [
      'Разрешение на земляные работы, шурфование коммуникаций',
      'Крепление откосов / шпунт, ограничение складирования у бровки',
      'Контроль осадков и вибрации',
    ],
  },
  {
    id: 'ot-briefing',
    category: 'ot',
    title: 'Целевой инструктаж на рабочем месте',
    hazard: 'Недостаточная осведомлённость персонала об опасностях',
    measures: [
      'Провести целевой инструктаж с записью в журнале',
      'Ознакомить с локальными инструкциями по объекту',
    ],
  },
  {
    id: 'ot-ppe-check',
    category: 'ot',
    title: 'Проверка СИЗ перед началом работ',
    hazard: 'Использование неисправных или неподходящих СИЗ',
    measures: [
      'Проверить комплектность и исправность СИЗ',
      'Убедиться в соответствии СИЗ виду работ',
    ],
  },
  {
    id: 'ot-medical',
    category: 'ot',
    title: 'Допуск по результатам медосмотра',
    hazard: 'Допуск работника с медицинскими ограничениями',
    measures: [
      'Проверить действующий допуск к выполнению работ',
      'При необходимости — согласование с медслужбой',
    ],
  },
  {
    id: 'tb-simops',
    category: 'tb',
    title: 'Одновременные операции (SIMOPS / ОПР)',
    hazard: 'Конфликт работ, пересечение опасных зон',
    measures: [
      'Согласовать план SIMOPS с соседними участками',
      'Единая радиосвязь и ответственный координатор',
    ],
  },
  {
    id: 'oos-spill',
    category: 'oos',
    title: 'Предотвращение разливов ГСМ / химии',
    hazard: 'Загрязнение почвы и водных объектов',
    measures: [
      'Поддоны и бортовые ограждения',
      'Аварийный комплект сорбентов на месте',
      'План ликвидации разливов',
    ],
  },
  {
    id: 'oos-waste',
    category: 'oos',
    title: 'Обращение с отходами',
    hazard: 'Несанкционированное складирование отходов',
    measures: [
      'Сортировка отходов по классам опасности',
      'Маркировка и передача уполномоченному оператору',
      'Учёт по плану управления отходами',
    ],
  },
  {
    id: 'oos-emission',
    category: 'oos',
    title: 'Контроль выбросов и сбросов',
    hazard: 'Превышение нормативов выбросов',
    measures: [
      'Использовать исправное оборудование без подтеканий',
      'Контроль вентиляции / факела при необходимости',
      'Фиксация отклонений в журнале ООС',
    ],
  },
]

const NDPR_TEMPLATE_BY_ACTIVITY: Partial<Record<SpecialWorkActivity, string>> = {
  open_flame_fire: 'work-fire',
  confined_space: 'work-confined',
  electrical: 'work-electrical',
  gas_hazard: 'work-gas',
  radiographic: 'work-radiographic',
  energy_isolation: 'work-isolation',
}

export function hseTemplatesByCategory(
  category: HseActivityCategory,
): HseActivityTemplate[] {
  return HSE_ACTIVITY_TEMPLATES.filter((t) => t.category === category)
}

export function hseTemplateIdsFromNdprActivity(
  activity: SpecialWorkActivity | undefined,
): string[] {
  if (!activity) return []
  const id = NDPR_TEMPLATE_BY_ACTIVITY[activity]
  return id ? [id] : []
}

export function hseTemplateById(id: string): HseActivityTemplate | undefined {
  return HSE_ACTIVITY_TEMPLATES.find((t) => t.id === id)
}

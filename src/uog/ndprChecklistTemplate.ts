/**
 * Ядро вопросов F09 (НДПР) по UOG-HSE-PR-007-F09 — для категорий 1–3.
 * Полный перечень: docs/UOG-PR-007/_machine_read/*F09*.json
 */
export interface NdprTemplateRow {
  id: string
  order: number
  question: string
}

export const NDPR_F09_TEMPLATE: NdprTemplateRow[] = [
  {
    id: 'f09-1',
    order: 1,
    question:
      'Форма Наряда Допуск на Проведение Работ (НДПР) оформлена корректно',
  },
  {
    id: 'f09-2',
    order: 2,
    question:
      'Если категория работ — уровень 1, присутствует ли Производитель работ на участке?',
  },
  {
    id: 'f09-3',
    order: 3,
    question:
      'Имеется ли у Производителя работ приказ об ответственности?',
  },
  {
    id: 'f09-4',
    order: 4,
    question:
      'Дано ли чёткое описание объёма работ / участка / оборудования?',
  },
  {
    id: 'f09-5',
    order: 5,
    question:
      'Все подписи в НДПР проставлены (Выдающий, Допускающий, Утверждающий)?',
  },
  {
    id: 'f09-6',
    order: 6,
    question:
      'Разрешения определены, есть перекрёстные ссылки на НДПР?',
  },
  {
    id: 'f09-7',
    order: 7,
    question:
      'Блокировки систем безопасности учтены в РБС (если применимо)?',
  },
  {
    id: 'f09-8',
    order: 8,
    question:
      'Анализ загазованности проведён и отражён в НДПР (если применимо)?',
  },
  {
    id: 'f09-9',
    order: 9,
    question: 'Документация НДПР понятна рабочей бригаде?',
  },
  {
    id: 'f09-10',
    order: 10,
    question:
      'Персонал ознакомлен и расписан в бланке наряда-допуска?',
  },
]

export function initialNdprResponses(): {
  templateId: string
  order: number
  question: string
  answer: 'yes' | 'no' | 'na' | null
}[] {
  return NDPR_F09_TEMPLATE.map((r) => ({
    templateId: r.id,
    order: r.order,
    question: r.question,
    answer: null,
  }))
}

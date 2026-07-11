import type { MatrixRule, PermitCategory } from '../types/domain'

/**
 * Упрощённая матрица: только 2 категории (тип НД задаётся отдельно: огневой / холодный).
 */
export const DEFAULT_MATRIX: MatrixRule[] = [
  {
    category: 1,
    summaryRu:
      'Категория 1: повышенные требования согласования, контроля и срок действия НД',
    requiredDocuments: [
      'Наряд-допуск',
      'НД / специальное разрешение',
      'АСОР',
      'Письменный АБР',
      'При огневых — журнал огневых работ',
    ],
    approverRoles: ['issuer', 'permitter', 'performer', 'leadExpert'],
    defaultValidityDays: 7,
    extensionPolicy: 'daily',
    interactionMeasures: [
      'Совместный выезд на участок',
      'Оценка опасных факторов',
      'Целевой инструктаж',
      'Проверки перед началом работ',
      'Контроль за ходом работ',
    ],
  },
  {
    category: 2,
    summaryRu:
      'Категория 2: стандартный режим организации работ (обычный цикл допуска)',
    requiredDocuments: [
      'Наряд-допуск',
      'Письменный АБР',
      'При необходимости — приложения по типу работ',
    ],
    approverRoles: ['issuer', 'permitter', 'performer'],
    defaultValidityDays: 30,
    extensionPolicy: 'daily',
    interactionMeasures: [
      'Целевой инструктаж перед началом',
      'Контроль за ходом работ',
    ],
  },
]

export function matrixRow(category: PermitCategory): MatrixRule {
  const row = DEFAULT_MATRIX.find((r) => r.category === category)
  if (!row) throw new Error(`Unknown matrix category: ${category}`)
  return row
}

export function extensionPolicyLabel(
  policy: MatrixRule['extensionPolicy'],
): string {
  switch (policy) {
    case 'forbidden':
      return 'Запрещено'
    case 'daily':
      return 'Ежедневно'
    case 'up_to_6mo':
      return 'До 6 мес.'
    case 'na':
      return 'Н/П'
    default:
      return policy
  }
}
